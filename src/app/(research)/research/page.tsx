import type { Metadata } from "next";
import Link from "next/link";

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
import { IsDemoBadge } from "@/components/evidence/meta-badges";
import { formatDate } from "@/components/evidence/format";
import { CreateProjectDialog } from "@/components/research/create-project-dialog";
import { getRepository } from "@/lib/data";
import type { ResearchProjectStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Research Projects" };

const STATUS_STYLES: Record<ResearchProjectStatus, string> = {
  active: "border-teal-200 bg-teal-50 text-teal-700",
  completed: "border-accent/30 bg-accent/10 text-accent",
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Research projects
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Analyst workspaces that organize a question, the entities in scope, notes and
            evidence-linked findings.
          </p>
        </div>
        <CreateProjectDialog defaultOpen={dialogParam === "create"} />
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">No research projects yet</CardTitle>
            <CardDescription>
              Start a workspace to answer a market or product question with linked evidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateProjectDialog defaultOpen={false} />
          </CardContent>
        </Card>
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
                  <TableCell className="whitespace-nowrap text-xs text-slate-500">
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
