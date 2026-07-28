import { getRepository } from "@/lib/data";
import { withApi } from "@/lib/api/handler";
import { buildAndRecordHandoff, handoffRequestSchema } from "@/lib/api/memoire-handoff";
import { notFound, ok } from "@/lib/api/respond";
import { parseJsonBody } from "@/lib/api/validate";

/**
 * POST /api/v1/integrations/memoire/handoff
 * Body: { entityType, entityId, suggestedActionKind? }.
 * Builds a nexus-handoff/v1 payload, records an outbound_handoff_record
 * (status: prepared) and returns the payload. 404 unknown entity, 422
 * invalid body.
 */
export const POST = withApi("v1/integrations/memoire/handoff", async (request, _context, api) => {
  const parsed = await parseJsonBody(request, handoffRequestSchema);
  if (!parsed.ok) return parsed.response;

  const repo = await getRepository();
  const result = await buildAndRecordHandoff(repo, parsed.data, api.auth.tenantId);
  if (!result.ok) return notFound(result.message);
  return ok(result.payload, { handoffRecordId: result.handoffRecordId });
});
