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

import { createTender } from "./actions";

/**
 * "Record tender" dialog. Creates the tender plus its backing source record
 * (a tender must always cite the dossier it came from), then navigates to the
 * new tender detail so lots/items/bidders can be captured next.
 */
export function CreateTenderDialog({ organizations }: { organizations: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(createTender, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);

  useEffect(() => {
    if (state.ok && state.id) {
      setOpen(false);
      setFormKey((key) => key + 1);
      router.push(`/tenders/${state.id}`);
    }
  }, [state, router]);

  const sortedOrganizations = [...organizations].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden="true" />
          Record tender
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Record tender</DialogTitle>
          <DialogDescription>
            Captures a tender as published. Lots, items, bidders and the award are added from the tender detail
            page.
          </DialogDescription>
        </DialogHeader>
        <form key={formKey} ref={formRef} action={formAction} className="space-y-4" noValidate>
          <FormMessage state={state} />

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tender code" name="code" required>
              <Input
                id="code"
                name="code"
                required
                autoComplete="off"
                placeholder="e.g. RRH-2026-004"
                {...invalidProps(state, "code")}
              />
              <FieldError state={state} name="code" />
            </FormField>
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
          </div>

          <FormField label="Title" name="title" required>
            <Input
              id="title"
              name="title"
              required
              autoComplete="off"
              placeholder="Supply of …"
              {...invalidProps(state, "title")}
            />
            <FieldError state={state} name="title" />
          </FormField>

          <FormField label="Buyer organization" name="buyerOrganizationId" required>
            <NativeSelect
              name="buyerOrganizationId"
              required
              placeholder="Select buyer…"
              options={sortedOrganizations.map((org) => ({ value: org.id, label: org.name }))}
              ariaInvalid={Boolean(state.fieldErrors?.buyerOrganizationId)}
              ariaDescribedBy={state.fieldErrors?.buyerOrganizationId ? "buyerOrganizationId-error" : undefined}
            />
            <FieldError state={state} name="buyerOrganizationId" />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Publication date" name="publicationDate">
              <Input id="publicationDate" name="publicationDate" type="date" {...invalidProps(state, "publicationDate")} />
              <FieldError state={state} name="publicationDate" />
            </FormField>
            <FormField label="Submission deadline" name="submissionDeadline">
              <Input
                id="submissionDeadline"
                name="submissionDeadline"
                type="date"
                {...invalidProps(state, "submissionDeadline")}
              />
              <FieldError state={state} name="submissionDeadline" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Contract period (months)" name="contractPeriodMonths">
              <Input
                id="contractPeriodMonths"
                name="contractPeriodMonths"
                type="number"
                min={1}
                step={1}
                placeholder="12"
                {...invalidProps(state, "contractPeriodMonths")}
              />
              <FieldError state={state} name="contractPeriodMonths" />
            </FormField>
            <FormField label="Source title (dossier)" name="sourceTitle" required>
              <Input
                id="sourceTitle"
                name="sourceTitle"
                required
                autoComplete="off"
                placeholder="Tender dossier reference"
                {...invalidProps(state, "sourceTitle")}
              />
              <FieldError state={state} name="sourceTitle" />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Recording…">Record tender</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
