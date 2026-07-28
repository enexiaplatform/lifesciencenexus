"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  FieldError,
  FormField,
  FormMessage,
  NativeSelect,
  SubmitButton,
  initialActionState,
  invalidProps,
  useFocusFirstError,
  type ActionState,
} from "@/components/market/form-controls";
import { QUALIFICATION_STATUS_LABELS, humanize } from "@/components/market/labels";
import { Input } from "@/components/ui/input";
import { MAINTENANCE_EVENT_TYPES, QUALIFICATION_STATUSES } from "@/lib/domain/types";

/**
 * Inline forms on the installed-asset detail page: record a maintenance event
 * and update the qualification status. Both post to bound server actions.
 */

type BoundAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export interface SelectOption {
  value: string;
  label: string;
}

function SavedNote({ state }: { state: ActionState }) {
  if (!state.ok) return null;
  return (
    <p role="status" className="text-xs font-medium text-teal-700">
      Saved.
    </p>
  );
}

export function RecordMaintenanceForm({
  action,
  providers,
}: {
  action: BoundAction;
  providers: SelectOption[];
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Event type" name="type" required>
          <NativeSelect
            name="type"
            required
            options={MAINTENANCE_EVENT_TYPES.map((type) => ({ value: type, label: humanize(type) }))}
            ariaInvalid={Boolean(state.fieldErrors?.type)}
            ariaDescribedBy={state.fieldErrors?.type ? "type-error" : undefined}
          />
          <FieldError state={state} name="type" />
        </FormField>
        <FormField label="Date" name="at" required>
          <Input id="maint-at" name="at" type="date" required {...invalidProps(state, "at")} />
          <FieldError state={state} name="at" />
        </FormField>
        <FormField label="Service provider" name="providerOrgId">
          <NativeSelect name="providerOrgId" placeholder="Not recorded" options={providers} />
        </FormField>
        <FormField label="Next due date" name="nextDueDate">
          <Input id="nextDueDate" name="nextDueDate" type="date" {...invalidProps(state, "nextDueDate")} />
          <FieldError state={state} name="nextDueDate" />
        </FormField>
        <FormField label="Description" name="description" className="sm:col-span-2">
          <Input
            id="maint-description"
            name="description"
            autoComplete="off"
            placeholder="What was done, findings…"
            {...invalidProps(state, "description")}
          />
          <FieldError state={state} name="description" />
        </FormField>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Recording…">Record maintenance event</SubmitButton>
        <SavedNote state={state} />
      </div>
    </form>
  );
}

export function UpdateQualificationForm({
  action,
  current,
}: {
  action: BoundAction;
  current: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);

  return (
    <form ref={formRef} action={formAction} className="space-y-3" noValidate>
      <FormMessage state={state} />
      <FormField label="Qualification status" name="qualificationStatus" required>
        <NativeSelect
          key={current}
          name="qualificationStatus"
          required
          defaultValue={current}
          options={QUALIFICATION_STATUSES.map((status) => ({
            value: status,
            label: QUALIFICATION_STATUS_LABELS[status],
          }))}
          ariaInvalid={Boolean(state.fieldErrors?.qualificationStatus)}
          ariaDescribedBy={state.fieldErrors?.qualificationStatus ? "qualificationStatus-error" : undefined}
        />
        <FieldError state={state} name="qualificationStatus" />
      </FormField>
      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Updating…">Update qualification status</SubmitButton>
        <SavedNote state={state} />
      </div>
    </form>
  );
}
