
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getCollection, 
    getTrash, 
    removeFromCollection, 
    restoreFromTrash, 
    permanentlyDelete, 
    clearCollection, 
    exportCollectionToCSV, 
    MAX_COLLECTION_SIZE, 
    WARNING_THRESHOLD,
    TRASH_RETENTION_DAYS
} from '../services/collectionService';
import type { CollectionItem, CollectionType, User, AppSettings, VideoData } from '../types';
import Button from './common/Button';
import ChannelDetailView from './ChannelDetailView';
import VideoDetailView from './VideoDetailView';

interface CollectionViewProps {
    onBack: () => void;
    user: User;
    appSettings: AppSettings;
}

const TYPE_CONFIG: Record<CollectionType, { label: string; icon: string; color: string }> = {
    channel: { label: '채널분석', icon: '📺', color: 'text-blue-400' },
    video: { label: '영상분석', icon: '🎬', color: 'text-purple-400' },
    outlier: { label: '아웃라이어', icon: '🚀', color: 'text-red-400' },
    trend: { label: '트렌드', icon: '📈', color: 'text-green-400' },
    thumbnail: { label: '썸네일전략', icon: '🖼️', color: 'text-yellow-400' },
    algorithm: { label: 'DNA진단', icon: '🧬', color: 'text-pink-400' },
    myChannel: { label: '내채널', icon: '🏠', color: 'text-cyan-400' }
};

const HistoricalBanner = ({ date, url }: { date: string, url?: string }) => (
    <div className="bg-blue-900/20 border border-blue-500/20 p-3 rounded-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <span className="text-xl">📊</span>
            <div className="text-xs text-gray-300">
                <p className="font-bold text-white">데이터 스냅샷 열람 중</p>
                <p className="opacity-80"><span className="underline">{new Date(date).toLocaleString()}</span> 기준 데이터입니다. (실시간 정보와 차이가 있을 수 있음)</p>
            </div>
        </div>
        {url && (
            <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-full transition-all"
            >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                유튜브 바로가기
            </a>
        )}
    </div>
);

const CollectionView: React.FC<CollectionViewProps> = ({ onBack, user, appSettings }) => {
    const [items, setItems] = useState<CollectionItem[]>([]);
    const [trashItems, setTrashItems] = useState<CollectionItem[]>([]);
    const [activeTab, setActiveTab] = useState<'vault' | 'trash'>('vault');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<CollectionType | 'all'>('all');
    const [viewingItem, setViewingItem] = useState<CollectionItem | null>(null);

    const refreshData = () => {
        setItems(getCollection());
        setTrashItems(getTrash());
    };

    useEffect(() => { refreshData(); }, []);

    const filteredItems = useMemo(() => {
        const source = activeTab === 'vault' ? items : trashItems;
        return source.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || item.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [items, trashItems, searchTerm, filterType, activeTab]);

    const handleSoftDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("이 항목을 휴지통으로 이동할까요?")) {
            removeFromCollection(id);
            refreshData();
        }
    };

    const handleRestore = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (items.length >= MAX_COLLECTION_SIZE) {
            alert("금고가 가득 차서 복구할 수 없습니다. 공간을 먼저 확보해주세요.");
            return;
        }
        restoreFromTrash(id);
        refreshData();
    };

    const handlePermanentDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("휴지통에서 영구히 삭제합니다. 복구할 수 없습니다. 계속할까요?")) {
            permanentlyDelete(id);
            refreshData();
        }
    };

    const handleClearVault = () => {
        const msg = `정말 금고를 비우시겠습니까?\n모든 데이터는 휴지통으로 이동하며, ${TRASH_RETENTION_DAYS}일 후 영구 삭제됩니다.`;
        if (window.confirm(msg)) {
            clearCollection();
            refreshData();
        }
    };

    const renderSnapshot = () => {
        if (!viewingItem) return null;
        const commonProps = { user: { ...user, usage: 0 }, appSettings, onBack: () => setViewingItem(null), onUpdateUser: () => {}, onUpgradeRequired: () => {}, planLimit: Infinity };

        return (
            <div className="animate-fade-in pb-20">
                <button onClick={() => setViewingItem(null)} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 flex items-center gap-2">← 목록으로</button>
                <HistoricalBanner date={viewingItem.date} url={viewingItem.url} />

                {viewingItem.type === 'channel' && (<ChannelDetailView channelId={viewingItem.id.replace('channel_', '')} {...commonProps} onOpenCommentModal={() => {}} onShowVideoDetail={() => {}} onShowChannelDetail={(id) => setViewingItem(items.find(i => i.id === `channel_${id}`) || viewingItem)} />)}
                {viewingItem.type === 'video' && (<VideoDetailView videoId={viewingItem.id.replace('video_', '')} {...commonProps} onShowChannelDetail={() => {}} previousChannelId={null} />)}
                
                {viewingItem.type === 'outlier' && (
                    <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <span className="text-5xl">🚀</span>
                                <div><h2 className="text-2xl font-bold">{viewingItem.title}</h2><p className="text-gray-400">아웃라이어 영상 목록 및 당시 성과 지표</p></div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {(viewingItem.raw.analysisResult?.videos as VideoData[] || [])
                                .filter(v => v.viewCount >= (viewingItem.raw.analysisResult?.avgViews || 0) * (viewingItem.raw.multiplier || 5))
                                .map(video => (
                                <div key={video.id} className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700 group hover:border-blue-500/50 transition-all">
                                    <div className="relative">
                                        <img src={video.thumbnailUrl} className="w-32 h-[72px] object-cover rounded-lg" />
                                        <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                                        </a>
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <h4 className="font-bold text-white truncate">{video.title}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{video.channelTitle}</p>
                                        <div className="flex gap-4 mt-2 text-xs font-bold"><span className="text-blue-400">조회수 {video.viewCount.toLocaleString()}</span><span className="text-green-400">수익 ${video.estimatedRevenue.toLocaleString()}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {viewingItem.type !== 'channel' && viewingItem.type !== 'video' && viewingItem.type !== 'outlier' && (
                    <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700">
                        <h2 className="text-2xl font-bold mb-6">{viewingItem.title}</h2>
                        <div className="bg-gray-900/50 p-6 rounded-xl font-mono text-xs overflow-auto max-h-[500px]">{JSON.stringify(viewingItem.raw, null, 2)}</div>
                    </div>
                )}
            </div>
        );
    };

    if (viewingItem) return <div className="p-4 md:p-8 max-w-7xl mx-auto">{renderSnapshot()}</div>;

    const capacityPercent = (items.length / MAX_COLLECTION_SIZE) * 100;
    const isFull = items.length >= MAX_COLLECTION_SIZE;
    const isWarning = items.length >= WARNING_THRESHOLD;

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-screen">
            <div className="max-w-6xl mx-auto">
                
                <header className="mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <button onClick={onBack} className="mb-2 text-sm text-gray-400 hover:text-white">← 대시보드</button>
                            <h1 className="text-4xl font-black text-white flex items-center gap-3">💎 Strategic Vault</h1>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                             <div className="flex items-center gap-3 w-full md:w-64">
                                <div className="flex-grow">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">금고 용량</span>
                                        <span className={`text-[10px] font-bold ${isFull ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-blue-400'}`}>{items.length} / {MAX_COLLECTION_SIZE}</span>
                                    </div>
                                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden border border-gray-700">
                                        <div className={`h-full transition-all duration-1000 ${isFull ? 'bg-red-600' : isWarning ? 'bg-orange-500' : 'bg-blue-600'}`} style={{ width: `${capacityPercent}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="bg-gray-800 p-1 rounded-xl flex border border-gray-700">
                                    <button onClick={() => setActiveTab('vault')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'vault' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>나의 금고</button>
                                    <button onClick={() => setActiveTab('trash')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'trash' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>휴지통 <span className="bg-black/30 px-1.5 rounded-md">{trashItems.length}</span></button>
                                </div>
                                {activeTab === 'vault' && (
                                    <>
                                        <Button onClick={handleClearVault} variant="secondary" className="text-xs bg-red-900/20 text-red-400">비우기</Button>
                                        <Button onClick={exportCollectionToCSV} className="bg-blue-600 text-xs font-bold">엑셀</Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {isFull && <p className="mt-3 text-xs text-red-400 font-bold animate-pulse text-right">⚠️ 금고가 가득 찼습니다. 항목을 정리해주세요.</p>}
                    
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="md:col-span-2 relative">
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="검색어 입력..." className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 px-10 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                            <svg className="absolute left-3 top-3 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <div className="md:col-span-2 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${filterType === 'all' ? 'bg-white text-black border-white' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>전체 ({items.length})</button>
                            {Object.entries(TYPE_CONFIG).map(([type, config]) => (
                                <button key={type} onClick={() => setFilterType(type as any)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 border ${filterType === type ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                    <span>{config.icon}</span> {config.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="mb-6 bg-blue-900/10 border border-blue-500/10 p-3 rounded-xl flex items-center gap-2">
                    <span className="text-blue-400">🛡️</span>
                    <p className="text-[10.5px] text-blue-300 leading-tight">
                        금고의 전략 자산은 <b>가입 유지 기간 동안 안전하게 보관</b>됩니다. 
                        단, <b>구독 해지(또는 결제 만료) 시 30일이 경과하면</b> 서버 데이터 절약을 위해 <b>자동으로 영구 파기</b>되니 유의하시기 바랍니다.
                    </p>
                </div>

                {filteredItems.length === 0 ? (
                    <div className="text-center py-32 bg-gray-800/20 rounded-3xl border-2 border-dashed border-gray-800">
                        <p className="text-xl font-bold text-gray-600">{activeTab === 'vault' ? '금고가 비어있습니다.' : '휴지통이 비어있습니다.'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map(item => (
                            <div key={item.id} onClick={() => setViewingItem(item)} className="group relative bg-gray-800 border border-gray-700 rounded-2xl p-4 cursor-pointer hover:border-blue-500 transition-all transform hover:-translate-y-1">
                                <div className="flex items-center gap-4">
                                    {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className={`flex-shrink-0 object-cover ${item.type === 'channel' ? 'w-14 h-14 rounded-full border-2 border-gray-700' : 'w-24 h-14 rounded-lg'}`} /> : <div className="w-14 h-14 rounded-xl bg-gray-900 flex items-center justify-center text-3xl">{TYPE_CONFIG[item.type].icon}</div>}
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-gray-900 ${TYPE_CONFIG[item.type].color}`}>{TYPE_CONFIG[item.type].label}</span>
                                            <span className="text-[9px] text-gray-500">{new Date(item.date).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="font-bold text-white truncate text-sm">{item.title}</h4>
                                        <div className="flex gap-3 mt-1.5">
                                            <span className="text-[10px] text-gray-500 font-medium">{item.metric1}</span>
                                            <span className="text-[10px] text-blue-400 font-bold">{item.metric2}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {activeTab === 'vault' ? (
                                        <button onClick={(e) => handleSoftDelete(item.id, e)} className="p-1.5 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40" title="휴지통으로 이동"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    ) : (
                                        <>
                                            <button onClick={(e) => handleRestore(item.id, e)} className="p-1.5 bg-green-900/20 text-green-500 rounded-lg hover:bg-green-900/40" title="복구하기"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" /></svg></button>
                                            <button onClick={(e) => handlePermanentDelete(item.id, e)} className="p-1.5 bg-red-900/40 text-red-100 rounded-lg hover:bg-red-600" title="영구 삭제"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollectionView;
