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
import { EVIDENCE_STATE_LABELS } from "@/components/market/labels";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Inline capture forms on the tender detail page (add lot / add item / add
 * bidder / record award). Each posts to a bound server action, shows zod
 * field errors accessibly and resets itself on success.
 */

type BoundAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export interface SelectOption {
  value: string;
  label: string;
}

function useResetOnSuccess(state: ActionState, formRef: React.RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state, formRef]);
}

function SavedNote({ state }: { state: ActionState }) {
  if (!state.ok) return null;
  return (
    <p role="status" className="text-xs font-medium text-teal-700">
      Saved.
    </p>
  );
}

export function AddLotForm({ action }: { action: BoundAction }) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  useResetOnSuccess(state, formRef);

  return (
    <form ref={formRef} action={formAction} className="space-y-3" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Lot name" name="name" required>
          <Input id="lot-name" name="name" required autoComplete="off" placeholder="Lot 3 — …" {...invalidProps(state, "name")} />
          <FieldError state={state} name="name" />
        </FormField>
        <FormField label="Description" name="description">
          <Input id="lot-description" name="description" autoComplete="off" {...invalidProps(state, "description")} />
          <FieldError state={state} name="description" />
        </FormField>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Adding…">Add lot</SubmitButton>
        <SavedNote state={state} />
      </div>
    </form>
  );
}

export function AddItemForm({ action, lots, skus }: { action: BoundAction; lots: SelectOption[]; skus: SelectOption[] }) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  useResetOnSuccess(state, formRef);

  return (
    <form ref={formRef} action={formAction} className="space-y-3" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Lot" name="lotId" required>
          <NativeSelect
            name="lotId"
            required
            placeholder="Select lot…"
            options={lots}
            ariaInvalid={Boolean(state.fieldErrors?.lotId)}
            ariaDescribedBy={state.fieldErrors?.lotId ? "lotId-error" : undefined}
          />
          <FieldError state={state} name="lotId" />
        </FormField>
        <FormField label="Description" name="description" required>
          <Input
            id="item-description"
            name="description"
            required
            autoComplete="off"
            placeholder="Item as stated in the dossier"
            {...invalidProps(state, "description")}
          />
          <FieldError state={state} name="description" />
        </FormField>
        <FormField label="Required specification" name="requiredSpecification">
          <Input
            id="requiredSpecification"
            name="requiredSpecification"
            autoComplete="off"
            {...invalidProps(state, "requiredSpecification")}
          />
          <FieldError state={state} name="requiredSpecification" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Quantity" name="quantity">
            <Input id="quantity" name="quantity" type="number" min={0} step="any" {...invalidProps(state, "quantity")} />
            <FieldError state={state} name="quantity" />
          </FormField>
          <FormField label="Unit" name="unit">
            <Input id="unit" name="unit" autoComplete="off" placeholder="bottle / pack" {...invalidProps(state, "unit")} />
            <FieldError state={state} name="unit" />
          </FormField>
        </div>
        <FormField label="Map to SKU" name="mappedSkuId" className="sm:col-span-2">
          <NativeSelect
            name="mappedSkuId"
            placeholder="No product mapping"
            options={skus}
            ariaInvalid={Boolean(state.fieldErrors?.mappedSkuId)}
            ariaDescribedBy={state.fieldErrors?.mappedSkuId ? "mappedSkuId-error" : undefined}
          />
          <FieldError state={state} name="mappedSkuId" />
        </FormField>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Adding…">Add item</SubmitButton>
        <SavedNote state={state} />
      </div>
    </form>
  );
}

export function AddBidderForm({
  action,
  lots,
  organizations,
}: {
  action: BoundAction;
  lots: SelectOption[];
  organizations: SelectOption[];
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  useResetOnSuccess(state, formRef);

  return (
    <form ref={formRef} action={formAction} className="space-y-3" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Bid scope" name="scope" required>
          <NativeSelect
            name="scope"
            required
            options={[{ value: "tender", label: "Whole tender" }, ...lots.map((lot) => ({ value: `lot:${lot.value}`, label: lot.label }))]}
            ariaInvalid={Boolean(state.fieldErrors?.scope)}
            ariaDescribedBy={state.fieldErrors?.scope ? "scope-error" : undefined}
          />
          <FieldError state={state} name="scope" />
        </FormField>
        <FormField label="Bidder organization" name="organizationId" required>
          <NativeSelect
            name="organizationId"
            required
            placeholder="Select organization…"
            options={organizations}
            ariaInvalid={Boolean(state.fieldErrors?.organizationId)}
            ariaDescribedBy={state.fieldErrors?.organizationId ? "organizationId-error" : undefined}
          />
          <FieldError state={state} name="organizationId" />
        </FormField>
        <FormField label="Bid amount" name="bidAmount">
          <Input id="bidAmount" name="bidAmount" type="number" min={0} step="any" {...invalidProps(state, "bidAmount")} />
          <FieldError state={state} name="bidAmount" />
        </FormField>
        <FormField label="Currency" name="currency">
          <Input id="bid-currency" name="currency" maxLength={3} placeholder="VND" autoComplete="off" className="uppercase" {...invalidProps(state, "currency")} />
          <FieldError state={state} name="currency" />
        </FormField>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Recording…">Record bidder</SubmitButton>
        <SavedNote state={state} />
      </div>
    </form>
  );
}

export function RecordAwardForm({
  action,
  lots,
  items,
  organizations,
  products,
  evidenceSourceId,
}: {
  action: BoundAction;
  lots: SelectOption[];
  items: SelectOption[];
  organizations: SelectOption[];
  products: SelectOption[];
  evidenceSourceId: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  useResetOnSuccess(state, formRef);

  return (
    <form ref={formRef} action={formAction} className="space-y-3" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="evidenceSourceId" value={evidenceSourceId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Award scope" name="scope" required>
          <NativeSelect
            name="scope"
            required
            placeholder="Select lot or item…"
            options={[
              ...lots.map((lot) => ({ value: `lot:${lot.value}`, label: `Lot — ${lot.label}` })),
              ...items.map((item) => ({ value: `item:${item.value}`, label: `Item — ${item.label}` })),
            ]}
            ariaInvalid={Boolean(state.fieldErrors?.scope)}
            ariaDescribedBy={state.fieldErrors?.scope ? "scope-error" : undefined}
          />
          <FieldError state={state} name="scope" />
        </FormField>
        <FormField label="Awarded supplier" name="awardedSupplierOrgId" required>
          <NativeSelect
            name="awardedSupplierOrgId"
            required
            placeholder="Select supplier…"
            options={organizations}
            ariaInvalid={Boolean(state.fieldErrors?.awardedSupplierOrgId)}
            ariaDescribedBy={state.fieldErrors?.awardedSupplierOrgId ? "awardedSupplierOrgId-error" : undefined}
          />
          <FieldError state={state} name="awardedSupplierOrgId" />
        </FormField>
        <FormField label="Awarded manufacturer" name="awardedManufacturerOrgId">
          <NativeSelect name="awardedManufacturerOrgId" placeholder="Unknown / not stated" options={organizations} />
        </FormField>
        <FormField label="Awarded product" name="awardedProductId">
          <NativeSelect name="awardedProductId" placeholder="Not mapped" options={products} />
        </FormField>
        <FormField label="Amount" name="amount" required>
          <Input id="amount" name="amount" type="number" min={0} step="any" required {...invalidProps(state, "amount")} />
          <FieldError state={state} name="amount" />
        </FormField>
        <FormField label="Currency" name="currency" required>
          <Input
            id="currency"
            name="currency"
            required
            maxLength={3}
            placeholder="VND"
            autoComplete="off"
            className="uppercase"
            {...invalidProps(state, "currency")}
          />
          <FieldError state={state} name="currency" />
        </FormField>
        <FormField label="Award date" name="awardDate">
          <Input id="awardDate" name="awardDate" type="date" {...invalidProps(state, "awardDate")} />
          <FieldError state={state} name="awardDate" />
        </FormField>
        <FormField label="Evidence state" name="evidenceState" required>
          <NativeSelect
            name="evidenceState"
            required
            defaultValue="source_captured"
            options={(["unverified", "source_captured"] as const).map((value) => ({
              value,
              label: EVIDENCE_STATE_LABELS[value],
            }))}
            ariaInvalid={Boolean(state.fieldErrors?.evidence)}
          />
          <FieldError state={state} name="evidence" />
        </FormField>
        <FormField label="Evidence confidence (0–1)" name="confidence" required>
          <Input
            id="confidence"
            name="confidence"
            type="number"
            min={0}
            max={1}
            step={0.05}
            defaultValue={0.8}
            required
            {...invalidProps(state, "confidence")}
          />
          <FieldError state={state} name="confidence" />
        </FormField>
        <FormField label="Evidence notes" name="evidenceNotes" className="sm:col-span-2">
          <Textarea id="evidenceNotes" name="evidenceNotes" rows={2} placeholder="Where in the dossier the award is stated…" />
        </FormField>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Recording…">Record award</SubmitButton>
        <SavedNote state={state} />
      </div>
    </form>
  );
}
