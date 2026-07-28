"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepository } from "@/lib/data";

export type SignalActionResult = { ok: true } | { ok: false; error: string };

const idSchema = z.object({ id: z.string().min(1) }).strict();

/** Mark a signal acknowledged (keeps it visible, leaves the new queue). */
export async function acknowledgeSignalAction(input: { id: string }): Promise<SignalActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid signal id" };
  try {
    const repo = await getRepository();
    await repo.acknowledgeSignal(parsed.data.id);
    revalidatePath("/signals");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Dismiss a signal (hidden from default views via the status filter). */
export async function dismissSignalAction(input: { id: string }): Promise<SignalActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid signal id" };
  try {
    const repo = await getRepository();
    await repo.dismissSignal(parsed.data.id);
    revalidatePath("/signals");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
