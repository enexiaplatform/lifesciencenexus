import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { z } from "zod";

import { badRequest, unprocessable } from "./respond";

/**
 * Zod-backed input parsing for API v1 route handlers.
 *
 * Query strings fail with 400 (malformed request), JSON bodies with 422
 * (well-formed but semantically invalid) — both in the shared error contract.
 */

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

function zodDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
    code: issue.code,
  }));
}

/** Parse + validate the query string. Multi-value params arrive comma-joined. */
export function parseQuery<S extends z.ZodTypeAny>(request: NextRequest, schema: S): ParseResult<z.infer<S>> {
  const raw: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    raw[key] = key in raw ? `${raw[key]},${value}` : value;
  });
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, response: badRequest("Invalid query parameters.", zodDetails(result.error)) };
  }
  return { ok: true, data: result.data };
}

/** Parse + validate a JSON request body. */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  request: NextRequest,
  schema: S,
): Promise<ParseResult<z.infer<S>>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { ok: false, response: badRequest("Request body is not valid JSON.") };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return { ok: false, response: unprocessable("Request body failed validation.", zodDetails(result.error)) };
  }
  return { ok: true, data: result.data };
}

// ---------------------------------------------------------------------------
// Shared list-query schema (pagination + sorting)
// ---------------------------------------------------------------------------

const intParam = (fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? undefined : Number(value)),
    z.number().int().min(1).default(fallback),
  );

/** pageSize: invalid input 400s; out-of-range values clamp into 1..100. */
const pageSizeParam = z.preprocess(
  (value) => {
    if (value === undefined || value === "") return 25;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return value; // let zod report the type error
    return Math.min(Math.max(Math.trunc(parsed), 1), 100);
  },
  z.number().int().min(1).max(100),
);

/**
 * Standard list query: ?page=&pageSize=&sort=&order=. Endpoint schemas extend
 * this with their own filters. Sort fields must be whitelisted per endpoint
 * via {@link toListParams}.
 */
export const listQuerySchema = z.object({
  page: intParam(1),
  pageSize: pageSizeParam,
  sort: z.string().trim().min(1).optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

/** Comma-separated query param into a trimmed string array (empty when absent). */
export function commaList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

/** Build repository ListParams, whitelisting the sort field. */
export function toListParams(
  query: ListQuery,
  allowedSortFields: readonly string[],
  extra: { query?: string; filters?: Record<string, string | number | boolean | Array<string | number | boolean>> } = {},
): { page: number; pageSize: number; sort?: { field: string; direction: "asc" | "desc" }; query?: string; filters?: Record<string, string | number | boolean | Array<string | number | boolean>> } {
  return {
    page: query.page,
    pageSize: query.pageSize,
    ...(query.sort && allowedSortFields.includes(query.sort)
      ? { sort: { field: query.sort, direction: query.order } }
      : {}),
    ...(extra.query ? { query: extra.query } : {}),
    ...(extra.filters && Object.keys(extra.filters).length > 0 ? { filters: extra.filters } : {}),
  };
}
