import type { Product, ProductEdge, ProductEdgeTargetType, Sku } from "./types";

/**
 * Requirements-driven product matching.
 *
 * Fully explainable by construction: the requirement set is expanded into
 * concrete dimensions ("standard ISO 11133", "country VN"), each dimension is
 * checked against the candidate's evidence edges and SKU data, and the score
 * is simply matched / total × 100. No scoring magic, no AI.
 *
 * Evidence states `superseded`, `disputed` and `expired` never count as
 * supporting evidence — a dimension backed only by those is reported MISSING,
 * with a `recommendedNextAction` telling the analyst exactly what to source.
 */

/** Edge states that still say something positive about the product. */
const NON_SUPPORTING_STATES = new Set(["superseded", "disputed", "expired"]);

export interface MatchRequirements {
  industry?: string;
  applicationIds?: string[];
  methodIds?: string[];
  standardIds?: string[];
  sampleTypeIds?: string[];
  organismIds?: string[];
  /** Required ProductFormat id. */
  requiredFormat?: string;
  /** Required storage condition (case-insensitive exact match). */
  storage?: string;
  minShelfLifeMonths?: number;
  /** ISO alpha-2 country where the product must be available. */
  country?: string;
  /** Product to find alternatives for — excluded from results. */
  existingProductId?: string;
}

export interface MatchCandidate {
  product: Product;
  edges: ProductEdge[];
  /** Known SKUs of the product (needed for format/shelf-life/storage/country checks). */
  skus?: Sku[];
}

export interface ProductMatchResult {
  productId: string;
  productName: string;
  /** matched required dimensions / total required dimensions × 100 (0–100, 2dp). */
  score: number;
  matchedDimensions: string[];
  /** Required but no (supporting) evidence found. */
  missingDimensions: string[];
  /** Evidence actively contradicts a requirement (e.g. wrong format, discontinued). */
  conflicts: string[];
  /** What to source next when evidence is missing. */
  recommendedNextAction?: string;
}

const TARGET_TYPE_LABELS: Readonly<Record<ProductEdgeTargetType, string>> = {
  application: "application",
  method: "method",
  standard: "standard",
  organism: "organism",
  sample_type: "sample type",
  industry: "industry",
  technology: "technology",
  test_type: "test type",
  incubation_condition: "incubation condition",
  preparation_method: "preparation method",
};

interface Dimension {
  /** Display label, e.g. 'standard ISO 11133'. */
  label: string;
  /** matched = supporting evidence; conflict = evidence contradicts; neither = unknown. */
  check: () => "matched" | "conflict" | "unknown";
}

export function matchProducts(
  requirements: MatchRequirements,
  candidates: readonly MatchCandidate[],
): ProductMatchResult[] {
  const results: ProductMatchResult[] = [];

  for (const candidate of candidates) {
    if (candidate.product.id === requirements.existingProductId) continue;

    const supporting = candidate.edges.filter((edge) => !NON_SUPPORTING_STATES.has(edge.evidence.state));
    const skus = candidate.skus ?? [];
    const dimensions: Dimension[] = [];

    const edgeDimension = (targetType: ProductEdgeTargetType, targetId: string): Dimension => ({
      label: `${TARGET_TYPE_LABELS[targetType]} ${targetId}`,
      check: () =>
        supporting.some((edge) => edge.targetType === targetType && edge.targetId === targetId)
          ? "matched"
          : "unknown",
    });

    if (requirements.industry) dimensions.push(edgeDimension("industry", requirements.industry));
    for (const id of requirements.applicationIds ?? []) dimensions.push(edgeDimension("application", id));
    for (const id of requirements.methodIds ?? []) dimensions.push(edgeDimension("method", id));
    for (const id of requirements.standardIds ?? []) dimensions.push(edgeDimension("standard", id));
    for (const id of requirements.sampleTypeIds ?? []) dimensions.push(edgeDimension("sample_type", id));
    for (const id of requirements.organismIds ?? []) dimensions.push(edgeDimension("organism", id));

    if (requirements.requiredFormat) {
      const required = requirements.requiredFormat;
      dimensions.push({
        label: `format ${required}`,
        check: () => {
          if (skus.some((sku) => sku.formatId === required)) return "matched";
          // A known-but-different format is a conflict; no format data is unknown.
          return skus.some((sku) => sku.formatId !== undefined) ? "conflict" : "unknown";
        },
      });
    }

    if (requirements.storage) {
      const required = requirements.storage.trim().toLowerCase();
      dimensions.push({
        label: `storage ${requirements.storage}`,
        check: () => {
          if (skus.some((sku) => sku.storageCondition?.trim().toLowerCase() === required)) return "matched";
          return skus.some((sku) => sku.storageCondition !== undefined) ? "conflict" : "unknown";
        },
      });
    }

    if (requirements.minShelfLifeMonths !== undefined) {
      const min = requirements.minShelfLifeMonths;
      dimensions.push({
        label: `shelf life ≥ ${min} months`,
        check: () => {
          if (skus.some((sku) => sku.shelfLifeMonths !== undefined && sku.shelfLifeMonths >= min)) return "matched";
          return skus.some((sku) => sku.shelfLifeMonths !== undefined) ? "conflict" : "unknown";
        },
      });
    }

    if (requirements.country) {
      const country = requirements.country.toUpperCase();
      dimensions.push({
        label: `country ${country}`,
        check: () => {
          if (skus.some((sku) => sku.countryAvailability.map((c) => c.toUpperCase()).includes(country)))
            return "matched";
          return skus.some((sku) => sku.countryAvailability.length > 0) ? "conflict" : "unknown";
        },
      });
    }

    const matchedDimensions: string[] = [];
    const missingDimensions: string[] = [];
    const conflicts: string[] = [];
    for (const dimension of dimensions) {
      const verdict = dimension.check();
      if (verdict === "matched") matchedDimensions.push(dimension.label);
      else if (verdict === "conflict") conflicts.push(dimension.label);
      else missingDimensions.push(dimension.label);
    }

    if (candidate.product.status === "discontinued") {
      conflicts.push("product discontinued");
    }

    // Vacuous requirement set: everything matches (documented; means "no filter").
    const score =
      dimensions.length === 0
        ? 100
        : Math.round((matchedDimensions.length / dimensions.length) * 10000) / 100;

    const recommendedNextAction =
      missingDimensions.length > 0
        ? `evidence missing for ${missingDimensions[0]} — add source`
        : undefined;

    results.push({
      productId: candidate.product.id,
      productName: candidate.product.name,
      score,
      matchedDimensions,
      missingDimensions,
      conflicts,
      recommendedNextAction,
    });
  }

  return results.sort(
    (a, b) =>
      b.score - a.score ||
      a.productName.localeCompare(b.productName) ||
      a.productId.localeCompare(b.productId),
  );
}
