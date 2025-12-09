// Simple session storage cache with a timeout
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_PREFIX = 'youtubeAnalyzerCache:';

/**
 * Retrieves an item from the cache if it exists and has not expired.
 * @param key The key of the item to retrieve (without prefix).
 * @returns The cached data or null if not found or expired.
 */
export const getFromCache = (key: string): any | null => {
    const fullKey = CACHE_PREFIX + key;
    const cachedItemJSON = sessionStorage.getItem(fullKey);

    if (!cachedItemJSON) {
        // This is a normal cache miss, no need to log every time.
        // console.log(`[Cache] MISS for key: ${key}`);
        return null;
    }

    try {
        const cachedItem = JSON.parse(cachedItemJSON);
        if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
            console.log(`[Cache] HIT for key: ${key}`);
            return cachedItem.data;
        }
        
        // Cache item expired
        console.log(`[Cache] EXPIRED for key: ${key}`);
        sessionStorage.removeItem(fullKey);
        return null;
    } catch (e) {
        console.error(`[Cache] Error parsing cache for key: ${key}`, e);
        sessionStorage.removeItem(fullKey); // Remove corrupted item
        return null;
    }
};

/**
 * Adds or updates an item in the cache with the current timestamp.
 * @param key The key of the item to set (without prefix).
 * @param data The data to be cached.
 */
export const setInCache = (key: string, data: any): void => {
    const fullKey = CACHE_PREFIX + key;
    const itemToCache = {
        data,
        timestamp: Date.now(),
    };
    try {
        sessionStorage.setItem(fullKey, JSON.stringify(itemToCache));
        console.log(`[Cache] SET for key: ${key}`);
    } catch (e) {
        console.error(`[Cache] Failed to set item for key: ${key}. Storage might be full.`, e);
    }
};

/**
 * Clears all items from the cache that match the cache prefix.
 */
export const clearCache = (): void => {
    Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
            sessionStorage.removeItem(key);
        }
    });
    console.log('[Cache] All app cache cleared.');
};