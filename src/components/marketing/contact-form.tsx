"use client";

import { ChevronDown } from "lucide-react";
import { useActionState } from "react";

import {
  submitLead,
  type LeadFieldErrors,
} from "@/app/(marketing)/contact/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ROLE_OPTIONS = [
  { value: "procurement", label: "Procurement / sourcing" },
  { value: "qc_lab", label: "QC / laboratory" },
  { value: "r_and_d", label: "R&D" },
  { value: "commercial", label: "Commercial / sales" },
  { value: "other", label: "Other" },
] as const;

function FieldError({
  id,
  errors,
}: {
  id: string;
  errors: string[] | undefined;
}) {
  if (!errors || errors.length === 0) {
    return null;
  }
  return (
    <p id={id} className="mt-1.5 text-xs text-red-600">
      {errors[0]}
    </p>
  );
}

/**
 * Request-access form. Validation runs in the `submitLead` server action;
 * per-field errors come back as state and are wired with aria-invalid +
 * aria-describedby per the design-system a11y rules.
 */
export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitLead, {
    status: "idle",
  });

  const fieldErrors: LeadFieldErrors =
    state.status === "error" ? state.fieldErrors : {};

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="rounded-lg border border-success-border bg-success-bg p-5"
      >
        <h2 className="text-sm font-semibold text-success-fg">
          Request received
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Thank you — your request was received for this evaluation
          deployment. The team reviews access requests for this deployment and
          follows up through the channel you provided.
        </p>
        {state.demoNote ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {state.demoNote}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div aria-live="polite" className="sr-only">
        {state.status === "error"
          ? "The form has validation errors. Review the highlighted fields."
          : ""}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-name">Name</Label>
          <Input
            id="lead-name"
            name="name"
            autoComplete="name"
            className="mt-1.5"
            aria-invalid={Boolean(fieldErrors.name) || undefined}
            aria-describedby={fieldErrors.name ? "lead-name-error" : undefined}
          />
          <FieldError id="lead-name-error" errors={fieldErrors.name} />
        </div>
        <div>
          <Label htmlFor="lead-email">Work email</Label>
          <Input
            id="lead-email"
            name="email"
            type="email"
            autoComplete="email"
            className="mt-1.5"
            aria-invalid={Boolean(fieldErrors.email) || undefined}
            aria-describedby={fieldErrors.email ? "lead-email-error" : undefined}
          />
          <FieldError id="lead-email-error" errors={fieldErrors.email} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-company">Company</Label>
          <Input
            id="lead-company"
            name="company"
            autoComplete="organization"
            className="mt-1.5"
            aria-invalid={Boolean(fieldErrors.company) || undefined}
            aria-describedby={
              fieldErrors.company ? "lead-company-error" : undefined
            }
          />
          <FieldError id="lead-company-error" errors={fieldErrors.company} />
        </div>
        <div>
          <Label htmlFor="lead-role">Role</Label>
          <div className="relative mt-1.5">
            <select
              id="lead-role"
              name="role"
              defaultValue=""
              aria-invalid={Boolean(fieldErrors.role) || undefined}
              aria-describedby={fieldErrors.role ? "lead-role-error" : undefined}
              className="flex h-9 w-full appearance-none items-center rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 shadow-xs transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-red-500/20"
            >
              <option value="" disabled>
                Select your role
              </option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          </div>
          <FieldError id="lead-role-error" errors={fieldErrors.role} />
        </div>
      </div>

      <div>
        <Label htmlFor="lead-message">Message</Label>
        <Textarea
          id="lead-message"
          name="message"
          rows={5}
          className="mt-1.5"
          placeholder="What are you evaluating — a market, a portfolio, a tender pipeline?"
          aria-invalid={Boolean(fieldErrors.message) || undefined}
          aria-describedby={
            fieldErrors.message ? "lead-message-error" : undefined
          }
        />
        <FieldError id="lead-message-error" errors={fieldErrors.message} />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit request"}
        </Button>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Submitting this form does not create an account. This evaluation
          deployment does not store lead records in a CRM.
        </p>
      </div>
    </form>
  );
}
