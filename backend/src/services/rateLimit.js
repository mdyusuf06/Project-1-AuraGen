export function createRateLimit(limit, windowMs, maxKeys) {
  const buckets = new Map();

  function prune(now = Date.now()) {
    for (const [key, bucket] of buckets) {
      if (bucket.expiresAt > now) break;
      buckets.delete(key);
    }
  }

  return {
    prune,
    take(key, now = Date.now()) {
      let bucket = buckets.get(key);
      if (!bucket || bucket.expiresAt <= now) {
        prune(now);
        if (buckets.size >= maxKeys) return false;
        bucket = { count: 0, expiresAt: now + windowMs };
        buckets.set(key, bucket);
      }
      if (bucket.count >= limit) return false;
      bucket.count++;
      return true;
    }
  };
}
