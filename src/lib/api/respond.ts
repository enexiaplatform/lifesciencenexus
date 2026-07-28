import { NextResponse } from "next/server";

/**
 * API v1 response contract.
 *
 * Success:  `{ data, meta }` — meta carries pagination (`page`, `pageSize`,
 * `total`, `totalPages`) plus endpoint-specific extras.
 * Error:    `{ error: { code, message, details? } }` with a stable machine
 * code and an HTTP status from the shared set (400/401/404/422/429/500).
 */

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export const API_ERROR_CODES = [
  "bad_request",
  "unauthorized",
  "not_found",
  "unprocessable",
  "rate_limited",
  "internal_error",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Success envelope. */
export function ok<T>(data: T, meta: ApiMeta = {}, init: { status?: number; headers?: HeadersInit } = {}): NextResponse {
  return NextResponse.json({ data, meta }, { status: init.status ?? 200, headers: init.headers });
}

/** Error envelope. */
export function apiError(status: number, code: ApiErrorCode, message: string, details?: unknown, headers?: HeadersInit): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status, headers },
  );
}

export const badRequest = (message: string, details?: unknown) => apiError(400, "bad_request", message, details);
export const unauthorized = (message = "Missing or invalid API key.") => apiError(401, "unauthorized", message);
export const notFound = (message = "Resource not found.") => apiError(404, "not_found", message);
export const unprocessable = (message: string, details?: unknown) => apiError(422, "unprocessable", message, details);
export const rateLimited = (retryAfterSeconds: number) =>
  apiError(429, "rate_limited", `Rate limit exceeded. Retry in ${retryAfterSeconds} seconds.`, undefined, {
    "Retry-After": String(retryAfterSeconds),
  });
export const internalError = (message = "Unexpected server error.") => apiError(500, "internal_error", message);

/** Pagination meta from a repository Paged<T>. */
export function pageMeta(paged: { page: number; pageSize: number; total: number; totalPages: number }): ApiMeta {
  return {
    page: paged.page,
    pageSize: paged.pageSize,
    total: paged.total,
    totalPages: paged.totalPages,
  };
}
