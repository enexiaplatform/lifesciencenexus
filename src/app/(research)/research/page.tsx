import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IsDemoBadge } from "@/components/evidence/meta-badges";
import { formatDate } from "@/components/evidence/format";
import { CreateProjectDialog } from "@/components/research/create-project-dialog";
import { getRepository } from "@/lib/data";
import type { ResearchProjectStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Research Projects" };

const STATUS_STYLES: Record<ResearchProjectStatus, string> = {
  active: "border-success-border bg-success-bg text-success-fg",
  completed: "border-info-border bg-info-bg text-info-fg",
  archived: "border-slate-300 bg-slate-100 text-slate-500",
};

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const dialogParam = Array.isArray(params.dialog) ? params.dialog[0] : params.dialog;

  const repo = await getRepository();
  const projects = await repo.list("research_project", {
    pageSize: 50,
    sort: { field: "updatedAt", direction: "desc" },
  });
  const details = await Promise.all(
    projects.items.map((project) => repo.getResearchProjectDetail(project.id)),
  );
  const rows = projects.items.map((project, index) => ({
    project,
    entityCount: details[index]?.entities.length ?? 0,
    findingCount: details[index]?.findings.length ?? 0,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Research projects"
        description="Analyst workspaces that organize a question, the entities in scope, notes and evidence-linked findings."
        actions={<CreateProjectDialog defaultOpen={dialogParam === "create"} />}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No research projects yet"
          description="Start a workspace to answer a market or product question with linked evidence."
          action={<CreateProjectDialog defaultOpen={false} />}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Geography</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Entities</TableHead>
                <TableHead className="text-right">Findings</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ project, entityCount, findingCount }) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      href={`/research/${project.id}`}
                      className="font-medium text-slate-900 hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {project.title}
                    </Link>
                    <div className="mt-0.5">
                      <IsDemoBadge isDemo={project.isDemo} />
                    </div>
                  </TableCell>
                  <TableCell className="max-w-72">
                    <span className="line-clamp-2 text-xs text-slate-600">{project.question}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {project.geographyCodes.length === 0 ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        project.geographyCodes.map((code) => (
                          <Badge key={code} variant="secondary" className="text-[10px]">
                            {code}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", STATUS_STYLES[project.status])}>
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{entityCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{findingCount}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                    {formatDate(project.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
