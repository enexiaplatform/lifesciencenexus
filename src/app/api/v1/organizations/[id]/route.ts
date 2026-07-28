import { getRepository } from "@/lib/data";
import { canSeeTenantPrivate } from "@/lib/api/guards";
import { withApi } from "@/lib/api/handler";
import { notFound, ok } from "@/lib/api/respond";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/organizations/[id] — full organization aggregate.
 * Tenant-private sub-records (contacts) are stripped for anonymous callers.
 */
export const GET = withApi<RouteContext>("v1/organizations/:id", async (_request, context, api) => {
  const { id } = await context.params;
  const repo = await getRepository();
  const detail = await repo.getOrganizationDetail(id);
  if (!detail) return notFound(`organization ${id} not found`);
  // Existence of tenant-private records is not leaked to anonymous callers.
  if (!canSeeTenantPrivate(api.auth) && detail.organization.visibility === "tenant_private") {
    return notFound(`organization ${id} not found`);
  }
  if (!canSeeTenantPrivate(api.auth)) {
    detail.contacts = detail.contacts.filter((contact) => contact.visibility === "canonical");
  }
  return ok(detail);
});
