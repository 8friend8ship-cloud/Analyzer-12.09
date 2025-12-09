
import type { CollectionItem, ChannelAnalysisData, VideoDetailData } from '../types';

const COLLECTION_KEY = 'contentOS_collection';

export const getCollection = (): CollectionItem[] => {
    try {
        const stored = localStorage.getItem(COLLECTION_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to load collection", e);
        return [];
    }
};

export const addToCollection = (item: CollectionItem) => {
    try {
        const current = getCollection();
        // Remove duplicate if exists (update with new data)
        const filtered = current.filter(i => i.id !== item.id);
        const updated = [item, ...filtered];
        localStorage.setItem(COLLECTION_KEY, JSON.stringify(updated));
        // console.log(`[Collection] Added ${item.type}: ${item.title}`);
    } catch (e) {
        console.error("Failed to add to collection", e);
    }
};

export const removeFromCollection = (id: string) => {
    try {
        const current = getCollection();
        const updated = current.filter(i => i.id !== id);
        localStorage.setItem(COLLECTION_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error("Failed to remove from collection", e);
    }
};

export const clearCollection = () => {
    localStorage.removeItem(COLLECTION_KEY);
};

export const exportCollectionToCSV = () => {
    const items = getCollection();
    if (items.length === 0) return;

    // 1. Sort: Channels first, then Videos. Within type, sort by Saved Date (Newest first).
    items.sort((a, b) => {
        if (a.type !== b.type) {
            // 'channel' comes before 'video' alphabetically (or logically)
            return a.type === 'channel' ? -1 : 1;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    let csvContent = "\uFEFF"; // BOM for Excel UTF-8
    // 2. Korean Headers with Thumbnail column
    csvContent += "구분,제목(채널명),주요지표(구독/조회),보조지표(영상/좋아요),수집일시,썸네일(URL),바로가기(Link),ID\n";

    items.forEach(item => {
        const typeLabel = item.type === 'channel' ? '채널' : '영상';
        // Escape quotes in title
        const safeTitle = `"${item.title.replace(/"/g, '""')}"`;
        
        // Metrics often contain commas (e.g. "1,234"), wrap in quotes
        const m1 = `"${item.metric1}"`;
        const m2 = `"${item.metric2}"`;
        
        const dateStr = new Date(item.date).toLocaleString('ko-KR');

        const row = [
            typeLabel,
            safeTitle,
            m1,
            m2,
            `"${dateStr}"`,
            `"${item.thumbnailUrl}"`, // Include Thumbnail URL
            `"${item.url}"`,
            `"${item.id}"`
        ].join(",");
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `컬렉션_데이터_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Helper to convert ChannelAnalysisData to CollectionItem
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

// Helper to convert VideoDetailData to CollectionItem
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
