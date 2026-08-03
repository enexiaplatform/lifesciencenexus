import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRound } from "lucide-react";

import { DemoBadge, VisibilityBadge } from "@/components/market/badges";
import { Breadcrumb } from "@/components/market/breadcrumb";
import { DetailGrid, DetailItem } from "@/components/market/description-list";
import { EmptyState } from "@/components/market/empty-state";
import { DECISION_ROLE_LABELS, formatDate, formatDateTime } from "@/components/market/labels";
import { TenantPrivateNotice } from "@/components/market/tenant-private-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionCard } from "@/components/ui/section-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRepository } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepository();

  const person = await repo.getById("person", id);
  if (!person) notFound();

  const [employments, contacts, orgs, sites] = await Promise.all([
    repo.list("employment_relationship", { filters: { personId: id }, pageSize: 50 }),
    repo.list("organization_contact", { filters: { personId: id }, pageSize: 50 }),
    repo.list("organization", { pageSize: 500 }),
    repo.list("site", { pageSize: 500 }),
  ]);

  const orgById = new Map(orgs.items.map((org) => [org.id, org]));
  const siteById = new Map(sites.items.map((site) => [site.id, site]));

  const observations = [
    ...(person.notes ? [{ id: "person-notes", context: "Personal notes", text: person.notes }] : []),
    ...contacts.items
      .filter((contact) => contact.notes)
      .map((contact) => {
        const org = orgById.get(contact.organizationId);
        return { id: contact.id, context: `Contact at ${org?.name ?? contact.organizationId}`, text: contact.notes ?? "" };
      }),
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Organizations", href: "/organizations" }, { label: "People" }, { label: person.fullName }]} />

      <TenantPrivateNotice message="People are tenant-private relationship records. This profile — including contact details and decision roles — is visible only inside this workspace and is never shared to the canonical graph." />

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <UserRound className="h-5 w-5 text-slate-400" aria-hidden="true" />
            <CardTitle className="text-xl">{person.fullName}</CardTitle>
            <VisibilityBadge visibility={person.visibility} />
            <DemoBadge isDemo={person.isDemo} />
          </div>
        </CardHeader>
        <CardContent>
          <DetailGrid>
            <DetailItem label="Title">{person.title ?? "—"}</DetailItem>
            <DetailItem label="Email">
              {person.email ? (
                <a href={`mailto:${person.email}`} className="text-spectral-600 hover:underline">
                  {person.email}
                </a>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="Phone">{person.phone ?? "—"}</DetailItem>
            <DetailItem label="Last updated">
              <time dateTime={person.updatedAt}>{formatDateTime(person.updatedAt)}</time>
            </DetailItem>
          </DetailGrid>
        </CardContent>
      </Card>

      <SectionCard
        title="Employment relationships"
        description="Organizations this person is (or was) employed by."
      >
          {employments.items.length === 0 ? (
            <EmptyState
              icon={UserRound}
              title="No employment relationships recorded"
              description="Link this person to their employer to complete the account map."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Current</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employments.items.map((employment) => {
                  const org = orgById.get(employment.organizationId);
                  return (
                    <TableRow key={employment.id}>
                      <TableCell>
                        {org ? (
                          <Link href={`/organizations/${org.id}`} className="font-medium text-spectral-600 hover:underline">
                            {org.name}
                          </Link>
                        ) : (
                          employment.organizationId
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{employment.role ?? "—"}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDate(employment.startedAt)} → {employment.current ? "present" : formatDate(employment.endedAt)}
                      </TableCell>
                      <TableCell>
                        {employment.current ? <Badge variant="success">Current</Badge> : <Badge variant="secondary">Past</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
      </SectionCard>

      <SectionCard title="Decision roles" description="Purchasing-influence roles mapped at each organization.">
          {contacts.items.length === 0 ? (
            <EmptyState
              icon={UserRound}
              title="No decision roles mapped"
              description="Decision roles (QA approver, economic buyer, …) drive coverage-gap and account-priority analysis."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Decision roles</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Visibility</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.items.map((contact) => {
                  const org = orgById.get(contact.organizationId);
                  const site = contact.siteId ? siteById.get(contact.siteId) : undefined;
                  return (
                    <TableRow key={contact.id}>
                      <TableCell>
                        {org ? (
                          <Link href={`/organizations/${org.id}`} className="font-medium text-spectral-600 hover:underline">
                            {org.name}
                          </Link>
                        ) : (
                          contact.organizationId
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {site ? (
                          <Link href={`/sites/${site.id}`} className="hover:underline">
                            {site.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contact.decisionRoles.length === 0 ? (
                            <span className="text-xs text-slate-500">—</span>
                          ) : (
                            contact.decisionRoles.map((role) => (
                              <Badge key={role} variant="secondary">
                                {DECISION_ROLE_LABELS[role]}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{contact.isPrimary ? <Badge variant="default">Primary</Badge> : "—"}</TableCell>
                      <TableCell>
                        <VisibilityBadge visibility={contact.visibility} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
      </SectionCard>

      {observations.length > 0 ? (
        <SectionCard
          title="Contact observations"
          description="Field notes captured about this person (tenant-private)."
        >
            <ul className="divide-y divide-slate-100">
              {observations.map((observation) => (
                <li key={observation.id} className="py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{observation.context}</p>
                  <p className="mt-0.5 text-sm text-slate-700">{observation.text}</p>
                </li>
              ))}
            </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}
