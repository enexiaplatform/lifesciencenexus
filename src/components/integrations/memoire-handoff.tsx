"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Memoire handoff builder (client): pick an entity, optionally override the
 * suggested action, then build the nexus-handoff/v1 payload via
 * POST /api/v1/integrations/memoire/handoff. The payload is previewed as JSON
 * and can be copied or downloaded; every build is recorded server-side in the
 * outbound handoff log (status: prepared).
 */

export interface HandoffEntityOption {
  entityType: string;
  entityId: string;
  label: string;
}

const ACTION_KINDS = [
  { value: "auto", label: "Default for this entity type" },
  { value: "create_account", label: "Create account" },
  { value: "create_opportunity_note", label: "Create opportunity note" },
  { value: "add_stakeholder", label: "Add stakeholder" },
  { value: "log_activity", label: "Log activity" },
  { value: "review_signal", label: "Review signal" },
] as const;

export function MemoireHandoffBuilder({
  entities,
  tenantId,
}: {
  entities: HandoffEntityOption[];
  tenantId: string;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState("");
  const [actionKind, setActionKind] = useState("auto");
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function build() {
    const [entityType, entityId] = selection.split("|");
    if (!entityType || !entityId) return;
    setError(null);
    setCopied(false);
    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/integrations/memoire/handoff", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-nexus-tenant": tenantId,
          },
          body: JSON.stringify({
            entityType,
            entityId,
            ...(actionKind !== "auto" ? { suggestedActionKind: actionKind } : {}),
          }),
        });
        const body = await response.json();
        if (!response.ok) {
          setError(body?.error?.message ?? `Handoff failed (${response.status}).`);
          setPayload(null);
          return;
        }
        setPayload(body.data);
        router.refresh(); // refresh the outbound handoff log
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Handoff request failed.");
        setPayload(null);
      }
    });
  }

  function copyPayload() {
    if (!payload) return;
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadPayload() {
    if (!payload) return;
    const handoffId = typeof payload.handoffId === "string" ? payload.handoffId.slice(0, 8) : "payload";
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nexus-handoff-${handoffId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="handoff-entity">Entity</Label>
          <Select value={selection} onValueChange={setSelection}>
            <SelectTrigger id="handoff-entity">
              <SelectValue placeholder="Choose an entity…" />
            </SelectTrigger>
            <SelectContent>
              {entities.map((option) => (
                <SelectItem key={`${option.entityType}|${option.entityId}`} value={`${option.entityType}|${option.entityId}`}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="handoff-action">Suggested action</Label>
          <Select value={actionKind} onValueChange={setActionKind}>
            <SelectTrigger id="handoff-action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_KINDS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={build} disabled={selection === "" || isPending}>
            <Send className="h-4 w-4" aria-hidden="true" />
            {isPending ? "Building…" : "Build handoff payload"}
          </Button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {payload ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyPayload}>
              {copied ? <Check className="h-4 w-4 text-teal-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? "Copied" : "Copy JSON"}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPayload}>
              <Download className="h-4 w-4" aria-hidden="true" /> Download .json
            </Button>
          </div>
          <pre
            className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100"
            tabIndex={0}
            aria-label="Handoff payload JSON preview"
          >
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
