import { getRepository } from "@/lib/data";
import { withApi } from "@/lib/api/handler";
import { notFound, ok } from "@/lib/api/respond";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/v1/products/[id] — full product aggregate (family, brand, skus, edges, documents). */
export const GET = withApi<RouteContext>("v1/products/:id", async (_request, context) => {
  const { id } = await context.params;
  const repo = await getRepository();
  const detail = await repo.getProductDetail(id);
  if (!detail) return notFound(`product ${id} not found`);
  return ok(detail);
});
