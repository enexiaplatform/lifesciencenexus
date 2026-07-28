import { z } from "zod";

import { getRepository } from "@/lib/data";
import { withApi } from "@/lib/api/handler";
import { ok, pageMeta } from "@/lib/api/respond";
import { listQuerySchema, parseQuery, toListParams } from "@/lib/api/validate";
import { SOURCE_TYPES } from "@/lib/domain/types";

/** GET /api/v1/sources — evidence sources. Filters: q (title), type. */
const querySchema = listQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  type: z.enum(SOURCE_TYPES).optional(),
});

export const GET = withApi("v1/sources", async (request) => {
  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;

  const repo = await getRepository();
  const paged = await repo.list(
    "source",
    toListParams(parsed.data, ["title", "capturedAt", "publishedAt", "createdAt"], {
      query: parsed.data.q,
      filters: parsed.data.type ? { type: parsed.data.type } : {},
    }),
  );
  return ok(paged.items, pageMeta(paged));
});
