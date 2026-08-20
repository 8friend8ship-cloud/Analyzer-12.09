import type { CollectionItem, ChannelAnalysisData, VideoDetailData } from '../types';
import { sendBackendEvent } from './backendService';

const COLLECTION_KEY = 'contentOS_collection';

const mirrorToBackend = (action: string, payload: unknown) => {
    void sendBackendEvent(action, payload).catch((error) => {
        // Local-first is intentional. A central backend outage must not destroy the user's local collection.
        console.warn(`[Collection] Central backend mirror pending for ${action}:`, error);
    });
};

export const getCollection = (): CollectionItem[] => {
    try {
        const stored = localStorage.getItem(COLLECTION_KEY);
        if (!stored) return [];

        const items: CollectionItem[] = JSON.parse(stored);

        // Filter out items older than 28 days to comply with Google policies.
        const twentyEightDaysAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
        const freshItems = items.filter(item => new Date(item.date).getTime() >= twentyEightDaysAgo);

        // If items were pruned, update localStorage to reflect the change.
        if (freshItems.length < items.length) {
            localStorage.setItem(COLLECTION_KEY, JSON.stringify(freshItems));
            mirrorToBackend('collection.prune', {
                retainedIds: freshItems.map(item => item.id),
                reason: '28_day_policy',
            });
            console.log(`[Collection] Pruned ${items.length - freshItems.length} items older than 28 days.`);
        }

        return freshItems;
    } catch (e) {
        console.error('Failed to load collection', e);
        localStorage.removeItem(COLLECTION_KEY);
        return [];
    }
};

export const addToCollection = (item: CollectionItem) => {
    try {
        const current = getCollection();
        const filtered = current.filter(i => i.id !== item.id);
        const updated = [item, ...filtered];
        localStorage.setItem(COLLECTION_KEY, JSON.stringify(updated));
        mirrorToBackend('collection.upsert', { item });
    } catch (e) {
        console.error('Failed to add to collection', e);
    }
};

export const removeFromCollection = (id: string) => {
    try {
        const current = getCollection();
        const updated = current.filter(i => i.id !== id);
        localStorage.setItem(COLLECTION_KEY, JSON.stringify(updated));
        mirrorToBackend('collection.remove', { id });
    } catch (e) {
        console.error('Failed to remove from collection', e);
    }
};

export const clearCollection = () => {
    localStorage.removeItem(COLLECTION_KEY);
    mirrorToBackend('collection.clear', {});
};

export const createChannelCollectionItem = (data: ChannelAnalysisData): CollectionItem => ({
    id: data.id,
    type: 'channel',
    title: data.name,
    thumbnailUrl: data.thumbnailUrl,
    metric1: data.subscriberCount.toLocaleString(),
    metric2: data.totalVideos.toLocaleString(),
    date: new Date().toISOString(),
    url: `https://www.youtube.com/channel/${data.id}`,
    raw: data
});

export const createVideoCollectionItem = (data: VideoDetailData): CollectionItem => ({
    id: data.id,
    type: 'video',
    title: data.title,
    thumbnailUrl: data.thumbnailUrl,
    metric1: data.viewCount.toLocaleString(),
    metric2: data.likeCount.toLocaleString(),
    date: new Date().toISOString(),
    url: `https://www.youtube.com/watch?v=${data.id}`,
    raw: data
});
