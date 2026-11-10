import { ApiError } from "@/lib/api-error";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, retryAfterSec: 0 };
  }
  if (current.count >= limit) {
    return {
      ok: false as const,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { ok: true as const, retryAfterSec: 0 };
}

export function assertRateLimit(key: string, limit: number, windowMs: number) {
  const result = rateLimit(key, limit, windowMs);
  if (!result.ok) {
    throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Try again later.", {
      retryAfterSec: result.retryAfterSec,
    });
  }
}

export function authRateLimit(): number {
  const parsed = Number(process.env.AUTH_RATE_LIMIT ?? "10");
  if (!Number.isFinite(parsed) || parsed < 1) return 10;
  return Math.floor(parsed);
}

export function resetRateLimits() {
  buckets.clear();
}

export const AUTH_WINDOW_MS = 15 * 60 * 1000;
