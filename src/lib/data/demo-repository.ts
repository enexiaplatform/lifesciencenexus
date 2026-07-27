import { buildMergePlan } from "../domain/entity-resolution";
import { daysUntil, freshnessBucket, isReviewDue } from "../domain/freshness";
import { newId } from "../domain/id";
import type { SearchableRecord } from "../domain/search-rank";
import { rankSearchResults } from "../domain/search-rank";
import type {
  CreateEntityInput,
  DuplicateCandidate,
  EntityMergeEvent,
  EntityType,
  EntityTypeMap,
  NexusEntity,
  OpportunitySignal,
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
 * Context (tenantId/userId) is injected at construction and used to fill
 * audit fields; `now` is injectable for deterministic tests.
 */

export interface DemoRepositoryContext {
  tenantId?: string;
  userId?: string;
  now?: () => Date;
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
  private readonly tenantId: string;
  private readonly userId: string;
  private readonly now: () => Date;

  constructor(context: DemoRepositoryContext = {}) {
    this.tenantId = context.tenantId ?? "demo-tenant";
    this.userId = context.userId ?? "demo-user";
    this.now = context.now ?? (() => new Date());
  }

  /**
   * Per-type bucket. The cast is safe because all writes go through
   * createEntity/updateEntity, which only place an entity into its own
   * type's bucket.
   */
  private bucket<K extends EntityType>(type: K): Map<string, EntityTypeMap[K]> {
    let bucket = this.store.get(type);
    if (!bucket) {
      bucket = new Map<string, NexusEntity>();
      this.store.set(type, bucket);
    }
    return bucket as Map<string, EntityTypeMap[K]>;
  }

  /** Non-archived entities of one type. */
  private all<K extends EntityType>(type: K): Array<EntityTypeMap[K]> {
    return [...this.bucket(type).values()].filter((entity) => entity.archivedAt === undefined);
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
    let items = [...this.bucket(type).values()];

    if (!resolved.includeArchived) {
      items = items.filter((entity) => entity.archivedAt === undefined);
    }
    const query = resolved.query?.trim().toLowerCase();
    if (query) {
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

  async getById<K extends EntityType>(type: K, id: string): Promise<EntityTypeMap[K] | null> {
    return this.bucket(type).get(id) ?? null;
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
    for (const alias of this.all("organization_alias")) {
      const list = aliasesByOrg.get(alias.organizationId) ?? [];
      list.push(alias.alias);
      aliasesByOrg.set(alias.organizationId, list);
    }

    for (const org of this.all("organization")) {
      push(org, "organization", {
        name: org.name,
        aliases: aliasesByOrg.get(org.id) ?? [],
        identifiers: org.identifiers,
      }, `${org.types.join(", ")} · ${org.country}`);
    }
    for (const site of this.all("site")) {
      push(site, "site", { name: site.name }, site.siteType);
    }
    for (const person of this.all("person")) {
      push(person, "person", { name: person.fullName }, person.title);
    }
    for (const brand of this.all("brand")) {
      push(brand, "brand", { name: brand.name });
    }
    for (const family of this.all("product_family")) {
      push(family, "product_family", { name: family.name }, family.category);
    }
    for (const product of this.all("product")) {
      push(product, "product", { name: product.name }, product.category);
    }
    for (const sku of this.all("sku")) {
      push(sku, "sku", {
        name: sku.name,
        aliases: sku.alternateNames,
        catalogueNumber: sku.catalogueNumber,
        identifiers: sku.gtin ? [{ scheme: "gtin", value: sku.gtin }] : [],
      }, sku.catalogueNumber);
    }
    for (const standard of this.all("standard")) {
      push(standard, "standard", {
        name: `${standard.body} ${standard.code}`,
        aliases: [standard.code],
      }, standard.title);
    }
    for (const organism of this.all("organism")) {
      push(organism, "organism", {
        name: `${organism.genus} ${organism.species}`,
        aliases: organism.strainCode ? [organism.strainCode] : [],
      }, organism.strainCode);
    }
    for (const model of this.all("asset_model")) {
      push(model, "asset_model", { name: model.model }, model.category);
    }
    for (const tender of this.all("tender")) {
      push(tender, "tender", {
        name: `${tender.code} ${tender.title}`,
        aliases: [tender.code],
      }, `${tender.country} · ${tender.status}`);
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Detail aggregates
  // -------------------------------------------------------------------------

  async getOrganizationDetail(id: string): Promise<OrganizationDetail | null> {
    const organization = await this.getById("organization", id);
    if (!organization) return null;
    const sites = this.all("site").filter((site) => site.organizationId === id);
    const siteIds = new Set(sites.map((site) => site.id));
    const contacts = this.all("organization_contact").filter((contact) => contact.organizationId === id);
    return {
      organization,
      aliases: this.all("organization_alias").filter((alias) => alias.organizationId === id),
      sites,
      laboratories: this.all("laboratory").filter((lab) => siteIds.has(lab.siteId)),
      supplierProfile: this.all("supplier_profile").find((profile) => profile.organizationId === id) ?? null,
      contacts: contacts.map((contact) => ({
        ...contact,
        person: this.bucket("person").get(contact.personId) ?? null,
      })),
      relationships: this.all("organization_relationship").filter(
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
      skus: this.all("sku").filter((sku) => sku.productId === id),
      edges: this.all("product_edge").filter((edge) => edge.productId === id),
      documents: this.all("product_document").filter((doc) => doc.productId === id),
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
      packConfigurations: this.all("pack_configuration").filter((pack) => pack.skuId === id),
      edges: this.all("product_edge").filter((edge) => edge.productId === sku.productId),
      listings: this.all("supplier_listing").filter((listing) => listing.skuId === id),
      prices: this.all("price_observation")
        .filter((price) => price.skuId === id)
        .sort((a, b) => b.observationDate.localeCompare(a.observationDate)),
      documents: this.all("product_document").filter((doc) => doc.skuId === id),
    };
  }

  async getTenderDetail(id: string): Promise<TenderDetail | null> {
    const tender = await this.getById("tender", id);
    if (!tender) return null;
    const lots = this.all("tender_lot").filter((lot) => lot.tenderId === id);
    const lotIds = new Set(lots.map((lot) => lot.id));
    const items = this.all("tender_item").filter((item) => lotIds.has(item.lotId));
    const itemIds = new Set(items.map((item) => item.id));
    return {
      tender,
      buyer: await this.getById("organization", tender.buyerOrganizationId),
      lots,
      items,
      bidders: this.all("tender_bidder").filter(
        (bidder) => bidder.tenderId === id || (bidder.lotId !== undefined && lotIds.has(bidder.lotId)),
      ),
      awards: this.all("tender_award").filter(
        (award) =>
          (award.lotId !== undefined && lotIds.has(award.lotId)) ||
          (award.tenderItemId !== undefined && itemIds.has(award.tenderItemId)),
      ),
      events: this.all("tender_event").filter((event) => event.tenderId === id),
    };
  }

  async getAssetDetail(id: string): Promise<AssetDetail | null> {
    const asset = await this.getById("installed_asset", id);
    if (!asset) return null;
    const compatibilities = this.all("consumable_compatibility").filter(
      (compatibility) => compatibility.assetModelId === asset.assetModelId,
    );
    return {
      asset,
      model: await this.getById("asset_model", asset.assetModelId),
      site: await this.getById("site", asset.siteId),
      laboratory: asset.laboratoryId ? await this.getById("laboratory", asset.laboratoryId) : null,
      lifecycleEvents: this.all("asset_lifecycle_event").filter((event) => event.installedAssetId === id),
      maintenanceEvents: this.all("maintenance_event").filter((event) => event.installedAssetId === id),
      qualificationEvents: this.all("qualification_event").filter((event) => event.installedAssetId === id),
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
      notes: this.all("research_note").filter((note) => note.projectId === id),
      findings: this.all("research_finding").filter((finding) => finding.projectId === id),
      entities: this.all("research_project_entity").filter((link) => link.projectId === id),
      exports: this.all("research_export").filter((exported) => exported.projectId === id),
    };
  }

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------

  async dashboardSummary(): Promise<DashboardSummary> {
    const now = this.now();
    const counts: Partial<Record<EntityType, number>> = {};
    for (const type of ENTITY_TYPES) {
      const count = this.all(type).length;
      if (count > 0) counts[type] = count;
    }
    const activeClaims = this.all("claim");
    const signals = this.all("opportunity_signal");
    return {
      counts,
      reviewQueueSize: activeClaims.filter((claim) =>
        ["unverified", "source_captured", "structurally_validated"].includes(claim.reviewStatus),
      ).length,
      freshness: {
        stalePrices: this.all("price_observation").filter(
          (price) =>
            freshnessBucket(price.observationDate, { agingAfterDays: 90, staleAfterDays: 180 }, now) === "stale",
        ).length,
        reviewDueClaims: activeClaims.filter((claim) => isReviewDue(claim.reviewByDate, now)).length,
        expiringAgreements: this.all("distribution_agreement").filter((agreement) => {
          if (!agreement.validTo) return false;
          const days = daysUntil(agreement.validTo, now);
          return days >= 0 && days <= 90;
        }).length,
      },
      highValueSignals: signals
        .filter((signal) => signal.status === "new" && signal.commercialRelevance === "high")
        .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
        .slice(0, 5),
      possibleDuplicates: this.all("duplicate_candidate").filter((candidate) => candidate.status === "pending")
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
  // Signals
  // -------------------------------------------------------------------------

  async listSignals(params?: Partial<ListParams>): Promise<Paged<OpportunitySignal>> {
    return this.list("opportunity_signal", params);
  }

  async acknowledgeSignal(id: string): Promise<OpportunitySignal> {
    return this.updateEntity("opportunity_signal", id, { status: "acknowledged" });
  }

  async dismissSignal(id: string): Promise<OpportunitySignal> {
    return this.updateEntity("opportunity_signal", id, { status: "dismissed" });
  }
}

export function createDemoRepository(context: DemoRepositoryContext = {}): DemoRepository {
  return new DemoRepository(context);
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
