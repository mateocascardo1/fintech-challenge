const hits = new Map<string, number[]>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
};

export function rateLimit(
  key: string,
  max = 10,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    const oldest = arr[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, windowMs - (now - oldest)),
    };
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 10000) {
    for (const [k, v] of hits) {
      if (v.length === 0 || now - v[v.length - 1] > windowMs) hits.delete(k);
    }
  }
  return { allowed: true, remaining: max - arr.length, resetMs: windowMs };
}
