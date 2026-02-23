import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Header from './Header';
import FilterBar from './FilterBar';
import ResultsTable from './ResultsTable';
import ChannelResultsTable from './ChannelResultsTable'; // Import the new component
import Spinner from './common/Spinner';
import ChannelDetailView from './ChannelDetailView';
import AdminDashboard from './AdminDashboard';
import UpgradeModal from './UpgradeModal'; 
import TopChartsView from './RankingView'; 
import WorkflowView from './WorkflowView'; 
import VideoDetailView from './VideoDetailView'; 
import ThumbnailAnalysisView from './ThumbnailAnalysisView'; 
import OutlierAnalysisView from './OutlierAnalysisView'; 
import ABTestGameView from './ABTestGameView'; 
import Chatbot from './Chatbot'; 
import MyChannelAnalytics from './MyChannelAnalytics';
import AccountSettings from './AccountSettings';
import IdentityFinderView from './IdentityFinderView';
import CollectionView from './CollectionView';
import ComparisonView from './ComparisonView';
import HelpModal from './HelpModal';
import InfluencerMarketingView from './InfluencerMarketingView';
import { logQuery, getPopularQueries, pruneQueries } from '../services/queryAnalyticsService'; 
import { fetchYouTubeData, fetchChannelSearchData } from '../services/youtubeService'; // Updated import
import type { VideoData, FilterState, User, AppSettings, PopularQuery, OutlierViewState, ThumbnailViewState, TopChartsViewState, ChannelRankingData, AnalysisMode } from '../types';
import AdAnalysis from './AdAnalysis';
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

type ViewType = 'main' | 'admin' | 'topCharts' | 'channelDetail' | 'workflow' | 'videoDetail' | 'thumbnailAnalysis' | 'outlierAnalysis' | 'myChannel' | 'abTestGame' | 'identityFinder' | 'collections' | 'comparison' | 'influencerMarketing' | 'account';
type SearchTab = 'video' | 'channel';

// Navigation State Interface for the History Stack
interface NavState {
    view: ViewType;
    params?: {
        channelId?: string | null;
        videoId?: string | null;
        previousChannelId?: string | null;
        initialTab?: 'overview' | 'similarChannels';
        initialChannelIds?: string[];
    };
}

const Dashboard: React.FC<DashboardProps> = ({ user, appSettings, onLogout, onNavigate, onUpdateUser, onUpdateAppSettings }) => {
    const [videos, setVideos] = useState<VideoData[]>([]);
    const [channelResults, setChannelResults] = useState<ChannelRankingData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isInitial, setIsInitial] = useState(true);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    
    const [view, setView] = useState<ViewType>('main');
    const [navStack, setNavStack] = useState<NavState[]>([{ view: 'main' }]);
    
    const [channelDetailId, setChannelDetailId] = useState<string | null>(null);
    const [videoDetailId, setVideoDetailId] = useState<string | null>(null);
    const [previousChannelId, setPreviousChannelId] = useState<string | null>(null);
    const [initialChannelDetailTab, setInitialChannelDetailTab] = useState<'overview' | 'similarChannels'>('overview');
    const [comparisonChannelIds, setComparisonChannelIds] = useState<string[] | null>(null);
    
    const [query, setQuery] = useState('캠핑');
    const [searchTab, setSearchTab] = useState<SearchTab>('video');
    const [filters, setFilters] = useState<FilterState>(initialFilterState);
    const [popularQueries, setPopularQueries] = useState<PopularQuery[]>([]);

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    const [outlierViewState, setOutlierViewState] = useState<OutlierViewState | null>(null);
    const [thumbnailViewState, setThumbnailViewState] = useState<ThumbnailViewState | null>(null);
    const [topChartsViewState, setTopChartsViewState] = useState<TopChartsViewState | null>(null);
    
    const [selectedChannels, setSelectedChannels] = useState<Record<string, { name: string }>>({});

    const handleChannelSelect = useCallback((channel: { id: string, name: string }, isSelected: boolean) => {
        setSelectedChannels(prev => {
            const newSelection = { ...prev };
            if (isSelected) {
                if (Object.keys(newSelection).length >= 5) {
                    alert('최대 5개의 채널만 비교할 수 있습니다. (You can only compare up to 5 channels.)');
                    return prev;
                }
                newSelection[channel.id] = { name: channel.name };
            } else {
                delete newSelection[channel.id];
            }
            return newSelection;
        });
    }, []);

    const handleShowComparison = () => {
        if (Object.keys(selectedChannels).length < 2) {
            alert('비교를 위해 2개 이상의 채널을 선택해주세요. (Please select 2 or more channels to compare.)');
            return;
        }
        navigateTo('comparison', { initialChannelIds: Object.keys(selectedChannels) });
    };

    const hasApiKey = !!appSettings.apiKeys.youtube;

    useEffect(() => {
        pruneQueries(); 
        setPopularQueries(getPopularQueries(5));
    }, []); 

    const navigateTo = useCallback((targetView: ViewType, params?: NavState['params']) => {
        if (targetView === 'admin' && !user.isAdmin) {
            console.warn("Access Denied: Non-admin user attempted to access the admin dashboard.");
            return;
        }

        setNavStack(prev => {
            const currentParams = {
                channelId: channelDetailId,
                videoId: videoDetailId,
                previousChannelId,
                initialTab: initialChannelDetailTab,
                initialChannelIds: comparisonChannelIds || undefined
            };
            return [...prev, { view: targetView, params: targetView === view ? currentParams : params }];
        });
        
        if (params?.channelId) setChannelDetailId(params.channelId);
        if (params?.videoId) setVideoDetailId(params.videoId);
        if (params?.previousChannelId !== undefined) setPreviousChannelId(params.previousChannelId);
        if (params?.initialTab) setInitialChannelDetailTab(params.initialTab);
        if (params?.initialChannelIds) setComparisonChannelIds(params.initialChannelIds);


        setView(targetView);
        window.scrollTo(0, 0);
    }, [view, channelDetailId, videoDetailId, previousChannelId, initialChannelDetailTab, comparisonChannelIds, user]);

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
            setComparisonChannelIds(params?.initialChannelIds || null);

            return newStack;
        });
    }, []);


    const handleAnalysis = useCallback(async (searchQuery: string, searchMode: SearchTab) => {
        if (user.usage.search.used >= user.usage.search.limit) {
            setIsUpgradeModalOpen(true);
            return;
        }

        logQuery(searchQuery, searchMode === 'video' ? 'keyword' : 'channel');
        setSelectedChannels({});
        setIsInitial(false);
        setError(null);
        setVideos([]);
        setChannelResults([]);

        if (!searchQuery.trim()) {
            setError("키워드 또는 채널 URL을 입력해주세요. (Please enter a keyword or channel URL.)");
            return;
        }

        if (!hasApiKey) {
            setError("시스템 API 키가 설정되지 않았습니다. 관리자에게 문의해주세요. (System API key is not set.)");
            return;
        }
        
        const apiKey = appSettings.apiKeys.youtube;
        
        onUpdateUser({ 
            usage: {
                ...user.usage,
                search: {
                    ...user.usage.search,
                    used: user.usage.search.used + 1,
                }
            } 
        });

        setIsLoading(true);
        setLoadingMessage(`'${searchQuery}'에 대한 데이터를 조회 중입니다...`);

        try {
            if (searchMode === 'channel') {
                const channelData = await fetchChannelSearchData(searchQuery, filters, apiKey!);
                setChannelResults(channelData);
            } else { // video mode
                const videoData = await fetchYouTubeData('keyword', searchQuery, filters, apiKey!);
                setVideos(videoData);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "데이터 조회에 실패했습니다.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [user, onUpdateUser, appSettings, filters, hasApiKey]);
    
    const handlePopularQuerySelect = (selectedQuery: string, selectedMode: AnalysisMode) => {
        setQuery(selectedQuery);
        setSearchTab(selectedMode === 'channel' ? 'channel' : 'video');
        handleAnalysis(selectedQuery, selectedMode === 'channel' ? 'channel' : 'video');
    };

    const sortedVideos = useMemo(() => {
        if (videos.length === 0) return [];
        
        return [...videos].sort((a, b) => {
            const sortBy = filters.sortBy;
            if (sortBy === 'publishedAt') {
                return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
            }
            const valueA = a[sortBy as keyof VideoData] as number;
            const valueB = b[sortBy as keyof VideoData] as number;
            return valueB - valueA;
        });
    }, [videos, filters.sortBy]);

    const handleCloseUpgradeModal = useCallback(() => setIsUpgradeModalOpen(false), []);

    const handleShowChannelDetail = useCallback((channelId: string, tab: 'overview' | 'similarChannels' = 'overview') => {
        if (user.usage.channelDetail.used < user.usage.channelDetail.limit) {
            onUpdateUser({ 
                usage: { 
                    ...user.usage, 
                    channelDetail: { ...user.usage.channelDetail, used: user.usage.channelDetail.used + 1 }
                }
            });
            navigateTo('channelDetail', { channelId, initialTab: tab });
        } else {
            setIsUpgradeModalOpen(true);
        }
    }, [navigateTo, user, onUpdateUser]);
    
    const handleShowVideoDetail = useCallback((videoId: string) => {
        if (user.usage.videoDetail.used < user.usage.videoDetail.limit) {
            onUpdateUser({ 
                usage: { 
                    ...user.usage, 
                    videoDetail: { ...user.usage.videoDetail, used: user.usage.videoDetail.used + 1 }
                }
            });
            navigateTo('videoDetail', { videoId, previousChannelId: channelDetailId });
        } else {
            setIsUpgradeModalOpen(true);
        }
    }, [navigateTo, channelDetailId, user, onUpdateUser]);

    const handleWorkflowNavigate = useCallback(async (featureId: string) => {
        switch (featureId) {
            case 'outliers':
                navigateTo('outlierAnalysis');
                break;
            case 'top_charts':
                navigateTo('topCharts');
                break;
            case 'thumbnail_search':
                navigateTo('thumbnailAnalysis');
                break;
            case 'ab_test':
                navigateTo('abTestGame');
                break;
            case 'identity_finder':
                navigateTo('identityFinder');
                break;
            case 'collections':
                navigateTo('collections');
                break;
            case 'influencer_marketing':
                navigateTo('influencerMarketing');
                break;
            case 'my_channel_analytics':
                navigateTo('myChannel');
                break;
            case 'channel_comparison':
                navigateTo('comparison');
                break;
            default:
                alert(`'${featureId}' 기능은 현재 준비 중입니다. (This feature is coming soon.)`);
        }
    }, [navigateTo]);

    const QuickStartView: React.FC<{
      onQuerySelect: (query: string, mode: AnalysisMode) => void;
    }> = ({ onQuerySelect }) => {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-fade-in">
              <div className="max-w-3xl w-full bg-gray-800/50 p-8 rounded-2xl border border-gray-700/50">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 mx-auto mb-4 border border-blue-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-2h4v2H10zm5.91-4.5H8.09c-.49 0-.85-.59-.57-1.02l1.9-2.92c.2-.31.54-.51.92-.51h3.32c.38 0 .72.2.92.51l1.9 2.92c.28.43-.08 1.02-.57 1.02z"/>
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-white">어떤 스토리를 찾고 계신가요? (What story are you looking for?)</h2>
                  <p className="mt-2 text-gray-400 mb-6">
                    데이터를 통해 유튜브 채널 성장의 다음 단서를 찾아보세요.<br/>키워드나 채널을 입력하여 분석을 시작할 수 있습니다.<br/>
                    (Find the next clue for your YouTube channel's growth through data.<br/>You can start by entering a keyword or channel.)
                  </p>
                  {popularQueries.length > 0 && (
                      <div>
                          <h3 className="text-sm font-semibold text-gray-500 mb-3">인기 검색어 (Popular Queries)</h3>
                          <div className="flex flex-wrap justify-center gap-2">
                              {popularQueries.map(pq => (
                                  <button
                                      key={pq.query}
                                      onClick={() => onQuerySelect(pq.query, pq.mode)}
                                      className="px-4 py-2 text-sm font-medium bg-gray-700 text-gray-200 rounded-full hover:bg-gray-600 hover:text-white transition-colors"
                                  >
                                      {pq.query}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  <div className="mt-12 pt-6 border-t border-blue-500/30 text-left">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-md border border-blue-500/30 uppercase">
                                Live API Connected
                            </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-4">
                            Content OS is now connected to the official YouTube Data API and Gemini AI.
                            <br/><span className="text-xs text-gray-500">(Content OS가 YouTube 공식 API 및 Gemini AI에 연결되었습니다.)</span>
                        </p>
                        
                        <ul className="space-y-3 text-gray-300 text-sm">
                            <li className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
                                <span className="text-blue-400 font-bold mt-0.5">1.</span>
                                <div>
                                    <b className="text-white">Real-time Data:</b> All analysis results are based on real-time data from YouTube.
                                    <br/><span className="text-gray-500 text-xs">(모든 분석 결과는 YouTube의 실시간 데이터를 기반으로 합니다.)</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
                                <span className="text-blue-400 font-bold mt-0.5">2.</span>
                                <div>
                                    <b className="text-white">AI Insights:</b> Gemini AI provides deep strategic insights for your content.
                                    <br/><span className="text-gray-500 text-xs">(Gemini AI가 콘텐츠에 대한 깊이 있는 전략적 인사이트를 제공합니다.)</span>
                                </div>
                            </li>
                        </ul>
                         <p className="mt-4 text-xs text-gray-400 text-center">Data is processed in compliance with YouTube API Services Terms of Service.</p>
                  </div>
              </div>
          </div>
      );
    };

    const DataSummaryView = ({ data }: { data: VideoData[] }) => (
        <div className="mb-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4">검색 결과 (Search Results)</h2>
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
                    <div className="p-4 md:p-6 lg:p-8 relative min-h-[60vh]">
                        {isLoading && (
                            <div className="absolute inset-0 bg-gray-900/80 flex justify-center items-center z-20 animate-fade-in">
                                <Spinner message={loadingMessage} />
                            </div>
                        )}
                        {error ? (
                            <div className="text-center text-red-400 p-4 bg-red-900/50 rounded-lg">{error}</div>
                        ) : isInitial ? (
                            <QuickStartView onQuerySelect={handlePopularQuerySelect} />
                        ) : (
                            <div className="animate-fade-in">
                                {searchTab === 'video' && videos.length > 0 && <DataSummaryView data={videos} />}
                                
                                {searchTab === 'video' && (
                                    <>
                                        <h2 className="text-xl font-bold mb-4 mt-8">영상 목록 (Video List)</h2>
                                        <ResultsTable 
                                            videos={sortedVideos} 
                                            onShowChannelDetail={handleShowChannelDetail} 
                                            onShowVideoDetail={handleShowVideoDetail}
                                            onOpenCommentModal={() => {}}
                                            selectedChannels={selectedChannels}
                                            onChannelSelect={handleChannelSelect}
                                        />
                                    </>
                                )}
                                {searchTab === 'channel' && (
                                     <>
                                        <h2 className="text-xl font-bold mb-4 mt-8">채널 목록 (Channel List)</h2>
                                        <ChannelResultsTable
                                            channels={channelResults}
                                            onShowChannelDetail={handleShowChannelDetail}
                                            selectedChannels={selectedChannels}
                                            onChannelSelect={handleChannelSelect}
                                        />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                );
            case 'admin':
                return <AdminDashboard onBack={handleBack} settings={appSettings} onUpdateSettings={onUpdateAppSettings} />;
            case 'topCharts':
                 return <TopChartsView 
                            user={user} 
                            appSettings={appSettings} 
                            onShowChannelDetail={handleShowChannelDetail} 
                            onShowVideoDetail={handleShowVideoDetail} 
                            savedState={topChartsViewState}
                            onSaveState={setTopChartsViewState}
                        />;
            case 'channelDetail':
                 return <ChannelDetailView 
                            channelId={channelDetailId!} 
                            user={user} 
                            appSettings={appSettings} 
                            onBack={handleBack} 
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
                    onUpgradeRequired={() => setIsUpgradeModalOpen(true)}
                    onUpdateUser={onUpdateUser}
                    savedState={outlierViewState}
                    onSaveState={setOutlierViewState}
                />;
            case 'abTestGame':
                return <ABTestGameView user={user} appSettings={appSettings} onBack={handleBack} />;
            case 'myChannel':
                return <MyChannelAnalytics user={user} appSettings={appSettings} onShowChannelDetail={handleShowChannelDetail} />;
            case 'identityFinder':
                return <IdentityFinderView onBack={handleBack} />;
            case 'collections':
                return <CollectionView onBack={handleBack} />;
            case 'comparison':
                return <ComparisonView 
                            user={user} 
                            appSettings={appSettings} 
                            onBack={handleBack} 
                            initialChannelIds={comparisonChannelIds || undefined}
                        />;
            case 'influencerMarketing':
                return <InfluencerMarketingView user={user} onBack={() => navigateTo('workflow')} />;
            case 'account':
                return <AccountSettings user={user} onNavigate={(target) => navigateTo('main')} onUpdateUser={onUpdateUser} />;
            default:
                return null;
        }
    };
    
    const planLimit = user.isAdmin ? Infinity : user.usage.search.limit;

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100 font-sans">
            <div className="sticky top-0 z-50">
                <Header 
                    user={user}
                    planLimit={planLimit}
                    onLogout={onLogout} 
                    onOpenChat={() => setIsChatOpen(true)} 
                    onOpenHelp={() => setIsHelpModalOpen(true)}
                    onShowAdmin={() => navigateTo('admin')} 
                    onNavigate={onNavigate}
                    onShowMain={() => navigateTo('main')}
                    onShowTopCharts={() => navigateTo('topCharts')}
                    onShowWorkflow={() => navigateTo('workflow')}
                    onShowMyChannel={() => navigateTo('myChannel')}
                    onShowComparison={() => navigateTo('comparison')}
                    currentView={view}
                />
            </div>
            
            <main className="flex-1 flex flex-col">
                {view === 'main' && (
                    <FilterBar
                        onAnalyze={handleAnalysis} 
                        isLoading={isLoading}
                        query={query}
                        onQueryChange={setQuery}
                        searchTab={searchTab}
                        onSearchTabChange={setSearchTab}
                        filters={filters}
                        onFiltersChange={setFilters}
                        selectedChannels={selectedChannels}
                        onCompare={handleShowComparison}
                    />
                )}
                
                {renderCurrentView()}
            </main>

            <button
                onClick={() => setIsChatOpen(prev => !prev)}
                className="fixed bottom-5 right-5 w-16 h-16 bg-blue-600 rounded-full text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 z-50"
                aria-label="Open AI Chatbot"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </button>
            <Chatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
            {isUpgradeModalOpen && <UpgradeModal onClose={handleCloseUpgradeModal} />}
            {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}

            <footer className="flex-shrink-0 w-full text-center p-4 mt-auto text-xs text-gray-600 border-t border-gray-800">
                <p>
                    모든 분석 결과는 참고용 가이드이며, 서비스는 이를 기반으로 한 결정에 대해 책임을 지지 않습니다. 본 서비스는 YouTube API를 사용하며{' '}
                    <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 underline">YouTube 서비스 약관</a>
                    {' '}및{' '}
                    <a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 underline">Google 개인정보처리방침</a>을 준수합니다.
                </p>
            </footer>
        </div>
    );
};

export default Dashboard;