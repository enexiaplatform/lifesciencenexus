import type {
  AssetCategory,
  AvailabilityStatus,
  DecisionRole,
  EvidenceState,
  IdentifierScheme,
  InstalledAssetStatus,
  LaboratoryType,
  OrganizationRelationshipType,
  OrganizationType,
  ProductCategory,
  ProductStatus,
  QualificationStatus,
  SiteType,
  SourceType,
  SupplierRelationshipType,
  TenderEventType,
  TenderStatus,
  Visibility,
} from "@/lib/domain/types";

/**
 * Display labels and formatting helpers for the Market module.
 *
 * Deterministic by construction: dates render as ISO substrings and numbers
 * through Intl with a fixed locale, so server and client markup never drift.
 */

// ---------------------------------------------------------------------------
// Controlled-vocabulary labels
// ---------------------------------------------------------------------------

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  manufacturer: "Manufacturer",
  brand_owner: "Brand owner",
  distributor: "Distributor",
  dealer: "Dealer",
  importer: "Importer",
  service_provider: "Service provider",
  pharmaceutical_company: "Pharmaceutical company",
  food_manufacturer: "Food manufacturer",
  testing_laboratory: "Testing laboratory",
  cro: "CRO",
  cdmo: "CDMO",
  government_laboratory: "Government laboratory",
  university: "University",
  hospital: "Hospital",
  consultant: "Consultant",
};

export const ORGANIZATION_RELATIONSHIP_LABELS: Record<OrganizationRelationshipType, string> = {
  owns_brand: "Owns brand",
  manufactures: "Manufactures",
  distributes_for: "Distributes for",
  subsidiary_of: "Subsidiary of",
  partner_of: "Partner of",
};

export const SUPPLIER_RELATIONSHIP_LABELS: Record<SupplierRelationshipType, string> = {
  authorized_distributor: "Authorized distributor",
  non_exclusive_distributor: "Non-exclusive distributor",
  dealer: "Dealer",
  reseller: "Reseller",
  importer: "Importer",
  service_provider: "Service provider",
  unknown_unverified: "Unverified relationship",
};

export const IDENTIFIER_SCHEME_LABELS: Record<IdentifierScheme, string> = {
  tax_code: "Tax code",
  duns: "D-U-N-S",
  gmp_certificate: "GMP certificate",
  iso_certificate: "ISO certificate",
  domain: "Domain",
  other: "Other",
};

export const SITE_TYPE_LABELS: Record<SiteType, string> = {
  factory: "Factory",
  warehouse: "Warehouse",
  office: "Office",
  laboratory_site: "Laboratory site",
};

export const LABORATORY_TYPE_LABELS: Record<LaboratoryType, string> = {
  microbiology: "Microbiology",
  qc: "QC",
  sterility: "Sterility",
  r_and_d: "R&D",
  other: "Other",
};

export const DECISION_ROLE_LABELS: Record<DecisionRole, string> = {
  user: "User",
  technical_evaluator: "Technical evaluator",
  qa_approver: "QA approver",
  procurement: "Procurement",
  economic_buyer: "Economic buyer",
  influencer: "Influencer",
  blocker: "Blocker",
  champion: "Champion",
  service_owner: "Service owner",
};

export const TENDER_STATUS_LABELS: Record<TenderStatus, string> = {
  published: "Open",
  closed: "Closed",
  awarded: "Awarded",
  cancelled: "Cancelled",
  unknown: "Unknown",
};

export const TENDER_EVENT_TYPE_LABELS: Record<TenderEventType, string> = {
  published: "Published",
  clarification: "Clarification",
  deadline_extended: "Deadline extended",
  closed: "Closed",
  awarded: "Awarded",
  cancelled: "Cancelled",
  other: "Other",
};

export const AVAILABILITY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  in_stock: "In stock",
  limited: "Limited",
  out_of_stock: "Out of stock",
  unknown: "Unknown",
};

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  air_sampler: "Air sampler",
  particle_counter: "Particle counter",
  sterility_testing: "Sterility testing",
  incubator: "Incubator",
  autoclave: "Autoclave",
  other: "Other",
};

export const ASSET_STATUS_LABELS: Record<InstalledAssetStatus, string> = {
  operational: "Operational",
  under_maintenance: "Under maintenance",
  retired: "Retired",
  unknown: "Unknown",
};

export const QUALIFICATION_STATUS_LABELS: Record<QualificationStatus, string> = {
  iq_oq_pq_complete: "IQ/OQ/PQ complete",
  partial: "Partial",
  none: "None",
  unknown: "Unknown",
};

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  dehydrated_culture_media: "Dehydrated culture media",
  ready_prepared_media: "Ready-prepared media",
  microbial_reference_materials: "Microbial reference materials",
  sterility_testing_consumables: "Sterility testing consumables",
  environmental_monitoring_consumables: "Environmental monitoring consumables",
  biological_indicators: "Biological indicators",
  air_samplers: "Air samplers",
  particle_counters: "Particle counters",
  sterility_testing_equipment: "Sterility testing equipment",
  microbiology_lab_accessories: "Microbiology lab accessories",
  other: "Other",
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: "Active",
  discontinued: "Discontinued",
  unknown: "Unknown",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  manufacturer_catalogue: "Manufacturer catalogue",
  manufacturer_website: "Manufacturer website",
  regulatory_document: "Regulatory document",
  standard: "Standard",
  tender_document: "Tender document",
  public_company_document: "Public company document",
  distributor_quotation: "Distributor quotation",
  customer_quotation: "Customer quotation",
  import_record: "Import record",
  customer_conversation: "Customer conversation",
  field_observation: "Field observation",
  internal_note: "Internal note",
  user_uploaded_document: "Uploaded document",
  public_web_source: "Public web source",
};

export const EVIDENCE_STATE_LABELS: Record<EvidenceState, string> = {
  unverified: "Unverified",
  source_captured: "Source captured",
  structurally_validated: "Structurally validated",
  analyst_reviewed: "Analyst reviewed",
  domain_expert_reviewed: "Expert reviewed",
  superseded: "Superseded",
  disputed: "Disputed",
  expired: "Expired",
};

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  canonical: "Canonical",
  tenant_private: "Tenant private",
};

/** Fallback for any unmapped enum-ish key: snake_case → words. */
export function humanize(key: string): string {
  return key.replace(/_/g, " ");
}

// ---------------------------------------------------------------------------
// Value formatting
// ---------------------------------------------------------------------------

const regionNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

/** ISO alpha-2 → English region name, falling back to the raw code. */
export function countryName(code: string): string {
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Deterministic date display: 'YYYY-MM-DD' (time part dropped). */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

/** Deterministic datetime display: 'YYYY-MM-DD HH:MM UTC'. */
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  if (iso.length <= 10) return iso;
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** Money as '1,850,000,000 VND' — fixed locale, code suffix, no FX guesses. */
export function formatMoney(amount: number | undefined | null, currency: string | undefined | null): string {
  if (amount === undefined || amount === null) return "—";
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
  return currency ? `${formatted} ${currency}` : formatted;
}

/** 0–1 confidence as a percentage string. */
export function formatConfidence(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return `${Math.round(value * 100)}%`;
}
