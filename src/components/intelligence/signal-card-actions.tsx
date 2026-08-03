"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

import { MemoireHandoffDialog } from "@/components/products/memoire-handoff-dialog";
import { Button } from "@/components/ui/button";
import type { BuildMemoireHandoffInput } from "@/lib/integrations/memoire";
import type { SignalStatus } from "@/lib/domain/types";

type SignalAction = (input: { id: string }) => Promise<{ ok: true } | { ok: false; error: string }>;

/** Per-signal actions: acknowledge, dismiss (server actions) and Memoire handoff. */
export function SignalCardActions({
  signalId,
  status,
  handoffInput,
  acknowledge,
  dismiss,
}: {
  signalId: string;
  status: SignalStatus;
  handoffInput: BuildMemoireHandoffInput;
  acknowledge: SignalAction;
  dismiss: SignalAction;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: SignalAction) => {
    setError(null);
    startTransition(async () => {
      const result = await action({ id: signalId });
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "new" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(acknowledge)}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Acknowledge
          </Button>
        ) : null}
        {status !== "dismissed" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => run(dismiss)}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Dismiss
          </Button>
        ) : null}
        <MemoireHandoffDialog input={handoffInput} fileName={`nexus-handoff-${signalId}.json`} />
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
