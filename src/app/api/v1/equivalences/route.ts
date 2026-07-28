import { z } from "zod";

import { getRepository } from "@/lib/data";
import { withApi } from "@/lib/api/handler";
import { ok, pageMeta } from "@/lib/api/respond";
import { listQuerySchema, parseQuery, toListParams } from "@/lib/api/validate";
import { EQUIVALENCE_CLASSIFICATIONS } from "@/lib/domain/types";

/** GET /api/v1/equivalences — equivalence records. Filters: classification, skuId (either side). */
const querySchema = listQuerySchema.extend({
  classification: z.enum(EQUIVALENCE_CLASSIFICATIONS).optional(),
  skuId: z.string().trim().min(1).optional(),
});

export const GET = withApi("v1/equivalences", async (request) => {
  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { classification, skuId } = parsed.data;

  const repo = await getRepository();
  let paged = await repo.list(
    "equivalence_record",
    toListParams(parsed.data, ["overallScore", "classification", "createdAt"], {
      filters: classification ? { classification } : {},
    }),
  );
  if (skuId) {
    // skuId can sit on either side — filter post-list (demo scale is fine).
    const items = paged.items.filter((record) => record.sourceSkuId === skuId || record.candidateSkuId === skuId);
    paged = { ...paged, items, total: items.length, totalPages: 1 };
  }
  return ok(paged.items, pageMeta(paged));
});
