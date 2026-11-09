import { ApiError } from "@/lib/api-error";

const WINDOW_MS = 15 * 60 * 1000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function authLimit(): number {
  const parsed = Number.parseInt(process.env.AUTH_RATE_LIMIT ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Fixed-window counter. Returns false once `key` has used up its attempts.
 *
 * State lives in this server process, so each instance counts separately and a
 * restart clears it. Put a shared store (Redis, a database table) behind this
 * function before running more than one instance.
 */
export function consume(key: string, limit = authLimit(), now = Date.now()): boolean {
  if (buckets.size > 10_000) prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function enforceRateLimit(key: string) {
  if (!consume(key)) {
    throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Try again in 15 minutes.");
  }
}

export function resetRateLimits() {
  buckets.clear();
}

/** Best-effort client IP. Only trust these headers behind a proxy that sets them. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
