// This service simulates a Firebase connection for caching using browser localStorage.
// This allows for persistent caching across sessions to reduce API calls.

const CACHE_PREFIX = 'contentos-cache:';
const STALE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheItem<T> {
    data: T;
    lastFetched: string; // ISO timestamp
}

/**
 * Retrieves an item from the cache if it's considered "fresh".
 * @param key The key for the cached item.
 * @returns The cached data or null if not found or stale.
 */
export const getFromCache = <T>(key: string): T | null => {
    const fullKey = CACHE_PREFIX + key;
    try {
        const itemStr = localStorage.getItem(fullKey);
        if (!itemStr) {
            return null;
        }
        const item: CacheItem<T> = JSON.parse(itemStr);
        const isStale = new Date().getTime() - new Date(item.lastFetched).getTime() > STALE_DURATION;

        if (isStale) {
            console.log(`[Cache] STALE data for key: ${key}. Will re-fetch.`);
            localStorage.removeItem(fullKey);
            return null;
        }
        
        console.log(`[Cache] FRESH data found for key: ${key}.`);
        return item.data;

    } catch (e) {
        console.error(`[Cache] Error reading from localStorage for key ${key}:`, e);
        // Clear corrupted data
        localStorage.removeItem(fullKey);
        return null;
    }
};

/**
 * Stores an item in the cache with a current timestamp.
 * @param key The key for the item to be cached.
 * @param data The data to store.
 */
export const setInCache = <T>(key: string, data: T): void => {
    const fullKey = CACHE_PREFIX + key;
    const item: CacheItem<T> = {
        data,
        lastFetched: new Date().toISOString(),
    };

    try {
        localStorage.setItem(fullKey, JSON.stringify(item));
        console.log(`[Cache] Data SET for key: ${key}`);
    } catch (e) {
        console.error(`[Cache] Error writing to localStorage for key ${key}. Storage might be full.`, e);
    }
};

/**
 * Clears all items from the app's cache.
 */
export const clearFirebaseCache = (): void => {
    try {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        console.log('[Cache] Firebase cache simulation cleared successfully.');
    } catch (e) {
        console.error('[Cache] Error clearing cache:', e);
    }
};