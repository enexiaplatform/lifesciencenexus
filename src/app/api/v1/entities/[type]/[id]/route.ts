import { getRepository } from "@/lib/data";
import { maySee } from "@/lib/api/guards";
import { withApi } from "@/lib/api/handler";
import { notFound, ok } from "@/lib/api/respond";
import { ENTITY_TYPES, type EntityType } from "@/lib/domain/types";

interface RouteContext {
  params: Promise<{ type: string; id: string }>;
}

/**
 * GET /api/v1/entities/[type]/[id] — generic entity fetch.
 * `type` must be one of the domain entity types. Tenant-private records are
 * 404 for anonymous callers (no existence leak).
 */
export const GET = withApi<RouteContext>("v1/entities/:type/:id", async (_request, context, api) => {
  const { type, id } = await context.params;
  if (!(ENTITY_TYPES as readonly string[]).includes(type)) {
    return notFound(`unknown entity type "${type}"`);
  }
  const repo = await getRepository();
  const entity = await repo.getById(type as EntityType, id);
  if (!entity || !maySee(api.auth, entity)) {
    return notFound(`${type} ${id} not found`);
  }
  return ok(entity);
});
