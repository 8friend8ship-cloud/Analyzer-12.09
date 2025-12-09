
import React, { useState, useEffect } from 'react';
import { getCollection, removeFromCollection, clearCollection, exportCollectionToCSV } from '../services/collectionService';
import type { CollectionItem } from '../types';
import Button from './common/Button';

interface CollectionViewProps {
    onBack: () => void;
}

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <p className="text-lg font-medium">수집된 항목이 없습니다.</p>
        <p className="text-sm mt-1">채널 분석이나 영상 분석을 진행하면 자동으로 여기에 저장됩니다.</p>
    </div>
);

const CollectionView: React.FC<CollectionViewProps> = ({ onBack }) => {
    const [items, setItems] = useState<CollectionItem[]>([]);

    useEffect(() => {
        setItems(getCollection());
    }, []);

    const handleDelete = (id: string) => {
        removeFromCollection(id);
        setItems(getCollection());
    };

    const handleClearAll = () => {
        if (window.confirm("모든 수집 기록을 삭제하시겠습니까?")) {
            clearCollection();
            setItems([]);
        }
    };

    const channels = items.filter(i => i.type === 'channel');
    const videos = items.filter(i => i.type === 'video');

    const ItemRow: React.FC<{ item: CollectionItem }> = ({ item }) => (
        <div className="flex items-center gap-4 p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
            <img src={item.thumbnailUrl} alt={item.title} className={`flex-shrink-0 object-cover ${item.type === 'channel' ? 'w-12 h-12 rounded-full' : 'w-20 h-12 rounded-md'}`} />
            <div className="flex-grow min-w-0">
                <h4 className="font-bold text-white truncate">{item.title}</h4>
                <div className="text-xs text-gray-400 flex gap-3 mt-1">
                    <span>{item.type === 'channel' ? '구독자' : '조회수'}: {item.metric1}</span>
                    <span>{item.type === 'channel' ? '영상수' : '좋아요'}: {item.metric2}</span>
                    <span>수집: {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-400 hover:bg-gray-700 rounded-md" title="YouTube로 이동">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
                <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:bg-gray-700 rounded-md" title="삭제">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <button onClick={onBack} className="mb-2 text-sm text-gray-400 hover:text-white flex items-center gap-1">
                            ← 워크플로우로 돌아가기
                        </button>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <span className="text-4xl">🗂️</span> 컬렉션 (Daily Collection)
                        </h1>
                        <p className="text-gray-400 mt-1 text-sm">오늘 분석한 채널과 영상을 자동으로 모아두었습니다. 엑셀로 다운로드하여 관리하세요.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleClearAll} variant="secondary" disabled={items.length === 0}>
                            전체 삭제
                        </Button>
                        <Button onClick={exportCollectionToCSV} className="bg-green-600 hover:bg-green-700" disabled={items.length === 0}>
                            엑셀/구글시트 다운로드 (CSV)
                        </Button>
                    </div>
                </div>

                {items.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2 flex justify-between items-center">
                                📺 수집된 채널 <span className="text-sm font-normal text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{channels.length}</span>
                            </h3>
                            <div className="space-y-3">
                                {channels.length > 0 ? (
                                    channels.map(item => <ItemRow key={item.id} item={item} />)
                                ) : (
                                    <p className="text-center text-gray-500 py-8">수집된 채널이 없습니다.</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2 flex justify-between items-center">
                                🎬 수집된 영상 <span className="text-sm font-normal text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{videos.length}</span>
                            </h3>
                            <div className="space-y-3">
                                {videos.length > 0 ? (
                                    videos.map(item => <ItemRow key={item.id} item={item} />)
                                ) : (
                                    <p className="text-center text-gray-500 py-8">수집된 영상이 없습니다.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollectionView;
