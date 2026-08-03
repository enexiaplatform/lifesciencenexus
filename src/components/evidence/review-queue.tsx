"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import type {
  ConfidenceDimensions,
  EntityType,
  EvidenceState,
  SourceType,
} from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ConfidenceMiniBars } from "@/components/evidence/confidence";
import { EvidenceStateBadge } from "@/components/evidence/state-badge";
import { IsDemoBadge } from "@/components/evidence/meta-badges";
import { SourceChip } from "@/components/evidence/source-chip";
import { formatDate } from "@/components/evidence/format";
import { entityHref, humanize } from "@/components/search/entity-routes";
import { reviewClaimAction } from "@/app/(research)/review/actions";

export interface ReviewQueueRow {
  id: string;
  subjectEntityType: EntityType;
  subjectEntityId: string;
  subjectTitle: string;
  predicate: string;
  valueText: string;
  sourceTitle: string;
  sourceType: SourceType;
  reviewStatus: EvidenceState;
  reviewByDate?: string;
  overdue: boolean;
  confidence: ConfidenceDimensions;
  reviewerId?: string;
  isDemo: boolean;
}

type ReviewTarget = "structurally_validated" | "analyst_reviewed" | "disputed" | "expired";

const REVIEW_ACTIONS: Array<{ value: ReviewTarget; label: string }> = [
  { value: "structurally_validated", label: "Advance to Structurally validated" },
  { value: "analyst_reviewed", label: "Advance to Analyst reviewed" },
  { value: "disputed", label: "Mark as Disputed" },
  { value: "expired", label: "Mark as Expired" },
];

/** Review queue table with a per-row reviewer action dialog. */
export function ReviewQueue({ rows }: { rows: ReviewQueueRow[] }) {
  const [reviewing, setReviewing] = useState<ReviewQueueRow | null>(null);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Queue is clear"
        description="No claims are waiting for review and nothing is past its review-by date. Capture new sources to keep evidence flowing."
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/sources?dialog=add">Add source</Link>
          </Button>
        }
      />
    );
  }

  // Overdue first, then by review-by date ascending, then state.
  const sorted = [...rows].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return (a.reviewByDate ?? "9999").localeCompare(b.reviewByDate ?? "9999");
  });

  return (
    <>
      <Card>
        <Table compact>
          <TableHeader>
            <TableRow>
              <TableHead>Claim</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Review by</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.id} className={row.overdue ? "bg-danger-bg/40" : undefined}>
                <TableCell className="max-w-64">
                  <Link
                    href={entityHref(row.subjectEntityType, row.subjectEntityId)}
                    className="block truncate font-medium text-slate-900 hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    title={row.subjectTitle}
                  >
                    {row.subjectTitle}
                  </Link>
                  <span className="text-xs text-slate-500">{humanize(row.predicate)}</span>
                  <IsDemoBadge isDemo={row.isDemo} className="ml-1" />
                </TableCell>
                <TableCell className="max-w-48">
                  <span className="block truncate text-xs text-slate-600" title={row.valueText}>
                    {row.valueText}
                  </span>
                </TableCell>
                <TableCell>
                  <SourceChip type={row.sourceType} title={row.sourceTitle} />
                </TableCell>
                <TableCell>
                  <ConfidenceMiniBars confidence={row.confidence} />
                </TableCell>
                <TableCell>
                  <EvidenceStateBadge state={row.reviewStatus} />
                </TableCell>
                <TableCell
                  className={
                    row.overdue
                      ? "whitespace-nowrap text-xs font-medium tabular-nums text-danger-fg"
                      : "whitespace-nowrap text-xs tabular-nums text-slate-600"
                  }
                >
                  {row.reviewByDate ? formatDate(row.reviewByDate) : "—"}
                  {row.overdue && <span className="block text-[10px]">Overdue</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-slate-600">
                  {row.reviewerId ?? "Unassigned"}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setReviewing(row)}>
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <ReviewActionDialog row={reviewing} onClose={() => setReviewing(null)} />
    </>
  );
}

function ReviewActionDialog({
  row,
  onClose,
}: {
  row: ReviewQueueRow | null;
  onClose: () => void;
}) {
  const [action, setAction] = useState<ReviewTarget>("structurally_validated");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (row) {
      setAction(
        row.reviewStatus === "unverified" ? "structurally_validated" : "analyst_reviewed",
      );
      setNote("");
      setError(null);
    }
  }, [row]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row) return;
    setError(null);
    startTransition(async () => {
      const result = await reviewClaimAction({
        claimId: row.id,
        toState: action,
        note,
      });
      if (result.ok) {
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={row !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review claim</DialogTitle>
          <DialogDescription>
            {row
              ? `${humanize(row.predicate)} — ${row.subjectTitle}: ${row.valueText}`
              : "Review this claim"}
          </DialogDescription>
        </DialogHeader>
        {row && (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span>Current state:</span>
              <EvidenceStateBadge state={row.reviewStatus} />
              <SourceChip type={row.sourceType} title={row.sourceTitle} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-action">Review action</Label>
              <Select value={action} onValueChange={(value) => setAction(value as ReviewTarget)}>
                <SelectTrigger id="review-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_ACTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-note">
                Review note <span className="text-danger-fg">(required)</span>
              </Label>
              <Textarea
                id="review-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                required
                minLength={3}
                placeholder="Why this decision? Reference the evidence you checked…"
              />
            </div>
            <div aria-live="polite">
              {error && <p className="text-sm text-danger-fg">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending || note.trim().length < 3}>
                {pending ? "Recording…" : "Record review"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
