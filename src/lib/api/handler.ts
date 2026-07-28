import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticate, type ApiAuth } from "./auth";
import { checkRateLimit } from "./rate-limit";
import { internalError, rateLimited } from "./respond";

/**
 * Shared API v1 pipeline: authenticate -> rate limit -> handler -> error
 * contract. Every v1 route wraps its handler with `withApi`.
 *
 * Rate limit: 60 req/min per (API key, route), in-memory (per-instance —
 * see rate-limit.ts). Exceeding requests get 429 + Retry-After in the
 * standard error contract.
 */

export interface ApiContext {
  auth: ApiAuth;
}

type RouteHandler<C> = (request: NextRequest, routeContext: C, api: ApiContext) => Promise<NextResponse> | NextResponse;

export function withApi<C = unknown>(routeKey: string, handler: RouteHandler<C>): (request: NextRequest, routeContext: C) => Promise<NextResponse> {
  return async (request: NextRequest, routeContext: C) => {
    const authResult = authenticate(request);
    if (!authResult.ok) return authResult.response;

    const limit = checkRateLimit(`${authResult.auth.keyId}:${routeKey}`);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

    try {
      const response = await handler(request, routeContext, { auth: authResult.auth });
      response.headers.set("X-RateLimit-Limit", String(limit.limit));
      response.headers.set("X-RateLimit-Remaining", String(limit.remaining));
      return response;
    } catch (error) {
      console.error(`[api] ${routeKey} failed:`, error);
      return internalError();
    }
  };
}
