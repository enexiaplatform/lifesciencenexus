"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Combobox, type ComboboxOption } from "@/components/products/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type CreateShellAction = (input: {
  sourceSkuId: string;
  candidateSkuId: string;
}) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;

/** Searchable source/candidate picker that creates the record shell and routes to the workspace. */
export function NewEquivalenceForm({
  options,
  createShell,
}: {
  options: ComboboxOption[];
  createShell: CreateShellAction;
}) {
  const router = useRouter();
  const [sourceSkuId, setSourceSkuId] = useState<string | null>(null);
  const [candidateSkuId, setCandidateSkuId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    if (!sourceSkuId || !candidateSkuId) {
      setError("Select both a source and a candidate SKU.");
      return;
    }
    if (sourceSkuId === candidateSkuId) {
      setError("Source and candidate SKU must be different.");
      return;
    }
    startTransition(async () => {
      const result = await createShell({ sourceSkuId, candidateSkuId });
      if (result.ok) {
        router.push(`/equivalence/${result.id}`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Assessment pair</CardTitle>
        <CardDescription>
          If a record for this exact pair already exists, you are taken to it instead of creating a
          duplicate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Combobox
          label="Source SKU (to be replaced)"
          options={options}
          value={sourceSkuId}
          onChange={setSourceSkuId}
          placeholder="Search SKUs…"
        />
        <Combobox
          label="Candidate SKU (potential substitute)"
          options={options}
          value={candidateSkuId}
          onChange={setCandidateSkuId}
          placeholder="Search SKUs…"
        />
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800"
          >
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={submit}
          disabled={pending || !sourceSkuId || !candidateSkuId}
        >
          {pending ? "Creating…" : "Create assessment"}
        </Button>
      </CardContent>
    </Card>
  );
}
