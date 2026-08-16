import { getSupabaseEnv } from "@/lib/env";

export { sanitizeNextPath } from "./next-path";

/**
 * Workspace access gating.
 *
 * Auth is env-gated: with Supabase env vars set, workspace routes require a
 * session and anonymous visitors are redirected to `/login?next=…`. With no
 * env vars the app runs the public demo and everything stays open.
 */

/** True when Supabase Auth is configured (server-side helper). */
export function isAuthEnabled(): boolean {
  return getSupabaseEnv() !== null;
}

export type AccessDecision =
  | { allow: true }
  | { allow: false; redirectTo: string };

/** Exact paths that never require a session. */
const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/pricing",
  "/contact",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

/**
 * Prefixes that never require a session:
 * - `/legal`, `/auth` — public marketing/legal and auth-flow routes.
 * - `/api` — API routes carry their own `x-api-key` auth; do not gate them.
 * - `/screenshots` — public marketing media.
 * - `/manifest`, `/robots`, `/sitemap`, `/icon`, `/apple-icon`, `/favicon` —
 *   metadata routes (also matches file extensions, e.g. `/manifest.webmanifest`).
 */
const PUBLIC_PREFIXES = [
  "/legal",
  "/auth",
  "/api",
  "/screenshots",
  "/manifest",
  "/robots",
  "/sitemap",
  "/icon",
  "/apple-icon",
  "/favicon",
];

/**
 * Decide whether a request for `pathname` may proceed.
 *
 * Demo mode (`authEnabled === false`) always allows, preserving current
 * behavior. Otherwise public paths pass and everything else requires a
 * session; anonymous requests are sent to `/login` with an encoded `next`.
 */
export function decideAccess(
  pathname: string,
  hasSession: boolean,
  authEnabled: boolean,
): AccessDecision {
  if (!authEnabled) {
    return { allow: true };
  }
  if (
    PUBLIC_EXACT_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return { allow: true };
  }
  if (!hasSession) {
    return {
      allow: false,
      redirectTo: `/login?next=${encodeURIComponent(pathname)}`,
    };
  }
  return { allow: true };
}
