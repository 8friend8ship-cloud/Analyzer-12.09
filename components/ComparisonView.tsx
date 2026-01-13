
import React, { useState, useEffect } from 'react';
import { resolveChannelId, fetchChannelAnalysis } from '../services/youtubeService';
import type { User, AppSettings, ChannelAnalysisData, ChannelVideo } from '../types';
import Spinner from './common/Spinner';
import ComparisonModal from './ComparisonModal';
import Button from './common/Button';

interface ComparisonViewProps {
    user: User;
    appSettings: AppSettings;
    onBack: () => void;
    initialChannelIds?: string[];
}

const formatNumber = (num?: number) => num ? num.toLocaleString() : '-';
const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleDateString('ko-KR') : '-';


const ChannelSearch: React.FC<{ onChannelFound: (data: ChannelAnalysisData) => void; apiKey: string; }> = ({ onChannelFound, apiKey }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const channelId = await resolveChannelId(query, apiKey);
            if (!channelId) throw new Error("채널을 찾을 수 없습니다. (Channel not found.)");
            const channelData = await fetchChannelAnalysis(channelId, apiKey);
            onChannelFound(channelData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "채널 검색에 실패했습니다. (Channel search failed.)");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSearch} className="relative">
            <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="비교할 채널 이름 또는 URL 검색"
                className="w-full bg-gray-800 border border-gray-600 rounded-md py-3 px-4 text-white focus:ring-blue-500 focus:border-blue-500"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {isLoading ? <Spinner message="" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 0114 0z" /></svg>}
            </button>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </form>
    );
};

const ChannelCard: React.FC<{ data: ChannelAnalysisData; onRemove: () => void; color: 'red' | 'blue' }> = ({ data, onRemove, color }) => (
    <div className={`bg-gray-800/50 rounded-lg p-4 border-2 ${color === 'red' ? 'border-red-500' : 'border-blue-500'}`}>
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
                <img src={data.thumbnailUrl} alt={data.name} className="w-16 h-16 rounded-full" />
                <div>
                    <h3 className="text-xl font-bold">{data.name}</h3>
                    <p className="text-sm text-gray-400">{data.handle}</p>
                </div>
            </div>
            <button onClick={onRemove} className="text-gray-500 hover:text-white">&times;</button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div><p className="text-xs text-gray-400">총 조회수 (Views)</p><p className="font-semibold">{formatNumber(data.totalViews)}</p></div>
            <div><p className="text-xs text-gray-400">구독자 (Subs)</p><p className="font-semibold">{formatNumber(data.subscriberCount)}</p></div>
            <div><p className="text-xs text-gray-400">업로드 (Uploads)</p><p className="font-semibold">{formatNumber(data.totalVideos)}</p></div>
        </div>
    </div>
);

const ComparisonView: React.FC<ComparisonViewProps> = ({ user, appSettings, onBack, initialChannelIds }) => {
    const [channelA, setChannelA] = useState<ChannelAnalysisData | null>(null);
    const [channelB, setChannelB] = useState<ChannelAnalysisData | null>(null);
    const [activeTab, setActiveTab] = useState<'basic' | 'videos' | 'tags' | 'summary'>('basic');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const apiKey = appSettings.apiKeys.youtube;

    useEffect(() => {
        const fetchInitialChannels = async () => {
            if (initialChannelIds && initialChannelIds.length > 0 && apiKey) {
                try {
                    if (initialChannelIds[0]) {
                        const dataA = await fetchChannelAnalysis(initialChannelIds[0], apiKey);
                        setChannelA(dataA);
                    }
                    if (initialChannelIds[1]) {
                        const dataB = await fetchChannelAnalysis(initialChannelIds[1], apiKey);
                        setChannelB(dataB);
                    }
                } catch (err) {
                    console.error("Failed to fetch initial channels:", err);
                    alert("선택한 채널 정보를 불러오는 데 실패했습니다.");
                }
            }
        };
        fetchInitialChannels();
    }, [initialChannelIds, apiKey]);

    const TabButton: React.FC<{ tab: typeof activeTab, label: string, currentTab: typeof activeTab, onClick: () => void }> = ({ tab, label, currentTab, onClick }) => (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${currentTab === tab ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
            {label}
        </button>
    );
    
    const BasicInfoTable: React.FC<{ chA: ChannelAnalysisData | null, chB: ChannelAnalysisData | null }> = ({ chA, chB }) => {
        const metrics = [
            { label: '구독자 수 (Subscribers)', key: 'subscriberCount', format: formatNumber },
            { label: '총 영상 수 (Total Videos)', key: 'totalVideos', format: formatNumber },
            { label: '총 조회수 (Total Views)', key: 'totalViews', format: formatNumber },
            { label: '채널 개설일 (Created Date)', key: 'publishedAt', format: formatDate },
        ];

        return (
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-900/50">
                        <tr >
                            <th className="p-3 text-left font-semibold text-gray-300 w-1/3">항목 (Item)</th>
                            <th className="p-3 text-center font-semibold text-red-400 w-1/3">{chA?.name || '채널 A (Channel A)'}</th>
                            <th className="p-3 text-center font-semibold text-blue-400 w-1/3">{chB?.name || '채널 B (Channel B)'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {metrics.map(metric => (
                            <tr key={metric.label}>
                                <td className="p-3 text-gray-400">{metric.label}</td>
                                <td className="p-3 text-center font-mono text-white">{chA ? (metric.format as (value: any) => string)(chA[metric.key as keyof ChannelAnalysisData]) : '-'}</td>
                                <td className="p-3 text-center font-mono text-white">{chB ? (metric.format as (value: any) => string)(chB[metric.key as keyof ChannelAnalysisData]) : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };
    
    const VideoList: React.FC<{ videos: ChannelVideo[] }> = ({ videos }) => (
        <div className="space-y-3">
            {videos.slice(0, 10).map(video => (
                <div key={video.id} className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-md">
                    <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">
                        <img src={video.thumbnailUrl} alt={video.title} className="w-20 h-auto rounded" />
                    </a>
                    <div className="min-w-0">
                        <p className="text-xs text-white line-clamp-2">{video.title}</p>
                        <p className="text-xs text-gray-400 mt-1">👁️ {formatNumber(video.viewCount)}</p>
                    </div>
                </div>
            ))}
             {videos.length === 0 && <p className="text-sm text-gray-500 text-center py-4">최근 영상이 없습니다. (No recent videos.)</p>}
        </div>
    );
    
    const TagList: React.FC<{ tags: string[] }> = ({ tags }) => (
        <div className="flex flex-wrap gap-2">
            {tags.length > 0 ? tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-md">#{tag}</span>
            )) : <p className="text-sm text-gray-500">설정된 채널 태그가 없습니다. (No channel tags set.)</p>}
        </div>
    );

     const SummaryDisplay: React.FC<{ description: string }> = ({ description }) => (
        <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {description || "채널 설명이 없습니다. (No channel description.)"}
        </div>
    );

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <button onClick={onBack} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
                ← 뒤로 가기
            </button>
            <header className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white">채널 데이터 비교 (Channel Data Comparison)</h1>
                <p className="text-gray-400 mt-2">두 채널의 데이터를 나란히 비교하여 참고할 점을 찾아보세요.</p>
            </header>

            <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-8">
                    <div>{channelA ? <ChannelCard data={channelA} onRemove={() => setChannelA(null)} color="red" /> : <ChannelSearch onChannelFound={setChannelA} apiKey={apiKey} />}</div>
                    <div>{channelB ? <ChannelCard data={channelB} onRemove={() => setChannelB(null)} color="blue" /> : <ChannelSearch onChannelFound={setChannelB} apiKey={apiKey} />}</div>
                </div>
                 
                 {channelA && channelB && (
                    <div className="animate-fade-in">
                        <div className="border-b border-gray-700 mb-6 flex justify-between items-center">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                <TabButton tab="basic" label="기본 정보" currentTab={activeTab} onClick={() => setActiveTab('basic')} />
                                <TabButton tab="videos" label="최근 영상" currentTab={activeTab} onClick={() => setActiveTab('videos')} />
                                <TabButton tab="tags" label="채널 태그" currentTab={activeTab} onClick={() => setActiveTab('tags')} />
                                <TabButton tab="summary" label="채널 요약" currentTab={activeTab} onClick={() => setActiveTab('summary')} />
                            </nav>
                            <Button onClick={() => setIsAiModalOpen(true)} className="!py-1.5 !px-3 text-xs">
                                🤖 채널 정보 요약
                            </Button>
                        </div>
                        
                        <div>
                            {activeTab === 'basic' && <BasicInfoTable chA={channelA} chB={channelB} />}
                            {activeTab === 'videos' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-800/50 p-4 rounded-lg border border-red-500/30">
                                        <h3 className="font-semibold mb-3 text-red-400">{channelA.name}</h3>
                                        <VideoList videos={channelA.videoList} />
                                    </div>
                                    <div className="bg-gray-800/50 p-4 rounded-lg border border-blue-500/30">
                                        <h3 className="font-semibold mb-3 text-blue-400">{channelB.name}</h3>
                                        <VideoList videos={channelB.videoList} />
                                    </div>
                                </div>
                            )}
                            {activeTab === 'tags' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-800/50 p-4 rounded-lg border border-red-500/30">
                                        <h3 className="font-semibold mb-3 text-red-400">{channelA.name}</h3>
                                        <TagList tags={channelA.channelKeywords} />
                                    </div>
                                    <div className="bg-gray-800/50 p-4 rounded-lg border border-blue-500/30">
                                        <h3 className="font-semibold mb-3 text-blue-400">{channelB.name}</h3>
                                        <TagList tags={channelB.channelKeywords} />
                                    </div>
                                </div>
                            )}
                             {activeTab === 'summary' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-800/50 p-4 rounded-lg border border-red-500/30">
                                        <h3 className="font-semibold mb-3 text-red-400">{channelA.name}</h3>
                                        <SummaryDisplay description={channelA.description} />
                                    </div>
                                    <div className="bg-gray-800/50 p-4 rounded-lg border border-blue-500/30">
                                        <h3 className="font-semibold mb-3 text-blue-400">{channelB.name}</h3>
                                        <SummaryDisplay description={channelB.description} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {isAiModalOpen && channelA && channelB && (
                <ComparisonModal 
                    onClose={() => setIsAiModalOpen(false)}
                    channelA={{ query: channelA.name, videos: channelA.videoList as any }}
                    channelB={{ query: channelB.name, videos: channelB.videoList as any }}
                />
            )}
        </div>
    );
};

export default ComparisonView;
