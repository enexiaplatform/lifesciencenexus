import type { Profile, Tenant, TenantMembership } from "@/lib/domain/types";

import type { SeedContext } from "./context";
import { DEMO_TENANT_ID, MEMBERSHIPS, OTHER_TENANT_ID, PROFILES, USERS } from "./ids";
import type { DemoDatasetSlices } from "./types";

/**
 * Tenancy fixtures: the demo workspace (`tenant_demo`) with three members at
 * distinct roles, plus a second tenant (`tenant_other`) whose private records
 * (seeded elsewhere) prove tenant isolation in tests.
 */
export function seedTenancy(ctx: SeedContext): DemoDatasetSlices {
  const tenants: Tenant[] = [
    {
      ...ctx.canonical(DEMO_TENANT_ID),
      name: "Nexus Demo Workspace (Demo)",
      slug: "nexus-demo",
    },
    {
      ...ctx.canonical(OTHER_TENANT_ID),
      name: "Other Workspace (Demo)",
      slug: "other-workspace",
    },
  ];

  // Memberships are tenant-scoped records: tenant_private, one per (user, tenant).
  const tenantMemberships: TenantMembership[] = [
    {
      ...ctx.canonical(MEMBERSHIPS.demoOwner),
      visibility: "tenant_private",
      tenantId: DEMO_TENANT_ID,
      userId: USERS.demoOwner,
      role: "owner",
    },
    {
      ...ctx.canonical(MEMBERSHIPS.demoAnalyst),
      visibility: "tenant_private",
      tenantId: DEMO_TENANT_ID,
      userId: USERS.demoAnalyst,
      role: "analyst",
    },
    {
      ...ctx.canonical(MEMBERSHIPS.demoViewer),
      visibility: "tenant_private",
      tenantId: DEMO_TENANT_ID,
      userId: USERS.demoViewer,
      role: "viewer",
    },
    {
      ...ctx.canonical(MEMBERSHIPS.otherOwner),
      visibility: "tenant_private",
      tenantId: OTHER_TENANT_ID,
      userId: USERS.otherOwner,
      role: "owner",
    },
  ];

  const profiles: Profile[] = [
    {
      ...ctx.canonical(PROFILES.demoOwner),
      userId: USERS.demoOwner,
      fullName: "Demo Owner (Demo)",
      email: "demo_owner@nexus.demo",
      defaultTenantId: DEMO_TENANT_ID,
    },
    {
      ...ctx.canonical(PROFILES.demoAnalyst),
      userId: USERS.demoAnalyst,
      fullName: "Demo Analyst (Demo)",
      email: "demo_analyst@nexus.demo",
      defaultTenantId: DEMO_TENANT_ID,
    },
    {
      ...ctx.canonical(PROFILES.demoViewer),
      userId: USERS.demoViewer,
      fullName: "Demo Viewer (Demo)",
      email: "demo_viewer@nexus.demo",
      defaultTenantId: DEMO_TENANT_ID,
    },
    {
      ...ctx.canonical(PROFILES.otherOwner),
      userId: USERS.otherOwner,
      fullName: "Other Tenant Owner (Demo)",
      email: "owner@other-tenant.demo",
      defaultTenantId: OTHER_TENANT_ID,
    },
  ];

  return {
    tenant: tenants,
    tenant_membership: tenantMemberships,
    profile: profiles,
  };
}
