import { z } from "zod";

import { getRepository } from "@/lib/data";
import { canSeeTenantPrivate } from "@/lib/api/guards";
import { withApi } from "@/lib/api/handler";
import { ok, pageMeta } from "@/lib/api/respond";
import { listQuerySchema, parseQuery, toListParams } from "@/lib/api/validate";
import { VISIBILITIES } from "@/lib/domain/types";

/**
 * GET /api/v1/prices — price observations.
 * Filters: sku (skuId), currency (ISO 4217), visibility.
 *
 * Visibility guard: `tenant_private` observations are returned ONLY to
 * callers authenticated as that tenant (demo: `x-nexus-tenant: tenant_demo`).
 * Anonymous callers always get canonical rows only, even if they pass
 * `visibility=tenant_private` (the filter is silently clamped).
 */
const querySchema = listQuerySchema.extend({
  sku: z.string().trim().min(1).optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  visibility: z.enum(VISIBILITIES).optional(),
  supplierOrgId: z.string().trim().min(1).optional(),
});

export const GET = withApi("v1/prices", async (request, _context, api) => {
  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { sku, currency, supplierOrgId } = parsed.data;

  let visibility = parsed.data.visibility;
  if (!canSeeTenantPrivate(api.auth)) {
    // Anonymous/keyless caller: canonical only (clamped, not an error).
    visibility = "canonical";
  }

  const repo = await getRepository();
  const paged = await repo.list(
    "price_observation",
    toListParams(parsed.data, ["observationDate", "originalAmount", "originalCurrency", "createdAt"], {
      filters: {
        ...(sku ? { skuId: sku } : {}),
        ...(currency ? { originalCurrency: currency } : {}),
        ...(supplierOrgId ? { supplierOrgId } : {}),
        ...(visibility ? { visibility } : {}),
      },
    }),
  );
  return ok(paged.items, pageMeta(paged));
});
