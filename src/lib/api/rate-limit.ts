/**
 * In-memory token-bucket rate limiter for API v1.
 *
 * One bucket per (key, route): `limit` tokens per `windowMs`, refilled
 * wholesale when the window rolls over. 60 req/min by default.
 *
 * LIMITATION: the store is per process/instance. A multi-instance deployment
 * must move this to a shared store (Redis/KV); the function signature
 * (injectable clock, pure result) is designed to make that swap trivial.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the current window resets (for Retry-After). */
  retryAfterSeconds: number;
  resetAt: number;
}

interface Bucket {
  tokens: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export const DEFAULT_RATE_LIMIT = 60;
export const DEFAULT_RATE_WINDOW_MS = 60_000;

export function checkRateLimit(
  key: string,
  options: { limit?: number; windowMs?: number; now?: number } = {},
): RateLimitResult {
  const limit = options.limit ?? DEFAULT_RATE_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_RATE_WINDOW_MS;
  const now = options.now ?? Date.now();

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { tokens: limit, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  if (bucket.tokens <= 0) {
    return { allowed: false, limit, remaining: 0, retryAfterSeconds, resetAt: bucket.resetAt };
  }
  bucket.tokens -= 1;
  return { allowed: true, limit, remaining: bucket.tokens, retryAfterSeconds, resetAt: bucket.resetAt };
}

/** Clear all buckets (test isolation). */
export function resetRateLimitStoreForTests(): void {
  buckets.clear();
}
