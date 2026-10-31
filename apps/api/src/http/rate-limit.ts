import type { Context, MiddlewareHandler } from "hono";
import type { ApiKeyEnv } from "./api-key.js";

type Bucket = { tokens: number; refilledAt: number };

export function rateLimitPerKey(
  perMinute: number,
  keyOf: (c: Context<ApiKeyEnv>) => string,
  now: () => number = Date.now,
): MiddlewareHandler<ApiKeyEnv> {
  const buckets = new Map<string, Bucket>();
  const perMs = perMinute / 60_000;

  return async (c, next) => {
    const at = now();
    for (const [key, bucket] of buckets) if (bucket.tokens + (at - bucket.refilledAt) * perMs >= perMinute) buckets.delete(key);
    const key = keyOf(c);
    const was = buckets.get(key) ?? { tokens: perMinute, refilledAt: at };
    const bucket = { tokens: Math.min(perMinute, was.tokens + (at - was.refilledAt) * perMs), refilledAt: at };
    const allowed = bucket.tokens >= 1;
    if (allowed) bucket.tokens -= 1;
    buckets.set(key, bucket);
    const untilNext = Math.ceil((1 - Math.min(bucket.tokens, 1)) / perMs / 1000);
    c.header("RateLimit-Limit", String(perMinute));
    c.header("RateLimit-Remaining", String(Math.floor(bucket.tokens)));
    c.header("RateLimit-Reset", String(allowed ? Math.ceil((perMinute - bucket.tokens) / perMs / 1000) : untilNext));
    if (!allowed) {
      c.header("Retry-After", String(untilNext));
      const detail = `This key has made more than ${perMinute} requests in a minute; try again in ${untilNext} s`;
      return c.body(JSON.stringify({ type: "about:blank", title: "Too many requests", status: 429, detail }), 429, {
        "content-type": "application/problem+json",
      });
    }
    await next();
  };
}
