import { getRepository } from "@/lib/data";
import { withApi } from "@/lib/api/handler";
import { notFound, ok } from "@/lib/api/respond";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/v1/sites/[id] — site with its parent organization name. */
export const GET = withApi<RouteContext>("v1/sites/:id", async (_request, context) => {
  const { id } = await context.params;
  const repo = await getRepository();
  const site = await repo.getById("site", id);
  if (!site) return notFound(`site ${id} not found`);
  const organization = await repo.getById("organization", site.organizationId);
  return ok({ ...site, organizationName: organization?.name ?? null });
});
