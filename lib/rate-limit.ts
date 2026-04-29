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
  return { allowed: true, remaining: max - arr.length, resetMs: windowMs };
}
