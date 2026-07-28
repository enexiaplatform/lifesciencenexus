import type { EntityType, NexusEntity } from "@/lib/domain/types";

/**
 * Shared routing + display helpers for search results and cross-module entity
 * links. Kept client-safe (no server-only imports) so both server pages and
 * client components can resolve an entity to its canonical route.
 */

const EXPLICIT_LABELS: Partial<Record<EntityType, string>> = {
  source: "Source",
  source_document: "Source document",
  claim: "Claim",
  evidence_review: "Evidence review",
  data_quality_issue: "Data quality issue",
  organization: "Organization",
  organization_alias: "Organization alias",
  site: "Site",
  laboratory: "Laboratory",
  person: "Person",
  brand: "Brand",
  product_family: "Product family",
  product: "Product",
  sku: "SKU",
  product_format: "Product format",
  application: "Application",
  method: "Method",
  standard: "Standard",
  standard_version: "Standard version",
  organism: "Organism",
  sample_type: "Sample type",
  industry: "Industry",
  supplier_profile: "Supplier",
  distribution_agreement: "Distribution agreement",
  supplier_listing: "Supplier listing",
  price_observation: "Price observation",
  tender: "Tender",
  asset_model: "Asset model",
  installed_asset: "Installed asset",
  research_project: "Research project",
  research_note: "Research note",
  research_finding: "Research finding",
  research_project_entity: "Research entity link",
  research_export: "Research export",
  equivalence_record: "Equivalence record",
  opportunity_signal: "Opportunity signal",
  duplicate_candidate: "Duplicate candidate",
};

/** snake_case → "Snake case" fallback for types without an explicit label. */
export function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function entityTypeLabel(type: EntityType): string {
  return EXPLICIT_LABELS[type] ?? humanize(type);
}

/** Federated-search type facets, in the order they render as chips. */
export const SEARCH_FACETS: ReadonlyArray<{ type: EntityType; label: string }> = [
  { type: "organization", label: "Organizations" },
  { type: "site", label: "Sites" },
  { type: "laboratory", label: "Laboratories" },
  { type: "person", label: "People" },
  { type: "brand", label: "Brands" },
  { type: "product", label: "Products" },
  { type: "sku", label: "SKUs" },
  { type: "application", label: "Applications" },
  { type: "method", label: "Methods" },
  { type: "standard", label: "Standards" },
  { type: "organism", label: "Organisms" },
  { type: "supplier_profile", label: "Suppliers" },
  { type: "tender", label: "Tenders" },
  { type: "installed_asset", label: "Installed assets" },
  { type: "source", label: "Sources" },
  { type: "research_project", label: "Research" },
];

/** Canonical route for an entity; falls back to the most relevant list page. */
export function entityHref(type: EntityType, id: string): string {
  switch (type) {
    case "organization":
      return `/organizations/${id}`;
    case "site":
      return `/sites/${id}`;
    case "laboratory":
      return `/laboratories/${id}`;
    case "person":
      return `/people/${id}`;
    case "product":
      return `/products/${id}`;
    case "product_family":
      return "/products";
    case "sku":
      return `/skus/${id}`;
    case "tender":
      return `/tenders/${id}`;
    case "installed_asset":
      return `/installed-base/${id}`;
    case "asset_model":
      return "/installed-base";
    case "research_project":
      return `/research/${id}`;
    case "source":
    case "source_document":
      return "/sources";
    case "claim":
    case "evidence_review":
      return "/evidence";
    case "supplier_profile":
    case "supplier_listing":
    case "distribution_agreement":
      return "/suppliers";
    case "brand":
      return "/brands";
    case "application":
      return "/applications";
    case "method":
      return "/methods";
    case "standard":
    case "standard_version":
      return "/standards";
    case "organism":
      return "/organisms";
    case "price_observation":
      return "/prices";
    case "equivalence_record":
      return "/equivalence";
    case "opportunity_signal":
      return "/signals";
    case "duplicate_candidate":
      return "/admin/entity-resolution";
    default:
      return "/search";
  }
}

/** Best-effort display name for any entity (used in lists and dashboards). */
export function entityDisplayName(entity: NexusEntity | null | undefined): string {
  if (!entity) return "Unknown";
  const record = entity as unknown as Record<string, unknown>;
  if (typeof record.name === "string" && record.name) return record.name;
  if (typeof record.title === "string" && record.title) return record.title;
  if (typeof record.fullName === "string" && record.fullName) return record.fullName;
  if (typeof record.model === "string" && record.model) return record.model;
  if (typeof record.question === "string" && record.question) return record.question;
  if (typeof record.code === "string" && record.code) {
    return typeof record.title === "string" ? `${record.code} ${record.title}` : record.code;
  }
  if (typeof record.genus === "string" && typeof record.species === "string") {
    return `${record.genus} ${record.species}`;
  }
  if (typeof record.body === "string" && typeof record.code === "string") {
    return `${record.body} ${record.code}`;
  }
  if (typeof record.alias === "string") return record.alias;
  if (typeof record.text === "string") {
    return record.text.length > 60 ? `${record.text.slice(0, 57)}…` : record.text;
  }
  return entity.id;
}
