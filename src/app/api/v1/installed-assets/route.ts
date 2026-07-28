import { z } from "zod";

import { getRepository } from "@/lib/data";
import { canSeeTenantPrivate } from "@/lib/api/guards";
import { withApi } from "@/lib/api/handler";
import { ok, pageMeta } from "@/lib/api/respond";
import { listQuerySchema, parseQuery, toListParams } from "@/lib/api/validate";
import { INSTALLED_ASSET_STATUSES, QUALIFICATION_STATUSES } from "@/lib/domain/types";

/**
 * GET /api/v1/installed-assets — installed-base records (tenant-private by
 * nature). Anonymous callers receive an empty page; tenant-authenticated
 * callers (demo: `x-nexus-tenant: tenant_demo`) receive their tenant's rows.
 */
const querySchema = listQuerySchema.extend({
  siteId: z.string().trim().min(1).optional(),
  assetModelId: z.string().trim().min(1).optional(),
  status: z.enum(INSTALLED_ASSET_STATUSES).optional(),
  qualificationStatus: z.enum(QUALIFICATION_STATUSES).optional(),
});

const EMPTY_PAGE_META = { page: 1, total: 0, totalPages: 1 };

export const GET = withApi("v1/installed-assets", async (request, _context, api) => {
  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { siteId, assetModelId, status, qualificationStatus } = parsed.data;

  if (!canSeeTenantPrivate(api.auth)) {
    return ok([], { ...EMPTY_PAGE_META, pageSize: parsed.data.pageSize });
  }

  const repo = await getRepository();
  const paged = await repo.list(
    "installed_asset",
    toListParams(parsed.data, ["installationDate", "createdAt"], {
      filters: {
        ...(siteId ? { siteId } : {}),
        ...(assetModelId ? { assetModelId } : {}),
        ...(status ? { status } : {}),
        ...(qualificationStatus ? { qualificationStatus } : {}),
      },
    }),
  );
  return ok(paged.items, pageMeta(paged));
});
