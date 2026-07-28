import type { NexusRepository } from "@/lib/data/repository";
import { normalizeForMatch, scoreDuplicatePair, type DuplicateEntityInput } from "@/lib/domain/entity-resolution";
import { newId } from "@/lib/domain/id";
import type { CreateEntityInput, EntityType, Visibility } from "@/lib/domain/types";
import { TENANT_SCOPED_ENTITY_TYPES } from "@/lib/domain/types";

import { IMPORT_TEMPLATES, type ImportKind } from "./templates";
import { IMPORT_SOURCE_PLACEHOLDER, parseImportRow, validateRows, type ImportSummary, type RowError } from "./validate";

/**
 * Import runner: takes mapped + validated rows and commits them through the
 * repository. Also used by the /imports server actions; pure apart from repo
 * I/O so it is unit-testable with a DemoRepository.
 *
 * Idempotency: before creating, every row gets a per-kind dedup key
 * (e.g. normalized name + country for organizations, normalized catalogue
 * number for SKUs, SKU+amount+date for prices). A row whose key already
 * exists — in the graph or earlier in the same batch — is skipped as
 * "exact duplicate", so re-importing the same file with the same mapping
 * creates nothing twice.
 */

export interface RunImportInput {
  kind: ImportKind;
  /** Rows keyed by template field (post-mapping). */
  rows: Record<string, string>[];
  fileName: string;
  visibility: Visibility;
  /** When false, any invalid row aborts the whole import without writes. */
  importValidOnly: boolean;
  /** Row indexes the user chose to skip after duplicate review. */
  skipRowIndexes?: number[];
  /** Tenant/user recorded on the batch audit entry. */
  tenantId: string;
  actorId: string;
}

export interface ImportRowResult {
  rowIndex: number;
  status: "created" | "skipped" | "error";
  entityIds?: string[];
  message?: string;
  errors?: RowError[];
}

export interface ImportReport {
  batchId: string;
  kind: ImportKind;
  fileName: string;
  visibility: Visibility;
  total: number;
  created: number;
  skipped: number;
  failed: number;
  rows: ImportRowResult[];
  createdEntityIds: string[];
  sourceRecordId: string;
  startedAt: string;
  finishedAt: string;
}

export type RunImportResult =
  | { ok: true; report: ImportReport }
  | { ok: false; message: string; summary: ImportSummary };

// ---------------------------------------------------------------------------
// Reference resolution
// ---------------------------------------------------------------------------

async function resolveByNameOrId<K extends EntityType>(
  repo: NexusRepository,
  type: K,
  ref: string,
  nameOf: (entity: import("@/lib/domain/types").EntityTypeMap[K]) => string,
): Promise<string | null> {
  const byId = await repo.getById(type, ref);
  if (byId) return byId.id;
  const wanted = normalizeForMatch(ref);
  const candidates = await repo.list(type, { query: ref, pageSize: 100 });
  for (const candidate of candidates.items) {
    if (normalizeForMatch(nameOf(candidate)) === wanted) return candidate.id;
  }
  return null;
}

function resolveOrganization(repo: NexusRepository, ref: string): Promise<string | null> {
  return resolveByNameOrId(repo, "organization", ref, (org) => org.name);
}

/** SKU by id, catalogue number (alphanumeric-normalized), GTIN or exact name. */
async function resolveSku(repo: NexusRepository, ref: string): Promise<string | null> {
  const byId = await repo.getById("sku", ref);
  if (byId) return byId.id;
  const wantedName = normalizeForMatch(ref);
  const wantedCode = normalizeCode(ref);
  const all = await repo.list("sku", { pageSize: 1000 });
  for (const sku of all.items) {
    if (sku.catalogueNumber && normalizeCode(sku.catalogueNumber) === wantedCode) return sku.id;
    if (sku.gtin && normalizeCode(sku.gtin) === wantedCode) return sku.id;
    if (normalizeForMatch(sku.name) === wantedName) return sku.id;
  }
  return null;
}

function normalizeCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

// ---------------------------------------------------------------------------
// Dedup keys (idempotency)
// ---------------------------------------------------------------------------

type ResolvedDto = Record<string, unknown>;

function dedupKey(kind: ImportKind, dto: ResolvedDto): string | null {
  const str = (key: string) => (typeof dto[key] === "string" ? (dto[key] as string) : "");
  const num = (key: string) => (typeof dto[key] === "number" ? String(dto[key]) : "");
  switch (kind) {
    case "organizations":
      return `org:${normalizeForMatch(str("name"))}|${str("country")}`;
    case "sites":
      return `site:${str("organizationId")}|${normalizeForMatch(str("name"))}`;
    case "products":
      return `prod:${normalizeForMatch(str("name"))}|${str("manufacturerOrganizationId")}`;
    case "skus":
      return str("catalogueNumber")
        ? `sku-cat:${normalizeCode(str("catalogueNumber"))}`
        : `sku-name:${str("productId")}|${normalizeForMatch(str("name"))}`;
    case "prices":
      return `price:${str("skuId")}|${num("originalAmount")}|${str("originalCurrency")}|${str("observationDate")}|${str("supplierOrgId")}`;
    case "suppliers":
      return `supplier:${str("organizationId")}`;
    case "tenders":
      return `tender:${normalizeForMatch(str("code"))}|${str("country")}`;
    case "installed-assets":
      return str("serialNumber")
        ? `asset-sn:${normalizeCode(str("serialNumber"))}|${str("siteId")}`
        : `asset:${str("assetModelId")}|${str("siteId")}|${str("installationDate")}`;
    case "contacts": {
      const person = dto.person as { fullName?: string } | undefined;
      return `contact:${normalizeForMatch(person?.fullName ?? "")}|${str("organizationId")}`;
    }
    case "equivalence-candidates":
      return `equiv:${str("sourceSkuId")}|${str("candidateSkuId")}`;
  }
}

/** Existing dedup keys per kind, so exact duplicates are skipped (idempotent re-import). */
async function existingDedupKeys(repo: NexusRepository, kind: ImportKind): Promise<Set<string>> {
  const keys = new Set<string>();
  const add = (key: string | null) => {
    if (key) keys.add(key);
  };
  switch (kind) {
    case "organizations": {
      for (const org of (await repo.list("organization", { pageSize: 1000 })).items) {
        add(`org:${normalizeForMatch(org.name)}|${org.country}`);
      }
      break;
    }
    case "sites": {
      for (const site of (await repo.list("site", { pageSize: 1000 })).items) {
        add(`site:${site.organizationId}|${normalizeForMatch(site.name)}`);
      }
      break;
    }
    case "products": {
      for (const product of (await repo.list("product", { pageSize: 1000 })).items) {
        add(`prod:${normalizeForMatch(product.name)}|${product.manufacturerOrganizationId}`);
      }
      break;
    }
    case "skus": {
      for (const sku of (await repo.list("sku", { pageSize: 1000 })).items) {
        if (sku.catalogueNumber) add(`sku-cat:${normalizeCode(sku.catalogueNumber)}`);
        add(`sku-name:${sku.productId}|${normalizeForMatch(sku.name)}`);
      }
      break;
    }
    case "prices": {
      for (const price of (await repo.list("price_observation", { pageSize: 1000 })).items) {
        add(
          `price:${price.skuId}|${price.originalAmount}|${price.originalCurrency}|${price.observationDate}|${price.supplierOrgId ?? ""}`,
        );
      }
      break;
    }
    case "suppliers": {
      for (const profile of (await repo.list("supplier_profile", { pageSize: 1000 })).items) {
        add(`supplier:${profile.organizationId}`);
      }
      break;
    }
    case "tenders": {
      for (const tender of (await repo.list("tender", { pageSize: 1000 })).items) {
        add(`tender:${normalizeForMatch(tender.code)}|${tender.country}`);
      }
      break;
    }
    case "installed-assets": {
      for (const asset of (await repo.list("installed_asset", { pageSize: 1000 })).items) {
        if (asset.serialNumber) add(`asset-sn:${normalizeCode(asset.serialNumber)}|${asset.siteId}`);
        add(`asset:${asset.assetModelId}|${asset.siteId}|${asset.installationDate ?? ""}`);
      }
      break;
    }
    case "contacts": {
      const contacts = (await repo.list("organization_contact", { pageSize: 1000 })).items;
      for (const contact of contacts) {
        const person = await repo.getById("person", contact.personId);
        if (person) add(`contact:${normalizeForMatch(person.fullName)}|${contact.organizationId}`);
      }
      break;
    }
    case "equivalence-candidates": {
      for (const record of (await repo.list("equivalence_record", { pageSize: 1000 })).items) {
        add(`equiv:${record.sourceSkuId}|${record.candidateSkuId}`);
        add(`equiv:${record.candidateSkuId}|${record.sourceSkuId}`);
      }
      break;
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Reference resolution per kind (mutates a DTO copy; returns error or null)
// ---------------------------------------------------------------------------

async function resolveReferences(
  repo: NexusRepository,
  kind: ImportKind,
  dto: ResolvedDto,
): Promise<string | null> {
  const resolve = async (
    label: string,
    ref: unknown,
    resolver: (r: string) => Promise<string | null>,
    assign: (id: string) => void,
  ): Promise<string | null> => {
    const id = await resolver(String(ref));
    if (id === null) return `${label} "${String(ref)}" not found`;
    assign(id);
    return null;
  };

  switch (kind) {
    case "sites":
      return resolve("Organization", dto.organizationId, (r) => resolveOrganization(repo, r), (id) => { dto.organizationId = id; });
    case "products": {
      const familyError = await resolve("Product family", dto.familyId, (r) => resolveByNameOrId(repo, "product_family", r, (f) => f.name), (id) => { dto.familyId = id; });
      if (familyError) return familyError;
      return resolve("Manufacturer", dto.manufacturerOrganizationId, (r) => resolveOrganization(repo, r), (id) => { dto.manufacturerOrganizationId = id; });
    }
    case "skus": {
      const productError = await resolve("Product", dto.productId, (r) => resolveByNameOrId(repo, "product", r, (p) => p.name), (id) => { dto.productId = id; });
      if (productError) return productError;
      if (dto.formatId) {
        return resolve("Format", dto.formatId, (r) => resolveByNameOrId(repo, "product_format", r, (f) => f.name), (id) => { dto.formatId = id; });
      }
      return null;
    }
    case "prices": {
      const skuError = await resolve("SKU", dto.skuId, (r) => resolveSku(repo, r), (id) => { dto.skuId = id; });
      if (skuError) return skuError;
      if (dto.supplierOrgId) {
        return resolve("Supplier", dto.supplierOrgId, (r) => resolveOrganization(repo, r), (id) => { dto.supplierOrgId = id; });
      }
      return null;
    }
    case "suppliers": {
      const orgError = await resolve("Supplier organization", dto.organizationId, (r) => resolveOrganization(repo, r), (id) => { dto.organizationId = id; });
      if (orgError) return orgError;
      const resolvedManufacturers: string[] = [];
      for (const ref of (dto.manufacturers as string[] | undefined) ?? []) {
        const id = await resolveOrganization(repo, ref);
        if (id === null) return `Manufacturer "${ref}" not found`;
        resolvedManufacturers.push(id);
      }
      dto.manufacturers = resolvedManufacturers;
      return null;
    }
    case "tenders":
      return resolve("Buyer", dto.buyerOrganizationId, (r) => resolveOrganization(repo, r), (id) => { dto.buyerOrganizationId = id; });
    case "installed-assets": {
      const modelError = await resolve("Asset model", dto.assetModelId, (r) => resolveByNameOrId(repo, "asset_model", r, (m) => m.model), (id) => { dto.assetModelId = id; });
      if (modelError) return modelError;
      const siteError = await resolve("Site", dto.siteId, (r) => resolveByNameOrId(repo, "site", r, (s) => s.name), (id) => { dto.siteId = id; });
      if (siteError) return siteError;
      if (dto.laboratoryId) {
        return resolve("Laboratory", dto.laboratoryId, (r) => resolveByNameOrId(repo, "laboratory", r, (l) => l.name), (id) => { dto.laboratoryId = id; });
      }
      return null;
    }
    case "contacts":
      return resolve("Organization", dto.organizationId, (r) => resolveOrganization(repo, r), (id) => { dto.organizationId = id; });
    case "equivalence-candidates": {
      const sourceError = await resolve("Source SKU", dto.sourceSkuId, (r) => resolveSku(repo, r), (id) => { dto.sourceSkuId = id; });
      if (sourceError) return sourceError;
      return resolve("Candidate SKU", dto.candidateSkuId, (r) => resolveSku(repo, r), (id) => { dto.candidateSkuId = id; });
    }
    case "organizations":
      return null;
  }
}

// ---------------------------------------------------------------------------
// Entity creation per kind
// ---------------------------------------------------------------------------

async function createForKind(
  repo: NexusRepository,
  kind: ImportKind,
  dto: ResolvedDto,
  visibility: Visibility,
  tenantId: string,
): Promise<string[]> {
  // Tenant-scoped types (person, organization_contact, installed_asset, ...)
  // require tenantId on create; canonical types must NOT carry one.
  const entityType = IMPORT_TEMPLATES[kind].entityType;
  const tenancy = TENANT_SCOPED_ENTITY_TYPES.has(entityType) ? { tenantId } : {};
  const withGovernance = { ...dto, visibility, ...tenancy };
  switch (kind) {
    case "organizations": {
      const created = await repo.createEntity("organization", withGovernance as CreateEntityInput<"organization">);
      return [created.id];
    }
    case "sites": {
      const created = await repo.createEntity("site", withGovernance as CreateEntityInput<"site">);
      return [created.id];
    }
    case "products": {
      const created = await repo.createEntity("product", withGovernance as CreateEntityInput<"product">);
      return [created.id];
    }
    case "skus": {
      const created = await repo.createEntity("sku", withGovernance as CreateEntityInput<"sku">);
      return [created.id];
    }
    case "prices": {
      const created = await repo.createEntity("price_observation", withGovernance as CreateEntityInput<"price_observation">);
      return [created.id];
    }
    case "suppliers": {
      const created = await repo.createEntity("supplier_profile", withGovernance as CreateEntityInput<"supplier_profile">);
      return [created.id];
    }
    case "tenders": {
      const created = await repo.createEntity("tender", withGovernance as CreateEntityInput<"tender">);
      return [created.id];
    }
    case "installed-assets": {
      const created = await repo.createEntity("installed_asset", withGovernance as CreateEntityInput<"installed_asset">);
      return [created.id];
    }
    case "contacts": {
      const person = dto.person as CreateEntityInput<"person">;
      const createdPerson = await repo.createEntity("person", { ...person, visibility, tenantId });
      const createdContact = await repo.createEntity("organization_contact", {
        personId: createdPerson.id,
        organizationId: dto.organizationId as string,
        decisionRoles: (dto.decisionRoles as CreateEntityInput<"organization_contact">["decisionRoles"]) ?? [],
        isPrimary: (dto.isPrimary as boolean | undefined) ?? false,
        visibility,
        tenantId,
        isDemo: false,
      });
      return [createdPerson.id, createdContact.id];
    }
    case "equivalence-candidates": {
      const created = await repo.createEntity("equivalence_record", withGovernance as CreateEntityInput<"equivalence_record">);
      return [created.id];
    }
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

export async function runImport(repo: NexusRepository, input: RunImportInput): Promise<RunImportResult> {
  const startedAt = new Date().toISOString();
  const template = IMPORT_TEMPLATES[input.kind];
  const skipRows = new Set(input.skipRowIndexes ?? []);

  // Server-side re-validation — never trust client-computed validation.
  const summary = validateRows(input.kind, input.rows);
  if (summary.invalid > 0 && !input.importValidOnly) {
    return {
      ok: false,
      message: `${summary.invalid} of ${summary.total} rows have validation errors. Enable "import valid rows only" or fix the file.`,
      summary,
    };
  }

  const invalidByRow = new Map(summary.rows.map((row) => [row.rowIndex, row.errors]));
  const batchId = newId();

  // Every batch gets an import_record source; prices/tenders/documents point
  // at it via sourceId, and the batch audit entry references it.
  const source = await repo.createEntity("source", {
    type: "import_record",
    title: `Import: ${input.fileName} (${template.label})`,
    publisher: "Nexus import wizard",
    capturedAt: startedAt,
    notes: `batch ${batchId} · ${input.rows.length} rows · visibility ${input.visibility}`,
    visibility: input.visibility,
    isDemo: false,
  });

  const existingKeys = await existingDedupKeys(repo, input.kind);
  const seenKeys = new Set<string>();
  const rowResults: ImportRowResult[] = [];
  const createdEntityIds: string[] = [];

  for (let rowIndex = 0; rowIndex < input.rows.length; rowIndex += 1) {
    const row = input.rows[rowIndex];

    const validationErrors = invalidByRow.get(rowIndex);
    if (validationErrors) {
      rowResults.push({ rowIndex, status: "error", errors: validationErrors, message: "Validation failed" });
      continue;
    }
    if (skipRows.has(rowIndex)) {
      rowResults.push({ rowIndex, status: "skipped", message: "Skipped after duplicate review" });
      continue;
    }

    const parsed = parseImportRow(input.kind, row);
    if (!parsed.ok) {
      rowResults.push({ rowIndex, status: "error", errors: parsed.errors, message: "Validation failed" });
      continue;
    }
    const dto = { ...parsed.dto };

    const referenceError = await resolveReferences(repo, input.kind, dto);
    if (referenceError !== null) {
      rowResults.push({ rowIndex, status: "error", message: referenceError });
      continue;
    }

    if (dto.sourceId === IMPORT_SOURCE_PLACEHOLDER) dto.sourceId = source.id;

    const key = dedupKey(input.kind, dto);
    if (key && (existingKeys.has(key) || seenKeys.has(key))) {
      rowResults.push({ rowIndex, status: "skipped", message: "Exact duplicate — already in the graph (idempotent re-import)" });
      continue;
    }

    try {
      const ids = await createForKind(repo, input.kind, dto, input.visibility, input.tenantId);
      if (key) seenKeys.add(key);
      createdEntityIds.push(...ids);
      rowResults.push({ rowIndex, status: "created", entityIds: ids });
    } catch (error) {
      rowResults.push({
        rowIndex,
        status: "error",
        message: error instanceof Error ? error.message : "Create failed",
      });
    }
  }

  const finishedAt = new Date().toISOString();
  const report: ImportReport = {
    batchId,
    kind: input.kind,
    fileName: input.fileName,
    visibility: input.visibility,
    total: input.rows.length,
    created: rowResults.filter((row) => row.status === "created").length,
    skipped: rowResults.filter((row) => row.status === "skipped").length,
    failed: rowResults.filter((row) => row.status === "error").length,
    rows: rowResults,
    createdEntityIds,
    sourceRecordId: source.id,
    startedAt,
    finishedAt,
  };

  // Batch audit entry — doubles as the "recent import batches" listing.
  await repo.createEntity("audit_log_entry", {
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: "import.batch.completed",
    entityType: template.entityType,
    entityId: source.id,
    at: finishedAt,
    metadata: {
      batchId,
      kind: input.kind,
      fileName: input.fileName,
      visibility: input.visibility,
      total: report.total,
      created: report.created,
      skipped: report.skipped,
      failed: report.failed,
      createdEntityIds,
      rows: rowResults,
    },
    visibility: "tenant_private",
    isDemo: false,
  });

  return { ok: true, report };
}

// ---------------------------------------------------------------------------
// Duplicate detection for the wizard's review step
// ---------------------------------------------------------------------------

export interface ImportDuplicateHit {
  rowIndex: number;
  candidateId: string;
  candidateName: string;
  score: number;
  matchedOn: string[];
}

/** Score of the duplicate-check step: surface candidates at or above this. */
export const IMPORT_DUPLICATE_THRESHOLD = 0.45;

function domainFromWebsite(website: string | undefined): string | undefined {
  if (!website) return undefined;
  try {
    return new URL(website).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

/**
 * Score import rows against existing organizations/SKUs with
 * `scoreDuplicatePair`. Returns up to 3 candidates per row (best first) at or
 * above IMPORT_DUPLICATE_THRESHOLD. Only organizations and SKUs have a
 * duplicate review step; other kinds return an empty list.
 */
export async function findImportDuplicates(
  repo: NexusRepository,
  kind: ImportKind,
  rows: readonly Record<string, string>[],
): Promise<ImportDuplicateHit[]> {
  if (kind !== "organizations" && kind !== "skus") return [];

  let existing: DuplicateEntityInput[] = [];
  let nameOf = new Map<string, string>();

  if (kind === "organizations") {
    const orgs = (await repo.list("organization", { pageSize: 1000 })).items;
    const aliases = (await repo.list("organization_alias", { pageSize: 1000 })).items;
    const aliasesByOrg = new Map<string, string[]>();
    for (const alias of aliases) {
      const list = aliasesByOrg.get(alias.organizationId) ?? [];
      list.push(alias.alias);
      aliasesByOrg.set(alias.organizationId, list);
    }
    existing = orgs.map((org) => ({
      id: org.id,
      name: org.name,
      aliases: aliasesByOrg.get(org.id) ?? [],
      identifiers: org.identifiers,
      domain: domainFromWebsite(org.website),
    }));
    nameOf = new Map(orgs.map((org) => [org.id, org.name]));
  } else {
    const skus = (await repo.list("sku", { pageSize: 1000 })).items;
    existing = skus.map((sku) => ({
      id: sku.id,
      name: sku.name,
      aliases: sku.alternateNames,
      catalogueNumber: sku.catalogueNumber,
      // OrganizationIdentifier has no "gtin" scheme; "other" keeps exact-value
      // matching working for SKU-vs-SKU comparison.
      identifiers: sku.gtin ? [{ scheme: "other" as const, value: sku.gtin }] : [],
    }));
    nameOf = new Map(skus.map((sku) => [sku.id, sku.name]));
  }

  const hits: ImportDuplicateHit[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const parsed = parseImportRow(kind, rows[rowIndex]);
    if (!parsed.ok) continue; // invalid rows are handled by the validation step
    const dto = parsed.dto;
    const probe: DuplicateEntityInput =
      kind === "organizations"
        ? {
            id: `row:${rowIndex}`,
            name: String(dto.name ?? ""),
            identifiers: (dto.identifiers as DuplicateEntityInput["identifiers"]) ?? [],
            domain: domainFromWebsite(typeof dto.website === "string" ? dto.website : undefined),
          }
        : {
            id: `row:${rowIndex}`,
            name: String(dto.name ?? ""),
            catalogueNumber: typeof dto.catalogueNumber === "string" ? dto.catalogueNumber : undefined,
            identifiers: typeof dto.gtin === "string" ? [{ scheme: "other" as const, value: dto.gtin }] : [],
          };

    const scored = existing
      .map((candidate) => ({ candidate, result: scoreDuplicatePair(probe, candidate) }))
      .filter(({ result }) => result.score >= IMPORT_DUPLICATE_THRESHOLD)
      .sort((a, b) => b.result.score - a.result.score)
      .slice(0, 3);
    for (const { candidate, result } of scored) {
      hits.push({
        rowIndex,
        candidateId: candidate.id,
        candidateName: nameOf.get(candidate.id) ?? candidate.name,
        score: result.score,
        matchedOn: result.matchedOn,
      });
    }
  }
  return hits;
}
