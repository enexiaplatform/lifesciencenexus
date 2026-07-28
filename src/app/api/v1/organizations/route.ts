import { z } from "zod";

import { getRepository } from "@/lib/data";
import { withApi } from "@/lib/api/handler";
import { ok, pageMeta } from "@/lib/api/respond";
import { listQuerySchema, parseQuery, toListParams } from "@/lib/api/validate";

/**
 * GET /api/v1/organizations — list organizations.
 * Filters: q (name), country (ISO alpha-2), type (organization role).
 */
const querySchema = listQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  country: z.string().trim().toUpperCase().length(2).optional(),
  type: z.string().trim().min(1).optional(),
});

export const GET = withApi("v1/organizations", async (request) => {
  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { q, country, type } = parsed.data;

  const repo = await getRepository();
  const paged = await repo.list(
    "organization",
    toListParams(parsed.data, ["name", "country", "createdAt"], {
      query: q,
      filters: {
        ...(country ? { country } : {}),
        ...(type ? { types: type } : {}),
      },
    }),
  );
  return ok(paged.items, pageMeta(paged));
});
