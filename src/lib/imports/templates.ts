import { toCsv } from "@/lib/domain/export";
import type { EntityType } from "@/lib/domain/types";

/**
 * Import templates: one per bulk-loadable entity family.
 *
 * A template is a flat list of column definitions. `key` is the stable machine
 * key produced by column mapping; `label` is the header written into the
 * downloadable CSV template; `synonyms` feed the auto-mapper (English +
 * Vietnamese, case/diacritic-insensitive).
 *
 * Reference columns (e.g. `organization` on the sites template) accept either
 * an existing record id or an exact display name; the import runner resolves
 * them against the repository at commit time and reports unresolved
 * references as row errors.
 */

export const IMPORT_KINDS = [
  "organizations",
  "sites",
  "products",
  "skus",
  "prices",
  "suppliers",
  "tenders",
  "installed-assets",
  "contacts",
  "equivalence-candidates",
] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

export interface ImportColumn {
  key: string;
  label: string;
  required: boolean;
  example: string;
  description?: string;
  /** Extra header spellings the auto-mapper should recognize for this column. */
  synonyms?: string[];
}

export interface ImportTemplate {
  kind: ImportKind;
  label: string;
  description: string;
  /** Primary entity type created by this template. */
  entityType: EntityType;
  columns: ImportColumn[];
}

const REFERENCE_NOTE = "Existing record id or exact name; resolved at import time.";
const ENUM_NOTE = (values: readonly string[]) => `One of: ${values.join(", ")}.`;

export const IMPORT_TEMPLATES: Record<ImportKind, ImportTemplate> = {
  organizations: {
    kind: "organizations",
    label: "Organizations",
    description: "Manufacturers, distributors, buyers and other organizations.",
    entityType: "organization",
    columns: [
      {
        key: "name",
        label: "Name",
        required: true,
        example: "Mekong Lab Supply Co., Ltd",
        synonyms: ["company", "organization", "org", "ten", "ten cong ty", "cong ty", "company name"],
      },
      {
        key: "types",
        label: "Types",
        required: true,
        example: "distributor;importer",
        description: `Semicolon-separated. ${ENUM_NOTE(["manufacturer", "distributor", "dealer", "importer", "hospital", "pharmaceutical_company", "food_manufacturer", "testing_laboratory", "..."])}`,
        synonyms: ["type", "roles", "loai hinh", "loai"],
      },
      {
        key: "country",
        label: "Country",
        required: true,
        example: "VN",
        description: "ISO 3166-1 alpha-2.",
        synonyms: ["country code", "quoc gia", "ma quoc gia", "nation"],
      },
      {
        key: "website",
        label: "Website",
        required: false,
        example: "https://mekonglab.example.vn",
        synonyms: ["web", "url", "trang web", "website url"],
      },
      {
        key: "identifiers",
        label: "Identifiers",
        required: false,
        example: "tax_code:0312345678",
        description: "Semicolon-separated scheme:value pairs (tax_code, duns, gmp_certificate, iso_certificate, domain, other).",
        synonyms: ["tax code", "ma so thue", "mst", "duns", "ids"],
      },
    ],
  },
  sites: {
    kind: "sites",
    label: "Sites",
    description: "Physical sites (factories, warehouses, offices, lab sites) of organizations.",
    entityType: "site",
    columns: [
      {
        key: "organization",
        label: "Organization",
        required: true,
        example: "org-mekong-lab-supply",
        description: `Parent organization. ${REFERENCE_NOTE}`,
        synonyms: ["org", "company", "parent", "cong ty", "to chuc"],
      },
      {
        key: "name",
        label: "Site Name",
        required: true,
        example: "Thu Duc Warehouse",
        synonyms: ["site", "name", "ten", "dia diem", "ten kho"],
      },
      {
        key: "siteType",
        label: "Site Type",
        required: true,
        example: "warehouse",
        description: ENUM_NOTE(["factory", "warehouse", "office", "laboratory_site"]),
        synonyms: ["type", "loai", "site type"],
      },
    ],
  },
  products: {
    kind: "products",
    label: "Products",
    description: "Product-level records belonging to a family and manufacturer.",
    entityType: "product",
    columns: [
      {
        key: "family",
        label: "Product Family",
        required: true,
        example: "fam-acme-dehydra",
        description: REFERENCE_NOTE,
        synonyms: ["family", "product family", "dong san pham", "nhom san pham"],
      },
      {
        key: "manufacturer",
        label: "Manufacturer",
        required: true,
        example: "org-acme-micromedia",
        description: `Manufacturer organization. ${REFERENCE_NOTE}`,
        synonyms: ["manufacturer org", "brand owner", "nha san xuat", "hang san xuat", "maker"],
      },
      {
        key: "name",
        label: "Product Name",
        required: true,
        example: "Tryptic Soy Agar (TSA)",
        synonyms: ["product", "name", "ten san pham", "san pham"],
      },
      {
        key: "category",
        label: "Category",
        required: true,
        example: "dehydrated_culture_media",
        description: ENUM_NOTE(["dehydrated_culture_media", "ready_prepared_media", "air_samplers", "microbiology_lab_accessories", "..."]),
        synonyms: ["product category", "loai san pham", "danh muc", "nhom"],
      },
      {
        key: "description",
        label: "Description",
        required: false,
        example: "General-purpose growth medium",
        synonyms: ["mo ta", "desc", "notes"],
      },
      {
        key: "status",
        label: "Status",
        required: false,
        example: "active",
        description: `${ENUM_NOTE(["active", "discontinued", "unknown"])} Default: unknown.`,
        synonyms: ["tinh trang", "trang thai"],
      },
    ],
  },
  skus: {
    kind: "skus",
    label: "SKUs",
    description: "Sellable catalogue items (with catalogue numbers, GTINs) of a product.",
    entityType: "sku",
    columns: [
      {
        key: "product",
        label: "Product",
        required: true,
        example: "prod-tsa-acme",
        description: REFERENCE_NOTE,
        synonyms: ["product name", "parent product", "san pham"],
      },
      {
        key: "name",
        label: "SKU Name",
        required: true,
        example: "TSA 500 g bottle",
        synonyms: ["sku", "name", "ten", "ten sku", "item"],
      },
      {
        key: "catalogueNumber",
        label: "Catalogue Number",
        required: false,
        example: "ACM-1101",
        synonyms: ["catalogue", "cat no", "cat#", "catalog", "catalog no", "catalogue no", "ma catalogue", "ma hang", "part number", "sku code"],
      },
      {
        key: "manufacturerCode",
        label: "Manufacturer Code",
        required: false,
        example: "1101-A",
        synonyms: ["mfr code", "ma nha san xuat"],
      },
      {
        key: "gtin",
        label: "GTIN",
        required: false,
        example: "08934567012345",
        synonyms: ["ean", "barcode", "upc", "ma vach"],
      },
      {
        key: "format",
        label: "Format",
        required: false,
        example: "fmt-granulated",
        description: REFERENCE_NOTE,
        synonyms: ["dang", "dinh dang", "form"],
      },
      {
        key: "shelfLifeMonths",
        label: "Shelf Life (months)",
        required: false,
        example: "24",
        synonyms: ["shelf life", "han su dung", "hsd", "shelflife"],
      },
      {
        key: "storageCondition",
        label: "Storage Condition",
        required: false,
        example: "2-8 C",
        synonyms: ["storage", "bao quan", "dieu kien bao quan"],
      },
      {
        key: "countryAvailability",
        label: "Country Availability",
        required: false,
        example: "VN;TH",
        description: "Semicolon-separated ISO alpha-2 codes.",
        synonyms: ["availability", "countries", "thị truong", "thi truong"],
      },
      {
        key: "status",
        label: "Status",
        required: false,
        example: "active",
        description: `${ENUM_NOTE(["active", "discontinued", "unknown"])} Default: unknown.`,
        synonyms: ["tinh trang", "trang thai"],
      },
    ],
  },
  prices: {
    kind: "prices",
    label: "Prices",
    description: "Point-in-time price observations for SKUs (immutable evidence records).",
    entityType: "price_observation",
    columns: [
      {
        key: "sku",
        label: "SKU",
        required: true,
        example: "sku-tsa-500",
        description: "SKU id, catalogue number or exact name.",
        synonyms: ["sku", "product", "ma hang", "catalogue number", "item"],
      },
      {
        key: "amount",
        label: "Amount",
        required: true,
        example: "1850000",
        description: "Original quoted amount (number, no thousand separators).",
        synonyms: ["price", "gia", "don gia", "thanh tien", "unit price", "gia ban"],
      },
      {
        key: "currency",
        label: "Currency",
        required: true,
        example: "VND",
        description: "ISO 4217.",
        synonyms: ["tien te", "don vi tien te", "curr"],
      },
      {
        key: "observationDate",
        label: "Observation Date",
        required: true,
        example: "2026-06-30",
        description: "ISO date the price was observed/quoted.",
        synonyms: ["date", "ngay", "ngay bao gia", "quote date"],
      },
      {
        key: "geography",
        label: "Geography",
        required: true,
        example: "VN",
        description: "Geography or ISO alpha-2 code the price applies to.",
        synonyms: ["geo", "khu vuc", "dia ban", "country"],
      },
      {
        key: "supplier",
        label: "Supplier",
        required: false,
        example: "org-mekong-lab-supply",
        description: `Supplier organization. ${REFERENCE_NOTE}`,
        synonyms: ["nha cung cap", "vendor", "distributor", "nha phan phoi"],
      },
      {
        key: "taxIncluded",
        label: "Tax Included",
        required: false,
        example: "false",
        description: "true/false/yes/no. Default: false.",
        synonyms: ["bao gom thue", "vat included", "tax"],
      },
      {
        key: "vatRate",
        label: "VAT Rate",
        required: false,
        example: "0.1",
        description: "Fraction 0-1, e.g. 0.1 for 10%.",
        synonyms: ["vat", "thue vat", "thue"],
      },
      {
        key: "quantity",
        label: "Quantity",
        required: false,
        example: "1",
        description: "Packs the quoted amount covers. Default: 1.",
        synonyms: ["so luong", "qty"],
      },
    ],
  },
  suppliers: {
    kind: "suppliers",
    label: "Supplier Profiles",
    description: "Supplier overlay records: which organizations distribute which manufacturers, where.",
    entityType: "supplier_profile",
    columns: [
      {
        key: "organization",
        label: "Supplier Organization",
        required: true,
        example: "org-mekong-lab-supply",
        description: REFERENCE_NOTE,
        synonyms: ["supplier", "org", "company", "nha cung cap", "nha phan phoi", "cong ty"],
      },
      {
        key: "relationshipType",
        label: "Relationship Type",
        required: true,
        example: "authorized_distributor",
        description: ENUM_NOTE(["authorized_distributor", "non_exclusive_distributor", "dealer", "reseller", "importer", "service_provider", "unknown_unverified"]),
        synonyms: ["relationship", "type", "loai quan he", "quan he"],
      },
      {
        key: "countries",
        label: "Countries",
        required: true,
        example: "VN;KH",
        description: "Semicolon-separated ISO alpha-2 codes served.",
        synonyms: ["country", "quoc gia", "thi truong", "khu vuc"],
      },
      {
        key: "manufacturers",
        label: "Manufacturers",
        required: false,
        example: "org-acme-micromedia",
        description: `Semicolon-separated manufacturer organizations. ${REFERENCE_NOTE}`,
        synonyms: ["manufacturer", "brands carried", "nha san xuat", "hang"],
      },
    ],
  },
  tenders: {
    kind: "tenders",
    label: "Tenders",
    description: "Public procurement tenders relevant to the catalogue.",
    entityType: "tender",
    columns: [
      {
        key: "code",
        label: "Tender Code",
        required: true,
        example: "RRH-2025-014",
        synonyms: ["tender code", "reference", "ma dau thau", "ma goi thau", "ref"],
      },
      {
        key: "title",
        label: "Title",
        required: true,
        example: "Culture media supply 2025",
        synonyms: ["name", "ten goi thau", "tieu de", "tender name"],
      },
      {
        key: "buyer",
        label: "Buyer Organization",
        required: true,
        example: "org-red-river-hospital",
        description: REFERENCE_NOTE,
        synonyms: ["buyer", "organization", "ben mua", "chu dau tu", "don vi mua"],
      },
      {
        key: "country",
        label: "Country",
        required: true,
        example: "VN",
        synonyms: ["quoc gia", "ma quoc gia"],
      },
      {
        key: "publicationDate",
        label: "Publication Date",
        required: false,
        example: "2025-03-01",
        synonyms: ["published", "ngay dang", "ngay cong bo"],
      },
      {
        key: "submissionDeadline",
        label: "Submission Deadline",
        required: false,
        example: "2025-04-15T17:00:00Z",
        synonyms: ["deadline", "han nop", "closing date"],
      },
      {
        key: "awardDate",
        label: "Award Date",
        required: false,
        example: "2025-05-20",
        synonyms: ["ngay trao thau", "awarded"],
      },
      {
        key: "contractPeriodMonths",
        label: "Contract Period (months)",
        required: false,
        example: "12",
        synonyms: ["contract months", "thoi gian hop dong"],
      },
      {
        key: "status",
        label: "Status",
        required: false,
        example: "published",
        description: `${ENUM_NOTE(["published", "closed", "awarded", "cancelled", "unknown"])} Default: unknown.`,
        synonyms: ["tinh trang", "trang thai"],
      },
    ],
  },
  "installed-assets": {
    kind: "installed-assets",
    label: "Installed Assets",
    description: "Instruments installed at customer sites (tenant-private installed base).",
    entityType: "installed_asset",
    columns: [
      {
        key: "assetModel",
        label: "Asset Model",
        required: true,
        example: "model-airsampler-as100",
        description: "Model id or exact model name.",
        synonyms: ["model", "instrument", "thiet bi", "may"],
      },
      {
        key: "site",
        label: "Site",
        required: true,
        example: "site-delta-pharma-plant",
        description: REFERENCE_NOTE,
        synonyms: ["location", "dia diem", "co so"],
      },
      {
        key: "laboratory",
        label: "Laboratory",
        required: false,
        example: "lab-delta-pharma-micro",
        description: REFERENCE_NOTE,
        synonyms: ["lab", "phong thi nghiem"],
      },
      {
        key: "serialNumber",
        label: "Serial Number",
        required: false,
        example: "AS100-2023-047",
        synonyms: ["serial", "so serial", "sn"],
      },
      {
        key: "installationDate",
        label: "Installation Date",
        required: false,
        example: "2023-05-11",
        synonyms: ["installed", "ngay lap dat"],
      },
      {
        key: "status",
        label: "Status",
        required: false,
        example: "operational",
        description: `${ENUM_NOTE(["operational", "under_maintenance", "retired", "unknown"])} Default: unknown.`,
        synonyms: ["tinh trang", "trang thai"],
      },
      {
        key: "qualificationStatus",
        label: "Qualification Status",
        required: false,
        example: "iq_oq_pq_complete",
        description: `${ENUM_NOTE(["iq_oq_pq_complete", "partial", "none", "unknown"])} Default: unknown.`,
        synonyms: ["qualification", "iq oq pq"],
      },
      {
        key: "confidence",
        label: "Confidence",
        required: false,
        example: "0.9",
        description: "0-1 field-observation confidence. Default: 0.5.",
        synonyms: ["do tin cay"],
      },
    ],
  },
  contacts: {
    kind: "contacts",
    label: "Contacts",
    description: "People plus their contact link to an organization (creates one person and one contact record per row).",
    entityType: "person",
    columns: [
      {
        key: "fullName",
        label: "Full Name",
        required: true,
        example: "Nguyen Van An",
        synonyms: ["name", "contact", "ho ten", "nguoi lien he", "ten"],
      },
      {
        key: "organization",
        label: "Organization",
        required: true,
        example: "org-delta-pharma-hcmc",
        description: REFERENCE_NOTE,
        synonyms: ["company", "org", "cong ty", "don vi"],
      },
      {
        key: "title",
        label: "Job Title",
        required: false,
        example: "QC Manager",
        synonyms: ["position", "role", "chuc vu", "chuc danh"],
      },
      {
        key: "email",
        label: "Email",
        required: false,
        example: "an.nguyen@example.vn",
        synonyms: ["e-mail", "thu dien tu"],
      },
      {
        key: "phone",
        label: "Phone",
        required: false,
        example: "+84 901 234 567",
        synonyms: ["dien thoai", "so dien thoai", "mobile", "sdt"],
      },
      {
        key: "decisionRoles",
        label: "Decision Roles",
        required: false,
        example: "user;technical_evaluator",
        description: "Semicolon-separated (user, technical_evaluator, qa_approver, procurement, economic_buyer, ...).",
        synonyms: ["roles", "vai tro"],
      },
      {
        key: "isPrimary",
        label: "Primary Contact",
        required: false,
        example: "true",
        description: "true/false/yes/no. Default: false.",
        synonyms: ["primary", "chinh"],
      },
    ],
  },
  "equivalence-candidates": {
    kind: "equivalence-candidates",
    label: "Equivalence Candidates",
    description: "Candidate SKU-equivalence records for analyst review (never auto-asserted).",
    entityType: "equivalence_record",
    columns: [
      {
        key: "sourceSku",
        label: "Source SKU",
        required: true,
        example: "sku-tsa-500",
        description: "SKU id, catalogue number or exact name.",
        synonyms: ["source", "sku", "from", "ma nguon"],
      },
      {
        key: "candidateSku",
        label: "Candidate SKU",
        required: true,
        example: "sku-tsa-delta-500",
        description: "SKU id, catalogue number or exact name.",
        synonyms: ["candidate", "target", "to", "ma tuong duong", "equivalent"],
      },
      {
        key: "classification",
        label: "Classification",
        required: true,
        example: "functional_equivalent",
        description: ENUM_NOTE(["exact_equivalent", "functional_equivalent", "closest_alternative", "not_recommended_substitute"]),
        synonyms: ["verdict", "phan loai", "loai tuong duong"],
      },
      {
        key: "overallScore",
        label: "Overall Score",
        required: true,
        example: "78",
        description: "0-100.",
        synonyms: ["score", "diem", "diem so"],
      },
      {
        key: "rationale",
        label: "Rationale",
        required: true,
        example: "Same formula per manufacturer catalogues; different granulation.",
        synonyms: ["reason", "ly do", "giai trinh", "justification"],
      },
      {
        key: "reviewState",
        label: "Review State",
        required: false,
        example: "unverified",
        description: `${ENUM_NOTE(["unverified", "source_captured", "structurally_validated", "analyst_reviewed", "domain_expert_reviewed"])} Default: unverified.`,
        synonyms: ["review", "trang thai", "state"],
      },
    ],
  },
};

export function getImportTemplate(kind: ImportKind): ImportTemplate {
  return IMPORT_TEMPLATES[kind];
}

/** CSV template for a kind: header row of labels plus one example row. */
export function templateCsv(kind: ImportKind): string {
  const template = IMPORT_TEMPLATES[kind];
  // One example row keyed by column key.
  const exampleRow: Record<string, string> = {};
  for (const column of template.columns) exampleRow[column.key] = column.example;
  return toCsv(
    [exampleRow],
    template.columns.map((column) => ({
      key: column.key,
      header: column.label,
      value: (row: Record<string, string>) => row[column.key],
    })),
  );
}
