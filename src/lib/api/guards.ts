import { demoTenantId } from "@/lib/env";
import type { Visibility } from "@/lib/domain/types";

import type { ApiAuth } from "./auth";

/**
 * Visibility guard for API v1.
 *
 * The repository scopes records to ITS configured tenant (demo: tenant_demo),
 * but the API must not leak tenant-private data to anonymous callers: a
 * tenant-private record is returned only when the request is authenticated as
 * that tenant (demo: `x-nexus-tenant: tenant_demo`). Canonical records are
 * always returned.
 */

export function canSeeTenantPrivate(auth: ApiAuth, tenantId: string = demoTenantId): boolean {
  return auth.authenticated && auth.tenantId === tenantId;
}

/** Filter a list to what this caller may see. */
export function visibleTo<T extends { visibility: Visibility }>(auth: ApiAuth, items: T[]): T[] {
  if (canSeeTenantPrivate(auth)) return items;
  return items.filter((item) => item.visibility === "canonical");
}

/** May this caller see one record? */
export function maySee<T extends { visibility: Visibility }>(auth: ApiAuth, entity: T): boolean {
  return canSeeTenantPrivate(auth) || entity.visibility === "canonical";
}

/** In-app deep link for an entity (used in integration payloads). */
export function entityAppPath(entityType: string, id: string): string {
  const base: Record<string, string> = {
    organization: "/organizations",
    site: "/sites",
    person: "/people",
    product: "/products",
    sku: "/skus",
    installed_asset: "/installed-base",
    tender: "/tenders",
    laboratory: "/laboratories",
  };
  const prefix = base[entityType];
  return prefix ? `${prefix}/${id}` : `/search?q=${encodeURIComponent(id)}`;
}
