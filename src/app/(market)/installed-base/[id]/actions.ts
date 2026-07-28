"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepository } from "@/lib/data";
import { isoDateString, updateInstalledAssetSchema } from "@/lib/domain/schemas";
import { MAINTENANCE_EVENT_TYPES } from "@/lib/domain/types";
import { demoTenantId } from "@/lib/env";

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

function revalidateAsset(assetId: string): void {
  revalidatePath("/installed-base");
  revalidatePath(`/installed-base/${assetId}`);
}

/** Local DTO for maintenance events (no shared schema exists for them). */
const createMaintenanceEventSchema = z
  .object({
    installedAssetId: z.string().min(1),
    type: z.enum(MAINTENANCE_EVENT_TYPES),
    at: isoDateString,
    providerOrgId: z.string().min(1).optional(),
    description: z.string().optional(),
    nextDueDate: isoDateString.optional(),
  })
  .strict();

/** Record a maintenance event against an installed asset. */
export async function recordMaintenanceEvent(
  assetId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createMaintenanceEventSchema.safeParse({
    installedAssetId: assetId,
    type: String(formData.get("type") ?? ""),
    at: String(formData.get("at") ?? "").trim(),
    providerOrgId: optionalText(formData, "providerOrgId"),
    description: optionalText(formData, "description"),
    nextDueDate: optionalText(formData, "nextDueDate"),
  });
  if (!parsed.success) {
    return { ok: false, error: "The maintenance event could not be recorded.", fieldErrors: firstIssues(parsed.error) };
  }
  const repo = await getRepository();
  const event = await repo.createEntity("maintenance_event", {
    ...parsed.data,
    tenantId: demoTenantId,
    visibility: "tenant_private",
    isDemo: false,
  });
  revalidateAsset(assetId);
  return { ok: true, id: event.id };
}

/** Update the qualification status of an installed asset. */
export async function updateQualificationStatus(
  assetId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateInstalledAssetSchema.safeParse({
    qualificationStatus: String(formData.get("qualificationStatus") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "The qualification status could not be updated.",
      fieldErrors: firstIssues(parsed.error),
    };
  }
  const repo = await getRepository();
  await repo.updateEntity("installed_asset", assetId, parsed.data);
  revalidateAsset(assetId);
  return { ok: true };
}
