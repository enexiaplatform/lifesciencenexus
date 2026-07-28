"use server";

import { revalidatePath } from "next/cache";

import { getRepository } from "@/lib/data";
import { createSourceSchema, createTenderSchema } from "@/lib/domain/schemas";

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

function optionalPositiveInt(formData: FormData, name: string): number | undefined {
  const value = optionalText(formData, name);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Create a tender together with its backing source record (governance: a
 * tender must always cite the dossier/document it was captured from).
 */
export async function createTender(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const sourceParsed = createSourceSchema.safeParse({
    type: "tender_document",
    title: String(formData.get("sourceTitle") ?? "").trim(),
    capturedAt: new Date().toISOString(),
  });

  const tenderParsed = createTenderSchema.safeParse({
    code: String(formData.get("code") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    buyerOrganizationId: String(formData.get("buyerOrganizationId") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
    publicationDate: optionalText(formData, "publicationDate"),
    submissionDeadline: optionalText(formData, "submissionDeadline"),
    contractPeriodMonths: optionalPositiveInt(formData, "contractPeriodMonths"),
    status: "published",
    // Placeholder passes min(1); the real source id is attached after the
    // source record is created (only when all validation passed).
    sourceId: "pending",
  });

  if (!sourceParsed.success || !tenderParsed.success) {
    return {
      ok: false,
      error: "The tender could not be created. Review the highlighted fields.",
      fieldErrors: {
        // Source-schema 'title' maps to the dialog's sourceTitle field.
        ...(sourceParsed.success ? {} : renameKeys(firstIssues(sourceParsed.error), { title: "sourceTitle" })),
        ...(tenderParsed.success ? {} : firstIssues(tenderParsed.error)),
      },
    };
  }

  const repo = await getRepository();
  const source = await repo.createEntity("source", { ...sourceParsed.data, visibility: "canonical", isDemo: false });
  const tender = await repo.createEntity("tender", {
    ...tenderParsed.data,
    sourceId: source.id,
    visibility: "canonical",
    isDemo: false,
  });
  revalidatePath("/tenders");
  return { ok: true, id: tender.id };
}

function renameKeys(errors: Record<string, string>, mapping: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(errors).map(([key, value]) => [mapping[key] ?? key, value]));
}
