import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

import { unauthorized } from "./respond";

/**
 * API v1 authentication.
 *
 * Current shape (demo): a single static API key in `NEXUS_API_KEY` checked
 * against the `x-api-key` header. When the env var is unset the API runs in
 * demo mode: requests are allowed without a key and flagged `mode: "demo"`.
 *
 * Tenant scoping: `tenant_private` data is returned only when the caller is
 * authenticated AS that tenant. In demo mode that means the explicit header
 * `x-nexus-tenant: tenant_demo`; with an API key configured, the same header
 * selects the tenant the key acts for. Requests without a tenant header are
 * anonymous and see canonical data only.
 *
 * Note: `NEXUS_API_KEY` is read from process.env directly (not via
 * `@/lib/env`) because that module is owned by another workstream; the name
 * and semantics mirror its conventions.
 *
 * Later (Supabase): swap the key check for JWT verification — the returned
 * ApiAuth shape already carries everything downstream code needs
 * (tenantId + authenticated), so handlers will not change.
 */

export interface ApiAuth {
  /** "demo" when NEXUS_API_KEY is unset, "api_key" otherwise. */
  mode: "demo" | "api_key";
  /** True once credentials (or demo mode) are accepted. */
  authenticated: boolean;
  /** Tenant the caller acts as; null = anonymous (canonical data only). */
  tenantId: string | null;
  /** Rate-limit identity: the api key, or "demo" in demo mode. */
  keyId: string;
}

export const DEMO_TENANT_HEADER = "x-nexus-tenant";
export const API_KEY_HEADER = "x-api-key";

export type AuthResult = { ok: true; auth: ApiAuth } | { ok: false; response: NextResponse };

export function authenticate(request: NextRequest): AuthResult {
  const configuredKey = process.env.NEXUS_API_KEY;
  const tenantHeader = request.headers.get(DEMO_TENANT_HEADER)?.trim() || null;

  if (!configuredKey) {
    // Demo mode: no key required. Tenant is only trusted from the explicit
    // header — anonymous callers get canonical data only.
    return {
      ok: true,
      auth: { mode: "demo", authenticated: true, tenantId: tenantHeader, keyId: "demo" },
    };
  }

  const presented = request.headers.get(API_KEY_HEADER);
  if (!presented || presented !== configuredKey) {
    return { ok: false, response: unauthorized() };
  }
  return {
    ok: true,
    auth: { mode: "api_key", authenticated: true, tenantId: tenantHeader, keyId: configuredKey },
  };
}
