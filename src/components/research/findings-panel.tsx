"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";

import type { EvidenceState, ResearchFindingKind } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IsDemoBadge } from "@/components/evidence/meta-badges";
import { EvidenceStateBadge } from "@/components/evidence/state-badge";
import { formatDate } from "@/components/evidence/format";
import {
  FINDING_KIND_ORDER,
  FINDING_KIND_STYLES,
} from "@/components/research/finding-kinds";
import {
  addResearchFindingAction,
  updateResearchFindingAction,
} from "@/app/(research)/research/actions";
import { cn } from "@/lib/utils";

export interface FindingItem {
  id: string;
  kind: ResearchFindingKind;
  text: string;
  evidenceClaimIds: string[];
  updatedAt: string;
  isDemo: boolean;
}

export interface ClaimOption {
  id: string;
  label: string;
  reviewStatus: EvidenceState;
}

/** FINDINGS panel: grouped by epistemic kind, add/edit with claim linking. */
export function FindingsPanel({
  projectId,
  findings,
  claimOptions,
}: {
  projectId: string;
  findings: FindingItem[];
  claimOptions: ClaimOption[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FindingItem | null>(null);

  const grouped = useMemo(
    () =>
      FINDING_KIND_ORDER.map((kind) => ({
        kind,
        items: findings.filter((finding) => finding.kind === kind),
      })),
    [findings],
  );

  const claimLabelById = useMemo(
    () => new Map(claimOptions.map((option) => [option.id, option])),
    [claimOptions],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Findings</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add finding
          </Button>
        </div>
        <CardDescription className="text-xs">
          Verified facts stay visually separated from interpretations, assumptions, unknowns
          and recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {findings.length === 0 ? (
          <p className="text-sm text-slate-500">
            No findings yet — record what is known, what is assumed and what is still unknown.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ kind, items }) => (
              <section key={kind}>
                <h3 className="mb-1.5 flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px]", FINDING_KIND_STYLES[kind].className)}>
                    {FINDING_KIND_STYLES[kind].label}
                  </Badge>
                  <span className="text-xs tabular-nums text-slate-400">{items.length}</span>
                </h3>
                {items.length > 0 && (
                  <ul className="space-y-1.5">
                    {items.map((finding) => (
                      <li
                        key={finding.id}
                        className="rounded-md border border-slate-200 px-3 py-2"
                      >
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 text-sm text-slate-800">{finding.text}</p>
                          <IsDemoBadge isDemo={finding.isDemo} />
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(finding);
                              setDialogOpen(true);
                            }}
                            aria-label="Edit finding"
                            className="rounded-sm p-1 text-slate-400 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Updated {formatDate(finding.updatedAt)}
                        </p>
                        {finding.evidenceClaimIds.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {finding.evidenceClaimIds.map((claimId) => {
                              const claim = claimLabelById.get(claimId);
                              return claim ? (
                                <EvidenceStateBadge
                                  key={claimId}
                                  state={claim.reviewStatus}
                                  className="max-w-56 truncate"
                                />
                              ) : (
                                <Badge key={claimId} variant="outline" className="max-w-56 truncate text-[10px]">
                                  {claimId}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </CardContent>
      <FindingDialog
        projectId={projectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        claimOptions={claimOptions}
      />
    </Card>
  );
}

function FindingDialog({
  projectId,
  open,
  onOpenChange,
  editing,
  claimOptions,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FindingItem | null;
  claimOptions: ClaimOption[];
}) {
  const [kind, setKind] = useState<ResearchFindingKind>("verified_fact");
  const [text, setText] = useState("");
  const [claimIds, setClaimIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Re-seed the form whenever the dialog target changes.
  useEffect(() => {
    if (open) {
      setKind(editing?.kind ?? "verified_fact");
      setText(editing?.text ?? "");
      setClaimIds(editing?.evidenceClaimIds ?? []);
      setError(null);
    }
  }, [open, editing]);

  function toggleClaim(id: string) {
    setClaimIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = { projectId, kind, text, evidenceClaimIds: claimIds };
      const result = editing
        ? await updateResearchFindingAction({ ...payload, findingId: editing.id })
        : await addResearchFindingAction(payload);
      if (result.ok) {
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit finding" : "Add finding"}</DialogTitle>
          <DialogDescription>
            Choose the epistemic kind carefully — verified facts must be backed by evidence
            claims.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="finding-kind">Kind</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as ResearchFindingKind)}>
              <SelectTrigger id="finding-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINDING_KIND_ORDER.map((value) => (
                  <SelectItem key={value} value={value}>
                    {FINDING_KIND_STYLES[value].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="finding-text">Finding</Label>
            <Textarea
              id="finding-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              required
              placeholder="State the finding precisely…"
            />
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-slate-700">
              Evidence claims{kind === "verified_fact" ? " (required for verified facts)" : ""}
            </legend>
            {claimOptions.length === 0 ? (
              <p className="text-xs text-slate-500">No claims in the graph yet.</p>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                {claimOptions.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={claimIds.includes(option.id)}
                      onChange={() => toggleClaim(option.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-navy-900"
                    />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{option.label}</span>
                    <EvidenceStateBadge state={option.reviewStatus} />
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <div aria-live="polite">
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Add finding"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
