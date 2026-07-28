import { withApi } from "@/lib/api/handler";
import { buildOpenApiDocument } from "@/lib/api/openapi";
import { ok } from "@/lib/api/respond";

/** GET /api/v1/openapi.json — hand-written OpenAPI 3.1 document for API v1. */
export const GET = withApi("v1/openapi.json", async () => {
  return ok(buildOpenApiDocument());
});
