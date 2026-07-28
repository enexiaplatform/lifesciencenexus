import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, FileCheck2, MapPin, Users } from "lucide-react";

import { DemoBadge, EvidenceStateBadge, StatusBadge, VisibilityBadge } from "@/components/market/badges";
import { Breadcrumb } from "@/components/market/breadcrumb";
import { DetailGrid, DetailItem } from "@/components/market/description-list";
import { EmptyState } from "@/components/market/empty-state";
import {
  IDENTIFIER_SCHEME_LABELS,
  LABORATORY_TYPE_LABELS,
  ORGANIZATION_RELATIONSHIP_LABELS,
  ORGANIZATION_TYPE_LABELS,
  SITE_TYPE_LABELS,
  countryName,
  formatConfidence,
  formatDate,
  formatDateTime,
  humanize,
} from "@/components/market/labels";
import { SupplierRelationshipBadge } from "@/components/market/relationship-badge";
import { SignalList } from "@/components/market/signal-list";
import { SourceChip } from "@/components/market/source-chip";
import { TenantPrivateNotice } from "@/components/market/tenant-private-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRepository } from "@/lib/data";
import { aggregateConfidence, evidenceStateRank } from "@/lib/domain/confidence";
import { daysUntil, isReviewDue } from "@/lib/domain/freshness";
import type { Claim, ClaimObjectValue, EvidenceState } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepository();

  const [detail, orgs, addresses, products, skus, assets, lines, claims, sources, approvals, validations, agreements, signals] =
    await Promise.all([
      repo.getOrganizationDetail(id),
      repo.list("organization", { pageSize: 500 }),
      repo.list("address", { pageSize: 500 }),
      repo.list("product", { pageSize: 500 }),
      repo.list("sku", { pageSize: 500 }),
      repo.list("installed_asset", { pageSize: 200 }),
      repo.list("production_line", { pageSize: 200 }),
      repo.list("claim", { filters: { subjectEntityId: id }, pageSize: 100 }),
      repo.list("source", { pageSize: 500 }),
      repo.list("vendor_approval", { filters: { organizationId: id }, pageSize: 50 }),
      repo.list("product_validation", { filters: { organizationId: id }, pageSize: 50 }),
      repo.list("distribution_agreement", { pageSize: 100 }),
      repo.listSignals({ pageSize: 100 }),
    ]);

  if (!detail) notFound();
  const { organization, aliases, sites, laboratories, supplierProfile, contacts, relationships } = detail;

  const orgById = new Map(orgs.items.map((org) => [org.id, org]));
  const addressById = new Map(addresses.items.map((address) => [address.id, address]));
  const productById = new Map(products.items.map((product) => [product.id, product]));
  const skuById = new Map(skus.items.map((sku) => [sku.id, sku]));
  const sourceById = new Map(sources.items.map((source) => [source.id, source]));

  const relatedSignals = signals.items.filter((signal) =>
    signal.relatedEntities.some((entity) => entity.entityType === "organization" && entity.entityId === id),
  );

  // Best evidence state among claims asserting this org is an authorized
  // distributor — feeds the supplier-relationship badge governance rule.
  const authorizationStates: EvidenceState[] = claims.items
    .filter((claim) => claim.predicate === "authorized_distributor_of")
    .map((claim) => claim.reviewStatus);
  const bestAuthorizationState = authorizationStates.sort((a, b) => evidenceStateRank(b) - evidenceStateRank(a))[0];

  const resolveValue = (value: ClaimObjectValue): { label: string; href?: string } => {
    if (typeof value === "string") {
      const org = orgById.get(value);
      if (org) return { label: org.name, href: `/organizations/${org.id}` };
      const sku = skuById.get(value);
      if (sku) return { label: sku.name, href: `/skus/${sku.id}` };
      const product = productById.get(value);
      if (product) return { label: product.name, href: `/products/${product.id}` };
      return { label: value };
    }
    if (typeof value === "number" || typeof value === "boolean") return { label: String(value) };
    return { label: JSON.stringify(value) };
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Organizations", href: "/organizations" },
          { label: organization.name },
        ]}
      />

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{organization.name}</CardTitle>
            {organization.types.map((type) => (
              <Badge key={type} variant="secondary">
                {ORGANIZATION_TYPE_LABELS[type]}
              </Badge>
            ))}
            <VisibilityBadge visibility={organization.visibility} />
            <DemoBadge isDemo={organization.isDemo} />
          </div>
          {aliases.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span>Also known as:</span>
              {aliases.map((alias) => (
                <Badge key={alias.id} variant="outline" title={alias.source ? `Alias source: ${alias.source}` : undefined}>
                  {alias.alias}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <DetailGrid>
            <DetailItem label="Country">
              {organization.country} — {countryName(organization.country)}
            </DetailItem>
            <DetailItem label="Website">
              {organization.website ? (
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  {organization.website.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="Identifiers">
              {organization.identifiers.length === 0 ? (
                "—"
              ) : (
                <ul className="space-y-0.5">
                  {organization.identifiers.map((identifier) => (
                    <li key={`${identifier.scheme}-${identifier.value}`} className="text-xs">
                      <span className="text-slate-500">{IDENTIFIER_SCHEME_LABELS[identifier.scheme]}:</span>{" "}
                      <span className="font-mono">{identifier.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </DetailItem>
            <DetailItem label="Last updated">
              <time dateTime={organization.updatedAt}>{formatDateTime(organization.updatedAt)}</time>
            </DetailItem>
          </DetailGrid>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList aria-label="Organization sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sites">Sites &amp; laboratories ({sites.length})</TabsTrigger>
          <TabsTrigger value="supplier">Supplier profile</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="evidence">Evidence ({claims.items.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relationships</CardTitle>
              <CardDescription>Evidence-backed links to other organizations in the graph.</CardDescription>
            </CardHeader>
            <CardContent>
              {relationships.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No relationships recorded"
                  description="Relationships (distributes for, manufactures, owns brand, …) are added as evidence is captured."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Counterparty</TableHead>
                      <TableHead>Evidence</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relationships.map((relationship) => {
                      const outgoing = relationship.fromOrgId === id;
                      const counterpartyId = outgoing ? relationship.toOrgId : relationship.fromOrgId;
                      const counterparty = orgById.get(counterpartyId);
                      return (
                        <TableRow key={relationship.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {ORGANIZATION_RELATIONSHIP_LABELS[relationship.type]}
                            </Badge>{" "}
                            <span className="text-xs text-slate-500">{outgoing ? "outgoing" : "incoming"}</span>
                          </TableCell>
                          <TableCell>
                            {counterparty ? (
                              <Link href={`/organizations/${counterparty.id}`} className="text-accent hover:underline">
                                {counterparty.name}
                              </Link>
                            ) : (
                              <span className="text-slate-500">{counterpartyId}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <EvidenceStateBadge state={relationship.evidence.state} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatConfidence(relationship.evidence.confidence)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {approvals.items.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Approved-vendor list</CardTitle>
                <CardDescription>
                  Tenant-private supplier approvals held by this organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <TenantPrivateNotice message="Vendor approvals are tenant-private procurement records." />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valid to</TableHead>
                      <TableHead>Evidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals.items.map((approval) => {
                      const supplier = orgById.get(approval.supplierOrgId);
                      const expired = approval.validTo !== undefined && daysUntil(approval.validTo) < 0;
                      return (
                        <TableRow key={approval.id}>
                          <TableCell>
                            {supplier ? (
                              <Link href={`/organizations/${supplier.id}`} className="text-accent hover:underline">
                                {supplier.name}
                              </Link>
                            ) : (
                              approval.supplierOrgId
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              label={humanize(approval.status)}
                              tone={
                                approval.status === "approved"
                                  ? "success"
                                  : approval.status === "expired" || approval.status === "rejected"
                                    ? "destructive"
                                    : "warning"
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {formatDate(approval.validTo)}{" "}
                            {expired ? <StatusBadge label="Expired" tone="destructive" /> : null}
                          </TableCell>
                          <TableCell>
                            <EvidenceStateBadge state={approval.evidence.state} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {validations.items.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Product validations</CardTitle>
                <CardDescription>SKUs this organization has validated (or is validating) for use.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validations.items.map((validation) => {
                      const sku = skuById.get(validation.skuId);
                      return (
                        <TableRow key={validation.id}>
                          <TableCell>
                            {sku ? (
                              <Link href={`/skus/${sku.id}`} className="text-accent hover:underline">
                                {sku.name}
                              </Link>
                            ) : (
                              validation.skuId
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              label={humanize(validation.status)}
                              tone={
                                validation.status === "passed"
                                  ? "success"
                                  : validation.status === "failed"
                                    ? "destructive"
                                    : validation.status === "in_progress" || validation.status === "planned"
                                      ? "warning"
                                      : "secondary"
                              }
                            />
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{validation.method ?? "—"}</TableCell>
                          <TableCell>{formatDate(validation.completedAt)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related signals</CardTitle>
              <CardDescription>Derived opportunities and gaps that reference this organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignalList signals={relatedSignals} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites" className="mt-4">
          {sites.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No sites recorded"
              description="Sites (factories, offices, laboratories) are attached to the organization as they are mapped."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {sites.map((site) => {
                const siteLabs = laboratories.filter((lab) => lab.siteId === site.id);
                const siteAssets = assets.items.filter((asset) => asset.siteId === site.id);
                const siteLines = lines.items.filter((line) => line.siteId === site.id);
                const address = site.addressId ? addressById.get(site.addressId) : undefined;
                return (
                  <Card key={site.id}>
                    <CardHeader className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">
                          <Link href={`/sites/${site.id}`} className="text-accent hover:underline">
                            {site.name}
                          </Link>
                        </CardTitle>
                        <Badge variant="secondary">{SITE_TYPE_LABELS[site.siteType]}</Badge>
                        <DemoBadge isDemo={site.isDemo} />
                      </div>
                      {address ? (
                        <CardDescription>
                          {[address.line1, address.city, address.province, address.country]
                            .filter(Boolean)
                            .join(", ")}
                        </CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Laboratories ({siteLabs.length})
                        </p>
                        {siteLabs.length === 0 ? (
                          <p className="text-xs text-slate-500">None recorded at this site.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {siteLabs.map((lab) => (
                              <Link key={lab.id} href={`/laboratories/${lab.id}`}>
                                <Badge variant="outline" className="hover:border-accent hover:text-accent">
                                  {lab.name} · {LABORATORY_TYPE_LABELS[lab.labType]}
                                </Badge>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                        <span>
                          <span className="font-medium text-slate-800">{siteAssets.length}</span> installed assets
                        </span>
                        <span>
                          <span className="font-medium text-slate-800">{siteLines.length}</span> production lines
                        </span>
                        <Link href={`/sites/${site.id}`} className="font-medium text-accent hover:underline">
                          Open site detail
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="supplier" className="mt-4">
          {supplierProfile === null ? (
            <EmptyState
              icon={Building2}
              title="No supplier profile"
              description="This organization is not recorded as a supplier in the market graph."
            />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Supplier profile</CardTitle>
                  <CardDescription>
                    Relationship labels follow evidence state — authorization is only stated when analyst-reviewed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DetailGrid>
                    <DetailItem label="Relationship">
                      <SupplierRelationshipBadge
                        type={supplierProfile.relationshipType}
                        evidenceState={bestAuthorizationState}
                      />
                    </DetailItem>
                    <DetailItem label="Manufacturers represented">
                      {supplierProfile.manufacturers.length === 0 ? (
                        "—"
                      ) : (
                        <ul className="space-y-0.5">
                          {supplierProfile.manufacturers.map((manufacturerId) => {
                            const manufacturer = orgById.get(manufacturerId);
                            return (
                              <li key={manufacturerId}>
                                {manufacturer ? (
                                  <Link
                                    href={`/organizations/${manufacturer.id}`}
                                    className="text-accent hover:underline"
                                  >
                                    {manufacturer.name}
                                  </Link>
                                ) : (
                                  manufacturerId
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </DetailItem>
                    <DetailItem label="Countries served">
                      <div className="flex flex-wrap gap-1">
                        {supplierProfile.countries.map((country) => (
                          <Badge key={country} variant="secondary">
                            {country}
                          </Badge>
                        ))}
                      </div>
                    </DetailItem>
                  </DetailGrid>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribution agreements</CardTitle>
                  <CardDescription>Recorded agreements where this organization is the distributor.</CardDescription>
                </CardHeader>
                <CardContent>
                  {agreements.items.filter((agreement) => agreement.distributorOrgId === id).length === 0 ? (
                    <p className="text-xs text-slate-500">No distribution agreements recorded for this supplier.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Manufacturer</TableHead>
                          <TableHead>Relationship</TableHead>
                          <TableHead>Validity</TableHead>
                          <TableHead>Evidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agreements.items
                          .filter((agreement) => agreement.distributorOrgId === id)
                          .map((agreement) => {
                            const manufacturer = orgById.get(agreement.manufacturerOrgId);
                            const daysLeft = agreement.validTo !== undefined ? daysUntil(agreement.validTo) : null;
                            return (
                              <TableRow key={agreement.id}>
                                <TableCell>
                                  {manufacturer ? (
                                    <Link
                                      href={`/organizations/${manufacturer.id}`}
                                      className="text-accent hover:underline"
                                    >
                                      {manufacturer.name}
                                    </Link>
                                  ) : (
                                    agreement.manufacturerOrgId
                                  )}
                                </TableCell>
                                <TableCell>
                                  <SupplierRelationshipBadge
                                    type={agreement.relationshipType}
                                    evidenceState={agreement.evidence.state}
                                  />
                                </TableCell>
                                <TableCell>
                                  {formatDate(agreement.validFrom)} → {formatDate(agreement.validTo)}{" "}
                                  {daysLeft !== null && daysLeft < 0 ? (
                                    <StatusBadge label="Expired" tone="destructive" />
                                  ) : daysLeft !== null && daysLeft <= 90 ? (
                                    <StatusBadge label={`Expires in ${daysLeft} d`} tone="warning" />
                                  ) : null}
                                </TableCell>
                                <TableCell>
                                  <EvidenceStateBadge state={agreement.evidence.state} />
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
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-4">
          <TenantPrivateNotice message="Contacts and decision roles are tenant-private relationship intelligence. They never leave this workspace." />
          {contacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No contacts mapped"
              description="People at this organization are recorded here with their decision roles once identified in the field."
            />
          ) : (
            <Card>
              <CardContent className="pt-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Decision roles</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => {
                      const site = contact.siteId ? sites.find((candidate) => candidate.id === contact.siteId) : undefined;
                      return (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {contact.person ? (
                                <Link href={`/people/${contact.person.id}`} className="font-medium text-accent hover:underline">
                                  {contact.person.fullName}
                                </Link>
                              ) : (
                                <span className="text-slate-500">{contact.personId}</span>
                              )}
                              {contact.isPrimary ? <Badge variant="default">Primary</Badge> : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{contact.person?.title ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex max-w-56 flex-wrap gap-1">
                              {contact.decisionRoles.length === 0 ? (
                                <span className="text-xs text-slate-500">—</span>
                              ) : (
                                contact.decisionRoles.map((role) => (
                                  <Badge key={role} variant="secondary">
                                    {humanize(role)}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{site?.name ?? "—"}</TableCell>
                          <TableCell>
                            <VisibilityBadge visibility={contact.visibility} />
                          </TableCell>
                          <TableCell className="max-w-48 text-xs text-slate-600">{contact.notes ?? "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evidence" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Claims about this organization
              </CardTitle>
              <CardDescription>
                Atomic, source-backed statements where this organization is the subject.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {claims.items.length === 0 ? (
                <EmptyState
                  icon={FileCheck2}
                  title="No claims recorded"
                  description="Claims are extracted from sources (catalogues, quotations, field observations) during evidence capture."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Predicate</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Review by</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.items.map((claim: Claim) => {
                      const resolved = resolveValue(claim.objectValue);
                      const reviewDue = isReviewDue(claim.reviewByDate);
                      return (
                        <TableRow key={claim.id}>
                          <TableCell className="font-mono text-xs">{humanize(claim.predicate)}</TableCell>
                          <TableCell className="max-w-56">
                            {resolved.href ? (
                              <Link href={resolved.href} className="text-accent hover:underline">
                                {resolved.label}
                              </Link>
                            ) : (
                              <span className="text-xs">{resolved.label}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <SourceChip source={sourceById.get(claim.sourceId)} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatConfidence(aggregateConfidence(claim.confidence))}
                          </TableCell>
                          <TableCell>
                            <EvidenceStateBadge state={claim.reviewStatus} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {formatDate(claim.reviewByDate)}{" "}
                            {reviewDue ? <StatusBadge label="Review due" tone="destructive" /> : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
