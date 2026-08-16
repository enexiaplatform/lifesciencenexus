"use server";

import { isDemoMode } from "@/lib/env";
import { leadSchema, type LeadInput } from "@/lib/leads/schema";

export type LeadFieldErrors = Partial<
  Record<keyof LeadInput, string[] | undefined>
>;

export type LeadFormState =
  | { status: "idle" }
  | { status: "error"; fieldErrors: LeadFieldErrors }
  | { status: "success"; demoNote?: string };

/**
 * Validate a request-access submission.
 *
 * This evaluation deployment has no CRM or leads store, so a valid
 * submission is acknowledged without being persisted — the success copy in
 * the UI says exactly that. In demo mode an additional note makes the
 * limitation explicit.
 */
export async function submitLead(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company"),
    role: formData.get("role"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  return {
    status: "success",
    demoNote: isDemoMode()
      ? "This deployment is running in demo mode against a synthetic dataset; no lead record is stored and no CRM is connected."
      : undefined,
  };
}
