import { z } from "zod";

import { getRepository } from "@/lib/data";
import { canSeeTenantPrivate } from "@/lib/api/guards";
import { withApi } from "@/lib/api/handler";
import { ok, pageMeta } from "@/lib/api/respond";
import { listQuerySchema, parseQuery, toListParams } from "@/lib/api/validate";
import { SIGNAL_STATUSES, SIGNAL_TYPES } from "@/lib/domain/types";

/**
 * GET /api/v1/signals — computed opportunity signals (tenant-private
 * intelligence). Anonymous callers receive an empty page.
 */
const querySchema = listQuerySchema.extend({
  type: z.enum(SIGNAL_TYPES).optional(),
  status: z.enum(SIGNAL_STATUSES).optional(),
});

export const GET = withApi("v1/signals", async (request, _context, api) => {
  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;

  if (!canSeeTenantPrivate(api.auth)) {
    return ok([], { page: 1, pageSize: parsed.data.pageSize, total: 0, totalPages: 1 });
  }

  const repo = await getRepository();
  const paged = await repo.listSignals(
    toListParams(parsed.data, ["generatedAt", "type"], {
      filters: {
        ...(parsed.data.type ? { type: parsed.data.type } : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
      },
    }),
  );
  return ok(paged.items, pageMeta(paged));
});
