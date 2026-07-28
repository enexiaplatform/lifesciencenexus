import { getRepository } from "@/lib/data";
import { canSeeTenantPrivate } from "@/lib/api/guards";
import { withApi } from "@/lib/api/handler";
import { notFound, ok } from "@/lib/api/respond";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/skus/[id] — full SKU detail: product/family/brand/manufacturer,
 * formats, packs, edges, listings, prices, documents.
 * Tenant-private prices/listings are stripped for anonymous callers.
 */
export const GET = withApi<RouteContext>("v1/skus/:id", async (_request, context, api) => {
  const { id } = await context.params;
  const repo = await getRepository();
  const detail = await repo.getSkuDetail(id);
  if (!detail) return notFound(`sku ${id} not found`);

  if (!canSeeTenantPrivate(api.auth)) {
    detail.prices = detail.prices.filter((price) => price.visibility === "canonical");
    detail.listings = detail.listings.filter((listing) => listing.visibility === "canonical");
  }
  return ok(detail);
});
