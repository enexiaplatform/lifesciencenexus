import { z } from "zod";

import { getRepository } from "@/lib/data";
import { withApi } from "@/lib/api/handler";
import { ok, pageMeta } from "@/lib/api/respond";
import { listQuerySchema, parseQuery, toListParams } from "@/lib/api/validate";
import { SUPPLIER_RELATIONSHIP_TYPES } from "@/lib/domain/types";

/**
 * GET /api/v1/suppliers — supplier profiles joined with organization names.
 * Filters: relationshipType, country (countries served).
 */
const querySchema = listQuerySchema.extend({
  relationshipType: z.enum(SUPPLIER_RELATIONSHIP_TYPES).optional(),
  country: z.string().trim().toUpperCase().length(2).optional(),
});

export const GET = withApi("v1/suppliers", async (request) => {
  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { relationshipType, country } = parsed.data;

  const repo = await getRepository();
  const paged = await repo.list(
    "supplier_profile",
    toListParams(parsed.data, ["relationshipType", "createdAt"], {
      filters: {
        ...(relationshipType ? { relationshipType } : {}),
        ...(country ? { countries: country } : {}),
      },
    }),
  );

  const items = await Promise.all(
    paged.items.map(async (profile) => {
      const organization = await repo.getById("organization", profile.organizationId);
      return {
        ...profile,
        organizationName: organization?.name ?? null,
      };
    }),
  );
  return ok(items, pageMeta(paged));
});
