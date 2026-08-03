import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, FlaskConical, Factory } from "lucide-react";

import { DemoBadge, StatusBadge, VisibilityBadge } from "@/components/market/badges";
import { Breadcrumb } from "@/components/market/breadcrumb";
import { DetailGrid, DetailItem } from "@/components/market/description-list";
import { EmptyState } from "@/components/market/empty-state";
import {
  ASSET_CATEGORY_LABELS,
  ASSET_STATUS_LABELS,
  LABORATORY_TYPE_LABELS,
  QUALIFICATION_STATUS_LABELS,
  SITE_TYPE_LABELS,
  formatDate,
  formatDateTime,
} from "@/components/market/labels";
import { TenantPrivateNotice } from "@/components/market/tenant-private-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionCard } from "@/components/ui/section-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRepository } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepository();

  const site = await repo.getById("site", id);
  if (!site) notFound();

  const [organization, address, laboratories, assets, assetModels, assetOrgs, productionLines, facilityUnits] =
    await Promise.all([
      repo.getById("organization", site.organizationId),
      site.addressId ? repo.getById("address", site.addressId) : Promise.resolve(null),
      repo.list("laboratory", { filters: { siteId: id }, pageSize: 100 }),
      repo.list("installed_asset", { filters: { siteId: id }, pageSize: 100 }),
      repo.list("asset_model", { pageSize: 200 }),
      repo.list("organization", { pageSize: 500 }),
      repo.list("production_line", { filters: { siteId: id }, pageSize: 100 }),
      repo.list("facility_unit", { filters: { siteId: id }, pageSize: 100 }),
    ]);

  const modelById = new Map(assetModels.items.map((model) => [model.id, model]));
  const orgById = new Map(assetOrgs.items.map((org) => [org.id, org]));
  const labById = new Map(laboratories.items.map((lab) => [lab.id, lab]));

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Organizations", href: "/organizations" },
          ...(organization
            ? [{ label: organization.name, href: `/organizations/${organization.id}` }]
            : []),
          { label: site.name },
        ]}
      />

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{site.name}</CardTitle>
            <Badge variant="secondary">{SITE_TYPE_LABELS[site.siteType]}</Badge>
            <VisibilityBadge visibility={site.visibility} />
            <DemoBadge isDemo={site.isDemo} />
          </div>
        </CardHeader>
        <CardContent>
          <DetailGrid>
            <DetailItem label="Organization">
              {organization ? (
                <Link href={`/organizations/${organization.id}`} className="text-spectral-600 hover:underline">
                  {organization.name}
                </Link>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="Site type">{SITE_TYPE_LABELS[site.siteType]}</DetailItem>
            <DetailItem label="Address">
              {address
                ? [address.line1, address.line2, address.city, address.province, address.postalCode, address.country]
                    .filter(Boolean)
                    .join(", ")
                : "—"}
            </DetailItem>
            <DetailItem label="Last updated">
              <time dateTime={site.updatedAt}>{formatDateTime(site.updatedAt)}</time>
            </DetailItem>
          </DetailGrid>
        </CardContent>
      </Card>

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Laboratories ({laboratories.items.length})
          </span>
        }
      >
          {laboratories.items.length === 0 ? (
            <p className="text-xs text-slate-500">No laboratories recorded at this site.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {laboratories.items.map((lab) => (
                <Link
                  key={lab.id}
                  href={`/laboratories/${lab.id}`}
                  className="rounded-md border border-slate-200 p-3 transition-colors hover:border-nexus-300 hover:bg-nexus-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600"
                >
                  <p className="text-sm font-medium text-slate-800">{lab.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{LABORATORY_TYPE_LABELS[lab.labType]}</p>
                </Link>
              ))}
            </div>
          )}
      </SectionCard>

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Installed assets ({assets.items.length})
          </span>
        }
        description="Instruments observed at this site (tenant-private installed base)."
      >
        <div className="space-y-3">
          {assets.items.length > 0 ? (
            <TenantPrivateNotice message="Installed-base records are tenant-private field observations." />
          ) : null}
          {assets.items.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No installed assets observed"
              description="Instruments are recorded from field observations. Coverage gaps at mapped sites are signal candidates."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Laboratory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Installed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.items.map((asset) => {
                  const model = modelById.get(asset.assetModelId);
                  const manufacturer = model ? orgById.get(model.manufacturerOrgId) : undefined;
                  const lab = asset.laboratoryId ? labById.get(asset.laboratoryId) : undefined;
                  return (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <Link href={`/installed-base/${asset.id}`} className="font-medium text-spectral-600 hover:underline">
                          {model?.model ?? asset.assetModelId}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {manufacturer ? (
                          <Link href={`/organizations/${manufacturer.id}`} className="hover:underline">
                            {manufacturer.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {model ? <Badge variant="secondary">{ASSET_CATEGORY_LABELS[model.category]}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {lab ? (
                          <Link href={`/laboratories/${lab.id}`} className="hover:underline">
                            {lab.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={ASSET_STATUS_LABELS[asset.status]}
                          tone={
                            asset.status === "operational"
                              ? "success"
                              : asset.status === "under_maintenance"
                                ? "warning"
                                : asset.status === "retired"
                                  ? "secondary"
                                  : "outline"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={QUALIFICATION_STATUS_LABELS[asset.qualificationStatus]}
                          tone={
                            asset.qualificationStatus === "iq_oq_pq_complete"
                              ? "success"
                              : asset.qualificationStatus === "partial"
                                ? "warning"
                                : "secondary"
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDate(asset.installationDate)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Production lines ({productionLines.items.length})
            </span>
          }
        >
            {productionLines.items.length === 0 ? (
              <p className="text-xs text-slate-500">No production lines recorded at this site.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {productionLines.items.map((line) => (
                  <li key={line.id} className="py-2">
                    <p className="text-sm font-medium text-slate-800">{line.name}</p>
                    {line.productDescription ? (
                      <p className="text-xs text-slate-500">{line.productDescription}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
        </SectionCard>

        <SectionCard title={`Facility units (${facilityUnits.items.length})`}>
            {facilityUnits.items.length === 0 ? (
              <p className="text-xs text-slate-500">No facility units recorded at this site.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {facilityUnits.items.map((unit) => (
                  <li key={unit.id} className="py-2">
                    <p className="text-sm font-medium text-slate-800">{unit.name}</p>
                    {unit.description ? <p className="text-xs text-slate-500">{unit.description}</p> : null}
                  </li>
                ))}
              </ul>
            )}
        </SectionCard>
      </div>
    </div>
  );
}
