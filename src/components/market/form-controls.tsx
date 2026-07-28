"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Client-side form helpers for the market module's server-action forms.
 *
 * Convention: server actions return `ActionState` (`{ ok: true }` or
 * `{ ok: false, error, fieldErrors? }`). `FormMessage` renders the top-level
 * error in an aria-live region; `fieldError()` maps a field name to its
 * message; `useFocusFirstError` moves focus to the first invalid control so
 * keyboard and screen-reader users land on the problem immediately.
 */

export interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Id of the created record, when the action creates one. */
  id?: string;
}

export const initialActionState: ActionState = { ok: false };

/** Top-level form error announced via aria-live. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.ok || !state.error) {
    return <div aria-live="polite" className="min-h-0" />;
  }
  return (
    <div
      aria-live="polite"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
    >
      {state.error}
    </div>
  );
}

/** First validation message for a field, or undefined. */
export function fieldError(state: ActionState, name: string): string | undefined {
  return state.fieldErrors?.[name];
}

/** Props wiring aria-invalid + aria-describedby for a labelled control. */
export function invalidProps(
  state: ActionState,
  name: string,
): { "aria-invalid"?: true; "aria-describedby"?: string } {
  return fieldError(state, name)
    ? { "aria-invalid": true, "aria-describedby": `${name}-error` }
    : {};
}

/** Inline per-field error text (pair with `invalidProps`). */
export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const message = fieldError(state, name);
  if (!message) return null;
  return (
    <p id={`${name}-error`} className="text-xs text-red-600">
      {message}
    </p>
  );
}

/** Focus the first control that carries a validation error. */
export function useFocusFirstError(state: ActionState, formRef: React.RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (state.ok || !state.fieldErrors) return;
    const first = Object.keys(state.fieldErrors)[0];
    if (!first) return;
    const form = formRef.current;
    const control = form?.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`);
    control?.focus();
  }, [state, formRef]);
}

/** Standard labelled field wrapper (label above, control, error below). */
export function FormField({
  label,
  name,
  required,
  children,
  className,
}: {
  label: string;
  name: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={name} className="text-xs">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-red-600">
            *
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

/** Submit button that disables and reports progress while the action runs. */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Styled native select that posts through FormData (name included). */
export function NativeSelect({
  id,
  name,
  defaultValue,
  required,
  disabled,
  options,
  placeholder,
  className,
  ariaInvalid,
  ariaDescribedBy,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}) {
  return (
    <select
      id={id ?? name}
      name={name}
      defaultValue={defaultValue}
      required={required}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      className={cn(
        "h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
