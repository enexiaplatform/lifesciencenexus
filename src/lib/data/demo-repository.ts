import { buildDemoDataset, DEMO_TENANT_ID, type DemoDataset } from "../demo";
import { buildMergePlan } from "../domain/entity-resolution";
import { daysUntil, freshnessBucket, isReviewDue } from "../domain/freshness";
import { newId } from "../domain/id";
import type { SearchableRecord } from "../domain/search-rank";
import { rankSearchResults } from "../domain/search-rank";
import type { SignalSnapshot } from "../domain/signals";
import { generateSignals } from "../domain/signals";
import type {
  CreateEntityInput,
  DuplicateCandidate,
  EntityMergeEvent,
  EntityType,
  EntityTypeMap,
  NexusEntity,
  OpportunitySignal,
  ProductEdge,
  SignalStatus,
  UpdateEntityInput,
  Visibility,
} from "../domain/types";
import { ENTITY_TYPES, TENANT_SCOPED_ENTITY_TYPES } from "../domain/types";
import type {
  AssetDetail,
  DashboardSummary,
  ListFilterValue,
  ListParams,
  ListSort,
  MergeEntitiesInput,
  NexusRepository,
  OrganizationDetail,
  Paged,
  ProductDetail,
  ResearchProjectDetail,
  SearchOptions,
  SearchResult,
  SkuDetail,
  TenderDetail,
} from "./repository";
import { DEFAULT_LIST_PARAMS } from "./repository";

/**
 * In-memory demo backend for {@link NexusRepository}.
 *
 * Fully functional for UI development: generic CRUD, federated search (via
 * the search-rank engine), detail aggregates, dashboard summary, duplicate
 * queue and merges. Everything lives in process memory — nothing persists
 * across restarts, which is exactly what a demo backend should promise.
 *
 * `createDemoRepository()` loads the full synthetic dataset from `@/lib/demo`
 * (the factory in `./index` goes through this path); `new DemoRepository()`
 * without a dataset stays empty, which keeps unit tests small.
 *
 * Tenant isolation: records carrying a `tenantId` are visible only to the
 * matching active tenant; `tenant_private` records without one belong to the
 * demo workspace tenant (`tenant_demo`) by convention; canonical records are
 * visible to everyone.
 *
 * Context (tenantId/userId) is injected at construction and used to fill
 * audit fields; `now` is injectable for deterministic tests.
 */

export interface DemoRepositoryContext {
  tenantId?: string;
  userId?: string;
  now?: () => Date;
  /** Pre-built dataset; `createDemoRepository` builds one when absent. */
  dataset?: DemoDataset;
}

/** Minimal structural view used for merge planning. */
type MergeableEntity = Record<string, unknown> & {
  id: string;
  name?: string;
  aliases?: string[];
};

const QUERY_FIELDS = [
  "name",
  "title",
  "fullName",
  "code",
  "model",
  "question",
  "alias",
  "catalogueNumber",
  "manufacturerCode",
  "gtin",
] as const;

export class DemoRepository implements NexusRepository {
  private readonly store = new Map<EntityType, Map<string, NexusEntity>>();
  private readonly redirects = new Map<string, string>();
  private readonly signalStatusOverrides = new Map<string, SignalStatus>();
  private readonly tenantId: string;
  private readonly userId: string;
  private readonly now: () => Date;

  constructor(context: DemoRepositoryContext = {}) {
    this.tenantId = context.tenantId ?? DEMO_TENANT_ID;
    this.userId = context.userId ?? "user_demo_owner";
    this.now = context.now ?? (() => new Date());
    if (context.dataset) {
      this.loadDataset(context.dataset);
    }
  }

  /**
   * Per-type bucket. The cast is safe because all writes go through
   * createEntity/updateEntity/loadDataset, which only place an entity into
   * its own type's bucket.
   */
  private bucket<K extends EntityType>(type: K): Map<string, EntityTypeMap[K]> {
    let bucket = this.store.get(type);
    if (!bucket) {
      bucket = new Map<string, NexusEntity>();
      this.store.set(type, bucket);
    }
    return bucket as Map<string, EntityTypeMap[K]>;
  }

  /** Load a pre-built dataset into the store, bucket by bucket. */
  private loadDataset(dataset: DemoDataset): void {
    for (const type of ENTITY_TYPES) {
      const records = dataset[type];
      if (!records) continue;
      const bucket = this.bucket(type);
      for (const record of records) {
        bucket.set(record.id, record);
      }
    }
  }

  /**
   * Tenant isolation rule: tenant-owned records are visible only to their
   * tenant; tenant-private records without an explicit tenantId belong to the
   * demo workspace tenant; canonical records are visible to all.
   */
  private isVisible(entity: NexusEntity): boolean {
    const tenantId = (entity as { tenantId?: unknown }).tenantId;
    if (typeof tenantId === "string") {
      return tenantId === this.tenantId;
    }
    if (entity.visibility === "tenant_private") {
      return this.tenantId === DEMO_TENANT_ID;
    }
    return true;
  }

  /** Non-archived entities of one type. */
  private all<K extends EntityType>(type: K): Array<EntityTypeMap[K]> {
    return [...this.bucket(type).values()].filter((entity) => entity.archivedAt === undefined);
  }

  /** Non-archived entities of one type visible to the active tenant. */
  private visibleAll<K extends EntityType>(type: K): Array<EntityTypeMap[K]> {
    return this.all(type).filter((entity) => this.isVisible(entity));
  }

  /** Follow a merge redirect, when one exists. */
  getRedirect(type: EntityType, id: string): string | undefined {
    return this.redirects.get(`${type}:${id}`);
  }

  // -------------------------------------------------------------------------
  // Generic reads
  // -------------------------------------------------------------------------

  async list<K extends EntityType>(type: K, params?: Partial<ListParams>): Promise<Paged<EntityTypeMap[K]>> {
    const resolved = { ...DEFAULT_LIST_PARAMS, ...params };
    let items = [...this.bucket(type).values()].filter((entity) => this.isVisible(entity));

    if (!resolved.includeArchived) {
      items = items.filter((entity) => entity.archivedAt === undefined);
    }
    if (resolved.query?.trim()) {
      const query = resolved.query.trim().toLowerCase();
      items = items.filter((entity) => matchesQuery(entity, query));
    }
    if (resolved.filters) {
      for (const [field, value] of Object.entries(resolved.filters)) {
        items = items.filter((entity) => matchesFilter(entity, field, value));
      }
    }
    if (resolved.sort) {
      items = sortItems(items, resolved.sort);
    }

    return paginate(items, resolved);
  }

  async getById<K extends EntityType>(type: K, id: string): Promise<EntityTypeMap[K] | null> {
    const entity = this.bucket(type).get(id);
    if (!entity || !this.isVisible(entity)) return null;
    return entity;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const metas = this.searchableRecords().filter(
      (meta) => !options.types || options.types.includes(meta.record.entityType as EntityType),
    );
    const ranked = rankSearchResults(
      query,
      metas.map((meta) => meta.record),
      { limit: options.limit ?? 20, minScore: options.minScore },
    );
    const metaByRecord = new Map(metas.map((meta) => [meta.record, meta]));
    return ranked.map((hit) => {
      const meta = metaByRecord.get(hit.record);
      return {
        entityType: hit.record.entityType as EntityType,
        id: hit.record.id,
        title: hit.record.name,
        subtitle: meta?.subtitle,
        score: hit.score,
        matchReasons: hit.matchReasons,
        visibility: meta?.visibility ?? "canonical",
        isDemo: meta?.isDemo ?? true,
      };
    });
  }

  private searchableRecords(): Array<{
    record: SearchableRecord;
    subtitle?: string;
    visibility: Visibility;
    isDemo: boolean;
  }> {
    const out: Array<{ record: SearchableRecord; subtitle?: string; visibility: Visibility; isDemo: boolean }> = [];
    const push = (
      entity: NexusEntity,
      entityType: EntityType,
      record: Omit<SearchableRecord, "entityType" | "id">,
      subtitle?: string,
    ) => {
      out.push({
        record: { entityType, id: entity.id, ...record },
        subtitle,
        visibility: entity.visibility,
        isDemo: entity.isDemo,
      });
    };

    const aliasesByOrg = new Map<string, string[]>();
    for (const alias of this.visibleAll("organization_alias")) {
      const list = aliasesByOrg.get(alias.organizationId) ?? [];
      list.push(alias.alias);
      aliasesByOrg.set(alias.organizationId, list);
    }

    for (const org of this.visibleAll("organization")) {
      push(org, "organization", {
        name: org.name,
        aliases: aliasesByOrg.get(org.id) ?? [],
        identifiers: org.identifiers,
      }, `${org.types.join(", ")} · ${org.country}`);
    }
    for (const site of this.visibleAll("site")) {
      push(site, "site", { name: site.name }, site.siteType);
    }
    for (const lab of this.visibleAll("laboratory")) {
      push(lab, "laboratory", { name: lab.name }, lab.labType);
    }
    for (const person of this.visibleAll("person")) {
      push(person, "person", { name: person.fullName }, person.title);
    }
    for (const brand of this.visibleAll("brand")) {
      push(brand, "brand", { name: brand.name });
    }
    for (const family of this.visibleAll("product_family")) {
      push(family, "product_family", { name: family.name }, family.category);
    }
    for (const product of this.visibleAll("product")) {
      push(product, "product", { name: product.name }, product.category);
    }
    for (const sku of this.visibleAll("sku")) {
      push(sku, "sku", {
        name: sku.name,
        aliases: sku.alternateNames,
        catalogueNumber: sku.catalogueNumber,
        identifiers: sku.gtin ? [{ scheme: "gtin", value: sku.gtin }] : [],
      }, sku.catalogueNumber);
    }
    for (const application of this.visibleAll("application")) {
      push(application, "application", { name: application.name });
    }
    for (const method of this.visibleAll("method")) {
      push(method, "method", { name: method.name });
    }
    for (const standard of this.visibleAll("standard")) {
      push(standard, "standard", {
        name: `${standard.body} ${standard.code}`,
        aliases: [standard.code],
      }, standard.title);
    }
    for (const organism of this.visibleAll("organism")) {
      push(organism, "organism", {
        name: `${organism.genus} ${organism.species}`,
        aliases: organism.strainCode ? [organism.strainCode] : [],
      }, organism.strainCode);
    }
    for (const profile of this.visibleAll("supplier_profile")) {
      const org = this.bucket("organization").get(profile.organizationId);
      push(
        profile,
        "supplier_profile",
        { name: org?.name ?? profile.organizationId },
        `${profile.relationshipType} · ${profile.countries.join(", ")}`,
      );
    }
    for (const tender of this.visibleAll("tender")) {
      push(tender, "tender", {
        name: `${tender.code} ${tender.title}`,
        aliases: [tender.code],
      }, `${tender.country} · ${tender.status}`);
    }
    for (const model of this.visibleAll("asset_model")) {
      push(model, "asset_model", { name: model.model }, model.category);
    }
    for (const asset of this.visibleAll("installed_asset")) {
      const model = this.bucket("asset_model").get(asset.assetModelId);
      push(
        asset,
        "installed_asset",
        {
          name: model?.model ?? asset.id,
          aliases: asset.serialNumber ? [asset.serialNumber] : [],
        },
        asset.status,
      );
    }
    for (const source of this.visibleAll("source")) {
      push(source, "source", { name: source.title }, source.publisher ?? source.type);
    }
    for (const project of this.visibleAll("research_project")) {
      push(project, "research_project", { name: project.title }, project.status);
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Detail aggregates
  // -------------------------------------------------------------------------

  async getOrganizationDetail(id: string): Promise<OrganizationDetail | null> {
    const organization = await this.getById("organization", id);
    if (!organization) return null;
    const sites = this.visibleAll("site").filter((site) => site.organizationId === id);
    const siteIds = new Set(sites.map((site) => site.id));
    const contacts = this.visibleAll("organization_contact").filter((contact) => contact.organizationId === id);
    return {
      organization,
      aliases: this.visibleAll("organization_alias").filter((alias) => alias.organizationId === id),
      sites,
      laboratories: this.visibleAll("laboratory").filter((lab) => siteIds.has(lab.siteId)),
      supplierProfile: this.visibleAll("supplier_profile").find((profile) => profile.organizationId === id) ?? null,
      contacts: contacts.map((contact) => ({
        ...contact,
        person: this.bucket("person").get(contact.personId) ?? null,
      })),
      relationships: this.visibleAll("organization_relationship").filter(
        (relationship) => relationship.fromOrgId === id || relationship.toOrgId === id,
      ),
    };
  }

  async getProductDetail(id: string): Promise<ProductDetail | null> {
    const product = await this.getById("product", id);
    if (!product) return null;
    const family = await this.getById("product_family", product.familyId);
    const brand = family ? await this.getById("brand", family.brandId) : null;
    const manufacturer = await this.getById("organization", product.manufacturerOrganizationId);
    return {
      product,
      family,
      brand,
      manufacturer,
      skus: this.visibleAll("sku").filter((sku) => sku.productId === id),
      edges: this.visibleAll("product_edge").filter((edge) => edge.productId === id),
      documents: this.visibleAll("product_document").filter((doc) => doc.productId === id),
    };
  }

  async getSkuDetail(id: string): Promise<SkuDetail | null> {
    const sku = await this.getById("sku", id);
    if (!sku) return null;
    const product = await this.getById("product", sku.productId);
    const family = product ? await this.getById("product_family", product.familyId) : null;
    const brand = family ? await this.getById("brand", family.brandId) : null;
    const manufacturer = product ? await this.getById("organization", product.manufacturerOrganizationId) : null;
    return {
      sku,
      product,
      family,
      brand,
      manufacturer,
      format: sku.formatId ? await this.getById("product_format", sku.formatId) : null,
      packConfigurations: this.visibleAll("pack_configuration").filter((pack) => pack.skuId === id),
      edges: this.visibleAll("product_edge")
        .filter((edge) => edge.productId === sku.productId)
        .map((edge) => ({ ...edge, targetName: this.edgeTargetName(edge) })),
      listings: this.visibleAll("supplier_listing")
        .filter((listing) => listing.skuId === id)
        .map((listing) => ({
          ...listing,
          supplierName: this.bucket("organization").get(listing.supplierOrgId)?.name ?? null,
        })),
      prices: this.visibleAll("price_observation")
        .filter((price) => price.skuId === id)
        .sort((a, b) => b.observationDate.localeCompare(a.observationDate)),
      documents: this.visibleAll("product_document").filter((doc) => doc.skuId === id),
    };
  }

  /** Resolve the display name of a product-edge target for detail views. */
  private edgeTargetName(edge: ProductEdge): string | null {
    switch (edge.targetType) {
      case "application":
        return this.bucket("application").get(edge.targetId)?.name ?? null;
      case "method":
        return this.bucket("method").get(edge.targetId)?.name ?? null;
      case "standard": {
        const standard = this.bucket("standard").get(edge.targetId);
        return standard ? `${standard.body} ${standard.code}` : null;
      }
      case "organism": {
        const organism = this.bucket("organism").get(edge.targetId);
        return organism
          ? [organism.genus, organism.species, organism.strainCode].filter(Boolean).join(" ")
          : null;
      }
      case "sample_type":
        return this.bucket("sample_type").get(edge.targetId)?.name ?? null;
      case "industry":
        return this.bucket("industry").get(edge.targetId)?.name ?? null;
      case "technology":
        return this.bucket("technology").get(edge.targetId)?.name ?? null;
      case "test_type":
        return this.bucket("test_type").get(edge.targetId)?.name ?? null;
      case "incubation_condition": {
        const condition = this.bucket("incubation_condition").get(edge.targetId);
        return condition?.description ?? null;
      }
      case "preparation_method":
        return this.bucket("preparation_method").get(edge.targetId)?.name ?? null;
    }
  }

  async getTenderDetail(id: string): Promise<TenderDetail | null> {
    const tender = await this.getById("tender", id);
    if (!tender) return null;
    const lots = this.visibleAll("tender_lot").filter((lot) => lot.tenderId === id);
    const lotIds = new Set(lots.map((lot) => lot.id));
    const items = this.visibleAll("tender_item").filter((item) => lotIds.has(item.lotId));
    const itemIds = new Set(items.map((item) => item.id));
    return {
      tender,
      buyer: await this.getById("organization", tender.buyerOrganizationId),
      lots,
      items,
      bidders: this.visibleAll("tender_bidder").filter(
        (bidder) => bidder.tenderId === id || (bidder.lotId !== undefined && lotIds.has(bidder.lotId)),
      ),
      awards: this.visibleAll("tender_award").filter(
        (award) =>
          (award.lotId !== undefined && lotIds.has(award.lotId)) ||
          (award.tenderItemId !== undefined && itemIds.has(award.tenderItemId)),
      ),
      events: this.visibleAll("tender_event").filter((event) => event.tenderId === id),
    };
  }

  async getAssetDetail(id: string): Promise<AssetDetail | null> {
    const asset = await this.getById("installed_asset", id);
    if (!asset) return null;
    const compatibilities = this.visibleAll("consumable_compatibility").filter(
      (compatibility) => compatibility.assetModelId === asset.assetModelId,
    );
    return {
      asset,
      model: await this.getById("asset_model", asset.assetModelId),
      site: await this.getById("site", asset.siteId),
      laboratory: asset.laboratoryId ? await this.getById("laboratory", asset.laboratoryId) : null,
      lifecycleEvents: this.visibleAll("asset_lifecycle_event").filter((event) => event.installedAssetId === id),
      maintenanceEvents: this.visibleAll("maintenance_event").filter((event) => event.installedAssetId === id),
      qualificationEvents: this.visibleAll("qualification_event").filter((event) => event.installedAssetId === id),
      compatibleConsumables: compatibilities.map((compatibility) => ({
        ...compatibility,
        sku: this.bucket("sku").get(compatibility.skuId) ?? null,
      })),
    };
  }

  async getResearchProjectDetail(id: string): Promise<ResearchProjectDetail | null> {
    const project = await this.getById("research_project", id);
    if (!project) return null;
    return {
      project,
      notes: this.visibleAll("research_note").filter((note) => note.projectId === id),
      findings: this.visibleAll("research_finding").filter((finding) => finding.projectId === id),
      entities: this.visibleAll("research_project_entity").filter((link) => link.projectId === id),
      exports: this.visibleAll("research_export").filter((exported) => exported.projectId === id),
    };
  }

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------

  async dashboardSummary(): Promise<DashboardSummary> {
    const now = this.now();
    const signals = this.computeSignals();
    const counts: Partial<Record<EntityType, number>> = {};
    for (const type of ENTITY_TYPES) {
      const count = this.visibleAll(type).length;
      if (count > 0) counts[type] = count;
    }
    // Signals are computed, not stored — report the computed count.
    counts.opportunity_signal = signals.length;

    const activeClaims = this.visibleAll("claim");
    return {
      counts,
      reviewQueueSize: activeClaims.filter((claim) =>
        ["unverified", "source_captured", "structurally_validated"].includes(claim.reviewStatus),
      ).length,
      freshness: {
        stalePrices: this.visibleAll("price_observation").filter(
          (price) =>
            freshnessBucket(price.observationDate, { agingAfterDays: 90, staleAfterDays: 180 }, now) === "stale",
        ).length,
        reviewDueClaims: activeClaims.filter((claim) => isReviewDue(claim.reviewByDate, now)).length,
        expiringAgreements: this.visibleAll("distribution_agreement").filter((agreement) => {
          if (!agreement.validTo) return false;
          const days = daysUntil(agreement.validTo, now);
          return days >= 0 && days <= 90;
        }).length,
      },
      highValueSignals: signals
        .filter((signal) => signal.status === "new" && signal.commercialRelevance === "high")
        .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
        .slice(0, 5),
      possibleDuplicates: this.visibleAll("duplicate_candidate").filter((candidate) => candidate.status === "pending")
        .length,
    };
  }

  // -------------------------------------------------------------------------
  // Writes
  // -------------------------------------------------------------------------

  async createEntity<K extends EntityType>(
    type: K,
    data: CreateEntityInput<K>,
  ): Promise<EntityTypeMap[K]> {
    const timestamp = this.now().toISOString();
    const defaults: Record<string, unknown> = {
      visibility: TENANT_SCOPED_ENTITY_TYPES.has(type) ? "tenant_private" : "canonical",
      isDemo: false,
    };
    if (TENANT_SCOPED_ENTITY_TYPES.has(type)) {
      defaults.tenantId = this.tenantId;
    }
    // The audit fields and defaults are authoritative; the cast is safe by
    // construction (defaults + data + audit cover every entity field).
    const entity = {
      ...defaults,
      ...data,
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: this.userId,
      updatedBy: this.userId,
    } as unknown as EntityTypeMap[K];
    this.bucket(type).set(entity.id, entity);
    return entity;
  }

  async updateEntity<K extends EntityType>(
    type: K,
    id: string,
    patch: UpdateEntityInput<K>,
  ): Promise<EntityTypeMap[K]> {
    const existing = this.bucket(type).get(id);
    if (!existing) {
      throw new Error(`${type} ${id} not found`);
    }
    const updated = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
      updatedAt: this.now().toISOString(),
      updatedBy: this.userId,
    } as EntityTypeMap[K];
    this.bucket(type).set(id, updated);
    return updated;
  }

  async archiveEntity<K extends EntityType>(type: K, id: string): Promise<EntityTypeMap[K]> {
    const existing = this.bucket(type).get(id);
    if (!existing) {
      throw new Error(`${type} ${id} not found`);
    }
    const archived = {
      ...existing,
      archivedAt: this.now().toISOString(),
      updatedAt: this.now().toISOString(),
      updatedBy: this.userId,
    };
    this.bucket(type).set(id, archived);
    return archived;
  }

  // -------------------------------------------------------------------------
  // Entity resolution queue
  // -------------------------------------------------------------------------

  async listDuplicateCandidates(params?: Partial<ListParams>): Promise<Paged<DuplicateCandidate>> {
    return this.list("duplicate_candidate", params);
  }

  async dismissDuplicateCandidate(id: string): Promise<DuplicateCandidate> {
    return this.updateEntity("duplicate_candidate", id, { status: "dismissed" });
  }

  async mergeEntities(input: MergeEntitiesInput): Promise<EntityMergeEvent> {
    const { entityType, survivorId, mergedId } = input;
    if (survivorId === mergedId) {
      throw new Error("survivorId and mergedId must be different entities");
    }
    const survivor = await this.getById(entityType, survivorId);
    if (!survivor) throw new Error(`${entityType} ${survivorId} not found`);
    const merged = await this.getById(entityType, mergedId);
    if (!merged) throw new Error(`${entityType} ${mergedId} not found`);

    const plan = buildMergePlan<MergeableEntity>({
      entityType,
      left: survivor as unknown as MergeableEntity,
      right: merged as unknown as MergeableEntity,
      survivor: "left",
      fieldChoices: input.fieldChoices,
    });

    // Apply field resolutions to the survivor.
    const survivorRecord = survivor as unknown as Record<string, unknown>;
    for (const [field, resolution] of Object.entries(plan.fieldResolutions)) {
      survivorRecord[field] = resolution.value;
    }

    // Alias preservation: the loser's names stay findable on the survivor.
    if (plan.aliasesToAdd.length > 0) {
      if (entityType === "organization") {
        for (const alias of plan.aliasesToAdd) {
          await this.createEntity("organization_alias", {
            organizationId: survivorId,
            alias,
            source: "merge",
            visibility: survivor.visibility,
            isDemo: survivor.isDemo,
          });
        }
      } else if (Array.isArray(survivorRecord.alternateNames)) {
        survivorRecord.alternateNames = [
          ...(survivorRecord.alternateNames as string[]),
          ...plan.aliasesToAdd,
        ];
      }
    }
    survivorRecord.updatedAt = this.now().toISOString();
    survivorRecord.updatedBy = this.userId;

    await this.archiveEntity(entityType, mergedId);
    this.redirects.set(`${entityType}:${mergedId}`, survivorId);

    const event = await this.createEntity("entity_merge_event", {
      entityType,
      survivorId,
      mergedId,
      fieldResolutions: plan.fieldResolutions,
      aliasPreservation: plan.aliasPreservation,
      redirectCreated: plan.redirectCreated,
      visibility: survivor.visibility,
      isDemo: survivor.isDemo,
    });

    for (const candidate of this.all("duplicate_candidate")) {
      const samePair =
        candidate.entityType === entityType &&
        ((candidate.leftId === survivorId && candidate.rightId === mergedId) ||
          (candidate.leftId === mergedId && candidate.rightId === survivorId));
      if (samePair && candidate.status === "pending") {
        await this.updateEntity("duplicate_candidate", candidate.id, { status: "merged" });
      }
    }

    return event;
  }

  // -------------------------------------------------------------------------
  // Signals (computed from the current dataset via the signal engine)
  // -------------------------------------------------------------------------

  /**
   * Compute the current opportunity signals. Signals are derived intelligence:
   * they are regenerated from the visible dataset on every call, carry
   * deterministic ids, and only their acknowledge/dismiss status is stored
   * (in-memory, keyed by signal id).
   */
  private computeSignals(): OpportunitySignal[] {
    const snapshot: SignalSnapshot = {
      installedAssets: this.visibleAll("installed_asset"),
      tenders: this.visibleAll("tender"),
      priceObservations: this.visibleAll("price_observation"),
      distributionAgreements: this.visibleAll("distribution_agreement"),
      products: this.visibleAll("product"),
      supplierListings: this.visibleAll("supplier_listing"),
      consumableCompatibilities: this.visibleAll("consumable_compatibility"),
      vendorApprovals: this.visibleAll("vendor_approval"),
      productValidations: this.visibleAll("product_validation"),
      availabilityObservations: this.visibleAll("availability_observation"),
      now: this.now(),
    };
    return generateSignals(snapshot).map((generated) => {
      const id = `sig-${generated.type}-${generated.triggeringRecordIds.join("-")}`;
      return {
        ...generated,
        id,
        tenantId: this.tenantId,
        createdAt: generated.generatedAt,
        updatedAt: generated.generatedAt,
        createdBy: "system",
        updatedBy: "system",
        visibility: "tenant_private" as const,
        isDemo: true,
        status: this.signalStatusOverrides.get(id) ?? generated.status,
      };
    });
  }

  async listSignals(params?: Partial<ListParams>): Promise<Paged<OpportunitySignal>> {
    const resolved = { ...DEFAULT_LIST_PARAMS, ...params };
    let items = this.computeSignals();

    if (resolved.query?.trim()) {
      const query = resolved.query.trim().toLowerCase();
      items = items.filter(
        (signal) =>
          signal.reason.toLowerCase().includes(query) ||
          signal.type.toLowerCase().includes(query) ||
          signal.recommendedAction.toLowerCase().includes(query),
      );
    }
    if (resolved.filters) {
      for (const [field, value] of Object.entries(resolved.filters)) {
        items = items.filter((entity) => matchesFilter(entity, field, value));
      }
    }
    if (resolved.sort) {
      items = sortItems(items, resolved.sort);
    } else {
      items = [...items].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    }

    return paginate(items, resolved);
  }

  async acknowledgeSignal(id: string): Promise<OpportunitySignal> {
    return this.setSignalStatus(id, "acknowledged");
  }

  async dismissSignal(id: string): Promise<OpportunitySignal> {
    return this.setSignalStatus(id, "dismissed");
  }

  private setSignalStatus(id: string, status: SignalStatus): OpportunitySignal {
    const signal = this.computeSignals().find((candidate) => candidate.id === id);
    if (!signal) {
      throw new Error(`opportunity_signal ${id} not found`);
    }
    this.signalStatusOverrides.set(id, status);
    return { ...signal, status, updatedAt: this.now().toISOString() };
  }
}

export function createDemoRepository(context: DemoRepositoryContext = {}): DemoRepository {
  const dataset = context.dataset ?? buildDemoDataset(context.now?.() ?? new Date());
  return new DemoRepository({ ...context, dataset });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asRecord(entity: NexusEntity): Record<string, unknown> {
  // Domain entities are plain data objects by convention.
  return entity as unknown as Record<string, unknown>;
}

function matchesQuery(entity: NexusEntity, query: string): boolean {
  const record = asRecord(entity);
  return QUERY_FIELDS.some((field) => {
    const value = record[field];
    return typeof value === "string" && value.toLowerCase().includes(query);
  });
}

function matchesFilter(entity: NexusEntity, field: string, value: ListFilterValue): boolean {
  const fieldValue = asRecord(entity)[field];
  const wanted = Array.isArray(value) ? value : [value];
  if (Array.isArray(fieldValue)) {
    // Array fields (e.g. countryAvailability): overlap counts as a match.
    return wanted.some((item) => (fieldValue as unknown[]).includes(item));
  }
  return wanted.some((item) => item === fieldValue);
}

function sortItems<T extends NexusEntity>(items: T[], sort: ListSort): T[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const left = asRecord(a)[sort.field];
    const right = asRecord(b)[sort.field];
    if (left === undefined && right === undefined) return 0;
    if (left === undefined) return 1;
    if (right === undefined) return -1;
    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * direction;
    }
    return String(left).localeCompare(String(right)) * direction;
  });
}

function paginate<T>(items: T[], resolved: ListParams): Paged<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / resolved.pageSize));
  const page = Math.min(Math.max(1, resolved.page), totalPages);
  const start = (page - 1) * resolved.pageSize;
  return {
    items: items.slice(start, start + resolved.pageSize),
    page,
    pageSize: resolved.pageSize,
    total,
    totalPages,
  };
}
