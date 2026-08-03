import Link from "next/link";
import { FileWarning, Truck } from "lucide-react";

import { DemoBadge, EvidenceStateBadge, StatusBadge, VisibilityBadge } from "@/components/market/badges";
import { EmptyState } from "@/components/market/empty-state";
import { FilterBar, FilterQuery } from "@/components/market/filter-bar";
import { formatConfidence, formatDate } from "@/components/market/labels";
import { PageHeader } from "@/components/market/page-header";
import { SupplierRelationshipBadge } from "@/components/market/relationship-badge";
import { firstParam, type SearchParams } from "@/components/market/search-params";
import { SourceChip } from "@/components/market/source-chip";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRepository } from "@/lib/data";
import { evidenceStateRank } from "@/lib/domain/confidence";
import { daysUntil } from "@/lib/domain/freshness";
import type { EvidenceState } from "@/lib/domain/types";

export const metadata = { title: "Suppliers" };
export const dynamic = "force-dynamic";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = firstParam(params.query);

  const repo = await getRepository();

  const [profiles, orgs, listings, agreements, claims, sources] = await Promise.all([
    repo.list("supplier_profile", { pageSize: 200 }),
    repo.list("organization", { query: undefined, pageSize: 500 }),
    repo.list("supplier_listing", { pageSize: 500 }),
    repo.list("distribution_agreement", { pageSize: 200 }),
    repo.list("claim", { pageSize: 500 }),
    repo.list("source", { pageSize: 500 }),
  ]);

  const orgById = new Map(orgs.items.map((org) => [org.id, org]));
  const sourceById = new Map(sources.items.map((source) => [source.id, source]));

  const listingCountBySupplier = new Map<string, number>();
  for (const listing of listings.items) {
    listingCountBySupplier.set(listing.supplierOrgId, (listingCountBySupplier.get(listing.supplierOrgId) ?? 0) + 1);
  }

  // Best evidence state per org among 'authorized_distributor_of' claims —
  // drives the relationship badge (authorization only shown when reviewed).
  const authorizationStateByOrg = new Map<string, EvidenceState>();
  for (const claim of claims.items) {
    if (claim.predicate !== "authorized_distributor_of") continue;
    const current = authorizationStateByOrg.get(claim.subjectEntityId);
    if (!current || evidenceStateRank(claim.reviewStatus) > evidenceStateRank(current)) {
      authorizationStateByOrg.set(claim.subjectEntityId, claim.reviewStatus);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const rows = profiles.items
    .map((profile) => ({ profile, org: orgById.get(profile.organizationId) }))
    .filter(
      ({ org }) =>
        normalizedQuery === "" ||
        (org?.name.toLowerCase().includes(normalizedQuery) ?? false),
    )
    .sort((a, b) => (a.org?.name ?? "").localeCompare(b.org?.name ?? ""));

  const agreementRows = [...agreements.items].sort((a, b) => (a.validTo ?? "9999").localeCompare(b.validTo ?? "9999"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Distributors, dealers and importers active in the market. Relationship labels never overstate evidence: unverified stays unverified, authorization is only shown when analyst-reviewed."
      />

      <FilterBar>
        <FilterQuery value={query} placeholder="Search suppliers…" />
      </FilterBar>

      {rows.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No supplier profiles found"
          description="Supplier profiles are created when a distributor relationship is evidenced."
          action={{ label: "Browse organizations", href: "/organizations" }}
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Manufacturers represented</TableHead>
                <TableHead>Countries</TableHead>
                <TableHead className="text-right">Listings</TableHead>
                <TableHead>Visibility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ profile, org }) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    {org ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link href={`/organizations/${org.id}`} className="font-medium text-spectral-600 hover:underline">
                          {org.name}
                        </Link>
                        <DemoBadge isDemo={org.isDemo} />
                      </div>
                    ) : (
                      <span className="text-slate-500">{profile.organizationId}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SupplierRelationshipBadge
                      type={profile.relationshipType}
                      evidenceState={authorizationStateByOrg.get(profile.organizationId)}
                    />
                  </TableCell>
                  <TableCell>
                    {profile.manufacturers.length === 0 ? (
                      <span className="text-xs text-slate-500">—</span>
                    ) : (
                      <ul className="space-y-0.5 text-xs">
                        {profile.manufacturers.map((manufacturerId) => {
                          const manufacturer = orgById.get(manufacturerId);
                          return (
                            <li key={manufacturerId}>
                              {manufacturer ? (
                                <Link href={`/organizations/${manufacturer.id}`} className="text-spectral-600 hover:underline">
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
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {profile.countries.map((country) => (
                        <Badge key={country} variant="secondary">
                          {country}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {listingCountBySupplier.get(profile.organizationId) ?? 0}
                  </TableCell>
                  <TableCell>
                    <VisibilityBadge visibility={profile.visibility} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Distribution agreements
          </span>
        }
        description="Manufacturer–distributor agreements with validity windows. Expired agreements are highlighted — they feed the supplier_agreement_expired signal."
      >
        {agreementRows.length === 0 ? (
          <EmptyState
            icon={FileWarning}
            title="No distribution agreements recorded"
            description="Agreements are extracted from manufacturer catalogues and tender documents."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Distributor</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Countries</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreementRows.map((agreement) => {
                const manufacturer = orgById.get(agreement.manufacturerOrgId);
                const distributor = orgById.get(agreement.distributorOrgId);
                const daysLeft = agreement.validTo !== undefined ? daysUntil(agreement.validTo) : null;
                const expired = daysLeft !== null && daysLeft < 0;
                return (
                  <TableRow key={agreement.id} className={expired ? "bg-danger-bg/60" : undefined}>
                    <TableCell>
                      {manufacturer ? (
                        <Link href={`/organizations/${manufacturer.id}`} className="text-spectral-600 hover:underline">
                          {manufacturer.name}
                        </Link>
                      ) : (
                        agreement.manufacturerOrgId
                      )}
                    </TableCell>
                    <TableCell>
                      {distributor ? (
                        <Link href={`/organizations/${distributor.id}`} className="text-spectral-600 hover:underline">
                          {distributor.name}
                        </Link>
                      ) : (
                        agreement.distributorOrgId
                      )}
                    </TableCell>
                    <TableCell>
                      <SupplierRelationshipBadge
                        type={agreement.relationshipType}
                        evidenceState={agreement.evidence.state}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agreement.countries.map((country) => (
                          <Badge key={country} variant="secondary">
                            {country}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-xs">
                      {formatDate(agreement.validFrom)} → {formatDate(agreement.validTo)}{" "}
                      {expired ? (
                        <StatusBadge label="Expired" tone="destructive" />
                      ) : daysLeft !== null && daysLeft <= 90 ? (
                        <StatusBadge label={`Expires in ${daysLeft} d`} tone="warning" />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <EvidenceStateBadge state={agreement.evidence.state} />
                        <SourceChip
                          source={agreement.evidence.sourceId ? sourceById.get(agreement.evidence.sourceId) : null}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatConfidence(agreement.evidence.confidence)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
