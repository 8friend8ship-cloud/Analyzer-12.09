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
    console.log('[Cache] All app session cache cleared.');
};


// --- NEW DAILY CACHE LOGIC using localStorage for persistence within a day ---
const DAILY_CACHE_PREFIX = 'youtubeAnalyzerDailyCache:';

const getTodayDateString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Retrieves an item from the daily cache. It's valid only for the current day.
 * @param key The key of the item to retrieve (without prefix or date).
 * @returns The cached data or null if not found for the current day.
 */
export const getDailyCache = (key: string): any | null => {
    const today = getTodayDateString();
    const fullKey = `${DAILY_CACHE_PREFIX}${today}:${key}`;
    const cachedItemJSON = localStorage.getItem(fullKey);

    if (!cachedItemJSON) {
        // console.log(`[DailyCache] MISS for key: ${key}`);
        return null;
    }

    try {
        console.log(`[DailyCache] HIT for key: ${key}`);
        return JSON.parse(cachedItemJSON);
    } catch (e) {
        console.error(`[DailyCache] Error parsing cache for key: ${key}`, e);
        localStorage.removeItem(fullKey); // Remove corrupted item
        return null;
    }
};

/**
 * Adds or updates an item in the daily cache.
 * @param key The key of the item to set (without prefix or date).
 * @param data The data to be cached.
 */
export const setDailyCache = (key: string, data: any): void => {
    const today = getTodayDateString();
    const fullKey = `${DAILY_CACHE_PREFIX}${today}:${key}`;
    try {
        localStorage.setItem(fullKey, JSON.stringify(data));
        console.log(`[DailyCache] SET for key: ${key}`);
    } catch (e) {
        console.error(`[DailyCache] Failed to set item for key: ${key}. Storage might be full.`, e);
    }
};

/**
 * Clears all daily cache items that are not from the current day.
 */
export const clearOldDailyCaches = (): void => {
    const today = getTodayDateString();
    const keysToRemove: string[] = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(DAILY_CACHE_PREFIX)) {
                // Key format: youtubeAnalyzerDailyCache:YYYY-MM-DD:ranking:channels...
                const keyParts = key.split(':');
                if (keyParts.length > 1 && keyParts[1] !== today) {
                    keysToRemove.push(key);
                }
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        if (keysToRemove.length > 0) {
            console.log(`[DailyCache] Cleared ${keysToRemove.length} old daily cache items.`);
        }
    } catch (e) {
        console.error("[DailyCache] Error clearing old caches:", e);
    }
};