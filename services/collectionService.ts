
import type { 
    CollectionItem, 
    CollectionType, 
    ChannelAnalysisData, 
    VideoDetailData, 
    OutlierViewState, 
    AIThumbnailInsights, 
    AlgorithmResult, 
    MyChannelAnalyticsData 
} from '../types';

const COLLECTION_KEY = 'contentOS_strategic_vault';
export const MAX_COLLECTION_SIZE = 500; 
export const WARNING_THRESHOLD = 450;
export const TRASH_RETENTION_DAYS = 7;

export interface EnhancedCollectionItem extends CollectionItem {
    deletedAt?: string; // ISO String for trash logic
}

export const getFullStore = (): EnhancedCollectionItem[] => {
    try {
        const stored = localStorage.getItem(COLLECTION_KEY);
        let items: EnhancedCollectionItem[] = stored ? JSON.parse(stored) : [];
        return cleanupItems(items);
    } catch (e) {
        console.error("Failed to load collection", e);
        return [];
    }
};

// Auto-delete logic: Only for items in TRASH (7 days)
// Blanket 30-day deletion from creation is removed as per request.
const cleanupItems = (items: EnhancedCollectionItem[]): EnhancedCollectionItem[] => {
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    
    const filtered = items.filter(item => {
        // Trash cleanup (7 days) - Safety for user-deleted items
        if (item.deletedAt) {
            const deletedTime = new Date(item.deletedAt).getTime();
            if (now - deletedTime > TRASH_RETENTION_DAYS * oneDay) return false;
        }
        
        return true;
    });

    if (filtered.length !== items.length) {
        localStorage.setItem(COLLECTION_KEY, JSON.stringify(filtered));
    }
    return filtered;
};

export const getCollection = (): EnhancedCollectionItem[] => {
    return getFullStore().filter(i => !i.deletedAt);
};

export const getTrash = (): EnhancedCollectionItem[] => {
    return getFullStore().filter(i => !!i.deletedAt);
};

export const addToCollection = (item: EnhancedCollectionItem) => {
    try {
        const fullStore = getFullStore();
        const activeItems = fullStore.filter(i => !i.deletedAt);
        
        if (activeItems.length >= MAX_COLLECTION_SIZE) {
            console.warn("Storage Full");
            return false;
        }

        const filtered = fullStore.filter(i => i.id !== item.id);
        const updated = [item, ...filtered];
        localStorage.setItem(COLLECTION_KEY, JSON.stringify(updated));
        return true;
    } catch (e) {
        console.error("Failed to add to collection", e);
        return false;
    }
};

export const removeFromCollection = (id: string) => {
    try {
        const fullStore = getFullStore();
        const updated = fullStore.map(item => {
            if (item.id === id) return { ...item, deletedAt: new Date().toISOString() };
            return item;
        });
        localStorage.setItem(COLLECTION_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error("Failed to move to trash", e);
    }
};

export const restoreFromTrash = (id: string) => {
    try {
        const fullStore = getFullStore();
        const updated = fullStore.map(item => {
            if (item.id === id) {
                const { deletedAt, ...rest } = item;
                return rest;
            }
            return item;
        });
        localStorage.setItem(COLLECTION_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error("Failed to restore item", e);
    }
};

export const permanentlyDelete = (id: string) => {
    try {
        const fullStore = getFullStore();
        const updated = fullStore.filter(i => i.id !== id);
        localStorage.setItem(COLLECTION_KEY, JSON.stringify(updated));
    } catch (e) {}
};

export const clearCollection = () => {
    try {
        const fullStore = getFullStore();
        const updated = fullStore.map(item => ({ ...item, deletedAt: new Date().toISOString() }));
        localStorage.setItem(COLLECTION_KEY, JSON.stringify(updated));
    } catch (e) {}
};

export const exportCollectionToCSV = () => {
    const items = getCollection();
    if (items.length === 0) return;

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let csvContent = "\uFEFF"; 
    csvContent += "구분,제목,지표1,지표2,수집일시,원본URL,ID\n";

    items.forEach(item => {
        const row = [
            item.type,
            `"${item.title.replace(/"/g, '""')}"`,
            `"${item.metric1}"`,
            `"${item.metric2}"`,
            `"${new Date(item.date).toLocaleString()}"`,
            `"${item.url}"`,
            `"${item.id}"`
        ].join(",");
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vault_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// --- Factory Functions ---

export const createChannelCollectionItem = (data: ChannelAnalysisData): EnhancedCollectionItem => ({
    id: `channel_${data.id}`,
    type: 'channel',
    title: data.name,
    thumbnailUrl: data.thumbnailUrl,
    metric1: `구독자 ${data.subscriberCount.toLocaleString()}`,
    metric2: `영상수 ${data.totalVideos.toLocaleString()}`,
    date: new Date().toISOString(),
    url: `https://www.youtube.com/channel/${data.id}`,
    raw: data
});

export const createVideoCollectionItem = (data: VideoDetailData): EnhancedCollectionItem => ({
    id: `video_${data.id}`,
    type: 'video',
    title: data.title,
    thumbnailUrl: data.thumbnailUrl,
    metric1: `조회수 ${data.viewCount.toLocaleString()}`,
    metric2: `좋아요 ${data.likeCount.toLocaleString()}`,
    date: new Date().toISOString(),
    url: `https://www.youtube.com/watch?v=${data.id}`,
    raw: data
});

export const createOutlierCollectionItem = (state: OutlierViewState): EnhancedCollectionItem => ({
    id: `outlier_${state.query}_${Date.now()}`,
    type: 'outlier',
    title: `'${state.query}' 아웃라이어 분석 리포트`,
    thumbnailUrl: state.analysisResult?.videos[0]?.thumbnailUrl || '',
    metric1: `분석영상 ${state.analysisResult?.videos.length}개`,
    metric2: `배수 ${state.multiplier}x`,
    date: new Date().toISOString(),
    url: state.mode === 'channel' ? `https://www.youtube.com/search?q=${encodeURIComponent(state.query)}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(state.query)}`,
    raw: state
});

export const createThumbnailCollectionItem = (query: string, insights: AIThumbnailInsights): EnhancedCollectionItem => ({
    id: `thumb_${query}_${Date.now()}`,
    type: 'thumbnail',
    title: `'${query}' 썸네일/제목 전략 가이드`,
    thumbnailUrl: '', 
    metric1: `AI 스코어링 완료`,
    metric2: `최적화 전략 도출`,
    date: new Date().toISOString(),
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    raw: { query, insights }
});

export const createAlgorithmCollectionItem = (result: AlgorithmResult): EnhancedCollectionItem => ({
    id: `algo_${result.profile.keyword}_${Date.now()}`,
    type: 'algorithm',
    title: `DNA 진단: ${result.profile.keyword} (${result.profile.category})`,
    thumbnailUrl: '', 
    metric1: `적합도 ${result.score}점`,
    metric2: result.statusMessage,
    date: new Date().toISOString(),
    url: '',
    raw: result
});

export const createMyChannelCollectionItem = (data: MyChannelAnalyticsData): EnhancedCollectionItem => ({
    id: `my_${data.name}_${Date.now()}`,
    type: 'myChannel',
    title: `내 채널 정밀 진단: ${data.name}`,
    thumbnailUrl: data.thumbnailUrl,
    metric1: `월 조회수 ${data.kpi.viewsLast30d.toLocaleString()}`,
    metric2: `CTR ${data.kpi.ctrLast30d}%`,
    date: new Date().toISOString(),
    url: '',
    raw: data
});

export const createTrendCollectionItem = (country: string, data: { youtube: any[]; google: any[] }, summary: string): EnhancedCollectionItem => ({
    id: `trend_${country}_${Date.now()}`,
    type: 'trend',
    title: `${country} 실시간 트렌드 리포트`,
    thumbnailUrl: '', 
    metric1: `YouTube 키워드 ${data.youtube.length}개`,
    metric2: `Google 키워드 ${data.google.length}개`,
    date: new Date().toISOString(),
    url: `https://trends.google.co.kr/trends/trendingsearches/daily?geo=${country === '대한민국' ? 'KR' : 'US'}`,
    raw: { country, data, summary }
});
