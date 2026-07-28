"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepository } from "@/lib/data";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Demo mode has no auth session; the workspace acts as the demo tenant owner
 * (see the permission note on /review). When auth lands, this reads the
 * session user instead.
 */
const DEMO_REVIEWER_ID = "user_demo_owner";

const REVIEW_TARGETS = [
  "structurally_validated",
  "analyst_reviewed",
  "disputed",
  "expired",
] as const;

const reviewSchema = z.object({
  claimId: z.string().min(1),
  toState: z.enum(REVIEW_TARGETS),
  note: z.string().trim().min(3, "A review note is required (min 3 characters)"),
});

/**
 * Advance or flag a claim: updates the claim's review state and appends an
 * evidence_review record (the audit trail).
 */
export async function reviewClaimAction(input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    const repo = await getRepository();
    const claim = await repo.getById("claim", parsed.data.claimId);
    if (!claim) return { ok: false, error: "Claim not found" };
    const fromState = claim.reviewStatus;
    if (fromState === parsed.data.toState) {
      return { ok: false, error: `Claim is already ${parsed.data.toState}` };
    }
    await repo.updateEntity("claim", claim.id, {
      reviewStatus: parsed.data.toState,
      reviewerId: DEMO_REVIEWER_ID,
    });
    await repo.createEntity("evidence_review", {
      visibility: claim.visibility,
      isDemo: false,
      claimId: claim.id,
      reviewerId: DEMO_REVIEWER_ID,
      fromState,
      toState: parsed.data.toState,
      comment: parsed.data.note,
      reviewedAt: new Date().toISOString(),
    });
    revalidatePath("/review");
    revalidatePath("/evidence");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unexpected error" };
  }
}
