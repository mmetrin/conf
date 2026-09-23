export function createRateLimiter({
  maxRequests,
  windowMs,
  maxEntries,
  now = Date.now,
}) {
  const buckets = new Map();

  function removeExpiredBuckets(time) {
    for (const [identifier, bucket] of buckets) {
      if (bucket.expiresAt <= time) buckets.delete(identifier);
    }
  }

  return {
    consume(identifier) {
      const time = now();
      removeExpiredBuckets(time);

      const existing = buckets.get(identifier);
      if (existing?.count >= maxRequests) return false;
      if (!existing && buckets.size >= maxEntries) return false;

      const bucket = existing || { count: 0, expiresAt: time + windowMs };
      bucket.count += 1;
      buckets.set(identifier, bucket);
      return true;
    },
  };
}
