import { z } from "zod";

/**
 * Validation for the request-access form on /contact.
 *
 * There is no CRM or leads table behind this form; the schema exists so the
 * server action can validate input and return per-field errors honestly.
 */
export const LEAD_ROLES = [
  "procurement",
  "qc_lab",
  "r_and_d",
  "commercial",
  "other",
] as const;

export const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name (at least 2 characters).")
    .max(100, "Name must be 100 characters or fewer."),
  email: z
    .string()
    .trim()
    .email("Enter a valid work email address."),
  company: z
    .string()
    .trim()
    .min(2, "Enter your organization name (at least 2 characters).")
    .max(100, "Organization name must be 100 characters or fewer."),
  role: z.enum(LEAD_ROLES, {
    errorMap: () => ({ message: "Select the role that describes you best." }),
  }),
  message: z
    .string()
    .trim()
    .min(10, "Tell us briefly what you want to evaluate (at least 10 characters).")
    .max(2000, "Message must be 2000 characters or fewer."),
});

export type LeadInput = z.infer<typeof leadSchema>;
