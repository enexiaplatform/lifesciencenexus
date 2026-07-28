import { getRepository } from "@/lib/data";
import { ResolutionQueue, type CandidatePair } from "@/components/ops/resolution-queue";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EntityType } from "@/lib/domain/types";

export const metadata = { title: "Entity Resolution" };
export const dynamic = "force-dynamic";

/**
 * /admin/entity-resolution — duplicate queue (score + matchedOn, side-by-side
 * comparison, merge dialog with field-level choices, dismissal) plus the
 * merge history from entity_merge_events.
 */
export default async function EntityResolutionPage() {
  const repo = await getRepository();
  const candidates = await repo.listDuplicateCandidates({
    filters: { status: "pending" },
    pageSize: 25,
    sort: { field: "score", direction: "desc" },
  });

  const pairs: CandidatePair[] = await Promise.all(
    candidates.items.map(async (candidate) => {
      const [left, right] = await Promise.all([
        repo.getById(candidate.entityType as EntityType, candidate.leftId),
        repo.getById(candidate.entityType as EntityType, candidate.rightId),
      ]);
      return {
        candidate,
        left: left ? (left as unknown as Record<string, unknown>) : null,
        right: right ? (right as unknown as Record<string, unknown>) : null,
      };
    }),
  );

  const mergeEvents = await repo.list("entity_merge_event", {
    pageSize: 25,
    sort: { field: "createdAt", direction: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Entity Resolution</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Triage duplicate candidates scored by the entity-resolution engine. Merges are never
          silent: the loser’s names are preserved as aliases and a redirect keeps old links working.
        </p>
      </div>

      <section aria-label="Duplicate queue">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          {pairs.length} pending candidate{pairs.length === 1 ? "" : "s"}
        </h2>
        <ResolutionQueue pairs={pairs} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Merge history</CardTitle>
          <CardDescription>Completed merges from entity_merge_events (most recent first).</CardDescription>
        </CardHeader>
        <CardContent>
          {mergeEvents.items.length === 0 ? (
            <p className="text-sm text-slate-500">No merges recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Survivor</TableHead>
                  <TableHead>Merged away</TableHead>
                  <TableHead>Aliases</TableHead>
                  <TableHead>Redirect</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mergeEvents.items.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-mono text-xs">{event.id.slice(0, 8)}</TableCell>
                    <TableCell><Badge variant="secondary">{event.entityType}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{event.survivorId}</TableCell>
                    <TableCell className="font-mono text-xs">{event.mergedId}</TableCell>
                    <TableCell>
                      <Badge variant={event.aliasPreservation ? "success" : "outline"}>
                        {event.aliasPreservation ? "preserved" : "none"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={event.redirectCreated ? "success" : "outline"}>
                        {event.redirectCreated ? "created" : "none"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(event.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
