import { z } from "zod";

import { getRepository } from "@/lib/data";
import { withApi } from "@/lib/api/handler";
import { ok, pageMeta } from "@/lib/api/respond";
import { listQuerySchema, parseQuery, toListParams } from "@/lib/api/validate";
import { TENDER_STATUSES } from "@/lib/domain/types";

/**
 * GET /api/v1/tenders — list tenders.
 * Filters: q (code/title), status, country.
 */
const querySchema = listQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  status: z.enum(TENDER_STATUSES).optional(),
  country: z.string().trim().toUpperCase().length(2).optional(),
});

export const GET = withApi("v1/tenders", async (request) => {
  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { q, status, country } = parsed.data;

  const repo = await getRepository();
  const paged = await repo.list(
    "tender",
    toListParams(parsed.data, ["code", "title", "publicationDate", "createdAt"], {
      query: q,
      filters: {
        ...(status ? { status } : {}),
        ...(country ? { country } : {}),
      },
    }),
  );
  return ok(paged.items, pageMeta(paged));
});
