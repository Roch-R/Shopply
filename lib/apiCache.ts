/**
 * Shopply API Cache Layer
 * 
 * Real in-memory + localStorage cache with stale-while-revalidate pattern.
 * Shared across all pages as a singleton — navigate between dashboard/shop/cart
 * without re-fetching everything.
 */

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  etag?: string;
}

interface CacheConfig {
  /** Time-to-live in milliseconds — how long data is considered "fresh" */
  ttl: number;
  /** Stale time in ms — how long stale data can be served while revalidating */
  staleTime: number;
  /** Whether to persist this cache to localStorage */
  persist: boolean;
}

// Per-endpoint TTL configuration
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  '/me':                 { ttl: 60_000,  staleTime: 300_000,  persist: true  },
  '/shop/items':         { ttl: 30_000,  staleTime: 120_000,  persist: true  },
  '/items':              { ttl: 30_000,  staleTime: 120_000,  persist: false },
  '/cart':               { ttl: 15_000,  staleTime: 60_000,   persist: false },
  '/orders':             { ttl: 30_000,  staleTime: 120_000,  persist: false },
  '/seller/orders':      { ttl: 30_000,  staleTime: 120_000,  persist: false },
  '/chat/conversations': { ttl: 5_000,   staleTime: 15_000,   persist: false },
};

const DEFAULT_CONFIG: CacheConfig = { ttl: 15_000, staleTime: 60_000, persist: false };

const STORAGE_PREFIX = 'shopply_cache_';
const MAX_PERSIST_AGE = 600_000; // 10 minutes max for persisted data

class ApiCache {
  private memoryCache = new Map<string, CacheEntry>();
  private inflightRequests = new Map<string, Promise<unknown>>();
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  private getConfig(path: string): CacheConfig {
    // Match the longest prefix
    const keys = Object.keys(CACHE_CONFIGS).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (path.startsWith(key)) return CACHE_CONFIGS[key];
    }
    return DEFAULT_CONFIG;
  }

  private getCacheKey(url: string): string {
    // Strip cache-busting params like _t=
    try {
      const parsed = new URL(url);
      parsed.searchParams.delete('_t');
      return parsed.pathname + parsed.search;
    } catch {
      return url;
    }
  }

  private getPathFromUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/^.*\/api/, '');
    } catch {
      return url;
    }
  }

  /** Get cached data if fresh */
  get<T>(url: string): { data: T; fresh: boolean } | null {
    const key = this.getCacheKey(url);
    const path = this.getPathFromUrl(url);
    const config = this.getConfig(path);
    const now = Date.now();

    // Check memory first
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      const age = now - memEntry.timestamp;
      if (age < config.ttl) {
        return { data: memEntry.data as T, fresh: true };
      }
      if (age < config.staleTime) {
        return { data: memEntry.data as T, fresh: false };
      }
    }

    // Check localStorage for persistent caches
    if (config.persist && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_PREFIX + key);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          const age = now - entry.timestamp;
          if (age < MAX_PERSIST_AGE) {
            // Restore to memory cache
            this.memoryCache.set(key, entry);
            return { data: entry.data, fresh: age < config.ttl };
          } else {
            localStorage.removeItem(STORAGE_PREFIX + key);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    return null;
  }

  /** Store data in cache */
  set<T>(url: string, data: T): void {
    const key = this.getCacheKey(url);
    const path = this.getPathFromUrl(url);
    const config = this.getConfig(path);
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };

    this.memoryCache.set(key, entry);

    // Persist if configured
    if (config.persist && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
      } catch {
        // Storage full — silently fail
      }
    }

    // Notify listeners
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(cb => cb(data));
    }
  }

  /** 
   * Fetch with cache — the main method.
   * Returns cached data immediately if available, and revalidates in background if stale. 
   */
  async fetch<T>(
    url: string,
    options: RequestInit = {},
    callbacks?: {
      onData?: (data: T) => void;
      onError?: (err: Error) => void;
    }
  ): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    
    // Never cache mutations
    if (method !== 'GET') {
      const res = await fetch(url, options);
      const data = await res.json();
      return data as T;
    }

    const cached = this.get<T>(url);
    
    // Fresh cache — return immediately
    if (cached?.fresh) {
      return cached.data;
    }

    // Stale cache — return stale data now, revalidate in background
    if (cached && !cached.fresh) {
      this.revalidate<T>(url, options, callbacks?.onData);
      return cached.data;
    }

    // No cache — deduplicate inflight requests
    const key = this.getCacheKey(url);
    const inflight = this.inflightRequests.get(key);
    if (inflight) {
      return inflight as Promise<T>;
    }

    const promise = this.doFetch<T>(url, options)
      .then(data => {
        this.inflightRequests.delete(key);
        callbacks?.onData?.(data);
        return data;
      })
      .catch(err => {
        this.inflightRequests.delete(key);
        callbacks?.onError?.(err);
        throw err;
      });

    this.inflightRequests.set(key, promise);
    return promise;
  }

  private async doFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
      },
    });
    const data = await res.json();
    this.set(url, data);
    return data as T;
  }

  private async revalidate<T>(
    url: string, 
    options: RequestInit = {},
    onData?: (data: T) => void
  ): Promise<void> {
    const key = this.getCacheKey(url);
    
    // Don't revalidate if already revalidating
    if (this.inflightRequests.has(key)) return;

    const promise = this.doFetch<T>(url, options)
      .then(data => {
        this.inflightRequests.delete(key);
        onData?.(data);
      })
      .catch(() => {
        this.inflightRequests.delete(key);
      });

    this.inflightRequests.set(key, promise);
  }

  /** Invalidate cache entries matching a pattern */
  invalidate(pattern: string): void {
    const keysToDelete: string[] = [];
    
    this.memoryCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_PREFIX + key);
      }
    });
  }

  /** Invalidate all cache */
  invalidateAll(): void {
    this.memoryCache.clear();
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
    }
  }

  /** Subscribe to cache updates for a key */
  subscribe(url: string, callback: (data: unknown) => void): () => void {
    const key = this.getCacheKey(url);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }
}

// Singleton — shared across all pages
let instance: ApiCache | null = null;

export function getApiCache(): ApiCache {
  if (!instance) {
    instance = new ApiCache();
  }
  return instance;
}

/**
 * Helper hook-like function for use in useEffect.
 * Fetches with cache and calls setter with data.
 */
export async function cachedFetch<T>(
  url: string,
  headers: Record<string, string>,
  onData: (data: T) => void,
  onError?: (err: Error) => void
): Promise<void> {
  const cache = getApiCache();
  try {
    const data = await cache.fetch<T>(url, { headers }, { onData });
    onData(data);
  } catch (err) {
    onError?.(err as Error);
  }
}

/**
 * Visibility-aware polling helper.
 * Pauses when tab is hidden, resumes on focus.
 * Returns cleanup function.
 */
export function createSmartPoller(
  fetchFn: () => void,
  intervalMs: number,
  options?: {
    /** Slow down when idle */
    idleIntervalMs?: number;
    /** Ms of inactivity before switching to idle */
    idleAfterMs?: number;
  }
): () => void {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isIdle = false;
  let lastActivity = Date.now();

  const getInterval = () => {
    if (isIdle && options?.idleIntervalMs) return options.idleIntervalMs;
    return intervalMs;
  };

  const start = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      if (document.hidden) return; // Skip when tab is hidden
      
      // Check idle status
      if (options?.idleAfterMs) {
        const now = Date.now();
        const wasIdle = isIdle;
        isIdle = (now - lastActivity) > options.idleAfterMs;
        if (isIdle !== wasIdle) {
          // Restart with new interval
          start();
          return;
        }
      }
      
      fetchFn();
    }, getInterval());
  };

  const handleVisibilityChange = () => {
    if (!document.hidden) {
      lastActivity = Date.now();
      isIdle = false;
      fetchFn(); // Immediate fetch on tab focus
      start(); // Reset interval
    }
  };

  const handleActivity = () => {
    lastActivity = Date.now();
    if (isIdle) {
      isIdle = false;
      start(); // Switch back to active interval
    }
  };

  // Initial fetch
  fetchFn();
  start();

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('mousemove', handleActivity, { passive: true });
  window.addEventListener('keydown', handleActivity, { passive: true });

  return () => {
    if (intervalId) clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('mousemove', handleActivity);
    window.removeEventListener('keydown', handleActivity);
  };
}
