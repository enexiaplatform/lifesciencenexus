import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, FlaskConical, Users } from "lucide-react";

import { DemoBadge, EvidenceStateBadge, StatusBadge, VisibilityBadge } from "@/components/market/badges";
import { Breadcrumb } from "@/components/market/breadcrumb";
import { DetailGrid, DetailItem } from "@/components/market/description-list";
import { EmptyState } from "@/components/market/empty-state";
import {
  ASSET_CATEGORY_LABELS,
  ASSET_STATUS_LABELS,
  DECISION_ROLE_LABELS,
  LABORATORY_TYPE_LABELS,
  formatConfidence,
  formatDateTime,
} from "@/components/market/labels";
import { SourceChip } from "@/components/market/source-chip";
import { TenantPrivateNotice } from "@/components/market/tenant-private-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRepository } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LaboratoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepository();

  const laboratory = await repo.getById("laboratory", id);
  if (!laboratory) notFound();

  const site = await repo.getById("site", laboratory.siteId);
  const organization = site ? await repo.getById("organization", site.organizationId) : null;

  const [assets, assetModels, orgs, compatibilities, skus, sources, contacts, people, usageClaims] = await Promise.all([
    repo.list("installed_asset", { filters: { laboratoryId: id }, pageSize: 100 }),
    repo.list("asset_model", { pageSize: 200 }),
    repo.list("organization", { pageSize: 500 }),
    repo.list("consumable_compatibility", { pageSize: 200 }),
    repo.list("sku", { pageSize: 500 }),
    repo.list("source", { pageSize: 500 }),
    site
      ? repo.list("organization_contact", { filters: { siteId: site.id }, pageSize: 50 })
      : Promise.resolve({ items: [], page: 1, pageSize: 50, total: 0, totalPages: 1 }),
    repo.list("person", { pageSize: 100 }),
    organization
      ? repo.list("claim", { filters: { subjectEntityId: organization.id }, pageSize: 100 })
      : Promise.resolve({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 1 }),
  ]);

  const modelById = new Map(assetModels.items.map((model) => [model.id, model]));
  const orgById = new Map(orgs.items.map((org) => [org.id, org]));
  const skuById = new Map(skus.items.map((sku) => [sku.id, sku]));
  const sourceById = new Map(sources.items.map((source) => [source.id, source]));
  const personById = new Map(people.items.map((person) => [person.id, person]));

  // Products used in this lab: consumables compatible with the installed
  // instruments' models, plus org-level 'current_user_of' claims.
  const modelIdsInLab = new Set(assets.items.map((asset) => asset.assetModelId));
  const labCompatibilities = compatibilities.items.filter((compatibility) =>
    modelIdsInLab.has(compatibility.assetModelId),
  );
  const currentUseClaims = usageClaims.items.filter((claim) => claim.predicate === "current_user_of");

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Organizations", href: "/organizations" },
          ...(organization ? [{ label: organization.name, href: `/organizations/${organization.id}` }] : []),
          ...(site ? [{ label: site.name, href: `/sites/${site.id}` }] : []),
          { label: laboratory.name },
        ]}
      />

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FlaskConical className="h-5 w-5 text-slate-400" aria-hidden="true" />
            <CardTitle className="text-xl">{laboratory.name}</CardTitle>
            <Badge variant="secondary">{LABORATORY_TYPE_LABELS[laboratory.labType]}</Badge>
            <VisibilityBadge visibility={laboratory.visibility} />
            <DemoBadge isDemo={laboratory.isDemo} />
          </div>
        </CardHeader>
        <CardContent>
          <DetailGrid>
            <DetailItem label="Organization">
              {organization ? (
                <Link href={`/organizations/${organization.id}`} className="text-accent hover:underline">
                  {organization.name}
                </Link>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="Site">
              {site ? (
                <Link href={`/sites/${site.id}`} className="text-accent hover:underline">
                  {site.name}
                </Link>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="Laboratory type">{LABORATORY_TYPE_LABELS[laboratory.labType]}</DetailItem>
            <DetailItem label="Last updated">
              <time dateTime={laboratory.updatedAt}>{formatDateTime(laboratory.updatedAt)}</time>
            </DetailItem>
          </DetailGrid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Boxes className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Installed assets in this laboratory ({assets.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assets.items.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No instruments recorded in this laboratory"
              description="Installed-base observations are captured during field visits."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Serial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.items.map((asset) => {
                  const model = modelById.get(asset.assetModelId);
                  const manufacturer = model ? orgById.get(model.manufacturerOrgId) : undefined;
                  return (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <Link href={`/installed-base/${asset.id}`} className="font-medium text-accent hover:underline">
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
                      <TableCell>
                        <StatusBadge
                          label={ASSET_STATUS_LABELS[asset.status]}
                          tone={
                            asset.status === "operational"
                              ? "success"
                              : asset.status === "under_maintenance"
                                ? "warning"
                                : "secondary"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {asset.serialNumber ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs">
                            {asset.serialNumber}
                            <VisibilityBadge visibility="tenant_private" />
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Products used</CardTitle>
          <CardDescription>
            Consumables compatible with this lab&apos;s instruments, and products the organization is recorded as
            using.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {labCompatibilities.length === 0 && currentUseClaims.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No product usage recorded"
              description="Consumable compatibilities and usage claims appear here as evidence is captured — a coverage gap worth noting."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Basis</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labCompatibilities.map((compatibility) => {
                  const sku = skuById.get(compatibility.skuId);
                  const model = modelById.get(compatibility.assetModelId);
                  return (
                    <TableRow key={compatibility.id}>
                      <TableCell>
                        {sku ? (
                          <Link href={`/skus/${sku.id}`} className="text-accent hover:underline">
                            {sku.name}
                          </Link>
                        ) : (
                          compatibility.skuId
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        Compatible with {model?.model ?? compatibility.assetModelId}
                      </TableCell>
                      <TableCell>
                        <SourceChip source={compatibility.evidence.sourceId ? sourceById.get(compatibility.evidence.sourceId) : null} />
                      </TableCell>
                      <TableCell>
                        <EvidenceStateBadge state={compatibility.evidence.state} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatConfidence(compatibility.evidence.confidence)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {currentUseClaims.map((claim) => {
                  const sku = typeof claim.objectValue === "string" ? skuById.get(claim.objectValue) : undefined;
                  return (
                    <TableRow key={claim.id}>
                      <TableCell>
                        {sku ? (
                          <Link href={`/skus/${sku.id}`} className="text-accent hover:underline">
                            {sku.name}
                          </Link>
                        ) : (
                          String(claim.objectValue)
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">Recorded as currently in use</TableCell>
                      <TableCell>
                        <SourceChip source={sourceById.get(claim.sourceId)} />
                      </TableCell>
                      <TableCell>
                        <EvidenceStateBadge state={claim.reviewStatus} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">—</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
            People with decision roles ({contacts.items.length})
          </CardTitle>
          <CardDescription>Contacts mapped to this site with purchasing influence.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {contacts.items.length > 0 ? (
            <TenantPrivateNotice message="People and decision roles are tenant-private records." />
          ) : null}
          {contacts.items.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No contacts mapped at this site"
              description="Map the QA approver, technical evaluator and procurement contact to complete the account picture."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Decision roles</TableHead>
                  <TableHead>Visibility</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.items.map((contact) => {
                  const person = personById.get(contact.personId);
                  return (
                    <TableRow key={contact.id}>
                      <TableCell>
                        {person ? (
                          <Link href={`/people/${person.id}`} className="font-medium text-accent hover:underline">
                            {person.fullName}
                          </Link>
                        ) : (
                          contact.personId
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{person?.title ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contact.decisionRoles.map((role) => (
                            <Badge key={role} variant="secondary">
                              {DECISION_ROLE_LABELS[role]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <VisibilityBadge visibility={contact.visibility} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
