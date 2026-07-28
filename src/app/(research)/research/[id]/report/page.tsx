import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { EvidenceStateBadge } from "@/components/evidence/state-badge";
import { formatDate, formatDateTime } from "@/components/evidence/format";
import { entityDisplayName, humanize } from "@/components/search/entity-routes";
import { FINDING_KIND_STYLES } from "@/components/research/finding-kinds";
import { PrintButton } from "@/components/research/print-button";
import { getRepository } from "@/lib/data";
import { buildReportSections } from "@/lib/domain/export";
import type { ResearchFinding } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Research report" };

/**
 * Print-optimized research report. The `@media print` block hides the app
 * chrome (sidebar/topbar) so the page prints as a clean document; the style
 * tag unmounts on navigation, so it never leaks into other pages.
 */
export default async function ResearchReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = await getRepository();
  const detail = await repo.getResearchProjectDetail(id);
  if (!detail) notFound();

  const { project, findings } = detail;
  const sections = buildReportSections(findings);

  // Evidence references for every claim linked from any finding.
  const claimIds = [...new Set(findings.flatMap((finding) => finding.evidenceClaimIds))];
  const claimReferences = new Map(
    (
      await Promise.all(
        claimIds.map(async (claimId) => {
          const claim = await repo.getById("claim", claimId);
          if (!claim) return null;
          const subject = await repo.getById(claim.subjectEntityType, claim.subjectEntityId);
          const source = await repo.getById("source", claim.sourceId);
          return [
            claimId,
            {
              predicate: claim.predicate,
              subjectTitle: entityDisplayName(subject),
              reviewStatus: claim.reviewStatus,
              sourceTitle: source?.title ?? claim.sourceId,
            },
          ] as const;
        }),
      )
    ).filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  );

  const generatedAt = new Date().toISOString();

  const sectionEntries: Array<{ key: string; label: string; items: ResearchFinding[] }> = [
    { key: "verified_facts", label: FINDING_KIND_STYLES.verified_fact.label, items: sections.verified_facts },
    {
      key: "analyst_interpretations",
      label: FINDING_KIND_STYLES.analyst_interpretation.label,
      items: sections.analyst_interpretations,
    },
    { key: "assumptions", label: FINDING_KIND_STYLES.assumption.label, items: sections.assumptions },
    { key: "unknowns", label: FINDING_KIND_STYLES.unknown.label, items: sections.unknowns },
    {
      key: "recommendations",
      label: FINDING_KIND_STYLES.recommendation.label,
      items: sections.recommendations,
    },
  ];

  return (
    <div className="report-print mx-auto max-w-3xl space-y-6">
      <style>{`
        @media print {
          aside, header { display: none !important; }
          main { padding: 0 !important; }
          .report-print a { color: inherit; text-decoration: none; }
          .report-print section { break-inside: avoid; }
          body { background: white; }
        }
      `}</style>

      <header className="space-y-2 border-b border-slate-300 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Life Science Nexus — Research report
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {project.title}
            </h1>
          </div>
          <PrintButton />
        </div>
        <p className="text-sm text-slate-700">
          <span className="font-medium">Question:</span> {project.question}
        </p>
        {project.scope && (
          <p className="text-sm text-slate-600">
            <span className="font-medium">Scope:</span> {project.scope}
          </p>
        )}
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
          <Badge variant="outline" className="text-[10px] capitalize">
            {project.status}
          </Badge>
        </div>
        <p className="text-xs text-slate-500">
          Generated {formatDateTime(generatedAt)} · Status {project.status}. PDF: use browser
          Print → Save as PDF.
        </p>
        {project.isDemo && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Synthetic demo data — not real market intelligence.
          </p>
        )}
      </header>

      {sectionEntries.map(({ key, label, items }) => (
        <section key={key} aria-label={label}>
          <h2 className="mb-2 border-b border-slate-200 pb-1 text-base font-semibold text-slate-900">
            {label}
            <span className="ml-2 text-sm font-normal tabular-nums text-slate-400">
              {items.length}
            </span>
          </h2>
          {items.length === 0 ? (
            <p className="text-sm italic text-slate-400">None recorded.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((finding) => (
                <li key={finding.id}>
                  <p className="text-sm text-slate-800">{finding.text}</p>
                  {finding.evidenceClaimIds.length > 0 && (
                    <ul className="mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
                      {finding.evidenceClaimIds.map((claimId) => {
                        const reference = claimReferences.get(claimId);
                        return (
                          <li
                            key={claimId}
                            className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600"
                          >
                            <span>
                              {reference
                                ? `${humanize(reference.predicate)} — ${reference.subjectTitle} (source: ${reference.sourceTitle})`
                                : claimId}
                            </span>
                            {reference && <EvidenceStateBadge state={reference.reviewStatus} />}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <footer className="border-t border-slate-300 pt-3 text-xs text-slate-500">
        <p>
          Verified facts are backed by the evidence claims referenced above; interpretations,
          assumptions and recommendations are analyst judgement. Unknowns are explicit knowledge
          gaps, not omissions.
        </p>
        <p className="mt-1">
          Report date {formatDate(generatedAt)}
          {project.isDemo ? " · Contains synthetic demo data." : ""}
        </p>
      </footer>
    </div>
  );
}
