// This service uses browser localStorage for persistent caching across sessions.

const CACHE_PREFIX = 'contentos-cache:';

export interface CacheItem<T> {
    data: T;
    timestamp: number; // Unix timestamp for easier math
}

/**
 * Stores an item in the cache with the current timestamp.
 * @param key The key for the item to be cached.
 * @param data The data to store.
 */
export const set = <T>(key: string, data: T): void => {
    const fullKey = CACHE_PREFIX + key;
    const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
    };
    try {
        localStorage.setItem(fullKey, JSON.stringify(item));
        console.log(`[Cache] SET for key: ${key}`);
    } catch (e) {
        console.error(`[Cache] Error writing to localStorage for key ${key}. Storage might be full.`, e);
    }
};


/**
 * Retrieves the raw cache item (data + timestamp) regardless of age.
 * @param key The key for the cached item.
 * @returns The full cache item or null if not found.
 */
export const getRawItem = <T>(key: string): CacheItem<T> | null => {
    const fullKey = CACHE_PREFIX + key;
    try {
        const itemStr = localStorage.getItem(fullKey);
        if (!itemStr) {
            return null;
        }
        return JSON.parse(itemStr) as CacheItem<T>;
    } catch (e) {
        console.error(`[Cache] Error reading from localStorage for key ${key}:`, e);
        localStorage.removeItem(fullKey);
        return null;
    }
};

/**
 * Retrieves data from the cache only if it's not older than maxAgeMs.
 * @param key The key of the item to retrieve.
 * @param maxAgeMs The maximum age in milliseconds.
 * @returns The cached data or null if not found or stale.
 */
export const get = <T>(key: string, maxAgeMs: number): T | null => {
    const item = getRawItem<T>(key);
    if (!item) {
        console.log(`[Cache] MISS for key: ${key}`);
        return null;
    }

    if (Date.now() - item.timestamp > maxAgeMs) {
        console.log(`[Cache] STALE for key: ${key}. Removing.`);
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
    }
    
    console.log(`[Cache] FRESH HIT for key: ${key}`);
    return item.data;
};


/**
 * Clears all items from the app's cache.
 */
export const clearCache = (): void => {
    try {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        console.log('[Cache] Persistent cache cleared successfully.');
    } catch (e) {
        console.error('[Cache] Error clearing cache:', e);
    }
};


// --- View Velocity Service ---
const VELOCITY_CACHE_PREFIX = 'velocity-cache:';

interface VelocityRecord {
    viewCount: number;
    timestamp: number; // Unix timestamp
}

export const setViewVelocity = (videoId: string, viewCount: number): void => {
    const key = VELOCITY_CACHE_PREFIX + videoId;
    const record: VelocityRecord = { viewCount, timestamp: Date.now() };
    try {
        localStorage.setItem(key, JSON.stringify(record));
    } catch (e) {
        console.error(`[VelocityService] Failed to write to localStorage for ${videoId}`, e);
    }
};

export const getViewVelocity = (videoId: string): VelocityRecord | null => {
    const key = VELOCITY_CACHE_PREFIX + videoId;
    try {
        const itemStr = localStorage.getItem(key);
        return itemStr ? JSON.parse(itemStr) : null;
    } catch (e) {
        console.error(`[VelocityService] Failed to read from localStorage for ${videoId}`, e);
        return null;
    }
};
