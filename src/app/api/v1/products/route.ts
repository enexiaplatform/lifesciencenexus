import { z } from "zod";

import { getRepository } from "@/lib/data";
import { withApi } from "@/lib/api/handler";
import { ok, pageMeta } from "@/lib/api/respond";
import { listQuerySchema, parseQuery, toListParams } from "@/lib/api/validate";

/**
 * GET /api/v1/products — list products.
 * Filters: q, category, status, familyId, manufacturerOrganizationId.
 */
const querySchema = listQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  status: z.enum(["active", "discontinued", "unknown"]).optional(),
  familyId: z.string().trim().min(1).optional(),
  manufacturerOrganizationId: z.string().trim().min(1).optional(),
});

export const GET = withApi("v1/products", async (request) => {
  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { q, category, status, familyId, manufacturerOrganizationId } = parsed.data;

  const repo = await getRepository();
  const paged = await repo.list(
    "product",
    toListParams(parsed.data, ["name", "category", "createdAt"], {
      query: q,
      filters: {
        ...(category ? { category } : {}),
        ...(status ? { status } : {}),
        ...(familyId ? { familyId } : {}),
        ...(manufacturerOrganizationId ? { manufacturerOrganizationId } : {}),
      },
    }),
  );
  return ok(paged.items, pageMeta(paged));
});
