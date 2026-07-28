import { getRepository } from "@/lib/data";
import { buildAtlasResponse } from "@/lib/api/atlas";
import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";

/**
 * GET /api/v1/integrations/atlas/products — canonical, vendor-neutral
 * nexus-atlas-read/v1 payload (no prices, no commercial terms, no
 * equivalence verdicts; see @/lib/integrations/atlas).
 */
export const GET = withApi("v1/integrations/atlas/products", async () => {
  const repo = await getRepository();
  const payload = await buildAtlasResponse(repo, "products");
  return ok(payload, { total: payload.data.length });
});
