"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepository } from "@/lib/data";
import {
  createTenderAwardSchema,
  createTenderItemSchema,
  createTenderLotSchema,
  currencyCode,
} from "@/lib/domain/schemas";

interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

function firstIssues(error: { issues: Array<{ path: Array<string | number>; message: string }> }): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function optionalText(formData: FormData, name: string): string | undefined {
  const value = String(formData.get(name) ?? "").trim();
  return value === "" ? undefined : value;
}

function revalidateTender(tenderId: string): void {
  revalidatePath("/tenders");
  revalidatePath(`/tenders/${tenderId}`);
}

/** Add a lot to a tender. */
export async function addTenderLot(tenderId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createTenderLotSchema.safeParse({
    tenderId,
    name: String(formData.get("name") ?? "").trim(),
    description: optionalText(formData, "description"),
  });
  if (!parsed.success) {
    return { ok: false, error: "The lot could not be added.", fieldErrors: firstIssues(parsed.error) };
  }
  const repo = await getRepository();
  const lot = await repo.createEntity("tender_lot", { ...parsed.data, visibility: "canonical", isDemo: false });
  revalidateTender(tenderId);
  return { ok: true, id: lot.id };
}

/** Add an item to a lot, optionally mapped to an existing SKU. */
export async function addTenderItem(tenderId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const quantityText = optionalText(formData, "quantity");
  const quantity = quantityText !== undefined ? Number(quantityText) : undefined;
  const mappedSkuId = optionalText(formData, "mappedSkuId");

  const repo = await getRepository();
  // Mapping to a SKU implies the product mapping (kept consistent server-side).
  let mappedProductId: string | undefined;
  if (mappedSkuId !== undefined) {
    const sku = await repo.getById("sku", mappedSkuId);
    if (!sku) {
      return { ok: false, error: "The selected SKU no longer exists.", fieldErrors: { mappedSkuId: "Unknown SKU" } };
    }
    mappedProductId = sku.productId;
  }

  const parsed = createTenderItemSchema.safeParse({
    lotId: String(formData.get("lotId") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    requiredSpecification: optionalText(formData, "requiredSpecification"),
    quantity,
    unit: optionalText(formData, "unit"),
    mappedSkuId,
    mappedProductId,
  });
  if (!parsed.success) {
    return { ok: false, error: "The item could not be added.", fieldErrors: firstIssues(parsed.error) };
  }
  const item = await repo.createEntity("tender_item", { ...parsed.data, visibility: "canonical", isDemo: false });
  revalidateTender(tenderId);
  return { ok: true, id: item.id };
}

/** Local DTO for bidders (no shared schema exists for tender_bidder). */
const createTenderBidderSchema = z
  .object({
    tenderId: z.string().min(1).optional(),
    lotId: z.string().min(1).optional(),
    organizationId: z.string().min(1, "Select a bidding organization"),
    bidAmount: z.number().nonnegative().optional(),
    currency: currencyCode.optional(),
  })
  .strict()
  .refine((value) => (value.tenderId !== undefined) !== (value.lotId !== undefined), {
    message: "A bid must reference exactly one of the tender or a lot",
    path: ["scope"],
  });

/** Record a bidder at tender or lot scope. */
export async function addTenderBidder(tenderId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const scope = String(formData.get("scope") ?? "");
  if (scope !== "tender" && !scope.startsWith("lot:")) {
    return { ok: false, error: "The bidder could not be recorded.", fieldErrors: { scope: "Select a bid scope" } };
  }
  const amountText = optionalText(formData, "bidAmount");
  const parsed = createTenderBidderSchema.safeParse({
    tenderId: scope === "tender" ? tenderId : undefined,
    lotId: scope.startsWith("lot:") ? scope.slice(4) : undefined,
    organizationId: String(formData.get("organizationId") ?? "").trim(),
    bidAmount: amountText !== undefined ? Number(amountText) : undefined,
    currency: optionalText(formData, "currency"),
  });
  if (!parsed.success) {
    return { ok: false, error: "The bidder could not be recorded.", fieldErrors: firstIssues(parsed.error) };
  }
  const repo = await getRepository();
  const bidder = await repo.createEntity("tender_bidder", { ...parsed.data, visibility: "canonical", isDemo: false });
  revalidateTender(tenderId);
  return { ok: true, id: bidder.id };
}

/**
 * Record an award (lot- or item-scoped) and mark the tender awarded. The
 * award date lands on the tender so the tender_renewal_expected signal can
 * fire when the contract period runs out.
 */
export async function recordTenderAward(
  tenderId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const scope = String(formData.get("scope") ?? "");
  if (!scope.startsWith("lot:") && !scope.startsWith("item:")) {
    return { ok: false, error: "The award could not be recorded.", fieldErrors: { scope: "Select a lot or item" } };
  }
  const amountText = optionalText(formData, "amount");
  const confidenceText = optionalText(formData, "confidence");
  const awardDate = optionalText(formData, "awardDate");

  const parsed = createTenderAwardSchema.safeParse({
    lotId: scope.startsWith("lot:") ? scope.slice(4) : undefined,
    tenderItemId: scope.startsWith("item:") ? scope.slice(5) : undefined,
    awardedSupplierOrgId: String(formData.get("awardedSupplierOrgId") ?? "").trim(),
    awardedManufacturerOrgId: optionalText(formData, "awardedManufacturerOrgId"),
    awardedProductId: optionalText(formData, "awardedProductId"),
    amount: amountText !== undefined ? Number(amountText) : Number.NaN,
    currency: String(formData.get("currency") ?? "").trim(),
    awardDate,
    evidence: {
      sourceId: optionalText(formData, "evidenceSourceId"),
      state: String(formData.get("evidenceState") ?? ""),
      confidence: confidenceText !== undefined ? Number(confidenceText) : Number.NaN,
      notes: optionalText(formData, "evidenceNotes"),
    },
  });
  if (!parsed.success) {
    return { ok: false, error: "The award could not be recorded.", fieldErrors: firstIssues(parsed.error) };
  }

  const repo = await getRepository();
  const award = await repo.createEntity("tender_award", { ...parsed.data, visibility: "canonical", isDemo: false });
  await repo.updateEntity("tender", tenderId, {
    status: "awarded",
    awardDate: awardDate ?? new Date().toISOString().slice(0, 10),
  });
  revalidateTender(tenderId);
  revalidatePath("/signals");
  return { ok: true, id: award.id };
}
