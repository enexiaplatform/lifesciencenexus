import { getRepository } from "@/lib/data";
import { demoTenantId, featureFlags, getDataBackend, getSupabaseEnv } from "@/lib/env";
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

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "default",
  analyst: "secondary",
  contributor: "secondary",
  reviewer: "secondary",
  viewer: "outline",
};

/** /settings — workspace, data mode and feature flags. */
export default async function SettingsPage() {
  const repo = await getRepository();
  const backend = getDataBackend();
  const supabaseConfigured = getSupabaseEnv() !== null;

  const tenants = await repo.list("tenant", { pageSize: 50 });
  const tenant = tenants.items.find((candidate) => candidate.id === demoTenantId) ?? null;
  const memberships = await repo.list("tenant_membership", {
    pageSize: 50,
    filters: { tenantId: demoTenantId },
  });
  const profiles = await repo.list("profile", { pageSize: 50 });
  const profileByUser = new Map(profiles.items.map((profile) => [profile.userId, profile]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Workspace, data mode and feature flags for this Nexus deployment.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace</CardTitle>
            <CardDescription>The demo tenant this deployment serves.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5 text-sm">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{tenant?.name ?? "Nexus Demo Workspace"}</dd>
              <dt className="text-slate-500">Tenant id</dt>
              <dd><code className="font-mono text-xs">{demoTenantId}</code></dd>
              <dt className="text-slate-500">Slug</dt>
              <dd className="text-sm">{tenant?.slug ?? "nexus-demo"}</dd>
            </dl>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Members ({memberships.items.length})
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.items.map((membership) => {
                    const profile = profileByUser.get(membership.userId);
                    return (
                      <TableRow key={membership.id}>
                        <TableCell className="font-medium text-slate-900">
                          {profile?.fullName ?? membership.userId}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{profile?.email ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={ROLE_VARIANT[membership.role] ?? "outline"}>{membership.role}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data mode</CardTitle>
              <CardDescription>Which backend the repository seam resolves to.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Active backend</span>
                <Badge variant={backend === "demo" ? "warning" : "success"}>{backend}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Supabase configured</span>
                <Badge variant={supabaseConfigured ? "success" : "outline"}>
                  {supabaseConfigured ? "yes" : "no"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Demo mode runs on the in-memory repository (seeded synthetic dataset, nothing
                persists across restarts). Set Supabase env vars or NEXUS_DATA_BACKEND=supabase
                to switch backends — the UI talks to the same repository contract either way.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">AI extraction</span>
                <Badge variant={featureFlags.aiExtraction ? "warning" : "destructive"}>
                  {featureFlags.aiExtraction ? "ENABLED" : "DISABLED"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                AI-assisted extraction stays off unless every guardrail holds: (1) the
                NEXUS_ENABLE_AI_EXTRACTION feature flag, (2) explicit env opt-in at deploy time,
                (3) mandatory human review before any extracted claim enters the graph,
                (4) evidence preservation — raw source and extraction provenance stored with
                every claim, and (5) a non-AI fallback so every workflow also works with manual
                capture only.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
