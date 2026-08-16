/**
 * Sanitize a post-auth redirect target (`next` query param).
 *
 * Client-safe: this module has no server-only imports and may be used from
 * browser code. It is re-exported from `./gating` for server consumers.
 *
 * Only same-origin absolute paths are allowed — anything else (protocol-
 * relative `//evil.com`, absolute URLs, empty values) falls back to the
 * dashboard so auth flows can never redirect off-site.
 */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/dashboard";
}
