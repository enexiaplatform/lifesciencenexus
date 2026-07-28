import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductEdge, ProductEdgeTargetType } from "@/lib/domain/types";

import { DomainEvidenceBadge } from "./badges";
import { ConfidenceValue, humanize } from "./format";
import { SourceChip } from "./source-chip";

export interface EdgeWithName extends ProductEdge {
  targetName: string | null;
}

export interface SourceInfo {
  id: string;
  title: string;
  type: string;
}

interface EdgeGroup {
  targetType: ProductEdgeTargetType;
  title: string;
}

const EDGE_GROUPS: EdgeGroup[] = [
  { targetType: "application", title: "Applications" },
  { targetType: "method", title: "Methods" },
  { targetType: "standard", title: "Standards" },
  { targetType: "organism", title: "Organisms" },
  { targetType: "sample_type", title: "Sample types" },
  { targetType: "industry", title: "Industries" },
  { targetType: "test_type", title: "Test types" },
  { targetType: "incubation_condition", title: "Incubation conditions" },
  { targetType: "preparation_method", title: "Preparation methods" },
];

/**
 * Evidence-carrying product edges grouped by target type. Every edge shows
 * its evidence state, numeric confidence and source chip — an edge without
 * visible provenance would read as unsupported fact.
 */
export function EdgePanels({
  edges,
  sources,
  groups = EDGE_GROUPS,
}: {
  edges: EdgeWithName[];
  sources: ReadonlyMap<string, SourceInfo>;
  groups?: EdgeGroup[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((group) => {
        const groupEdges = edges.filter((edge) => edge.targetType === group.targetType);
        if (groupEdges.length === 0) return null;
        return (
          <Card key={group.targetType}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">{group.title}</CardTitle>
              <CardDescription className="text-xs">
                {groupEdges.length} evidence-backed {groupEdges.length === 1 ? "link" : "links"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ul className="divide-y divide-slate-100">
                {groupEdges.map((edge) => {
                  const source = edge.evidence.sourceId
                    ? sources.get(edge.evidence.sourceId)
                    : undefined;
                  return (
                    <li key={edge.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {edge.targetName ?? edge.targetId}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          {edge.role ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                              {humanize(edge.role)}
                            </span>
                          ) : null}
                          <ConfidenceValue value={edge.evidence.confidence} />
                          <SourceChip
                            sourceId={edge.evidence.sourceId}
                            title={source?.title}
                            type={source?.type}
                          />
                        </div>
                      </div>
                      <DomainEvidenceBadge state={edge.evidence.state} />
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
