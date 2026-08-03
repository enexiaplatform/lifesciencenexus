"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

import {
  FieldError,
  FormField,
  FormMessage,
  NativeSelect,
  SubmitButton,
  initialActionState,
  invalidProps,
  useFocusFirstError,
} from "@/components/market/form-controls";
import { IDENTIFIER_SCHEME_LABELS, ORGANIZATION_TYPE_LABELS } from "@/components/market/labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { IDENTIFIER_SCHEMES, ORGANIZATION_TYPES } from "@/lib/domain/types";

import { createOrganization } from "./actions";

/**
 * "Create organization" dialog. Posts to the `createOrganization` server
 * action (zod-validated), shows per-field errors accessibly, and navigates to
 * the new record on success.
 */
export function CreateOrganizationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(createOrganization, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);

  useEffect(() => {
    if (state.ok && state.id) {
      setOpen(false);
      setFormKey((key) => key + 1);
      router.push(`/organizations/${state.id}`);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden="true" />
          Create organization
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Adds a canonical organization to the shared graph. Evidence (sources, claims) can be attached after
            creation.
          </DialogDescription>
        </DialogHeader>
        <form key={formKey} ref={formRef} action={formAction} className="space-y-4" noValidate>
          <FormMessage state={state} />

          <FormField label="Name" name="name" required>
            <Input
              id="name"
              name="name"
              required
              autoComplete="off"
              placeholder="e.g. Mekong Lab Supply"
              {...invalidProps(state, "name")}
            />
            <FieldError state={state} name="name" />
          </FormField>

          <fieldset className="space-y-1">
            <legend className="text-xs font-medium text-slate-700">
              Organization types
              <span aria-hidden="true" className="ml-0.5 text-danger">
                *
              </span>
            </legend>
            <div
              className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-slate-200 p-2"
              {...invalidProps(state, "types")}
            >
              {ORGANIZATION_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" name="types" value={type} className="h-3.5 w-3.5 accent-nexus-700" />
                  {ORGANIZATION_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
            <FieldError state={state} name="types" />
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Country (ISO alpha-2)" name="country" required>
              <Input
                id="country"
                name="country"
                required
                maxLength={2}
                placeholder="VN"
                autoComplete="off"
                className="uppercase"
                {...invalidProps(state, "country")}
              />
              <FieldError state={state} name="country" />
            </FormField>
            <FormField label="Website" name="website">
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://…"
                autoComplete="off"
                {...invalidProps(state, "website")}
              />
              <FieldError state={state} name="website" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Identifier scheme" name="identifierScheme">
              <NativeSelect
                name="identifierScheme"
                defaultValue="tax_code"
                options={IDENTIFIER_SCHEMES.map((scheme) => ({
                  value: scheme,
                  label: IDENTIFIER_SCHEME_LABELS[scheme],
                }))}
              />
            </FormField>
            <FormField label="Identifier value" name="identifierValue">
              <Input
                id="identifierValue"
                name="identifierValue"
                autoComplete="off"
                placeholder="Optional"
                {...invalidProps(state, "identifiers")}
              />
              <FieldError state={state} name="identifiers" />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Creating…">Create organization</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
