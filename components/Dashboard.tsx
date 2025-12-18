
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Header from './Header';
import FilterBar from './FilterBar';
import ResultsTable from './ResultsTable';
import Spinner from './common/Spinner';
import ComparisonModal from './ComparisonModal';
import HelpModal from './HelpModal';
import ChannelDetailView from './ChannelDetailView';
import AdminDashboard from './AdminDashboard';
import UpgradeModal from './UpgradeModal'; 
import CommentAnalysisModal from './CommentAnalysisModal';
import RankingView from './RankingView'; 
import WorkflowView from './WorkflowView'; 
import VideoDetailView from './VideoDetailView'; 
import ThumbnailAnalysisView from './ThumbnailAnalysisView'; 
import OutlierAnalysisView from './OutlierAnalysisView'; 
import ABTestGameView from './ABTestGameView'; 
import Chatbot from './Chatbot'; 
import MyChannelAnalytics from './MyChannelAnalytics';
import AdAnalysis from './AdAnalysis';
import AlgorithmFinderView from './AlgorithmFinderView';
import CollectionView from './CollectionView';
import TrendRankingView from './TrendRankingView';
import { logQuery, getPopularQueries, pruneQueries } from '../services/queryAnalyticsService'; 
import { fetchYouTubeData, resolveChannelId } from '../services/youtubeService';
import type { VideoData, AnalysisMode, FilterState, User, AppSettings, PopularQuery, OutlierViewState, ThumbnailViewState, RankingViewState } from '../types';
import LengthChart from './charts/LengthChart';
import ViewsDistributionChart from './charts/ViewsDistributionChart';

interface DashboardProps {
    user: User;
    appSettings: AppSettings;
    onLogout: () => void;
    onNavigate: (view: 'account') => void;
    onUpdateUser: (updatedUser: Partial<User>) => void;
    onUpdateAppSettings: (updatedSettings: Partial<AppSettings>) => void;
}

const initialFilterState: FilterState = {
  minViews: 100000,
  videoLength: 'any',
  videoFormat: 'any',
  period: '30',
  sortBy: 'viewCount',
  resultsLimit: 50,
  country: 'KR',
  category: 'all',
};

type ViewType = 'main' | 'admin' | 'ranking' | 'channelDetail' | 'workflow' | 'videoDetail' | 'thumbnailAnalysis' | 'outlierAnalysis' | 'myChannel' | 'abTestGame' | 'algorithmFinder' | 'collections' | 'trendRanking';

interface NavState {
    view: ViewType;
    params?: {
        channelId?: string | null;
        videoId?: string | null;
        previousChannelId?: string | null;
        initialTab?: 'overview' | 'similarChannels';
    };
}

const Dashboard: React.FC<DashboardProps> = ({ user, appSettings, onLogout, onNavigate, onUpdateUser, onUpdateAppSettings }) => {
    const [videos, setVideos] = useState<VideoData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isInitial, setIsInitial] = useState(true);
    const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    
    const [view, setView] = useState<ViewType>('main');
    const [navStack, setNavStack] = useState<NavState[]>([{ view: 'main' }]);
    
    const [channelDetailId, setChannelDetailId] = useState<string | null>(null);
    const [videoDetailId, setVideoDetailId] = useState<string | null>(null);
    const [previousChannelId, setPreviousChannelId] = useState<string | null>(null);
    const [initialChannelDetailTab, setInitialChannelDetailTab] = useState<'overview' | 'similarChannels'>('overview');

    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [selectedVideoForComments, setSelectedVideoForComments] = useState<{id: string, title: string} | null>(null);
    
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<AnalysisMode>('keyword');
    const [filters, setFilters] = useState<FilterState>(initialFilterState);
    const [popularQueries, setPopularQueries] = useState<PopularQuery[]>([]);

    const [selectedChannels, setSelectedChannels] = useState<Record<string, { name: string }>>({});
    const [isChatOpen, setIsChatOpen] = useState(false);

    const [outlierViewState, setOutlierViewState] = useState<OutlierViewState | null>(null);
    const [thumbnailViewState, setThumbnailViewState] = useState<ThumbnailViewState | null>(null);
    const [rankingViewState, setRankingViewState] = useState<RankingViewState | null>(null);


    const planLimits = { 
        Free: appSettings.freePlanLimit, 
        Pro: appSettings.plans.pro.analyses, 
        Biz: appSettings.plans.biz.analyses 
    };
    
    const planLimit = user.isAdmin ? Infinity : planLimits[user.plan];

    const hasYoutubeKey = !!(user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube));
    const hasGeminiKey = !!(user.isAdmin ? appSettings.apiKeys.gemini : (user.apiKeyGemini || appSettings.apiKeys.gemini));
    const hasAllApiKeys = hasYoutubeKey && hasGeminiKey;

    useEffect(() => {
        pruneQueries(); 
        setPopularQueries(getPopularQueries(5));
    }, []); 

    const navigateTo = useCallback((targetView: ViewType, params?: NavState['params']) => {
        if (targetView === 'admin' && !user.isAdmin) return;

        setNavStack(prev => {
            const currentParams = {
                channelId: channelDetailId,
                videoId: videoDetailId,
                previousChannelId,
                initialTab: initialChannelDetailTab
            };
            return [...prev, { view: targetView, params: targetView === view ? currentParams : params }];
        });
        
        if (params?.channelId) setChannelDetailId(params.channelId);
        if (params?.videoId) setVideoDetailId(params.videoId);
        if (params?.previousChannelId !== undefined) setPreviousChannelId(params.previousChannelId);
        if (params?.initialTab) setInitialChannelDetailTab(params.initialTab);

        setView(targetView);
        window.scrollTo(0, 0);
    }, [view, channelDetailId, videoDetailId, previousChannelId, initialChannelDetailTab, user]);

    const handleBack = useCallback(() => {
        setNavStack(prev => {
            if (prev.length <= 1) return prev; 
            const newStack = [...prev];
            newStack.pop(); 
            const previousState = newStack[newStack.length - 1]; 
            
            setView(previousState.view);
            const params = previousState.params;
            setChannelDetailId(params?.channelId || null);
            setVideoDetailId(params?.videoId || null);
            setPreviousChannelId(params?.previousChannelId || null);
            setInitialChannelDetailTab(params?.initialTab || 'overview');
            return newStack;
        });
    }, []);

    const handleUpgradeRequired = useCallback(() => {
        setIsUpgradeModalOpen(true);
    }, []);

    const handleAnalysis = useCallback(async (searchQuery: string, searchMode: AnalysisMode) => {
        if (user.usage >= planLimit) {
            setIsUpgradeModalOpen(true);
            return;
        }

        logQuery(searchQuery, searchMode);
        setLoadingMessage(`AI가 '${searchQuery}'에 대한 데이터를 분석 중입니다...`);
        setIsLoading(true);
        setError(null);
        setVideos([]);
        setIsInitial(false);
        setSelectedChannels({}); 

        try {
            if (!searchQuery.trim()) throw new Error("키워드 또는 채널 URL을 입력해주세요.");
            if (!hasAllApiKeys) throw new Error("API 키가 모두 설정되지 않았습니다.");
            
            const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
            const videoData = await fetchYouTubeData(searchMode, searchQuery, filters, apiKey!);
            setVideos(videoData);
            onUpdateUser({ usage: user.usage + 1 }); 
        } catch (err) {
            setError(err instanceof Error ? err.message : "데이터 분석에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    }, [user, onUpdateUser, appSettings, filters, hasAllApiKeys, planLimit]);
    
    const handlePopularQuerySelect = (selectedQuery: string, selectedMode: AnalysisMode) => {
        setQuery(selectedQuery);
        setMode(selectedMode);
        handleAnalysis(selectedQuery, selectedMode);
    };

    const sortedVideos = useMemo(() => {
        if (videos.length === 0) return [];
        return [...videos].sort((a, b) => {
            const sortBy = filters.sortBy;
            if (sortBy === 'publishedAt') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
            if (sortBy === 'grade') {
                const gradeOrder: { [key: string]: number } = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
                return gradeOrder[b.grade] - gradeOrder[a.grade];
            }
            const valueA = a[sortBy as keyof VideoData] as number;
            const valueB = b[sortBy as keyof VideoData] as number;
            return valueB - valueA;
        });
    }, [videos, filters.sortBy]);
    
    const handleChannelSelect = useCallback((channel: { id: string, name: string }, isSelected: boolean) => {
        setSelectedChannels(prev => {
            const newSelection = { ...prev };
            if (isSelected) newSelection[channel.id] = { name: channel.name };
            else delete newSelection[channel.id];
            return newSelection;
        });
    }, []);

    const handleShowChannelDetail = useCallback((channelId: string, tab: 'overview' | 'similarChannels' = 'overview') => {
        navigateTo('channelDetail', { channelId, initialTab: tab });
    }, [navigateTo]);
    
    const handleShowVideoDetail = useCallback((videoId: string) => {
        navigateTo('videoDetail', { videoId, previousChannelId: channelDetailId });
    }, [navigateTo, channelDetailId]);

    const handleWorkflowNavigate = useCallback(async (featureId: string) => {
        const getApiKey = () => user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
        if (['algorithm_finder', 'collections'].includes(featureId)) {
            if (user.plan !== 'Biz' && !user.isAdmin) {
                alert("이 기능은 상위 버전(Biz 요금제)에서만 사용할 수 있습니다.");
                return;
            }
        }
        switch (featureId) {
            case 'channel_analytics': setView('main'); setMode('channel'); setQuery(''); break;
            case 'video_analytics': setView('main'); setMode('keyword'); setQuery(''); break;
            case 'top_charts': navigateTo('ranking'); break;
            case 'similar_channels': {
                const input = prompt("분석할 기준 채널의 URL 또는 채널명을 입력해주세요:");
                if (input) {
                    const apiKey = getApiKey();
                    if (!apiKey) return;
                    const channelId = await resolveChannelId(input, apiKey);
                    if (channelId) handleShowChannelDetail(channelId, 'similarChannels');
                }
                break;
            }
            case 'thumbnail_search': navigateTo('thumbnailAnalysis'); break;
            case 'outliers': navigateTo('outlierAnalysis'); break;
            case 'trend_ranking': navigateTo('trendRanking'); break;
            case 'ab_test': navigateTo('abTestGame'); break;
            case 'algorithm_finder': navigateTo('algorithmFinder'); break;
            case 'collections': navigateTo('collections'); break;
            default: alert(`준비 중입니다.`);
        }
    }, [handleShowChannelDetail, user, appSettings, navigateTo]);

    const renderCurrentView = () => {
        const usageProps = { onUpdateUser, onUpgradeRequired: handleUpgradeRequired, planLimit };
        switch (view) {
            case 'main':
                return (
                    <div className="p-4 md:p-6 lg:p-8 relative min-h-[60vh]">
                        {isLoading && <div className="absolute inset-0 bg-gray-900/80 flex justify-center items-center z-20"><Spinner message={loadingMessage} /></div>}
                        {error ? <div className="text-center text-red-400 p-4 bg-red-900/50 rounded-lg">{error}</div> : isInitial ? <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-800/30 rounded-3xl border border-gray-700/50 max-w-4xl mx-auto"><h2 className="text-2xl font-bold mb-4">전략적 분석을 시작하세요</h2><p className="text-gray-400 mb-8">상단 검색창에 키워드나 채널을 입력해주세요.</p><div className="flex flex-wrap justify-center gap-2">{popularQueries.map(pq => <button key={pq.query} onClick={() => handlePopularQuerySelect(pq.query, pq.mode)} className="px-4 py-2 bg-gray-700 rounded-full text-sm hover:bg-gray-600">{pq.query}</button>)}</div></div> : (
                            <div className="animate-fade-in">
                                {videos.length > 0 && (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                        <div className="h-64"><ViewsDistributionChart data={videos} /></div>
                                        <div className="h-64"><LengthChart data={videos} /></div>
                                        <div className="h-64"><AdAnalysis videos={videos} /></div>
                                    </div>
                                )}
                                <ResultsTable videos={sortedVideos} onShowChannelDetail={handleShowChannelDetail} onShowVideoDetail={handleShowVideoDetail} onOpenCommentModal={(v) => { setSelectedVideoForComments(v); setIsCommentModalOpen(true); }} selectedChannels={selectedChannels} onChannelSelect={handleChannelSelect} />
                            </div>
                        )}
                    </div>
                );
            case 'admin': return <AdminDashboard onBack={handleBack} settings={appSettings} onUpdateSettings={onUpdateAppSettings} />;
            case 'ranking': return <RankingView user={user} appSettings={appSettings} onShowChannelDetail={handleShowChannelDetail} onShowVideoDetail={handleShowVideoDetail} savedState={rankingViewState} onSaveState={setRankingViewState} {...usageProps} />;
            case 'channelDetail': return <ChannelDetailView key={channelDetailId} channelId={channelDetailId!} user={user} appSettings={appSettings} onBack={handleBack} onOpenCommentModal={(v) => { setSelectedVideoForComments(v); setIsCommentModalOpen(true); }} onShowVideoDetail={handleShowVideoDetail} onShowChannelDetail={handleShowChannelDetail} initialTab={initialChannelDetailTab} {...usageProps} />;
            case 'videoDetail': return <VideoDetailView videoId={videoDetailId!} user={user} appSettings={appSettings} onBack={handleBack} onShowChannelDetail={handleShowChannelDetail} previousChannelId={previousChannelId} {...usageProps} />;
            case 'workflow': return <WorkflowView onNavigate={handleWorkflowNavigate} />;
            case 'thumbnailAnalysis': return <ThumbnailAnalysisView user={user} appSettings={appSettings} onBack={handleBack} savedState={thumbnailViewState} onSaveState={setThumbnailViewState} {...usageProps} />;
            case 'outlierAnalysis': return <OutlierAnalysisView user={user} appSettings={appSettings} onBack={handleBack} onShowChannelDetail={handleShowChannelDetail} onShowVideoDetail={handleShowVideoDetail} savedState={outlierViewState} onSaveState={setOutlierViewState} {...usageProps} />;
            case 'trendRanking': return <TrendRankingView user={user} appSettings={appSettings} onBack={handleBack} onShowVideoDetail={handleShowVideoDetail} onShowChannelDetail={handleShowChannelDetail} {...usageProps} />;
            case 'abTestGame': return <ABTestGameView user={user} appSettings={appSettings} onBack={handleBack} onUpdateUser={onUpdateUser} onUpgradeRequired={handleUpgradeRequired} />;
            case 'myChannel': return <MyChannelAnalytics user={user} appSettings={appSettings} {...usageProps} />;
            case 'algorithmFinder': return <AlgorithmFinderView user={user} onBack={handleBack} {...usageProps} />;
            case 'collections': return <CollectionView onBack={handleBack} user={user} appSettings={appSettings} />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#0F1117] text-gray-100 font-sans">
            <div className="sticky top-0 z-50">
                <Header user={user} planLimit={planLimit} onLogout={onLogout} onOpenHelpModal={() => setIsHelpModalOpen(true)} onShowAdmin={() => navigateTo('admin')} onNavigate={onNavigate} onShowMain={() => navigateTo('main')} onShowRanking={() => navigateTo('ranking')} onShowWorkflow={() => navigateTo('workflow')} onShowMyChannel={() => navigateTo('myChannel')} currentView={view} hasApiKey={hasAllApiKeys} />
            </div>
            <main className="flex-1">
                {view === 'main' && <FilterBar onAnalyze={handleAnalysis} isLoading={isLoading} onOpenCompareModal={() => setIsComparisonModalOpen(true)} selectedChannelCount={Object.keys(selectedChannels).length} query={query} onQueryChange={setQuery} mode={mode} onModeChange={setMode} filters={filters} onFiltersChange={setFilters} />}
                {renderCurrentView()}
            </main>
            <button onClick={() => setIsChatOpen(prev => !prev)} className="fixed bottom-5 right-5 w-16 h-16 bg-blue-600 rounded-full text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </button>
            <Chatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
            {isComparisonModalOpen && <ComparisonModal user={user} appSettings={appSettings} onClose={() => setIsComparisonModalOpen(false)} initialSelectedChannels={selectedChannels} />}
            {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}
            {isUpgradeModalOpen && <UpgradeModal onClose={() => setIsUpgradeModalOpen(false)} />}
            {isCommentModalOpen && selectedVideoForComments && <CommentAnalysisModal video={selectedVideoForComments} user={user} appSettings={appSettings} onClose={() => { setIsCommentModalOpen(false); setSelectedVideoForComments(null); }} />}
        </div>
    );
};

export default Dashboard;
