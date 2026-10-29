/**
 * A small in-memory cache with a time limit per entry and a cap on the number of entries
 * (the oldest are dropped first). Concurrent requests for the same key share one pending
 * load, so a burst of identical requests makes one upstream call.
 *
 * It lives in one process: with several server instances each has its own copy, which is
 * fine for short-lived data such as a third party's API answers.
 */
class TtlCache {
  /**
   * @param {{ttlMs: number, maxEntries?: number}} options
   */
  constructor({ ttlMs, maxEntries = 500 }) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.entries = new Map(); // key -> { expiresAt, promise }
  }

  /**
   * Returns the cached value for `key`, or runs `load()` once and caches what it returns.
   * A failed load is not cached.
   * @param {string} key
   * @param {() => Promise<any>} load
   */
  async get(key, load) {
    const now = Date.now();
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > now) return hit.promise;

    const promise = Promise.resolve().then(load);
    this.entries.set(key, { expiresAt: now + this.ttlMs, promise });
    this.trim();

    try {
      return await promise;
    } catch (error) {
      // Do not keep a failure around, unless a newer load already replaced it.
      if (this.entries.get(key)?.promise === promise) this.entries.delete(key);
      throw error;
    }
  }

  /** Drops expired entries, then the oldest ones above the cap. */
  trim() {
    if (this.entries.size <= this.maxEntries) return;
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value);
    }
  }

  clear() {
    this.entries.clear();
  }
}

module.exports = TtlCache;
