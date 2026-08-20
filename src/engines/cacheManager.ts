/**
 * VSC Platform V3 - Central Cache Manager
 * Prevents repeating expensive calculations (e.g., sorting, cutoff computations, team metrics).
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number; // in milliseconds
  tags: string[]; // for flexible group invalidation (e.g. by tournamentId)
}

class VscCacheManager {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Write data to cache with tag grouping and time-to-live parameter.
   */
  public set<T>(key: string, value: T, ttlSeconds: number = 300, tags: string[] = []): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
      tags
    };
    this.store.set(key, entry);
  }

  /**
   * Read data from cache. Returns null if missing or expired.
   */
  public get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Check if key exists and is unexpired in cache.
   */
  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate a single key.
   */
  public invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all cache entries matching a specific tag (e.g., tournamentId).
   */
  public invalidateByTag(tag: string): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.includes(tag)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Fully clear cache entries.
   */
  public clear(): void {
    this.store.clear();
  }
}

export const cacheManager = new VscCacheManager();
