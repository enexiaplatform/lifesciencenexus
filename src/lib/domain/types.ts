/**
 * Life Science Nexus — core domain model.
 *
 * Nexus is an industry & product intelligence graph for life science markets
 * (initial wedge: industrial microbiology, Vietnam). Data lives in four layers:
 *
 *   A. Canonical shared graph  — verified public facts (`visibility: 'canonical'`)
 *   B. Tenant-private overlay  — quoted prices, contacts, installed-base
 *      observations (`visibility: 'tenant_private'`, always tenant-scoped)
 *   C. Derived intelligence    — scores, signals (always recomputed, never hand-edited)
 *   D. Execution references    — links to Atlas / Memoire records
 *
 * Governance rule encoded throughout: the app must never present unsupported
 * data as fact. Every claim-level assertion carries an {@link EvidenceState}
 * and {@link ConfidenceDimensions}; derived values keep pointers to the
 * records they were computed from.
 *
 * Conventions:
 *  - All dates/timestamps are ISO 8601 strings (`YYYY-MM-DD` or full datetime).
 *  - Money is `{ amount, currency }` with ISO 4217 currency codes; engines
 *    never convert currencies without an explicit {@link ExchangeRateSnapshot}.
 *  - Country values are ISO 3166-1 alpha-2 codes (e.g. `'VN'`).
 *  - Enumerations are declared as const arrays with derived union types so the
 *    same values drive zod schemas, tests and UI option lists.
 */

// ---------------------------------------------------------------------------
// Governance primitives
// ---------------------------------------------------------------------------

export const VISIBILITIES = ["canonical", "tenant_private"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const EVIDENCE_STATES = [
  "unverified",
  "source_captured",
  "structurally_validated",
  "analyst_reviewed",
  "domain_expert_reviewed",
  "superseded",
  "disputed",
  "expired",
] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];

/**
 * Multi-dimensional confidence, each dimension 0–1. Kept as dimensions (not a
 * single score) so the UI can show *why* a claim is trusted or weak; use
 * `aggregateConfidence()` from `./confidence` when a single number is needed.
 */
export interface ConfidenceDimensions {
  /** Authority of the source (manufacturer document > distributor quote > conversation). */
  sourceAuthority: number;
  /** How recent the underlying evidence is. */
  sourceRecency: number;
  /** Certainty that the claim is attached to the right entity. */
  entityMatch: number;
  /** Reliability of the extraction/transcription into the system. */
  extraction: number;
  /** Technical equivalence certainty (for product-equivalence claims). */
  technicalEquivalence: number;
  /** How well the evidence geography matches the market of interest. */
  geographicRelevance: number;
  /** How relevant the evidence is to the commercial question at hand. */
  commercialRelevance: number;
}

export interface BaseEntity {
  id: string;
  /** ISO datetime of creation. */
  createdAt: string;
  /** ISO datetime of last update. */
  updatedAt: string;
  /** User id of the creator (`'system'` for seeded/derived records). */
  createdBy: string;
  /** User id of the last updater. */
  updatedBy: string;
  visibility: Visibility;
  /** True for synthetic demo data — the UI must badge it. */
  isDemo: boolean;
  /** Soft-delete timestamp; archived records are excluded from default lists. */
  archivedAt?: string;
}

/** Entity that always belongs to exactly one tenant (layer B / tenant-scoped C). */
export interface TenantEntity extends BaseEntity {
  tenantId: string;
}

// ---------------------------------------------------------------------------
// Entity registry (drives repository generics, signals, research links, …)
// ---------------------------------------------------------------------------

export const ENTITY_TYPES = [
  "source",
  "source_document",
  "claim",
  "evidence_review",
  "data_quality_issue",
  "audit_log_entry",
  "organization",
  "organization_alias",
  "organization_relationship",
  "site",
  "facility_unit",
  "laboratory",
  "production_line",
  "address",
  "geography",
  "person",
  "employment_relationship",
  "organization_contact",
  "brand",
  "product_family",
  "product",
  "sku",
  "pack_configuration",
  "product_format",
  "product_document",
  "application",
  "method",
  "standard",
  "standard_version",
  "organism",
  "sample_type",
  "industry",
  "technology",
  "test_type",
  "incubation_condition",
  "preparation_method",
  "product_edge",
  "supplier_profile",
  "distribution_agreement",
  "supplier_listing",
  "availability_observation",
  "commercial_terms",
  "price_observation",
  "price_component",
  "price_benchmark",
  "tender",
  "tender_lot",
  "tender_item",
  "tender_bidder",
  "tender_award",
  "tender_event",
  "asset_model",
  "installed_asset",
  "asset_lifecycle_event",
  "maintenance_event",
  "qualification_event",
  "consumable_compatibility",
  "consumption_model",
  "replacement_assumption",
  "vendor_approval",
  "product_validation",
  "trial_event",
  "research_project",
  "research_note",
  "research_finding",
  "research_project_entity",
  "saved_view",
  "research_export",
  "cost_per_test_scenario",
  "equivalence_record",
  "opportunity_signal",
  "duplicate_candidate",
  "entity_merge_event",
  "external_entity_reference",
  "outbound_handoff_record",
  "tenant",
  "tenant_membership",
  "profile",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Loose reference to any entity in the graph. */
export interface EntityRef {
  entityType: EntityType;
  entityId: string;
}

// ---------------------------------------------------------------------------
// Sources, claims, evidence
// ---------------------------------------------------------------------------

export const SOURCE_TYPES = [
  "manufacturer_catalogue",
  "manufacturer_website",
  "regulatory_document",
  "standard",
  "tender_document",
  "public_company_document",
  "distributor_quotation",
  "customer_quotation",
  "import_record",
  "customer_conversation",
  "field_observation",
  "internal_note",
  "user_uploaded_document",
  "public_web_source",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** A piece of evidence: a document, page, conversation or observation. */
export interface Source extends BaseEntity {
  type: SourceType;
  title: string;
  publisher?: string;
  url?: string;
  /** ISO date the source itself was published, when known. */
  publishedAt?: string;
  /** ISO datetime the evidence was captured into Nexus. */
  capturedAt: string;
  /** Uploaded file backing this source, when present. */
  documentId?: string;
  notes?: string;
}

export interface SourceDocument extends BaseEntity {
  sourceId?: string;
  fileName: string;
  mimeType: string;
  /** Storage bucket path — never a public URL for tenant-private files. */
  storagePath: string;
  sha256?: string;
  pageCount?: number;
}

/** Primitive claim payloads; structured objects stay shallow and JSON-safe. */
export type ClaimObjectValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | readonly unknown[];

/**
 * Atomic, evidence-backed statement about one entity
 * ("SKU X is distributed by org Y in VN", "product P conforms to ISO 11133").
 * Everything the app presents as fact should trace back to claims.
 */
export interface Claim extends BaseEntity {
  subjectEntityType: EntityType;
  subjectEntityId: string;
  /** Predicate key, e.g. 'distributed_by', 'conforms_to_standard', 'has_price'. */
  predicate: string;
  objectValue: ClaimObjectValue;
  sourceId: string;
  /** Date from which the claim is true in the real world. */
  effectiveDate?: string;
  /** Review-by date; past due the claim shows up in the review queue. */
  reviewByDate?: string;
  confidence: ConfidenceDimensions;
  reviewStatus: EvidenceState;
  reviewerId?: string;
  /** Claims that disagree with this one (both directions should be linked). */
  contradictingClaimIds: string[];
}

export interface EvidenceReview extends BaseEntity {
  claimId: string;
  reviewerId: string;
  fromState: EvidenceState;
  toState: EvidenceState;
  comment?: string;
  reviewedAt: string;
}

export const DATA_QUALITY_ISSUE_KINDS = [
  "missing_field",
  "inconsistent_value",
  "stale_evidence",
  "possible_duplicate",
  "contradicting_claims",
  "normalization_warning",
  "other",
] as const;
export type DataQualityIssueKind = (typeof DATA_QUALITY_ISSUE_KINDS)[number];

export const DATA_QUALITY_SEVERITIES = ["low", "medium", "high"] as const;
export type DataQualitySeverity = (typeof DATA_QUALITY_SEVERITIES)[number];

export interface DataQualityIssue extends BaseEntity {
  kind: DataQualityIssueKind;
  entityType: EntityType;
  entityId: string;
  field?: string;
  description: string;
  severity: DataQualitySeverity;
  status: "open" | "acknowledged" | "resolved" | "wont_fix";
  resolvedBy?: string;
  resolvedAt?: string;
}

/** Append-only audit record; entries are never updated or deleted. */
export interface AuditLogEntry extends BaseEntity {
  tenantId?: string;
  actorId: string;
  /** e.g. 'organization.create', 'claim.review', 'entity.merge' */
  action: string;
  entityType: EntityType;
  entityId: string;
  /** When the audited action happened. */
  at: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Organizations & places
// ---------------------------------------------------------------------------

export const ORGANIZATION_TYPES = [
  "manufacturer",
  "brand_owner",
  "distributor",
  "dealer",
  "importer",
  "service_provider",
  "pharmaceutical_company",
  "food_manufacturer",
  "testing_laboratory",
  "cro",
  "cdmo",
  "government_laboratory",
  "university",
  "hospital",
  "consultant",
] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const IDENTIFIER_SCHEMES = [
  "tax_code",
  "duns",
  "gmp_certificate",
  "iso_certificate",
  "domain",
  "other",
] as const;
export type IdentifierScheme = (typeof IDENTIFIER_SCHEMES)[number];

export interface OrganizationIdentifier {
  scheme: IdentifierScheme;
  value: string;
}

export interface Organization extends BaseEntity {
  name: string;
  /** An organization can play several roles (manufacturer AND distributor). */
  types: OrganizationType[];
  /** ISO 3166-1 alpha-2 country of registration/head office. */
  country: string;
  website?: string;
  identifiers: OrganizationIdentifier[];
}

export const ORGANIZATION_ALIAS_SOURCES = ["merge", "user", "import"] as const;
export type OrganizationAliasSource = (typeof ORGANIZATION_ALIAS_SOURCES)[number];

export interface OrganizationAlias extends BaseEntity {
  organizationId: string;
  alias: string;
  source?: OrganizationAliasSource;
}

export const ORGANIZATION_RELATIONSHIP_TYPES = [
  "owns_brand",
  "manufactures",
  "distributes_for",
  "subsidiary_of",
  "partner_of",
] as const;
export type OrganizationRelationshipType = (typeof ORGANIZATION_RELATIONSHIP_TYPES)[number];

export interface OrganizationRelationship extends BaseEntity {
  fromOrgId: string;
  toOrgId: string;
  type: OrganizationRelationshipType;
  evidence: EdgeEvidence;
}

export const SITE_TYPES = ["factory", "warehouse", "office", "laboratory_site"] as const;
export type SiteType = (typeof SITE_TYPES)[number];

export interface Site extends BaseEntity {
  organizationId: string;
  name: string;
  siteType: SiteType;
  addressId?: string;
}

export interface FacilityUnit extends BaseEntity {
  siteId: string;
  name: string;
  description?: string;
}

export const LABORATORY_TYPES = ["microbiology", "qc", "sterility", "r_and_d", "other"] as const;
export type LaboratoryType = (typeof LABORATORY_TYPES)[number];

export interface Laboratory extends BaseEntity {
  siteId: string;
  name: string;
  labType: LaboratoryType;
}

export interface ProductionLine extends BaseEntity {
  siteId: string;
  name: string;
  /** Free-text description of what the line produces. */
  productDescription?: string;
}

export interface Address extends BaseEntity {
  line1: string;
  line2?: string;
  city: string;
  province?: string;
  district?: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
}

export const GEOGRAPHY_LEVELS = ["country", "region", "province", "city"] as const;
export type GeographyLevel = (typeof GEOGRAPHY_LEVELS)[number];

export interface Geography extends BaseEntity {
  /** Stable code, e.g. 'VN', 'VN-SG' (Ho Chi Minh City), 'APAC'. */
  code: string;
  name: string;
  level: GeographyLevel;
  parentCode?: string;
}

// ---------------------------------------------------------------------------
// People (tenant-private by default)
// ---------------------------------------------------------------------------

export interface Person extends TenantEntity {
  fullName: string;
  title?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface EmploymentRelationship extends TenantEntity {
  personId: string;
  organizationId: string;
  role?: string;
  current: boolean;
  startedAt?: string;
  endedAt?: string;
}

export const DECISION_ROLES = [
  "user",
  "technical_evaluator",
  "qa_approver",
  "procurement",
  "economic_buyer",
  "influencer",
  "blocker",
  "champion",
  "service_owner",
] as const;
export type DecisionRole = (typeof DECISION_ROLES)[number];

export interface OrganizationContact extends TenantEntity {
  personId: string;
  organizationId: string;
  siteId?: string;
  decisionRoles: DecisionRole[];
  isPrimary: boolean;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface Brand extends BaseEntity {
  ownerOrganizationId: string;
  name: string;
}

/** The ten initial category verticals plus an escape hatch. */
export const PRODUCT_CATEGORIES = [
  "dehydrated_culture_media",
  "ready_prepared_media",
  "microbial_reference_materials",
  "sterility_testing_consumables",
  "environmental_monitoring_consumables",
  "biological_indicators",
  "air_samplers",
  "particle_counters",
  "sterility_testing_equipment",
  "microbiology_lab_accessories",
  "other",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface ProductFamily extends BaseEntity {
  brandId: string;
  name: string;
  category: ProductCategory;
}

export const PRODUCT_STATUSES = ["active", "discontinued", "unknown"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface Product extends BaseEntity {
  familyId: string;
  manufacturerOrganizationId: string;
  name: string;
  category: ProductCategory;
  description?: string;
  status: ProductStatus;
  successorProductId?: string;
  predecessorProductId?: string;
}

export interface Sku extends BaseEntity {
  productId: string;
  catalogueNumber?: string;
  manufacturerCode?: string;
  gtin?: string;
  name: string;
  alternateNames: string[];
  formatId?: string;
  shelfLifeMonths?: number;
  /** Free text, e.g. '2–8 °C', 'ambient, dry'. */
  storageCondition?: string;
  /** ISO alpha-2 country codes where the SKU is officially sold. */
  countryAvailability: string[];
  status: ProductStatus;
  successorSkuId?: string;
}

/**
 * One sellable pack size of a SKU, e.g. "500 g bottle" or "20 plates/pack".
 * `quantity`+`unit` describe the content amount; `unitsPerPack` the number of
 * items when sold as a multi-pack. See `normalizePack()` in `./units`.
 */
export interface PackConfiguration extends BaseEntity {
  skuId: string;
  quantity: number;
  unit: string;
  unitsPerPack?: number;
  description?: string;
}

export const PRODUCT_FORMS = [
  "powder",
  "granulated",
  "ready_plate",
  "ready_broth",
  "instrument",
  "consumable",
  "other",
] as const;
export type ProductForm = (typeof PRODUCT_FORMS)[number];

export interface ProductFormat extends BaseEntity {
  name: string;
  form: ProductForm;
}

export const PRODUCT_DOCUMENT_TYPES = [
  "tds",
  "coa",
  "msds",
  "certificate",
  "instruction",
  "other",
] as const;
export type ProductDocumentType = (typeof PRODUCT_DOCUMENT_TYPES)[number];

export interface ProductDocument extends BaseEntity {
  skuId?: string;
  productId?: string;
  docType: ProductDocumentType;
  title: string;
  sourceId: string;
}

// ---------------------------------------------------------------------------
// Scientific / regulatory reference entities
// ---------------------------------------------------------------------------

export interface Application extends BaseEntity {
  name: string;
  description?: string;
  industryCodes?: string[];
}

export interface Method extends BaseEntity {
  name: string;
  description?: string;
  standardIds?: string[];
}

export const STANDARD_BODIES = ["ISO", "USP", "EP", "JP", "AOAC", "TCVN", "other"] as const;
export type StandardBody = (typeof STANDARD_BODIES)[number];

export interface Standard extends BaseEntity {
  body: StandardBody;
  /** e.g. '11133', '71', '11137-1' */
  code: string;
  title: string;
}

export const STANDARD_VERSION_STATUSES = ["current", "superseded", "withdrawn", "unknown"] as const;
export type StandardVersionStatus = (typeof STANDARD_VERSION_STATUSES)[number];

export interface StandardVersion extends BaseEntity {
  standardId: string;
  /** e.g. '2014', '2014/Amd 1:2018' */
  version: string;
  year?: number;
  status: StandardVersionStatus;
}

export const GRAM_REACTIONS = ["positive", "negative", "variable", "unknown"] as const;
export type GramReaction = (typeof GRAM_REACTIONS)[number];

export interface Organism extends BaseEntity {
  genus: string;
  species: string;
  /** Culture-collection strain code, e.g. 'ATCC 25922', 'NCTC 12923'. */
  strainCode?: string;
  gramReaction?: GramReaction;
}

export interface SampleType extends BaseEntity {
  name: string;
  description?: string;
}

export interface Industry extends BaseEntity {
  code: string;
  name: string;
}

export interface Technology extends BaseEntity {
  name: string;
  description?: string;
}

export interface TestType extends BaseEntity {
  name: string;
  description?: string;
}

export interface IncubationCondition extends BaseEntity {
  temperatureCelsius?: number;
  durationHours?: number;
  /** e.g. 'aerobic', 'anaerobic', 'microaerophilic' */
  atmosphere?: string;
  description?: string;
}

export interface PreparationMethod extends BaseEntity {
  name: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Evidence-carrying edges
// ---------------------------------------------------------------------------

export const PRODUCT_EDGE_TARGET_TYPES = [
  "application",
  "method",
  "standard",
  "organism",
  "sample_type",
  "industry",
  "technology",
  "test_type",
  "incubation_condition",
  "preparation_method",
] as const;
export type ProductEdgeTargetType = (typeof PRODUCT_EDGE_TARGET_TYPES)[number];

/**
 * Inline evidence carried by graph edges (lighter than a full Claim, used
 * where the edge itself is the assertion). `confidence` is a single 0–1 score;
 * promote to a Claim when dimensional confidence matters.
 */
export interface EdgeEvidence {
  sourceId?: string;
  /** 0–1. */
  confidence: number;
  validFrom?: string;
  validTo?: string;
  reviewerId?: string;
  notes?: string;
  state: EvidenceState;
}

export interface ProductEdge extends BaseEntity {
  productId: string;
  targetType: ProductEdgeTargetType;
  targetId: string;
  /** Role of the target, e.g. 'intended_use', 'qc_test_strain', 'growth_promotion'. */
  role?: string;
  evidence: EdgeEvidence;
}

// ---------------------------------------------------------------------------
// Suppliers & commercial overlay
// ---------------------------------------------------------------------------

export const SUPPLIER_RELATIONSHIP_TYPES = [
  "authorized_distributor",
  "non_exclusive_distributor",
  "dealer",
  "reseller",
  "importer",
  "service_provider",
  "unknown_unverified",
] as const;
export type SupplierRelationshipType = (typeof SUPPLIER_RELATIONSHIP_TYPES)[number];

export interface SupplierProfile extends BaseEntity {
  organizationId: string;
  relationshipType: SupplierRelationshipType;
  /** Organization ids of the manufacturers this supplier carries. */
  manufacturers: string[];
  /** ISO alpha-2 countries served. */
  countries: string[];
}

export interface DistributionAgreement extends BaseEntity {
  manufacturerOrgId: string;
  distributorOrgId: string;
  relationshipType: SupplierRelationshipType;
  countries: string[];
  validFrom?: string;
  validTo?: string;
  evidence: EdgeEvidence;
}

/** Assertion "supplier S lists/sells SKU X" with its own evidence. */
export interface SupplierListing extends BaseEntity {
  supplierOrgId: string;
  skuId: string;
  relationshipType: SupplierRelationshipType;
  evidence: EdgeEvidence;
}

export const AVAILABILITY_STATUSES = ["in_stock", "limited", "out_of_stock", "unknown"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

/** Point-in-time stock observation at one supplier — immutable once recorded. */
export interface AvailabilityObservation extends BaseEntity {
  supplierOrgId: string;
  skuId: string;
  /** ISO alpha-2. */
  country: string;
  observedAt: string;
  status: AvailabilityStatus;
  leadTimeDays?: number;
}

/** Negotiated commercial terms with a supplier (tenant-private overlay). */
export interface CommercialTerms extends TenantEntity {
  supplierOrgId: string;
  skuId?: string;
  /** Minimum order quantity. */
  moq?: number;
  moqUnit?: string;
  /** e.g. 'Net 30', '50% advance'. */
  paymentTerms?: string;
  /** Incoterms® 2020 code, e.g. 'EXW', 'CIF', 'DAP'. */
  incoterm?: string;
  currency?: string;
  validFrom?: string;
  validTo?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Prices (immutable observations)
// ---------------------------------------------------------------------------

/**
 * One observed price for a SKU at a point in time. Price observations are
 * immutable: corrections create a new observation and mark the old claim
 * `superseded`. Normalized fields are derived by `normalizePrice()` and are
 * `null` whenever normalization was impossible (never silently guessed).
 */
export interface PriceObservation extends BaseEntity {
  skuId: string;
  packConfigurationId?: string;
  supplierOrgId?: string;
  originalAmount: number;
  /** ISO 4217, e.g. 'VND', 'USD'. */
  originalCurrency: string;
  observationDate: string;
  validFrom?: string;
  validTo?: string;
  taxIncluded: boolean;
  /** VAT/GST rate as a fraction (0–1), e.g. 0.1 for 10%. */
  vatRate?: number;
  incoterm?: string;
  /** Geography code or ISO alpha-2 country the price applies to. */
  geography: string;
  customerSegment?: string;
  /** Number of packs the quoted amount covers (usually 1). */
  quantity: number;
  sourceId: string;
  confidence: ConfidenceDimensions;
  evidenceState: EvidenceState;
  normalizedPerUnitAmount?: number | null;
  normalizedPerUnitCurrency?: string | null;
  /** Base unit the normalized amount refers to, e.g. 'g', 'mL', 'plate'. */
  normalizedPerUnit?: string | null;
  normalizedPerTestAmount?: number | null;
  /** True for derived/synthetic observations (e.g. list-price estimates) — never shown as fact. */
  isSynthetic: boolean;
}

export const PRICE_COMPONENT_KINDS = ["freight", "import_duty", "tax", "cold_chain", "other"] as const;
export type PriceComponentKind = (typeof PRICE_COMPONENT_KINDS)[number];

/** Itemized add-on attached to a price observation (keeps the quote auditable). */
export interface PriceComponent extends BaseEntity {
  priceObservationId: string;
  kind: PriceComponentKind;
  amount: number;
  currency: string;
}

/**
 * Explicit FX snapshot. Engines must refuse to convert currencies without one
 * of these — silent conversions produce unverifiable numbers.
 */
export interface ExchangeRateSnapshot {
  fromCurrency: string;
  toCurrency: string;
  /** Multiply an amount in fromCurrency by `rate` to get toCurrency. */
  rate: number;
  /** ISO date the rate applies to. */
  rateDate: string;
  /** Where the rate came from, e.g. 'SBV', 'ECB', manual entry id. */
  source: string;
}

export const PRICE_BENCHMARK_STATISTICS = ["median", "p25", "p75"] as const;
export type PriceBenchmarkStatistic = (typeof PRICE_BENCHMARK_STATISTICS)[number];

/** Derived (layer C) benchmark over a cluster of comparable SKUs. */
export interface PriceBenchmark extends BaseEntity {
  /** Clustering key, e.g. normalized product name + pack size bucket. */
  skuClusterKey: string;
  statistic: PriceBenchmarkStatistic;
  amount: number;
  currency: string;
  /** Price observation ids the statistic was computed from — full lineage. */
  computedFrom: string[];
}

// ---------------------------------------------------------------------------
// Cost-per-test scenarios (input shape consumed by the cost-per-test engine)
// ---------------------------------------------------------------------------

/**
 * Everything needed to compute the attributable cost of one test from a
 * purchasable pack. Amounts are in `currency`; the only permitted currency
 * conversion is through the optional `exchangeRate` snapshot (rate + date +
 * source mandatory), applied uniformly to every component.
 *
 * Per-pack components: purchasePrice, freight, importDutyRate (applied to
 * ex-tax price + freight), coldChain, storage.
 * Per-test components: preparationMaterials, water, labor (minutes × rate),
 * equipmentAllocationPerTest, qcGptPerTest, sterilizationPerTest,
 * disposalPerTest, validationCostAmortized, serviceCostPerTest.
 */
export interface CostPerTestInput {
  purchasePrice: number;
  /** ISO 4217. */
  currency: string;
  /** Content amount per pack, in `packUnit` ('500' of 'g'). */
  packQuantity: number;
  packUnit: string;
  /** Tests obtainable per base unit of pack content (e.g. tests per gram). */
  yieldPerUnit: number;
  freight?: number;
  /** 0–1; applied to (ex-tax purchase price + freight). */
  importDutyRate?: number;
  /** 0–1 VAT/GST rate. */
  vatRate?: number;
  /** True when purchasePrice already includes VAT. */
  taxIncluded: boolean;
  coldChain?: number;
  storage?: number;
  preparationMaterials?: number;
  water?: number;
  laborMinutesPerTest?: number;
  laborRatePerHour?: number;
  equipmentAllocationPerTest?: number;
  /** Growth-promotion-test QC allocation per test. */
  qcGptPerTest?: number;
  sterilizationPerTest?: number;
  /** 0–1 fraction of content lost to waste/spillage. */
  wasteRate?: number;
  /** 0–1 fraction of tests that must be repeated after failure. */
  failureRepeatRate?: number;
  disposalPerTest?: number;
  validationCostAmortized?: number;
  serviceCostPerTest?: number;
  exchangeRate?: ExchangeRateSnapshot;
}

/** A saved, named cost-per-test scenario (tenant-private analysis artifact). */
export interface CostPerTestScenario extends TenantEntity {
  name: string;
  skuId?: string;
  priceObservationId?: string;
  input: CostPerTestInput;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Tenders
// ---------------------------------------------------------------------------

export const TENDER_STATUSES = ["published", "closed", "awarded", "cancelled", "unknown"] as const;
export type TenderStatus = (typeof TENDER_STATUSES)[number];

export interface Tender extends BaseEntity {
  /** Buyer-side tender reference code. */
  code: string;
  title: string;
  buyerOrganizationId: string;
  siteId?: string;
  publicationDate?: string;
  submissionDeadline?: string;
  awardDate?: string;
  /** Awarded contract length; used to anticipate renewals. */
  contractPeriodMonths?: number;
  /** ISO alpha-2. */
  country: string;
  status: TenderStatus;
  sourceId: string;
}

export interface TenderLot extends BaseEntity {
  tenderId: string;
  name: string;
  description?: string;
}

export interface TenderItem extends BaseEntity {
  lotId: string;
  description: string;
  requiredSpecification?: string;
  quantity?: number;
  unit?: string;
  mappedProductId?: string;
  mappedSkuId?: string;
}

export interface TenderBidder extends BaseEntity {
  /** Exactly one of tenderId / lotId must be set (bid scope). */
  tenderId?: string;
  lotId?: string;
  organizationId: string;
  bidAmount?: number;
  currency?: string;
}

export interface TenderAward extends BaseEntity {
  /** Exactly one of lotId / tenderItemId must be set (award scope). */
  lotId?: string;
  tenderItemId?: string;
  awardedSupplierOrgId: string;
  awardedManufacturerOrgId?: string;
  awardedProductId?: string;
  amount: number;
  currency: string;
  awardDate?: string;
  evidence: EdgeEvidence;
}

export const TENDER_EVENT_TYPES = [
  "published",
  "clarification",
  "deadline_extended",
  "closed",
  "awarded",
  "cancelled",
  "other",
] as const;
export type TenderEventType = (typeof TENDER_EVENT_TYPES)[number];

export interface TenderEvent extends BaseEntity {
  tenderId: string;
  type: TenderEventType;
  at: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Installed base (tenant-private overlay)
// ---------------------------------------------------------------------------

export const ASSET_CATEGORIES = [
  "air_sampler",
  "particle_counter",
  "sterility_testing",
  "incubator",
  "autoclave",
  "other",
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export interface AssetModel extends BaseEntity {
  manufacturerOrgId: string;
  brandId?: string;
  model: string;
  category: AssetCategory;
}

export const INSTALLED_ASSET_STATUSES = ["operational", "under_maintenance", "retired", "unknown"] as const;
export type InstalledAssetStatus = (typeof INSTALLED_ASSET_STATUSES)[number];

export const QUALIFICATION_STATUSES = ["iq_oq_pq_complete", "partial", "none", "unknown"] as const;
export type QualificationStatus = (typeof QUALIFICATION_STATUSES)[number];

/** One physical instrument observed at a customer site. */
export interface InstalledAsset extends TenantEntity {
  assetModelId: string;
  siteId: string;
  laboratoryId?: string;
  /** Tenant-private: never synced to the canonical graph. */
  serialNumber?: string;
  installationDate?: string;
  status: InstalledAssetStatus;
  qualificationStatus: QualificationStatus;
  serviceProviderOrgId?: string;
  expectedReplacementDate?: string;
  /** Estimated yearly consumable pull-through, in consumable units. */
  estimatedAnnualConsumption?: number;
  /** 0–1 confidence that this asset record reflects reality (field-observed data). */
  confidence: number;
}

export const ASSET_LIFECYCLE_EVENT_TYPES = [
  "installed",
  "moved",
  "status_change",
  "returned_to_service",
  "retired",
  "other",
] as const;
export type AssetLifecycleEventType = (typeof ASSET_LIFECYCLE_EVENT_TYPES)[number];

export interface AssetLifecycleEvent extends TenantEntity {
  installedAssetId: string;
  type: AssetLifecycleEventType;
  at: string;
  description?: string;
}

export const MAINTENANCE_EVENT_TYPES = ["preventive", "corrective", "calibration", "other"] as const;
export type MaintenanceEventType = (typeof MAINTENANCE_EVENT_TYPES)[number];

export interface MaintenanceEvent extends TenantEntity {
  installedAssetId: string;
  type: MaintenanceEventType;
  at: string;
  providerOrgId?: string;
  description?: string;
  nextDueDate?: string;
}

export const QUALIFICATION_EVENT_KINDS = ["IQ", "OQ", "PQ", "requalification", "other"] as const;
export type QualificationEventKind = (typeof QUALIFICATION_EVENT_KINDS)[number];

export interface QualificationEvent extends TenantEntity {
  installedAssetId: string;
  kind: QualificationEventKind;
  at: string;
  passed?: boolean;
  documentSourceId?: string;
}

/** "Consumable SKU X fits / is used with asset model Y". */
export interface ConsumableCompatibility extends BaseEntity {
  assetModelId: string;
  skuId: string;
  evidence: EdgeEvidence;
}

/** Estimated recurring consumable usage for one asset or asset model. */
export interface ConsumptionModel extends TenantEntity {
  /** Set for asset-specific models. */
  installedAssetId?: string;
  /** Set for model-level estimates. */
  assetModelId?: string;
  skuId: string;
  estimatedAnnualQuantity: number;
  /** How the estimate was derived (e.g. '3 tests/week × 52'). */
  basis?: string;
  /** 0–1. */
  confidence: number;
}

/** Rule-of-thumb replacement cycles used to forecast replacement signals. */
export interface ReplacementAssumption extends TenantEntity {
  assetCategory: AssetCategory;
  typicalLifetimeYears: number;
  geographyCode?: string;
  basis?: string;
}

// ---------------------------------------------------------------------------
// Validation / vendor status (tenant-private)
// ---------------------------------------------------------------------------

export const VENDOR_APPROVAL_STATUSES = ["approved", "pending", "rejected", "expired"] as const;
export type VendorApprovalStatus = (typeof VENDOR_APPROVAL_STATUSES)[number];

/** Customer's approved-vendor-list entry for one supplier. */
export interface VendorApproval extends TenantEntity {
  /** The customer organization holding the AVL. */
  organizationId: string;
  supplierOrgId: string;
  status: VendorApprovalStatus;
  validTo?: string;
  evidence: EdgeEvidence;
}

export const PRODUCT_VALIDATION_STATUSES = [
  "not_started",
  "planned",
  "in_progress",
  "passed",
  "failed",
] as const;
export type ProductValidationStatus = (typeof PRODUCT_VALIDATION_STATUSES)[number];

/** A customer's validation of one SKU for use in their processes. */
export interface ProductValidation extends TenantEntity {
  organizationId: string;
  skuId: string;
  status: ProductValidationStatus;
  /** Validation method/protocol reference. */
  method?: string;
  completedAt?: string;
}

export const TRIAL_EVENT_TYPES = [
  "sample_sent",
  "trial_started",
  "trial_completed",
  "feedback_received",
  "other",
] as const;
export type TrialEventType = (typeof TRIAL_EVENT_TYPES)[number];

export interface TrialEvent extends TenantEntity {
  organizationId: string;
  skuId?: string;
  productValidationId?: string;
  type: TrialEventType;
  at: string;
  outcome?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Research workspace
// ---------------------------------------------------------------------------

export const RESEARCH_PROJECT_STATUSES = ["active", "completed", "archived"] as const;
export type ResearchProjectStatus = (typeof RESEARCH_PROJECT_STATUSES)[number];

export interface ResearchProject extends TenantEntity {
  title: string;
  /** The question the project sets out to answer. */
  question: string;
  scope?: string;
  geographyCodes: string[];
  industryCodes: string[];
  status: ResearchProjectStatus;
}

export interface ResearchNote extends TenantEntity {
  projectId: string;
  text: string;
  entityType?: EntityType;
  entityId?: string;
}

export const RESEARCH_FINDING_KINDS = [
  "verified_fact",
  "analyst_interpretation",
  "assumption",
  "unknown",
  "recommendation",
] as const;
export type ResearchFindingKind = (typeof RESEARCH_FINDING_KINDS)[number];

/**
 * Research output with an explicit epistemic kind — `verified_fact` findings
 * must list supporting claims in `evidenceClaimIds`; `unknown` findings make
 * knowledge gaps explicit instead of hiding them.
 */
export interface ResearchFinding extends TenantEntity {
  projectId: string;
  kind: ResearchFindingKind;
  text: string;
  evidenceClaimIds: string[];
}

export interface ResearchProjectEntity extends TenantEntity {
  projectId: string;
  entityType: EntityType;
  entityId: string;
}

/** Persisted list-view configuration (filters/sort/columns). */
export interface SavedView extends TenantEntity {
  name: string;
  entityType: EntityType;
  /** Serialized view parameters (filters, sort, visible columns). */
  params: Record<string, unknown>;
  ownerId: string;
}

export const RESEARCH_EXPORT_FORMATS = ["pdf", "csv", "xlsx", "json", "web_report"] as const;
export type ResearchExportFormat = (typeof RESEARCH_EXPORT_FORMATS)[number];

export interface ResearchExport extends TenantEntity {
  projectId?: string;
  format: ResearchExportFormat;
  fileName?: string;
  storagePath?: string;
}

// ---------------------------------------------------------------------------
// Derived intelligence (layer C)
// ---------------------------------------------------------------------------

export const EQUIVALENCE_CLASSIFICATIONS = [
  "exact_equivalent",
  "functional_equivalent",
  "closest_alternative",
  "not_recommended_substitute",
] as const;
export type EquivalenceClassification = (typeof EQUIVALENCE_CLASSIFICATIONS)[number];

export const EQUIVALENCE_DIMENSIONS = [
  "formula_composition",
  "intended_use_application",
  "method_standard_compatibility",
  "organism_performance",
  "preparation_conditions",
  "regulatory_documents",
  "format_pack",
  "local_availability",
] as const;
export type EquivalenceDimension = (typeof EQUIVALENCE_DIMENSIONS)[number];

/** Per-dimension score; `score: null` means UNKNOWN — never silently zero. */
export interface DimensionScore {
  /** 0–100, or null when there is no evidence to score this dimension. */
  score: number | null;
  /** Relative weight (the engine validates the total across dimensions). */
  weight: number;
  note?: string;
}

export const EQUIVALENCE_DIFFERENCE_SEVERITIES = ["minor", "moderate", "major"] as const;
export type EquivalenceDifferenceSeverity = (typeof EQUIVALENCE_DIFFERENCE_SEVERITIES)[number];

export interface EquivalenceDifference {
  dimension: EquivalenceDimension;
  description: string;
  severity?: EquivalenceDifferenceSeverity;
}

/**
 * Assessed equivalence between two SKUs. Decision support only — see
 * `EQUIVALENCE_DISCLAIMER` in `./equivalence`; never a regulatory approval.
 */
export interface EquivalenceRecord extends BaseEntity {
  sourceSkuId: string;
  candidateSkuId: string;
  classification: EquivalenceClassification;
  /** 0–100, computed over known dimensions only (see equivalence engine). */
  overallScore: number;
  dimensionScores: Record<EquivalenceDimension, DimensionScore>;
  rationale: string;
  differences: EquivalenceDifference[];
  validationConsiderations: string[];
  evidenceClaimIds: string[];
  reviewerId?: string;
  reviewState: EvidenceState;
  lastReviewedAt?: string;
}

export const COMPARISON_VERDICTS = ["met", "partially_met", "not_met", "unknown"] as const;
export type ComparisonVerdict = (typeof COMPARISON_VERDICTS)[number];

/** One cell of a spec-vs-spec comparison matrix. */
export interface ComparisonCell {
  verdict: ComparisonVerdict;
  valueText?: string;
  evidenceClaimId?: string;
}

// -- Opportunity signals ----------------------------------------------------

export const SIGNAL_TYPES = [
  "equipment_replacement_due",
  "consumable_pullthrough",
  "tender_renewal_expected",
  "supplier_agreement_expired",
  "price_stale",
  "competitor_product_discontinued",
  "new_factory_or_lab",
  "facility_expansion",
  "new_production_line",
  "regulatory_change",
  "missing_local_supplier",
  "portfolio_whitespace",
  "cross_sell_gap",
  "vendor_approval_gap",
  "validation_pending",
  "repeated_stock_issue",
  "unusual_price_increase",
  "asset_without_consumables",
  "incomplete_product_coverage",
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SIGNAL_COMMERCIAL_RELEVANCES = ["low", "medium", "high"] as const;
export type SignalCommercialRelevance = (typeof SIGNAL_COMMERCIAL_RELEVANCES)[number];

export const SIGNAL_STATUSES = ["new", "acknowledged", "sent_to_memoire", "dismissed"] as const;
export type SignalStatus = (typeof SIGNAL_STATUSES)[number];

/**
 * Derived, explainable commercial signal. Always carries the records that
 * triggered it (`triggeringRecordIds`) and a human-readable `reason` — a
 * signal that cannot explain itself must not be shown.
 */
export interface OpportunitySignal extends TenantEntity {
  type: SignalType;
  relatedEntities: EntityRef[];
  triggeringRecordIds: string[];
  reason: string;
  /** 0–1. */
  confidence: number;
  commercialRelevance: SignalCommercialRelevance;
  generatedAt: string;
  expiresAt?: string;
  recommendedAction: string;
  status: SignalStatus;
}

// ---------------------------------------------------------------------------
// Entity resolution
// ---------------------------------------------------------------------------

export const DUPLICATE_CANDIDATE_STATUSES = ["pending", "merged", "dismissed"] as const;
export type DuplicateCandidateStatus = (typeof DUPLICATE_CANDIDATE_STATUSES)[number];

export interface DuplicateCandidate extends BaseEntity {
  entityType: EntityType;
  leftId: string;
  rightId: string;
  /** 0–1 similarity score from the entity-resolution engine. */
  score: number;
  /** Human-readable explanations, e.g. 'name token overlap 0.80'. */
  matchedOn: string[];
  status: DuplicateCandidateStatus;
}

export const MERGE_FIELD_CHOICES = ["left", "right", "custom"] as const;
export type MergeFieldChoice = (typeof MERGE_FIELD_CHOICES)[number];

export interface MergeFieldResolution {
  chosen: MergeFieldChoice;
  value: unknown;
}

/**
 * Record of a completed merge. Merges are never silent: the loser's names are
 * preserved as aliases on the survivor and a redirect is kept so old links
 * keep working.
 */
export interface EntityMergeEvent extends BaseEntity {
  entityType: EntityType;
  survivorId: string;
  mergedId: string;
  fieldResolutions: Record<string, MergeFieldResolution>;
  aliasPreservation: boolean;
  redirectCreated: boolean;
}

// ---------------------------------------------------------------------------
// Integration references (layer D)
// ---------------------------------------------------------------------------

export const EXTERNAL_SYSTEMS = ["life_science_atlas", "memoire"] as const;
export type ExternalSystem = (typeof EXTERNAL_SYSTEMS)[number];

/** Link between a Nexus entity and its counterpart in Atlas or Memoire. */
export interface ExternalEntityReference extends BaseEntity {
  nexusEntityType: EntityType;
  nexusEntityId: string;
  system: ExternalSystem;
  externalId: string;
  externalUrl?: string;
  syncedAt?: string;
}

export const HANDOFF_STATUSES = ["prepared", "copied", "downloaded", "sent", "acknowledged"] as const;
export type HandoffStatus = (typeof HANDOFF_STATUSES)[number];

/** Audit record of a handoff payload prepared for Memoire. */
export interface OutboundHandoffRecord extends TenantEntity {
  targetSystem: "memoire";
  /** The exact payload that was handed off (contract: nexus-handoff/v1). */
  payload: Record<string, unknown>;
  sentAt?: string;
  status: HandoffStatus;
}

// ---------------------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------------------

export interface Tenant extends BaseEntity {
  name: string;
  slug: string;
}

export const ROLES = ["owner", "admin", "analyst", "contributor", "reviewer", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export interface TenantMembership extends BaseEntity {
  tenantId: string;
  userId: string;
  role: Role;
}

export interface Profile extends BaseEntity {
  userId: string;
  fullName: string;
  email?: string;
  defaultTenantId?: string;
}

// ---------------------------------------------------------------------------
// Entity type map (repository generics)
// ---------------------------------------------------------------------------

export interface EntityTypeMap {
  source: Source;
  source_document: SourceDocument;
  claim: Claim;
  evidence_review: EvidenceReview;
  data_quality_issue: DataQualityIssue;
  audit_log_entry: AuditLogEntry;
  organization: Organization;
  organization_alias: OrganizationAlias;
  organization_relationship: OrganizationRelationship;
  site: Site;
  facility_unit: FacilityUnit;
  laboratory: Laboratory;
  production_line: ProductionLine;
  address: Address;
  geography: Geography;
  person: Person;
  employment_relationship: EmploymentRelationship;
  organization_contact: OrganizationContact;
  brand: Brand;
  product_family: ProductFamily;
  product: Product;
  sku: Sku;
  pack_configuration: PackConfiguration;
  product_format: ProductFormat;
  product_document: ProductDocument;
  application: Application;
  method: Method;
  standard: Standard;
  standard_version: StandardVersion;
  organism: Organism;
  sample_type: SampleType;
  industry: Industry;
  technology: Technology;
  test_type: TestType;
  incubation_condition: IncubationCondition;
  preparation_method: PreparationMethod;
  product_edge: ProductEdge;
  supplier_profile: SupplierProfile;
  distribution_agreement: DistributionAgreement;
  supplier_listing: SupplierListing;
  availability_observation: AvailabilityObservation;
  commercial_terms: CommercialTerms;
  price_observation: PriceObservation;
  price_component: PriceComponent;
  price_benchmark: PriceBenchmark;
  tender: Tender;
  tender_lot: TenderLot;
  tender_item: TenderItem;
  tender_bidder: TenderBidder;
  tender_award: TenderAward;
  tender_event: TenderEvent;
  asset_model: AssetModel;
  installed_asset: InstalledAsset;
  asset_lifecycle_event: AssetLifecycleEvent;
  maintenance_event: MaintenanceEvent;
  qualification_event: QualificationEvent;
  consumable_compatibility: ConsumableCompatibility;
  consumption_model: ConsumptionModel;
  replacement_assumption: ReplacementAssumption;
  vendor_approval: VendorApproval;
  product_validation: ProductValidation;
  trial_event: TrialEvent;
  research_project: ResearchProject;
  research_note: ResearchNote;
  research_finding: ResearchFinding;
  research_project_entity: ResearchProjectEntity;
  saved_view: SavedView;
  research_export: ResearchExport;
  cost_per_test_scenario: CostPerTestScenario;
  equivalence_record: EquivalenceRecord;
  opportunity_signal: OpportunitySignal;
  duplicate_candidate: DuplicateCandidate;
  entity_merge_event: EntityMergeEvent;
  external_entity_reference: ExternalEntityReference;
  outbound_handoff_record: OutboundHandoffRecord;
  tenant: Tenant;
  tenant_membership: TenantMembership;
  profile: Profile;
}

/** Union of every storable entity. */
export type NexusEntity = EntityTypeMap[EntityType];

/**
 * Entity types whose records are always tenant-scoped (TenantEntity, plus
 * tenant_membership which carries a tenantId on a BaseEntity). Repositories
 * default these to `visibility: 'tenant_private'`; everything else defaults
 * to `'canonical'`.
 */
export const TENANT_SCOPED_ENTITY_TYPES: ReadonlySet<EntityType> = new Set<EntityType>([
  "person",
  "employment_relationship",
  "organization_contact",
  "commercial_terms",
  "installed_asset",
  "asset_lifecycle_event",
  "maintenance_event",
  "qualification_event",
  "consumption_model",
  "replacement_assumption",
  "vendor_approval",
  "product_validation",
  "trial_event",
  "research_project",
  "research_note",
  "research_finding",
  "research_project_entity",
  "saved_view",
  "research_export",
  "cost_per_test_scenario",
  "opportunity_signal",
  "outbound_handoff_record",
  "tenant_membership",
]);

/** Audit fields the repository fills in on create; callers never pass them. */
export type EntityAuditKeys = "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "archivedAt";

/** Input for creating an entity of type K (audit fields assigned by the repository). */
export type CreateEntityInput<K extends EntityType> = Omit<EntityTypeMap[K], EntityAuditKeys>;

/** Input for updating an entity of type K (audit fields managed by the repository). */
export type UpdateEntityInput<K extends EntityType> = Partial<CreateEntityInput<K>>;
