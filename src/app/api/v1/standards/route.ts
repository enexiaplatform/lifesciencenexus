import { z } from "zod";

import { getRepository } from "@/lib/data";
import { withApi } from "@/lib/api/handler";
import { ok, pageMeta } from "@/lib/api/respond";
import { listQuerySchema, parseQuery, toListParams } from "@/lib/api/validate";
import { STANDARD_BODIES } from "@/lib/domain/types";

/**
 * GET /api/v1/standards — list standards (optionally with their versions inline).
 * Filters: q (code/title), body (ISO, USP, ...).
 */
const querySchema = listQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  body: z.enum(STANDARD_BODIES).optional(),
  includeVersions: z.enum(["true", "false"]).default("false"),
});

export const GET = withApi("v1/standards", async (request) => {
  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { q, body, includeVersions } = parsed.data;

  const repo = await getRepository();
  const paged = await repo.list(
    "standard",
    toListParams(parsed.data, ["code", "body", "title", "createdAt"], {
      query: q,
      filters: body ? { body } : {},
    }),
  );

  let versionsByStandard: Map<string, unknown[]> | null = null;
  if (includeVersions === "true") {
    const versions = await repo.list("standard_version", { pageSize: 100 });
    versionsByStandard = new Map();
    for (const version of versions.items) {
      const list = versionsByStandard.get(version.standardId) ?? [];
      list.push(version);
      versionsByStandard.set(version.standardId, list);
    }
  }

  const items = paged.items.map((standard) =>
    versionsByStandard ? { ...standard, versions: versionsByStandard.get(standard.id) ?? [] } : standard,
  );
  return ok(items, pageMeta(paged));
});
