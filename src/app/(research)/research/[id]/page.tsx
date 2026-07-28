import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EvidenceStateBadge } from "@/components/evidence/state-badge";
import { IsDemoBadge, VisibilityBadge } from "@/components/evidence/meta-badges";
import { entityDisplayName, humanize } from "@/components/search/entity-routes";
import { EntityCollection } from "@/components/research/entity-collection";
import { NotesPanel } from "@/components/research/notes-panel";
import { FindingsPanel } from "@/components/research/findings-panel";
import { ExportCenter } from "@/components/research/export-center";
import { ProjectStatusSelect } from "@/components/research/project-status-select";
import { getRepository } from "@/lib/data";
import { aggregateConfidence } from "@/lib/domain/confidence";
import { EVIDENCE_STATES, type Claim, type EvidenceState } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Research workspace" };

export default async function ResearchWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = await getRepository();
  const detail = await repo.getResearchProjectDetail(id);
  if (!detail) notFound();

  const { project, notes, findings, entities, exports } = detail;

  // Resolve entity links to display titles.
  const resolvedEntities = await Promise.all(
    entities.map(async (link) => {
      const entity = await repo.getById(link.entityType, link.entityId);
      return {
        linkId: link.id,
        entityType: link.entityType,
        entityId: link.entityId,
        title: entity ? entityDisplayName(entity) : `${link.entityId} (missing)`,
        exists: entity !== null,
        isDemo: entity?.isDemo ?? false,
      };
    }),
  );

  // Claims linked from findings (confidence summary + evidence references).
  const linkedClaimIds = [...new Set(findings.flatMap((finding) => finding.evidenceClaimIds))];
  const linkedClaims = (
    await Promise.all(linkedClaimIds.map((claimId) => repo.getById("claim", claimId)))
  ).filter((claim): claim is Claim => claim !== null);

  // Claim picker options for the findings dialogs.
  const allClaims = await repo.list("claim", { pageSize: 500 });
  const claimOptions = await Promise.all(
    allClaims.items.map(async (claim) => {
      const subject = await repo.getById(claim.subjectEntityType, claim.subjectEntityId);
      return {
        id: claim.id,
        label: `${humanize(claim.predicate)} — ${entityDisplayName(subject)}`,
        reviewStatus: claim.reviewStatus,
      };
    }),
  );

  // Confidence summary over linked claims.
  const aggregates = linkedClaims.map((claim) => aggregateConfidence(claim.confidence));
  const averageConfidence =
    aggregates.length === 0
      ? null
      : Math.round((aggregates.reduce((sum, value) => sum + value, 0) / aggregates.length) * 100);
  const stateCounts = EVIDENCE_STATES.map((state: EvidenceState) => ({
    state,
    count: linkedClaims.filter((claim) => claim.reviewStatus === state).length,
  })).filter((entry) => entry.count > 0);

  // Data gaps: explicit unknowns + evidence-coverage hints.
  const unknownFindings = findings.filter((finding) => finding.kind === "unknown");
  const unsupportedFacts = findings.filter(
    (finding) => finding.kind === "verified_fact" && finding.evidenceClaimIds.length === 0,
  );

  const serializedFindings = findings.map((finding) => ({
    id: finding.id,
    kind: finding.kind,
    text: finding.text,
    evidenceClaimIds: finding.evidenceClaimIds,
    updatedAt: finding.updatedAt,
    isDemo: finding.isDemo,
  }));

  const serializedNotes = notes.map((note) => ({
    id: note.id,
    text: note.text,
    entityType: note.entityType,
    entityId: note.entityId,
    createdAt: note.createdAt,
    isDemo: note.isDemo,
  }));

  const claimReferences = linkedClaims.map((claim) => ({
    id: claim.id,
    predicate: claim.predicate,
    reviewStatus: claim.reviewStatus,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{project.title}</CardTitle>
                <VisibilityBadge visibility={project.visibility} />
                <IsDemoBadge isDemo={project.isDemo} />
              </div>
              <CardDescription className="mt-1.5 max-w-3xl">{project.question}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ProjectStatusSelect projectId={project.id} status={project.status} />
              <Button asChild variant="outline" size="sm">
                <Link href={`/research/${project.id}/report`}>
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  Report
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {project.scope && <p className="text-sm text-slate-600">{project.scope}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            {project.geographyCodes.map((code) => (
              <Badge key={code} variant="secondary" className="text-[10px]">
                {code}
              </Badge>
            ))}
            {project.industryCodes.map((code) => (
              <Badge key={code} variant="outline" className="text-[10px]">
                {humanize(code)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <EntityCollection projectId={project.id} entities={resolvedEntities} />
          <NotesPanel projectId={project.id} notes={serializedNotes} />
        </div>
        <div className="xl:col-span-2">
          <FindingsPanel
            projectId={project.id}
            findings={serializedFindings}
            claimOptions={claimOptions}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Confidence summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Confidence summary</CardTitle>
            <CardDescription className="text-xs">
              Aggregate confidence of claims linked to findings in this project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linkedClaims.length === 0 ? (
              <p className="text-sm text-slate-500">
                No evidence claims linked yet — link claims to findings to build confidence.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums text-slate-900">
                    {averageConfidence}
                  </span>
                  <span className="text-xs text-slate-500">
                    / 100 average across {linkedClaims.length} linked claim
                    {linkedClaims.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stateCounts.map(({ state, count }) => (
                    <span key={state} className="inline-flex items-center gap-1.5">
                      <EvidenceStateBadge state={state} />
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data gaps */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
              Data gaps
            </CardTitle>
            <CardDescription className="text-xs">
              Explicit unknowns and findings that still need evidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unknownFindings.length === 0 && unsupportedFacts.length === 0 ? (
              <p className="text-sm text-slate-500">
                No known gaps — every verified fact is backed by at least one claim.
              </p>
            ) : (
              <ul className="space-y-2">
                {unknownFindings.map((finding) => (
                  <li key={finding.id} className="flex items-start gap-2 text-sm">
                    <Badge variant="warning" className="mt-0.5 shrink-0">
                      Unknown
                    </Badge>
                    <span className="text-slate-700">{finding.text}</span>
                  </li>
                ))}
                {unsupportedFacts.map((finding) => (
                  <li key={finding.id} className="flex items-start gap-2 text-sm">
                    <Badge variant="destructive" className="mt-0.5 shrink-0">
                      Missing evidence
                    </Badge>
                    <span className="text-slate-700">{finding.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ExportCenter
        projectId={project.id}
        projectTitle={project.title}
        isDemo={project.isDemo}
        entities={resolvedEntities}
        findings={findings}
        notes={serializedNotes}
        claimReferences={claimReferences}
        exports={exports.map((entry) => ({
          id: entry.id,
          format: entry.format,
          fileName: entry.fileName,
          createdAt: entry.createdAt,
        }))}
      />
    </div>
  );
}
