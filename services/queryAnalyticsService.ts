import type { AnalysisMode } from '../types';

const QUERY_STORE_KEY = 'youtubeAnalyzerQueryStore';
const MAX_QUERIES = 200; // Max number of queries to store to prevent localStorage bloat
const PRUNE_THRESHOLD_DAYS = 30; // Prune queries not accessed in 30 days

interface QueryRecord {
    count: number;
    lastAccessed: number; // timestamp
    mode: AnalysisMode;
}

interface QueryStore {
    [query: string]: QueryRecord;
}

export const logQuery = (query: string, mode: AnalysisMode): void => {
    if (!query || !query.trim()) return;
    const trimmedQuery = query.trim().toLowerCase();
    
    try {
        const storeString = localStorage.getItem(QUERY_STORE_KEY);
        const store: QueryStore = storeString ? JSON.parse(storeString) : {};
        
        const existingRecord = store[trimmedQuery];
        if (existingRecord) {
            existingRecord.count += 1;
            existingRecord.lastAccessed = Date.now();
        } else {
            store[trimmedQuery] = {
                count: 1,
                lastAccessed: Date.now(),
                mode: mode,
            };
        }
        
        localStorage.setItem(QUERY_STORE_KEY, JSON.stringify(store));
    } catch (e) {
        console.error("Error logging query:", e);
    }
};

export const getPopularQueries = (limit: number): { query: string; mode: AnalysisMode }[] => {
    try {
        const storeString = localStorage.getItem(QUERY_STORE_KEY);
        if (!storeString) return [];

        const store: QueryStore = JSON.parse(storeString);
        
        const sortedQueries = Object.entries(store)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, limit);
            
        return sortedQueries.map(([query, record]) => ({ query, mode: record.mode }));
    } catch (e) {
        console.error("Error getting popular queries:", e);
        return [];
    }
};

export const pruneQueries = (): void => {
    try {
        const storeString = localStorage.getItem(QUERY_STORE_KEY);
        if (!storeString) return;

        let store: QueryStore = JSON.parse(storeString);
        const now = Date.now();
        const threshold = PRUNE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

        let pruned = false;

        // Prune old entries
        Object.entries(store).forEach(([query, record]) => {
            if (now - record.lastAccessed > threshold) {
                delete store[query];
                pruned = true;
            }
        });

        // Prune least popular if over max limit
        const queryCount = Object.keys(store).length;
        if (queryCount > MAX_QUERIES) {
            const sorted = Object.entries(store).sort(([, a], [, b]) => a.count - b.count);
            const toRemoveCount = queryCount - MAX_QUERIES;
            for (let i = 0; i < toRemoveCount; i++) {
                delete store[sorted[i][0]];
            }
            pruned = true;
        }

        if (pruned) {
            localStorage.setItem(QUERY_STORE_KEY, JSON.stringify(store));
            console.log("Query analytics store has been pruned.");
        }
    } catch (e) {
        console.error("Error pruning query store:", e);
    }
};
