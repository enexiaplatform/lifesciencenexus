"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepository } from "@/lib/data";
import { normalizePrice } from "@/lib/domain/price-normalization";
import { createPriceObservationSchema } from "@/lib/domain/schemas";
import { VISIBILITIES, type ConfidenceDimensions, type ExchangeRateSnapshot } from "@/lib/domain/types";

export type RecordPriceResult = { ok: true; id: string } | { ok: false; error: string };

const formSchema = z
  .object({
    skuId: z.string().min(1, "Select a SKU"),
    packConfigurationId: z.string().min(1).optional(),
    supplierOrgId: z.string().min(1).optional(),
    amount: z.number().nonnegative("Amount must be non-negative"),
    currency: z.string().trim().toUpperCase().length(3, "3-letter ISO currency"),
    observationDate: z.string().min(10, "Observation date is required"),
    taxIncluded: z.boolean(),
    vatRatePct: z.number().min(0).max(100).optional(),
    incoterm: z.string().trim().min(1).optional(),
    geography: z.string().trim().min(1, "Geography is required"),
    quantity: z.number().positive("Quantity must be positive"),
    sourceId: z.string().min(1, "Select the evidence source"),
    confidence: z.number().min(0).max(1),
    visibility: z.enum(VISIBILITIES),
    yieldPerUnit: z.number().positive().optional(),
    fxTargetCurrency: z.string().trim().toUpperCase().length(3).optional(),
    fxRate: z.number().positive().optional(),
    fxRateDate: z.string().optional(),
    fxSource: z.string().trim().min(1).optional(),
  })
  .strict();

export type RecordPriceInput = z.infer<typeof formSchema>;

/**
 * Record a new price observation. The payload is validated with the shared
 * zod schema from schemas.ts; normalized per-unit / per-test fields are then
 * computed by normalizePrice (pack-based; FX conversion only through an
 * explicit all-or-none snapshot).
 */
export async function recordPrice(input: RecordPriceInput): Promise<RecordPriceResult> {
  const parsed = formSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join("; ") };
  }
  const data = parsed.data;

  // FX snapshot is all-or-none.
  const fxFields = [data.fxTargetCurrency, data.fxRate, data.fxRateDate, data.fxSource];
  const fxProvided = fxFields.filter((field) => field !== undefined && field !== "").length;
  if (fxProvided > 0 && fxProvided < 4) {
    return {
      ok: false,
      error:
        "Currency conversion is all-or-none: provide target currency, rate, rate date and rate source, or none of them.",
    };
  }

  try {
    const repo = await getRepository();
    const sku = await repo.getById("sku", data.skuId);
    if (!sku) return { ok: false, error: "SKU not found" };
    const pack = data.packConfigurationId
      ? await repo.getById("pack_configuration", data.packConfigurationId)
      : null;
    if (data.packConfigurationId && !pack) return { ok: false, error: "Pack configuration not found" };

    const confidenceValue = data.confidence;
    const confidence: ConfidenceDimensions = {
      sourceAuthority: confidenceValue,
      sourceRecency: confidenceValue,
      entityMatch: confidenceValue,
      extraction: confidenceValue,
      technicalEquivalence: confidenceValue,
      geographicRelevance: confidenceValue,
      commercialRelevance: confidenceValue,
    };

    const observationInput = {
      skuId: data.skuId,
      ...(data.packConfigurationId ? { packConfigurationId: data.packConfigurationId } : {}),
      ...(data.supplierOrgId ? { supplierOrgId: data.supplierOrgId } : {}),
      originalAmount: data.amount,
      originalCurrency: data.currency,
      observationDate: data.observationDate,
      taxIncluded: data.taxIncluded,
      ...(data.vatRatePct !== undefined ? { vatRate: data.vatRatePct / 100 } : {}),
      ...(data.incoterm ? { incoterm: data.incoterm } : {}),
      geography: data.geography,
      quantity: data.quantity,
      sourceId: data.sourceId,
      confidence,
      evidenceState: "source_captured" as const,
      isSynthetic: false,
      visibility: data.visibility,
      isDemo: false,
    };

    const validated = createPriceObservationSchema.safeParse(observationInput);
    if (!validated.success) {
      return { ok: false, error: validated.error.issues.map((issue) => issue.message).join("; ") };
    }
    // The schema marks governance fields optional; the entity requires them.
    const visibility = validated.data.visibility ?? "tenant_private";
    const isDemo = validated.data.isDemo ?? false;

    const exchangeRate: ExchangeRateSnapshot | undefined =
      fxProvided === 4
        ? {
            fromCurrency: data.currency,
            toCurrency: data.fxTargetCurrency!,
            rate: data.fxRate!,
            rateDate: data.fxRateDate!,
            source: data.fxSource!,
          }
        : undefined;

    const normalized = normalizePrice(
      // The engine only reads the observation fields; id/audit fields are irrelevant here.
      { ...validated.data, visibility, isDemo, id: "", createdAt: "", updatedAt: "", createdBy: "", updatedBy: "" },
      pack,
      {
        ...(data.yieldPerUnit !== undefined ? { yieldPerUnit: data.yieldPerUnit } : {}),
        ...(exchangeRate ? { targetCurrency: exchangeRate.toCurrency, exchangeRate } : {}),
      },
    );

    const created = await repo.createEntity("price_observation", {
      ...validated.data,
      visibility,
      isDemo,
      normalizedPerUnitAmount: normalized.observation.normalizedPerUnitAmount ?? null,
      normalizedPerUnitCurrency: normalized.observation.normalizedPerUnitCurrency ?? null,
      normalizedPerUnit: normalized.observation.normalizedPerUnit ?? null,
      normalizedPerTestAmount: normalized.observation.normalizedPerTestAmount ?? null,
    });
    revalidatePath("/prices");
    revalidatePath(`/skus/${data.skuId}`);
    return { ok: true, id: created.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
