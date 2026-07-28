"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepository } from "@/lib/data";
import { DEFAULT_EQUIVALENCE_WEIGHTS, scoreEquivalence } from "@/lib/domain/equivalence";
import {
  EQUIVALENCE_CLASSIFICATIONS,
  EQUIVALENCE_DIMENSIONS,
  type DimensionScore,
  type EquivalenceDimension,
} from "@/lib/domain/types";

export type EquivalenceActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// New record shell
// ---------------------------------------------------------------------------

const shellSchema = z
  .object({
    sourceSkuId: z.string().min(1, "Select a source SKU"),
    candidateSkuId: z.string().min(1, "Select a candidate SKU"),
  })
  .refine((value) => value.sourceSkuId !== value.candidateSkuId, {
    message: "Source and candidate SKU must be different",
  });

/**
 * Create an empty equivalence assessment (all dimensions unknown, default
 * weights) and return its id. Idempotent: an existing record for the same
 * ordered pair is returned instead of duplicated.
 */
export async function createEquivalenceShell(input: {
  sourceSkuId: string;
  candidateSkuId: string;
}): Promise<EquivalenceActionResult> {
  const parsed = shellSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join("; ") };
  }
  try {
    const repo = await getRepository();
    const [source, candidate] = await Promise.all([
      repo.getById("sku", parsed.data.sourceSkuId),
      repo.getById("sku", parsed.data.candidateSkuId),
    ]);
    if (!source) return { ok: false, error: "Source SKU not found" };
    if (!candidate) return { ok: false, error: "Candidate SKU not found" };

    const existing = await repo.list("equivalence_record", {
      filters: { sourceSkuId: source.id, candidateSkuId: candidate.id },
      pageSize: 5,
    });
    if (existing.items.length > 0) {
      return { ok: true, id: existing.items[0].id };
    }

    const dimensionScores = Object.fromEntries(
      EQUIVALENCE_DIMENSIONS.map((dimension) => [
        dimension,
        { score: null, weight: DEFAULT_EQUIVALENCE_WEIGHTS[dimension] } satisfies DimensionScore,
      ]),
    ) as Record<EquivalenceDimension, DimensionScore>;

    const record = await repo.createEntity("equivalence_record", {
      sourceSkuId: source.id,
      candidateSkuId: candidate.id,
      classification: "not_recommended_substitute",
      overallScore: 0,
      dimensionScores,
      rationale: "Draft assessment — no dimensions scored yet.",
      differences: [],
      validationConsiderations: [],
      evidenceClaimIds: [],
      reviewState: "unverified",
      visibility: "canonical",
      isDemo: false,
    });
    revalidatePath("/equivalence");
    return { ok: true, id: record.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Save a full assessment
// ---------------------------------------------------------------------------

const dimensionScoreSchema = z
  .object({
    score: z.number().min(0).max(100).nullable(),
    weight: z.number().min(0),
    note: z.string().optional(),
  })
  .strict();

const saveSchema = z
  .object({
    id: z.string().min(1),
    classification: z.enum(EQUIVALENCE_CLASSIFICATIONS),
    rationale: z.string().trim().min(1, "A rationale is required"),
    differences: z.array(
      z
        .object({
          dimension: z.enum(EQUIVALENCE_DIMENSIONS),
          description: z.string().trim().min(1, "Describe the difference"),
          severity: z.enum(["minor", "moderate", "major"]).optional(),
        })
        .strict(),
    ),
    validationConsiderations: z.array(z.string().trim().min(1)),
    dimensionScores: z.record(z.enum(EQUIVALENCE_DIMENSIONS), dimensionScoreSchema),
  })
  .strict();

export type SaveEquivalenceInput = z.infer<typeof saveSchema>;

/**
 * Persist the edited assessment. The overall score is recomputed server-side
 * with the equivalence engine (never trusted from the client); the exact
 * classification is refused while any dimension is unknown.
 */
export async function saveEquivalenceAssessment(
  input: SaveEquivalenceInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join("; ") };
  }
  try {
    const repo = await getRepository();
    const record = await repo.getById("equivalence_record", parsed.data.id);
    if (!record) return { ok: false, error: "Equivalence record not found" };

    const weights = Object.fromEntries(
      EQUIVALENCE_DIMENSIONS.map((dimension) => [
        dimension,
        parsed.data.dimensionScores[dimension]?.weight ?? 0,
      ]),
    ) as Record<EquivalenceDimension, number>;
    const scores = Object.fromEntries(
      EQUIVALENCE_DIMENSIONS.map((dimension) => [
        dimension,
        parsed.data.dimensionScores[dimension]?.score ?? null,
      ]),
    ) as Record<EquivalenceDimension, number | null>;

    let result: ReturnType<typeof scoreEquivalence>;
    try {
      result = scoreEquivalence(scores, weights);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Invalid weights" };
    }
    if (result.overallScore === null) {
      return { ok: false, error: "Score at least one dimension — an assessment with no evidence cannot be saved." };
    }
    if (parsed.data.classification === "exact_equivalent" && result.unknownDimensions.length > 0) {
      return {
        ok: false,
        error: `Exact equivalence is impossible while dimensions are unknown (${result.unknownDimensions.join(", ")}).`,
      };
    }

    await repo.updateEntity("equivalence_record", record.id, {
      classification: parsed.data.classification,
      rationale: parsed.data.rationale,
      differences: parsed.data.differences,
      validationConsiderations: parsed.data.validationConsiderations,
      dimensionScores: parsed.data.dimensionScores as Record<EquivalenceDimension, DimensionScore>,
      overallScore: result.overallScore,
    });
    revalidatePath("/equivalence");
    revalidatePath(`/equivalence/${record.id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Review workflow
// ---------------------------------------------------------------------------

const idSchema = z.object({ id: z.string().min(1) }).strict();

/** Submit for review: unverified / source_captured → structurally_validated. */
export async function submitEquivalenceForReview(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid record id" };
  try {
    const repo = await getRepository();
    const record = await repo.getById("equivalence_record", parsed.data.id);
    if (!record) return { ok: false, error: "Equivalence record not found" };
    if (!["unverified", "source_captured"].includes(record.reviewState)) {
      return {
        ok: false,
        error: `Cannot submit from state '${record.reviewState}' — only unverified or source-captured records can be submitted.`,
      };
    }
    await repo.updateEntity("equivalence_record", record.id, {
      reviewState: "structurally_validated",
    });
    revalidatePath("/equivalence");
    revalidatePath(`/equivalence/${record.id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Mark analyst reviewed: structurally_validated → analyst_reviewed (stamps reviewer + date). */
export async function markEquivalenceAnalystReviewed(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid record id" };
  try {
    const repo = await getRepository();
    const record = await repo.getById("equivalence_record", parsed.data.id);
    if (!record) return { ok: false, error: "Equivalence record not found" };
    if (record.reviewState !== "structurally_validated") {
      return {
        ok: false,
        error: `Cannot mark analyst-reviewed from state '${record.reviewState}' — submit for review first.`,
      };
    }
    await repo.updateEntity("equivalence_record", record.id, {
      reviewState: "analyst_reviewed",
      reviewerId: record.reviewerId ?? "user_demo_owner",
      lastReviewedAt: new Date().toISOString(),
    });
    revalidatePath("/equivalence");
    revalidatePath(`/equivalence/${record.id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
