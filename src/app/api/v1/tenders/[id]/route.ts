import { getRepository } from "@/lib/data";
import { withApi } from "@/lib/api/handler";
import { notFound, ok } from "@/lib/api/respond";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/v1/tenders/[id] — tender with buyer, lots, items, bidders, awards, events. */
export const GET = withApi<RouteContext>("v1/tenders/:id", async (_request, context) => {
  const { id } = await context.params;
  const repo = await getRepository();
  const detail = await repo.getTenderDetail(id);
  if (!detail) return notFound(`tender ${id} not found`);
  return ok(detail);
});
