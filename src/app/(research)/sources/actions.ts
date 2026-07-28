"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepository } from "@/lib/data";
import { SOURCE_TYPES } from "@/lib/domain/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

const createSourceSchema = z.object({
  type: z.enum(SOURCE_TYPES),
  title: z.string().trim().min(1, "Title is required"),
  publisher: z.string().trim().optional(),
  url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  publishedAt: z
    .string()
    .trim()
    .regex(ISO_DATE_RE, "Expected an ISO date (YYYY-MM-DD)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().optional(),
});

/** Register a new evidence source (catalogue, quotation, document, note…). */
export async function createSourceAction(input: unknown): Promise<ActionResult> {
  const parsed = createSourceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    const repo = await getRepository();
    await repo.createEntity("source", {
      visibility: "canonical",
      isDemo: false,
      type: parsed.data.type,
      title: parsed.data.title,
      publisher: parsed.data.publisher || undefined,
      url: parsed.data.url,
      publishedAt: parsed.data.publishedAt,
      capturedAt: new Date().toISOString(),
      notes: parsed.data.notes || undefined,
    });
    revalidatePath("/sources");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unexpected error" };
  }
}
