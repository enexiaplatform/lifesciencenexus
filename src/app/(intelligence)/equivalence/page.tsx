import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import {
  ClassificationBadge,
  DomainEvidenceBadge,
  EntityBadges,
} from "@/components/products/badges";
import { EmptyState } from "@/components/products/empty-state";
import { DateText, ScoreBar } from "@/components/products/format";
import { PageHeader } from "@/components/products/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRepository } from "@/lib/data";
import { EQUIVALENCE_DISCLAIMER } from "@/lib/domain/equivalence";

export const metadata = { title: "Equivalence" };

export default async function EquivalencePage() {
  const repo = await getRepository();
  const [records, skus] = await Promise.all([
    repo.list("equivalence_record", {
      sort: { field: "updatedAt", direction: "desc" },
      pageSize: 100,
    }),
    repo.list("sku", { pageSize: 500 }),
  ]);
  const skuById = new Map(skus.items.map((sku) => [sku.id, sku]));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Equivalence"
        description="Assessed equivalence between SKUs across manufacturers — scored per dimension with explicit unknowns and an auditable review workflow."
        actions={
          <Button size="sm" asChild>
            <Link href="/equivalence/new">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New equivalence
            </Link>
          </Button>
        }
      />

      <p className="rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-xs text-warning-fg">
        {EQUIVALENCE_DISCLAIMER}
      </p>

      {records.items.length === 0 ? (
        <EmptyState
          title="No equivalence records yet"
          description="Create an assessment by picking a source SKU and a candidate SKU."
          action={
            <Button size="sm" asChild>
              <Link href="/equivalence/new">New equivalence</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table compact>
              <TableHeader>
                <TableRow>
                  <TableHead>Source SKU</TableHead>
                  <TableHead />
                  <TableHead>Candidate SKU</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead className="text-right">Overall score</TableHead>
                  <TableHead>Review state</TableHead>
                  <TableHead>Last reviewed</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.items.map((record) => {
                  const source = skuById.get(record.sourceSkuId);
                  const candidate = skuById.get(record.candidateSkuId);
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Link
                          href={`/skus/${record.sourceSkuId}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {source?.name ?? record.sourceSkuId}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/skus/${record.candidateSkuId}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {candidate?.name ?? record.candidateSkuId}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <ClassificationBadge classification={record.classification} />
                      </TableCell>
                      <TableCell className="text-right">
                        <ScoreBar score={record.overallScore} />
                      </TableCell>
                      <TableCell>
                        <DomainEvidenceBadge state={record.reviewState} />
                      </TableCell>
                      <TableCell>
                        {record.lastReviewedAt ? <DateText date={record.lastReviewedAt} /> : "—"}
                      </TableCell>
                      <TableCell>
                        <EntityBadges visibility={record.visibility} isDemo={record.isDemo} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/equivalence/${record.id}`}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Open workspace
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
