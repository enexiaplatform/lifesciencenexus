import type {
  ConsumableCompatibility,
  CreateEntityInput,
  DuplicateCandidate,
  EntityMergeEvent,
  EntityType,
  EntityTypeMap,
  InstalledAsset,
  AssetLifecycleEvent,
  AssetModel,
  Brand,
  Laboratory,
  MaintenanceEvent,
  OpportunitySignal,
  Organization,
  OrganizationAlias,
  OrganizationContact,
  OrganizationRelationship,
  PackConfiguration,
  Person,
  PriceObservation,
  Product,
  ProductDocument,
  ProductEdge,
  ProductFamily,
  ProductFormat,
  QualificationEvent,
  ResearchExport,
  ResearchFinding,
  ResearchNote,
  ResearchProject,
  ResearchProjectEntity,
  Site,
  Sku,
  SupplierListing,
  SupplierProfile,
  Tender,
  TenderAward,
  TenderBidder,
  TenderEvent,
  TenderItem,
  TenderLot,
  UpdateEntityInput,
  Visibility,
} from "@/lib/domain/types";

/**
 * Repository seam — the single interface UI code talks to.
 *
 * This module defines the contract ONLY; there is deliberately no
 * implementation here. `src/lib/data/index.ts` lazily resolves the active
 * backend (`demo` in-memory by default, `supabase` when configured) so UI
 * agents code against one ergonomic surface regardless of backend.
 */

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type ListFilterValue = string | number | boolean | Array<string | number | boolean>;

export interface ListSort {
  field: string;
  direction: "asc" | "desc";
}

export interface ListParams {
  /** Free-text filter over the entity's display fields. */
  query?: string;
  /** Equality filters on top-level fields; arrays mean OR. */
  filters?: Record<string, ListFilterValue>;
  sort?: ListSort;
  page: number;
  pageSize: number;
  /** Archived (soft-deleted) records are excluded unless true. */
  includeArchived?: boolean;
}

export const DEFAULT_LIST_PARAMS: ListParams = { page: 1, pageSize: 25 };

export interface SearchOptions {
  /** Restrict to these entity types. Default: all searchable types. */
  types?: EntityType[];
  limit?: number;
  minScore?: number;
}

export interface SearchResult {
  entityType: EntityType;
  id: string;
  title: string;
  subtitle?: string;
  score: number;
  matchReasons: string[];
  visibility: Visibility;
  isDemo: boolean;
}

// ---------------------------------------------------------------------------
// Detail aggregates (everything a detail screen needs in one round trip)
// ---------------------------------------------------------------------------

export interface OrganizationDetail {
  organization: Organization;
  aliases: OrganizationAlias[];
  sites: Site[];
  laboratories: Laboratory[];
  supplierProfile: SupplierProfile | null;
  contacts: Array<OrganizationContact & { person: Person | null }>;
  relationships: OrganizationRelationship[];
}

export interface ProductDetail {
  product: Product;
  family: ProductFamily | null;
  brand: Brand | null;
  manufacturer: Organization | null;
  skus: Sku[];
  edges: ProductEdge[];
  documents: ProductDocument[];
}

export interface SkuDetail {
  sku: Sku;
  product: Product | null;
  family: ProductFamily | null;
  brand: Brand | null;
  manufacturer: Organization | null;
  format: ProductFormat | null;
  packConfigurations: PackConfiguration[];
  edges: ProductEdge[];
  listings: SupplierListing[];
  prices: PriceObservation[];
  documents: ProductDocument[];
}

export interface TenderDetail {
  tender: Tender;
  buyer: Organization | null;
  lots: TenderLot[];
  items: TenderItem[];
  bidders: TenderBidder[];
  awards: TenderAward[];
  events: TenderEvent[];
}

export interface AssetDetail {
  asset: InstalledAsset;
  model: AssetModel | null;
  site: Site | null;
  laboratory: Laboratory | null;
  lifecycleEvents: AssetLifecycleEvent[];
  maintenanceEvents: MaintenanceEvent[];
  qualificationEvents: QualificationEvent[];
  compatibleConsumables: Array<ConsumableCompatibility & { sku: Sku | null }>;
}

export interface ResearchProjectDetail {
  project: ResearchProject;
  notes: ResearchNote[];
  findings: ResearchFinding[];
  entities: ResearchProjectEntity[];
  exports: ResearchExport[];
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardFreshnessStats {
  /** Price observations older than the staleness threshold (180 days). */
  stalePrices: number;
  /** Claims whose review-by date has passed. */
  reviewDueClaims: number;
  /** Distribution agreements expiring within 90 days. */
  expiringAgreements: number;
}

export interface DashboardSummary {
  /** Non-archived entity counts per type (types with zero records omitted). */
  counts: Partial<Record<EntityType, number>>;
  /** Claims awaiting analyst review (unverified / source_captured / structurally_validated). */
  reviewQueueSize: number;
  freshness: DashboardFreshnessStats;
  /** New signals with high commercial relevance (most recent first, max 5). */
  highValueSignals: OpportunitySignal[];
  /** Pending duplicate candidates awaiting triage. */
  possibleDuplicates: number;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface MergeEntitiesInput {
  entityType: EntityType;
  survivorId: string;
  mergedId: string;
  /** Per-field side overrides; default is the survivor's value. */
  fieldChoices?: Record<string, "left" | "right">;
}

// ---------------------------------------------------------------------------
// The repository contract
// ---------------------------------------------------------------------------

export interface NexusRepository {
  // -- Generic reads (one list/getById per entity family, typed via EntityTypeMap) --
  list<K extends EntityType>(type: K, params?: Partial<ListParams>): Promise<Paged<EntityTypeMap[K]>>;
  getById<K extends EntityType>(type: K, id: string): Promise<EntityTypeMap[K] | null>;

  /** Federated search across name-bearing entities, ranked and explained. */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  // -- Detail aggregates --
  getOrganizationDetail(id: string): Promise<OrganizationDetail | null>;
  getProductDetail(id: string): Promise<ProductDetail | null>;
  getSkuDetail(id: string): Promise<SkuDetail | null>;
  getTenderDetail(id: string): Promise<TenderDetail | null>;
  getAssetDetail(id: string): Promise<AssetDetail | null>;
  getResearchProjectDetail(id: string): Promise<ResearchProjectDetail | null>;

  dashboardSummary(): Promise<DashboardSummary>;

  // -- Writes --
  createEntity<K extends EntityType>(type: K, data: CreateEntityInput<K>): Promise<EntityTypeMap[K]>;
  updateEntity<K extends EntityType>(
    type: K,
    id: string,
    patch: UpdateEntityInput<K>,
  ): Promise<EntityTypeMap[K]>;
  /** Soft-delete: sets archivedAt; the record stays retrievable via getById. */
  archiveEntity<K extends EntityType>(type: K, id: string): Promise<EntityTypeMap[K]>;

  // -- Entity resolution queue --
  listDuplicateCandidates(params?: Partial<ListParams>): Promise<Paged<DuplicateCandidate>>;
  dismissDuplicateCandidate(id: string): Promise<DuplicateCandidate>;
  mergeEntities(input: MergeEntitiesInput): Promise<EntityMergeEvent>;

  // -- Opportunity signals --
  listSignals(params?: Partial<ListParams>): Promise<Paged<OpportunitySignal>>;
  acknowledgeSignal(id: string): Promise<OpportunitySignal>;
  dismissSignal(id: string): Promise<OpportunitySignal>;
}
