"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepository } from "@/lib/data";
import { calculateCostPerTest } from "@/lib/domain/cost-per-test";
import { demoTenantId } from "@/lib/env";

export type SaveScenarioResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

const fxSchema = z
  .object({
    fromCurrency: z.string().trim().toUpperCase().length(3),
    toCurrency: z.string().trim().toUpperCase().length(3),
    rate: z.number().positive(),
    rateDate: z.string().min(10, "Rate date is required"),
    source: z.string().trim().min(1, "Rate source is required"),
  })
  .strict();

const fraction = z.number().min(0).max(1);
const money = z.number().nonnegative();

const costInputSchema = z
  .object({
    purchasePrice: money,
    currency: z.string().trim().toUpperCase().length(3),
    packQuantity: z.number().positive(),
    packUnit: z.string().trim().min(1),
    yieldPerUnit: z.number().positive(),
    freight: money.optional(),
    importDutyRate: fraction.optional(),
    vatRate: fraction.optional(),
    taxIncluded: z.boolean(),
    coldChain: money.optional(),
    storage: money.optional(),
    preparationMaterials: money.optional(),
    water: money.optional(),
    laborMinutesPerTest: money.optional(),
    laborRatePerHour: money.optional(),
    equipmentAllocationPerTest: money.optional(),
    qcGptPerTest: money.optional(),
    sterilizationPerTest: money.optional(),
    wasteRate: fraction.optional(),
    failureRepeatRate: fraction.optional(),
    disposalPerTest: money.optional(),
    validationCostAmortized: money.optional(),
    serviceCostPerTest: money.optional(),
    exchangeRate: fxSchema.optional(),
  })
  .strict();

const saveSchema = z
  .object({
    name: z.string().trim().min(1, "Scenario name is required"),
    projectId: z.string().min(1).optional(),
    scenarios: z
      .array(
        z
          .object({
            skuId: z.string().min(1),
            priceObservationId: z.string().min(1).optional(),
            input: costInputSchema,
          })
          .strict(),
      )
      .min(1, "Add at least one SKU scenario"),
  })
  .strict();

export type SaveCostScenarioInput = z.infer<typeof saveSchema>;

/**
 * Save one cost-per-test scenario per SKU input (the entity is single-SKU by
 * design). Every input is re-validated by the engine before persisting; when
 * a research project is selected, the scenarios are linked to it.
 */
export async function saveCostScenario(input: SaveCostScenarioInput): Promise<SaveScenarioResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join("; ") };
  }
  try {
    const repo = await getRepository();
    if (parsed.data.projectId) {
      const project = await repo.getById("research_project", parsed.data.projectId);
      if (!project) return { ok: false, error: "Research project not found" };
    }

    // Engine re-validation: refuse to persist anything that does not compute.
    for (const scenario of parsed.data.scenarios) {
      try {
        calculateCostPerTest(scenario.input);
      } catch (error) {
        const sku = await repo.getById("sku", scenario.skuId);
        return {
          ok: false,
          error: `Scenario for ${sku?.name ?? scenario.skuId} does not compute: ${
            error instanceof Error ? error.message : "invalid input"
          }`,
        };
      }
    }

    let count = 0;
    for (const scenario of parsed.data.scenarios) {
      const sku = await repo.getById("sku", scenario.skuId);
      const name =
        parsed.data.scenarios.length > 1
          ? `${parsed.data.name} — ${sku?.name ?? scenario.skuId}`
          : parsed.data.name;
      const saved = await repo.createEntity("cost_per_test_scenario", {
        tenantId: demoTenantId,
        name,
        skuId: scenario.skuId,
        ...(scenario.priceObservationId ? { priceObservationId: scenario.priceObservationId } : {}),
        input: scenario.input,
        visibility: "tenant_private",
        isDemo: false,
      });
      count += 1;
      if (parsed.data.projectId) {
        await repo.createEntity("research_project_entity", {
          tenantId: demoTenantId,
          projectId: parsed.data.projectId,
          entityType: "cost_per_test_scenario",
          entityId: saved.id,
          visibility: "tenant_private",
          isDemo: false,
        });
      }
    }
    revalidatePath("/cost-per-test");
    revalidatePath("/research");
    return { ok: true, count };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
