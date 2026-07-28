import { z } from "zod";

import { getRepository } from "@/lib/data";
import { withApi } from "@/lib/api/handler";
import { badRequest, ok } from "@/lib/api/respond";
import { commaList, parseQuery } from "@/lib/api/validate";
import { ENTITY_TYPES } from "@/lib/domain/types";

/**
 * GET /api/v1/search?q=&types=&limit=
 * Federated search; results include score + matchReasons.
 */
const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "q is required"),
  types: z.string().optional(),
  limit: z.preprocess(
    (value) => (value === undefined || value === "" ? undefined : Number(value)),
    z.number().int().min(1).max(50).default(20),
  ),
});

export const GET = withApi("v1/search", async (request) => {
  const parsed = parseQuery(request, searchQuerySchema);
  if (!parsed.ok) return parsed.response;

  const types = commaList(parsed.data.types);
  const invalid = types.filter((type) => !(ENTITY_TYPES as readonly string[]).includes(type));
  if (invalid.length > 0) {
    return badRequest(`Unknown entity types: ${invalid.join(", ")}`);
  }

  const repo = await getRepository();
  const results = await repo.search(parsed.data.q, {
    types: types.length > 0 ? (types as (typeof ENTITY_TYPES)[number][]) : undefined,
    limit: parsed.data.limit,
  });
  return ok(results, { total: results.length });
});
