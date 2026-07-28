"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepository } from "@/lib/data";
import type { SearchResult } from "@/lib/data/repository";
import { demoTenantId } from "@/lib/env";
import {
  ENTITY_TYPES,
  RESEARCH_EXPORT_FORMATS,
  RESEARCH_FINDING_KINDS,
  RESEARCH_PROJECT_STATUSES,
} from "@/lib/domain/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

function splitCodes(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

const createProjectSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  question: z.string().trim().min(1, "Research question is required"),
  scope: z.string().trim().optional(),
  geographyCodes: z.string().trim().optional(),
  industryCodes: z.string().trim().optional(),
});

export async function createResearchProjectAction(
  input: unknown,
): Promise<ActionResult & { id?: string }> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const repo = await getRepository();
    const project = await repo.createEntity("research_project", {
      tenantId: demoTenantId,
      visibility: "tenant_private",
      isDemo: false,
      title: parsed.data.title,
      question: parsed.data.question,
      scope: parsed.data.scope || undefined,
      geographyCodes: splitCodes(parsed.data.geographyCodes),
      industryCodes: splitCodes(parsed.data.industryCodes),
      status: "active",
    });
    revalidatePath("/research");
    revalidatePath("/dashboard");
    return { ok: true, id: project.id };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

const updateStatusSchema = z.object({
  projectId: z.string().min(1),
  status: z.enum(RESEARCH_PROJECT_STATUSES),
});

export async function updateResearchProjectStatusAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const repo = await getRepository();
    await repo.updateEntity("research_project", parsed.data.projectId, {
      status: parsed.data.status,
    });
    revalidatePath("/research");
    revalidatePath(`/research/${parsed.data.projectId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

// ---------------------------------------------------------------------------
// Entity collection
// ---------------------------------------------------------------------------

/** Search candidate entities for the "Add entity" dialog. */
export async function searchEntitiesForProjectAction(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const repo = await getRepository();
  return repo.search(trimmed, { limit: 10 });
}

const addEntitySchema = z.object({
  projectId: z.string().min(1),
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1),
});

export async function addProjectEntityAction(input: unknown): Promise<ActionResult> {
  const parsed = addEntitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const repo = await getRepository();
    const detail = await repo.getResearchProjectDetail(parsed.data.projectId);
    if (!detail) return { ok: false, error: "Research project not found" };
    const duplicate = detail.entities.some(
      (link) =>
        link.entityType === parsed.data.entityType && link.entityId === parsed.data.entityId,
    );
    if (duplicate) return { ok: false, error: "Entity is already linked to this project" };
    await repo.createEntity("research_project_entity", {
      tenantId: demoTenantId,
      visibility: "tenant_private",
      isDemo: false,
      projectId: parsed.data.projectId,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
    });
    revalidatePath(`/research/${parsed.data.projectId}`);
    revalidatePath("/research");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

const removeEntitySchema = z.object({
  projectId: z.string().min(1),
  linkId: z.string().min(1),
});

export async function removeProjectEntityAction(input: unknown): Promise<ActionResult> {
  const parsed = removeEntitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const repo = await getRepository();
    await repo.archiveEntity("research_project_entity", parsed.data.linkId);
    revalidatePath(`/research/${parsed.data.projectId}`);
    revalidatePath("/research");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

const addNoteSchema = z.object({
  projectId: z.string().min(1),
  text: z.string().trim().min(1, "Note text is required"),
});

export async function addResearchNoteAction(input: unknown): Promise<ActionResult> {
  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const repo = await getRepository();
    await repo.createEntity("research_note", {
      tenantId: demoTenantId,
      visibility: "tenant_private",
      isDemo: false,
      projectId: parsed.data.projectId,
      text: parsed.data.text,
    });
    revalidatePath(`/research/${parsed.data.projectId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

const findingSchema = z.object({
  projectId: z.string().min(1),
  kind: z.enum(RESEARCH_FINDING_KINDS),
  text: z.string().trim().min(1, "Finding text is required"),
  evidenceClaimIds: z.array(z.string().min(1)).default([]),
});

export async function addResearchFindingAction(input: unknown): Promise<ActionResult> {
  const parsed = findingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const repo = await getRepository();
    await repo.createEntity("research_finding", {
      tenantId: demoTenantId,
      visibility: "tenant_private",
      isDemo: false,
      projectId: parsed.data.projectId,
      kind: parsed.data.kind,
      text: parsed.data.text,
      evidenceClaimIds: parsed.data.evidenceClaimIds,
    });
    revalidatePath(`/research/${parsed.data.projectId}`);
    revalidatePath("/research");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

const updateFindingSchema = z.object({
  projectId: z.string().min(1),
  findingId: z.string().min(1),
  kind: z.enum(RESEARCH_FINDING_KINDS),
  text: z.string().trim().min(1, "Finding text is required"),
  evidenceClaimIds: z.array(z.string().min(1)).default([]),
});

export async function updateResearchFindingAction(input: unknown): Promise<ActionResult> {
  const parsed = updateFindingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const repo = await getRepository();
    await repo.updateEntity("research_finding", parsed.data.findingId, {
      kind: parsed.data.kind,
      text: parsed.data.text,
      evidenceClaimIds: parsed.data.evidenceClaimIds,
    });
    revalidatePath(`/research/${parsed.data.projectId}`);
    revalidatePath(`/research/${parsed.data.projectId}/report`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

// ---------------------------------------------------------------------------
// Export bookkeeping
// ---------------------------------------------------------------------------

const recordExportSchema = z.object({
  projectId: z.string().min(1),
  format: z.enum(RESEARCH_EXPORT_FORMATS),
  fileName: z.string().trim().min(1),
});

export async function recordResearchExportAction(input: unknown): Promise<ActionResult> {
  const parsed = recordExportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const repo = await getRepository();
    await repo.createEntity("research_export", {
      tenantId: demoTenantId,
      visibility: "tenant_private",
      isDemo: false,
      projectId: parsed.data.projectId,
      format: parsed.data.format,
      fileName: parsed.data.fileName,
    });
    revalidatePath(`/research/${parsed.data.projectId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
