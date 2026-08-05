import { normalizeForMatch, tokenJaccard } from "@/lib/domain/entity-resolution";
import { PRODUCT_CATEGORIES, type AssetCategory, type ProductCategory } from "@/lib/domain/types";

/**
 * Category browse metadata: how each product category presents itself as a
 * browsable "shelf" (brands → models → SKUs) and which free-text queries
 * should lead a user to it.
 *
 * Pure and deterministic — used by the /categories pages, the search page
 * category cards and unit tests. Vietnamese synonyms included because buyers
 * in the demo market search in both languages.
 */

export interface CategoryInfo {
  /** Human label, e.g. 'Sterility testing equipment'. */
  label: string;
  /** One-line description of what belongs on this shelf. */
  description: string;
  /** Free-text aliases buyers actually type (EN + VI). */
  synonyms: string[];
  /** Guidance shown on the category page to help users choose between models. */
  selectionHints: string[];
  /** Matching installed-base asset category, when the shelf is equipment. */
  assetCategory?: AssetCategory;
}

function label(category: ProductCategory): string {
  const spaced = category.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const OVERRIDES: Partial<Record<ProductCategory, Partial<CategoryInfo>>> = {
  sterility_testing_equipment: {
    description:
      "Closed sterility testing systems (pump + canister sets) for membrane-filtration sterility tests per USP <71>.",
    synonyms: [
      "closed sterility testing system",
      "sterility testing pump",
      "sterility test system",
      "steritest",
      "máy kiểm tra vô trùng",
      "hệ thống kiểm tra vô trùng kín",
    ],
    selectionHints: [
      "Confirm canister compatibility first — a closed system is a long-term consumables commitment.",
      "Check conformance to USP <71> and the membrane filtration method before shortlisting.",
      "Compare local availability and lead time: an in-stock system beats a cheaper 45-day import.",
    ],
    assetCategory: "sterility_testing",
  },
  sterility_testing_consumables: {
    description: "Canisters, tubing and single-use sets consumed by closed sterility testing systems.",
    synonyms: ["sterility test canisters", "sterility canister", "steritest canister", "hộp kiểm tra vô trùng"],
    selectionHints: [
      "Match the canister to the pump system already installed (see compatible systems per SKU).",
    ],
  },
  dehydrated_culture_media: {
    description: "Dehydrated powder/granulated culture media prepared in-house before use.",
    synonyms: ["culture media powder", "dehydrated media", "agar powder", "môi trường nuôi cấy"],
    selectionHints: [
      "Check ISO 11133 conformance and the growth-promotion organism panel before accepting a substitute brand.",
      "Compare cost per prepared plate (not per bottle) — yield per 500 g differs between brands.",
      "Dehydrated media wins on unit cost but adds preparation labor; see the cost-per-test builder.",
    ],
  },
  ready_prepared_media: {
    description: "Ready-to-use plated or tubed media — no in-house preparation.",
    synonyms: ["ready plates", "ready-to-use media", "prepared plates", "đĩa thạch sẵn"],
    selectionHints: [
      "Shelf life is short (4–6 months, 2–8 °C) — prefer suppliers with fresh, local stock over import lead time.",
      "Verify cold-chain capability of the distributor before switching from dehydrated media.",
    ],
  },
  microbial_reference_materials: {
    description: "QC organisms and reference strains for growth-promotion and method validation.",
    synonyms: ["qc organisms", "reference strains", "atcc", "chủng chuẩn"],
    selectionHints: [
      "Match the strain code exactly (e.g. ATCC 6633) and check passage count — ≤4 passages for GPT.",
      "Cold-chain (−20 °C) and shelf life drive the real landed cost of QC pellets.",
    ],
  },
  air_samplers: {
    description: "Active air sampling instruments for viable environmental monitoring.",
    synonyms: ["air sampler", "microbial air sampler", "máy lấy mẫu khí"],
    selectionHints: [
      "Match flow rate (L/min) to your monitoring plan's volume requirements.",
      "Open 90 mm plate systems accept any media brand; proprietary contact-plate heads lock you to one supplier.",
      "Check local calibration/service coverage — an uncalibrated sampler fails audits.",
    ],
    assetCategory: "air_sampler",
  },
  particle_counters: {
    description: "Optical particle counters for cleanroom classification and monitoring.",
    synonyms: ["particle counter", "máy đếm hạt"],
    selectionHints: [
      "Handheld units suit spot checks; benchtop units suit continuous monitoring.",
      "Confirm 0.3 µm sensitivity if you monitor ISO class 5 areas.",
    ],
    assetCategory: "particle_counter",
  },
  environmental_monitoring_consumables: {
    description: "Contact plates, settle plates and swabs for environmental monitoring programs.",
    synonyms: ["contact plates", "em consumables", "đĩa tiếp xúc"],
    selectionHints: [
      "Match the plate format to the sampler head installed at your sites (contact vs 90 mm).",
      "Recurring stock-outs are a signal — check the availability history before committing.",
    ],
  },
  biological_indicators: {
    description: "Biological indicators for sterilization cycle validation.",
    synonyms: ["biological indicator", "spore strips", "chỉ thị sinh học"],
    selectionHints: [
      "Match the organism to the sterilization method: G. stearothermophilus for steam.",
      "Require ISO 11138 conformance and a certificate of analysis per lot.",
      "Self-contained ampoules are faster to read; strips are cheaper per test.",
    ],
  },
  microbiology_lab_accessories: {
    description: "General microbiology laboratory accessories and small equipment.",
    synonyms: ["lab accessories", "inoculating loops", "turntable", "phụ kiện phòng lab"],
    selectionHints: [
      "Calibrated consumables (loops) need a lot certificate for quantitative methods.",
      "Small bench accessories are low-risk purchases — prioritize local availability and price.",
    ],
  },
  cell_culture_media: {
    description:
      "Upstream biopharma: basal media and feeds for mammalian cell culture (e.g. CHO fed-batch mAb production).",
    synonyms: ["cho media", "cell culture medium", "fed-batch media", "môi trường nuôi tế bào"],
    selectionHints: [
      "Match the medium to your cell line and process (fed-batch vs perfusion) before comparing prices.",
      "Chemically defined, animal-component-free formulations simplify regulatory filings.",
      "Media are process-critical — plan a comparability study before switching suppliers.",
    ],
  },
  process_chemicals: {
    description:
      "Upstream and API processing: high-purity solvents, buffers and raw materials for synthesis and bioprocess steps.",
    synonyms: ["solvents", "buffers", "process chemicals", "usp ethanol", "hóa chất công nghệ"],
    selectionHints: [
      "Require the pharmacopoeial grade (USP/Ph.Eur.) and a lot-level CoA for GMP use.",
      "Solvents are bulky — local drum stock usually beats import pricing once freight is included.",
    ],
  },
  purification_chromatography: {
    description:
      "Downstream biopharma: affinity resins, ion-exchange media and membrane chromatography for capture and polishing.",
    synonyms: ["protein a resin", "chromatography resin", "ion exchange", "nhựa sắc ký"],
    selectionHints: [
      "Protein A resin dominates downstream COGS — compare price per cycle, not per litre.",
      "Match ligand chemistry to the molecule (mAb vs fragment) before shortlisting.",
      "Check resin shelf life and storage conditions (e.g. 20% ethanol) against your warehouse.",
    ],
  },
  process_filtration: {
    description:
      "Downstream: sterilizing-grade filters, depth filters and TFF cassettes for clarification, concentration and final fill.",
    synonyms: ["sterilizing filter", "0.22 um filter", "tff cassette", "lọc vô trùng"],
    selectionHints: [
      "Sterilizing-grade filters must be integrity-testable — verify the test method per model.",
      "Match membrane chemistry (PES vs PVDF) to your product's compatibility profile.",
      "Size TFF cassettes by membrane area per batch volume, not by unit price.",
    ],
  },
  endotoxin_testing: {
    description:
      "QC: bacterial endotoxins assays — LAL (gel-clot, kinetic) and recombinant Factor C (rFC) animal-free reagents.",
    synonyms: ["lal", "endotoxin", "bacterial endotoxins test", "rfc assay", "kiểm tra nội độc tố", "endotoxin testing"],
    selectionHints: [
      "rFC is animal-free and increasingly accepted; LAL gel-clot remains the compendial workhorse.",
      "Confirm the assay is validated against USP <85> for your product matrices.",
      "Compare cost per test, not per kit — kit sizes differ widely.",
    ],
  },
  other: {
    description: "Products not yet classified into a specific category.",
    synonyms: [],
  },
};

export const CATEGORY_INFO: Record<ProductCategory, CategoryInfo> = Object.fromEntries(
  PRODUCT_CATEGORIES.map((category) => {
    const override = OVERRIDES[category] ?? {};
    return [
      category,
      {
        label: override.label ?? label(category),
        description: override.description ?? label(category),
        synonyms: override.synonyms ?? [],
        selectionHints: override.selectionHints ?? [],
        assetCategory: override.assetCategory,
      } satisfies CategoryInfo,
    ];
  }),
) as Record<ProductCategory, CategoryInfo>;

export interface CategoryMatch {
  category: ProductCategory;
  /** 0–1 relevance; 1 when a synonym is an exact/substring hit. */
  score: number;
  /** The label or synonym that matched (explains the hit). */
  matchedOn: string;
}

const MIN_TOKEN_SCORE = 0.5;

/**
 * Match a free-text query against category labels and synonyms.
 * Exact/substring synonym hits outrank token overlap. Returns matches sorted
 * by score desc, then category name for determinism.
 */
export function matchCategories(query: string): CategoryMatch[] {
  const normalized = normalizeForMatch(query);
  if (normalized.length < 3) return [];
  const queryTokens = new Set(normalized.split(" ").filter(Boolean));
  const matches: CategoryMatch[] = [];

  for (const category of PRODUCT_CATEGORIES) {
    const info = CATEGORY_INFO[category];
    const haystacks = [info.label, ...info.synonyms];

    let best: CategoryMatch | null = null;
    for (const haystack of haystacks) {
      const candidate = normalizeForMatch(haystack);
      let score = 0;
      if (candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate)) {
        score = 1;
      } else {
        const overlap = tokenJaccard(queryTokens, new Set(candidate.split(" ").filter(Boolean)));
        if (overlap >= MIN_TOKEN_SCORE) score = overlap;
      }
      if (score > 0 && (best === null || score > best.score)) {
        best = { category, score, matchedOn: haystack };
      }
    }
    if (best) matches.push(best);
  }

  return matches.sort((a, b) => b.score - a.score || a.category.localeCompare(b.category));
}

/** Canonical href for a category browse page. */
export function categoryHref(category: ProductCategory): string {
  return `/categories/${category}`;
}
