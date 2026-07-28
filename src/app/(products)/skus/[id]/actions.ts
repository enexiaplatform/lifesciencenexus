"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepository } from "@/lib/data";
import { demoTenantId } from "@/lib/env";

export type SkuActionResult = { ok: true } | { ok: false; error: string };

const addToProjectSchema = z
  .object({
    projectId: z.string().min(1, "Select a research project"),
    skuId: z.string().min(1),
  })
  .strict();

/** Link a SKU to a research project (idempotent — duplicate links are rejected). */
export async function addSkuToResearchProject(input: {
  projectId: string;
  skuId: string;
}): Promise<SkuActionResult> {
  const parsed = addToProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join("; ") };
  }
  try {
    const repo = await getRepository();
    const project = await repo.getById("research_project", parsed.data.projectId);
    if (!project) return { ok: false, error: "Research project not found" };
    const sku = await repo.getById("sku", parsed.data.skuId);
    if (!sku) return { ok: false, error: "SKU not found" };

    const existing = await repo.list("research_project_entity", {
      filters: { projectId: project.id, entityType: "sku", entityId: sku.id },
      pageSize: 5,
    });
    if (existing.total > 0) {
      return { ok: false, error: `This SKU is already linked to “${project.title}”.` };
    }

    await repo.createEntity("research_project_entity", {
      tenantId: demoTenantId,
      projectId: project.id,
      entityType: "sku",
      entityId: sku.id,
      visibility: "tenant_private",
      isDemo: false,
    });
    revalidatePath(`/skus/${sku.id}`);
    revalidatePath("/research");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
