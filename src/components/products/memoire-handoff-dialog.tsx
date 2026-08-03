"use client";

import { useMemo, useState } from "react";
import { Copy, Download, Send, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toJsonExport } from "@/lib/domain/export";
import {
  buildMemoireHandoff,
  type BuildMemoireHandoffInput,
} from "@/lib/integrations/memoire";

import { copyText, downloadText } from "./download";

/**
 * "Send to Memoire" dialog: builds the nexus-handoff/v1 payload client-side
 * (schema-validated by buildMemoireHandoff), shows the JSON preview plus the
 * mandatory visibility warning, and offers Copy / Download — no silent send.
 */
export function MemoireHandoffDialog({
  input,
  triggerLabel = "Send to Memoire",
  fileName,
  disabled,
}: {
  /** Handoff builder input (handoffId/sentAt are generated fresh per open). */
  input: BuildMemoireHandoffInput;
  triggerLabel?: string;
  /** Downloaded file name; defaults from the entity id. */
  fileName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Build (and schema-validate) the payload when the dialog opens. Any
  // contract violation is shown instead of a payload — never send bad data.
  const { payload, buildError } = useMemo(() => {
    if (!open) return { payload: null, buildError: null as string | null };
    try {
      return { payload: buildMemoireHandoff(input), buildError: null as string | null };
    } catch (error) {
      return {
        payload: null,
        buildError: error instanceof Error ? error.message : "Failed to build handoff payload",
      };
    }
  }, [open, input]);

  const json = payload ? toJsonExport(payload) : "";
  const downloadName = fileName ?? `nexus-handoff-${input.entity.nexusEntityId}.json`;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => {
          setCopied(false);
          setOpen(true);
        }}
      >
        <Send className="h-3.5 w-3.5" aria-hidden="true" />
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send to Memoire</DialogTitle>
            <DialogDescription>
              Review the nexus-handoff/v1 payload. Copy it or download it as JSON, then import it
              in the Memoire workspace.
            </DialogDescription>
          </DialogHeader>

          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg p-3 text-xs text-warning-fg"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Visibility warning</p>
              <p className="mt-0.5">
                {payload?.visibilityWarning ??
                  input.visibilityWarning ??
                  "Contains tenant-private commercial intelligence from Life Science Nexus. Do not redistribute outside the tenant workspace."}
              </p>
            </div>
          </div>

          {buildError ? (
            <p role="alert" className="rounded-md border border-danger-border bg-danger-bg p-3 text-xs text-danger-fg">
              The payload could not be built: {buildError}
            </p>
          ) : (
            <pre
              aria-label="Handoff payload preview"
              className="max-h-72 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-800"
            >
              {json}
            </pre>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!payload}
              onClick={async () => {
                const ok = await copyText(json);
                setCopied(ok);
              }}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              {copied ? "Copied" : "Copy JSON"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!payload}
              onClick={() => downloadText(downloadName, json, "application/json")}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download .json
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
