
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
import { logQuery, getPopularQueries, pruneQueries } from '../services/queryAnalyticsService'; 
import { fetchYouTubeData, resolveChannelId, fetchRankingData } from '../services/youtubeService';
import type { VideoData, AnalysisMode, FilterState, User, AppSettings, ChannelAnalysisData, PopularQuery, OutlierViewState, ThumbnailViewState, RankingViewState } from '../types';
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

type ViewType = 'main' | 'admin' | 'ranking' | 'channelDetail' | 'workflow' | 'videoDetail' | 'thumbnailAnalysis' | 'outlierAnalysis' | 'myChannel' | 'abTestGame' | 'algorithmFinder' | 'collections';

// Navigation State Interface for the History Stack
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
    const [error, setError] = useState<string | null>(null);
    const [isInitial, setIsInitial] = useState(true);
    const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    
    // Core State for View and Navigation Stack
    const [view, setView] = useState<ViewType>('main');
    const [navStack, setNavStack] = useState<NavState[]>([{ view: 'main' }]);
    
    // View-Specific Params
    const [channelDetailId, setChannelDetailId] = useState<string | null>(null);
    const [videoDetailId, setVideoDetailId] = useState<string | null>(null);
    const [previousChannelId, setPreviousChannelId] = useState<string | null>(null);
    const [initialChannelDetailTab, setInitialChannelDetailTab] = useState<'overview' | 'similarChannels'>('overview');

    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [selectedVideoForComments, setSelectedVideoForComments] = useState<{id: string, title: string} | null>(null);
    
    const [query, setQuery] = useState('시니어');
    const [mode, setMode] = useState<AnalysisMode>('keyword');
    const [filters, setFilters] = useState<FilterState>(initialFilterState);

    const [selectedChannels, setSelectedChannels] = useState<Record<string, { name: string }>>({});
    const [isChatOpen, setIsChatOpen] = useState(false);

    // State Preservation for Sub-Views
    const [outlierViewState, setOutlierViewState] = useState<OutlierViewState | null>(null);
    const [thumbnailViewState, setThumbnailViewState] = useState<ThumbnailViewState | null>(null);
    const [rankingViewState, setRankingViewState] = useState<RankingViewState | null>(null);


    const planLimits = { 
        Free: appSettings.freePlanLimit, 
        Pro: appSettings.plans.pro.analyses, 
        Biz: appSettings.plans.biz.analyses 
    };
    
    const hasApiKey = !!(user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube));

    useEffect(() => {
        pruneQueries(); 

        const preFetchData = async () => {
            console.log("Pre-fetching data to warm up the cache...");
            try {
                if (hasApiKey) {
                    const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
                    // 1. Pre-fetch default rankings
                    const rankingFilters = { limit: 50, country: 'KR', category: 'all', metric: 'mostPopular', excludedCategories: new Set<string>() };
                    await fetchRankingData('channels', rankingFilters, apiKey!);
                    console.log("Ranking pre-fetch complete.");

                    // 2. Pre-fetch popular queries based on user history
                    const popularQueries: PopularQuery[] = getPopularQueries(3);
                    if (popularQueries.length > 0) {
                        const popularQueryPromises = popularQueries.map(pq => 
                            fetchYouTubeData(pq.mode, pq.query, initialFilterState, apiKey!)
                        );
                        await Promise.all(popularQueryPromises);
                    }
                }
            } catch (error) {
                console.warn("Background pre-fetching failed:", error);
            }
        };

        preFetchData();
    }, []); 

    // Enhanced Navigation Function
    const navigateTo = useCallback((targetView: ViewType, params?: NavState['params']) => {
        // Security check: Prevent non-admins from accessing admin page.
        if (targetView === 'admin' && !user.isAdmin) {
            console.warn("Access Denied: Non-admin user attempted to access the admin dashboard.");
            return; // Silently block navigation
        }

        setNavStack(prev => {
            // Push current state to stack before moving
            const currentParams = {
                channelId: channelDetailId,
                videoId: videoDetailId,
                previousChannelId,
                initialTab: initialChannelDetailTab
            };
            return [...prev, { view: targetView, params: targetView === view ? currentParams : params }];
        });
        
        // Update local state based on params
        if (params?.channelId) setChannelDetailId(params.channelId);
        if (params?.videoId) setVideoDetailId(params.videoId);
        if (params?.previousChannelId !== undefined) setPreviousChannelId(params.previousChannelId);
        if (params?.initialTab) setInitialChannelDetailTab(params.initialTab);

        setView(targetView);
        // Scroll to top on navigation
        window.scrollTo(0, 0);
    }, [view, channelDetailId, videoDetailId, previousChannelId, initialChannelDetailTab, user]);

    const handleBack = useCallback(() => {
        setNavStack(prev => {
            if (prev.length <= 1) return prev; // Cannot go back further than root
            
            const newStack = [...prev];
            newStack.pop(); // Remove current view
            const previousState = newStack[newStack.length - 1]; // Get previous view state
            
            // Restore Global State
            setView(previousState.view);
            
            // Restore View Specific Params
            const params = previousState.params;
            setChannelDetailId(params?.channelId || null);
            setVideoDetailId(params?.videoId || null);
            setPreviousChannelId(params?.previousChannelId || null);
            setInitialChannelDetailTab(params?.initialTab || 'overview');

            return newStack;
        });
    }, []);


    const handleAnalysis = useCallback(async (searchQuery: string) => {
        const currentPlanLimit = planLimits[user.plan];
        if (user.usage >= currentPlanLimit) {
            setIsUpgradeModalOpen(true);
            return;
        }

        logQuery(searchQuery, mode);

        setIsLoading(true);
        setError(null);
        setVideos([]);
        setIsInitial(false);
        setSelectedChannels({}); 

        try {
            if (!searchQuery.trim()) {
                setError("키워드 또는 채널 URL을 입력해주세요.");
                setIsLoading(false);
                return;
            }
            
            if (!hasApiKey) {
                const adminError = "관리자님, 시스템 YouTube API 키가 설정되지 않았습니다. [관리자 대시보드]에서 시스템 API 키를 설정해주세요.";
                const userError = "YouTube API 키가 설정되지 않았습니다. [계정 설정]에서 개인 키를 추가하거나 관리자에게 시스템 키 설정을 요청하세요.";
                setError(user.isAdmin ? adminError : userError);
                setIsLoading(false);
                return;
            }
            
            const apiKey = user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);
            const videoData = await fetchYouTubeData(mode, searchQuery, filters, apiKey!);
            setVideos(videoData);
            onUpdateUser({ usage: user.usage + 1 }); 
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "데이터 분석에 실패했습니다. 잠시 후 다시 시도해주세요.";
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [user, onUpdateUser, appSettings, mode, filters, hasApiKey]);
    
    const sortedVideos = useMemo(() => {
        if (videos.length === 0) return [];
        
        return [...videos].sort((a, b) => {
            const sortBy = filters.sortBy;
            if (sortBy === 'publishedAt') {
                return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
            }
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
            if (isSelected) {
                newSelection[channel.id] = { name: channel.name };
            } else {
                delete newSelection[channel.id];
            }
            return newSelection;
        });
    }, []);

    const handleOpenCompareModal = useCallback(() => setIsComparisonModalOpen(true), []);
    const handleCloseCompareModal = useCallback(() => setIsComparisonModalOpen(false), []);
    const handleOpenHelpModal = useCallback(() => setIsHelpModalOpen(true), []);
    const handleCloseHelpModal = useCallback(() => setIsHelpModalOpen(false), []);
    const handleCloseUpgradeModal = useCallback(() => setIsUpgradeModalOpen(false), []);
    const handleUpgradeRequired = useCallback(() => setIsUpgradeModalOpen(true), []);

    const handleShowChannelDetail = useCallback((channelId: string, tab: 'overview' | 'similarChannels' = 'overview') => {
        navigateTo('channelDetail', { channelId, initialTab: tab });
    }, [navigateTo]);
    
    const handleShowVideoDetail = useCallback((videoId: string) => {
        // We pass the current channelId as 'previousChannelId' if we are coming from a channel detail view
        navigateTo('videoDetail', { videoId, previousChannelId: channelDetailId });
    }, [navigateTo, channelDetailId]);

    const handleOpenCommentModal = useCallback((video: {id: string, title: string}) => {
        setSelectedVideoForComments(video);
        setIsCommentModalOpen(true);
    }, []);

    const handleCloseCommentModal = useCallback(() => {
        setIsCommentModalOpen(false);
        setSelectedVideoForComments(null);
    }, []);
    
    const handleWorkflowNavigate = useCallback(async (featureId: string) => {
        const getApiKey = () => user.isAdmin ? appSettings.apiKeys.youtube : (user.apiKeyYoutube || appSettings.apiKeys.youtube);

        switch (featureId) {
            case 'channel_analytics':
                setView('main');
                setMode('channel');
                setQuery('');
                // Small UX touch: Focus input after render?
                setTimeout(() => document.getElementById('query')?.focus(), 100);
                break;
            case 'video_analytics':
                setView('main');
                setMode('keyword');
                setQuery('');
                setTimeout(() => document.getElementById('query')?.focus(), 100);
                break;
            case 'top_charts':
                navigateTo('ranking');
                break;
            case 'similar_channels': {
                const channelInput = prompt("분석할 기준 채널의 URL, ID 또는 채널명을 입력해주세요:");
                if (channelInput) {
                    const apiKey = getApiKey();
                    if (!apiKey) {
                        alert("YouTube API 키가 설정되지 않았습니다.");
                        return;
                    }
                    const channelId = await resolveChannelId(channelInput, apiKey);
                    if (channelId) {
                        handleShowChannelDetail(channelId, 'similarChannels');
                    } else {
                        alert("채널을 찾을 수 없습니다. 입력값을 확인해주세요.");
                    }
                }
                break;
            }
            case 'thumbnail_search':
                navigateTo('thumbnailAnalysis');
                break;
            case 'outliers':
                navigateTo('outlierAnalysis');
                break;
            case 'ab_test':
                navigateTo('abTestGame');
                break;
            case 'algorithm_finder':
                navigateTo('algorithmFinder');
                break;
            case 'collections':
                navigateTo('collections');
                break;
            default:
                alert(`'${featureId}' 기능은 현재 준비 중입니다.`);
        }
    }, [handleShowChannelDetail, user, appSettings, navigateTo]);

    const WelcomeMessage = () => (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center text-gray-500 p-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-24 h-24 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
        <h2 className="text-2xl font-bold text-gray-300">데이터 분석을 시작하세요</h2>
        <p className="mt-2 max-w-md">상단 필터 바에서 검색어와 필터를 설정한 후 '검색' 버튼을 클릭하세요.</p>
      </div>
    );
    
    const AIAnalysisView = ({ data }: { data: VideoData[] }) => (
        <div className="mb-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4">AI 분석</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 h-64"><ViewsDistributionChart data={data} /></div>
                <div className="lg:col-span-1 h-64"><LengthChart data={data} /></div>
                <div className="lg:col-span-1 h-64">
                    <AdAnalysis videos={data} />
                </div>
            </div>
        </div>
    );

    const renderCurrentView = () => {
        switch (view) {
            case 'main':
                return (
                    <div className="p-4 md:p-6 lg:p-8">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64"><Spinner /></div>
                        ) : error ? (
                            <div className="text-center text-red-400 p-4 bg-red-900/50 rounded-lg">{error}</div>
                        ) : isInitial ? (
                            <WelcomeMessage />
                        ) : (
                        <>
                            {videos.length > 0 && <AIAnalysisView data={videos} />}
                            <h2 className="text-xl font-bold mb-4">관련 영상 리스트</h2>
                            <ResultsTable 
                                videos={sortedVideos} 
                                onShowChannelDetail={handleShowChannelDetail} 
                                onShowVideoDetail={handleShowVideoDetail}
                                onOpenCommentModal={handleOpenCommentModal}
                                selectedChannels={selectedChannels}
                                onChannelSelect={handleChannelSelect}
                            />
                        </>
                        )}
                    </div>
                );
            case 'admin':
                return <AdminDashboard onBack={handleBack} settings={appSettings} onUpdateSettings={onUpdateAppSettings} />;
            case 'ranking':
                 return <RankingView 
                            user={user} 
                            appSettings={appSettings} 
                            onShowChannelDetail={handleShowChannelDetail} 
                            onShowVideoDetail={handleShowVideoDetail} 
                            savedState={rankingViewState}
                            onSaveState={setRankingViewState}
                        />;
            case 'channelDetail':
                 return <ChannelDetailView 
                            channelId={channelDetailId!} 
                            user={user} 
                            appSettings={appSettings} 
                            onBack={handleBack} 
                            onOpenCommentModal={handleOpenCommentModal}
                            onShowVideoDetail={handleShowVideoDetail}
                            onShowChannelDetail={handleShowChannelDetail}
                            initialTab={initialChannelDetailTab}
                        />;
            case 'videoDetail':
                return <VideoDetailView 
                           videoId={videoDetailId!} 
                           user={user} 
                           appSettings={appSettings} 
                           onBack={handleBack} 
                           onShowChannelDetail={handleShowChannelDetail}
                           previousChannelId={previousChannelId}
                       />;
            case 'workflow':
                return <WorkflowView onNavigate={handleWorkflowNavigate} />;
            case 'thumbnailAnalysis':
                return <ThumbnailAnalysisView 
                    user={user} 
                    appSettings={appSettings} 
                    onBack={handleBack}
                    savedState={thumbnailViewState}
                    onSaveState={setThumbnailViewState}
                />;
            case 'outlierAnalysis':
                return <OutlierAnalysisView
                    user={user}
                    appSettings={appSettings}
                    onBack={handleBack}
                    onShowChannelDetail={handleShowChannelDetail}
                    onShowVideoDetail={handleShowVideoDetail}
                    onUpgradeRequired={handleUpgradeRequired}
                    onUpdateUser={onUpdateUser}
                    savedState={outlierViewState}
                    onSaveState={setOutlierViewState}
                />;
            case 'abTestGame':
                return <ABTestGameView user={user} appSettings={appSettings} onBack={handleBack} />;
            case 'myChannel':
                return <MyChannelAnalytics user={user} appSettings={appSettings} />;
            case 'algorithmFinder':
                return <AlgorithmFinderView onBack={handleBack} />;
            case 'collections':
                return <CollectionView onBack={handleBack} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100 font-sans">
            {/* Header stays at the top but is sticky so it remains accessible */}
            <div className="sticky top-0 z-50">
                <Header 
                    user={user}
                    planLimit={planLimits[user.plan]}
                    onLogout={onLogout} 
                    onOpenHelpModal={handleOpenHelpModal} 
                    onShowAdmin={() => navigateTo('admin')} 
                    onNavigate={onNavigate}
                    onShowMain={() => navigateTo('main')}
                    onShowRanking={() => navigateTo('ranking')}
                    onShowWorkflow={() => navigateTo('workflow')}
                    onShowMyChannel={() => navigateTo('myChannel')}
                    currentView={view}
                    hasApiKey={hasApiKey}
                />
            </div>
            
            {/* Main content flows naturally with the window scroll */}
            <main className="flex-1 flex flex-col">
                {/* FilterBar is part of the document flow, so it scrolls away */}
                {view === 'main' && (
                    <FilterBar
                        onAnalyze={handleAnalysis} 
                        isLoading={isLoading} 
                        onOpenCompareModal={handleOpenCompareModal}
                        selectedChannelCount={Object.keys(selectedChannels).length}
                        query={query}
                        onQueryChange={setQuery}
                        mode={mode}
                        onModeChange={setMode}
                        filters={filters}
                        onFiltersChange={setFilters}
                    />
                )}
                
                {renderCurrentView()}
            </main>

            {/* Floating Action Button for Chatbot */}
            <button
                onClick={() => setIsChatOpen(prev => !prev)}
                className="fixed bottom-5 right-5 w-16 h-16 bg-blue-600 rounded-full text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 z-50"
                aria-label="Open AI Chatbot"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </button>
            <Chatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
            {isComparisonModalOpen && <ComparisonModal user={user} appSettings={appSettings} onClose={handleCloseCompareModal} initialSelectedChannels={selectedChannels} />}
            {isHelpModalOpen && <HelpModal onClose={handleCloseHelpModal} />}
            {isUpgradeModalOpen && <UpgradeModal onClose={handleCloseUpgradeModal} />}
            {isCommentModalOpen && selectedVideoForComments && (
                <CommentAnalysisModal 
                    video={selectedVideoForComments}
                    user={user}
                    appSettings={appSettings}
                    onClose={handleCloseCommentModal}
                />
            )}
        </div>
    );
};

export default Dashboard;
