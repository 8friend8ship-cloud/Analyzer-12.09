
import React, { useState, useEffect } from 'react';
import { fetchVideoDetails, analyzeVideoDeeply } from '../services/youtubeService';
import { addToCollection, createVideoCollectionItem } from '../services/collectionService';
import type { VideoDetailData, User, AppSettings, VideoComment } from '../types';
import Spinner from './common/Spinner';

interface VideoDetailViewProps {
  videoId: string;
  user: User;
  appSettings: AppSettings;
  onBack: () => void;
  onShowChannelDetail: (channelId: string) => void;
  previousChannelId: string | null;
}

const formatNumber = (num: number): string => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString();
};

const StatItem: React.FC<{ icon: string; label: string; value: string; highlight?: boolean }> = ({ icon, label, value, highlight }) => (
    <div className="flex items-center gap-2 text-sm">
        <span className="text-xl">{icon}</span>
        <div>
            <p className="text-gray-400">{label}</p>
            <p className={`font-bold text-lg ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</p>
        </div>
    </div>
);

const CommentCard: React.FC<{ comment: VideoComment }> = ({ comment }) => (
    <div className="p-3 bg-gray-900/50 rounded-lg">
        <div className="flex justify-between items-center mb-1">
            <p className="font-semibold text-sm text-gray-300">{comment.author}</p>
            <p className="text-xs text-gray-500">{new Date(comment.publishedAt).toLocaleDateString()}</p>
        </div>
        <p className="text-sm text-gray-300 mb-2">{comment.text}</p>
        <p className="text-xs text-gray-400">👍 {formatNumber(comment.likeCount)}</p>
    </div>
);

const InsightSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50">
        <h3 className="font-semibold text-xl mb-4 flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <span className="text-blue-300">{title}</span>
        </h3>
        {children}
    </div>
);


const VideoDetailView: React.FC<VideoDetailViewProps> = ({ videoId, user, appSettings, onBack, onShowChannelDetail, previousChannelId }) => {
    const [data, setData] = useState<VideoDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            const apiKey = appSettings.apiKeys.youtube;
              
            if (!apiKey) {
                setError("시스템 API 키가 설정되지 않았습니다.");
                setIsLoading(false);
                return;
            }
            try {
                const result = await fetchVideoDetails(videoId, apiKey);
                setData(result);
                addToCollection(createVideoCollectionItem(result));
            } catch (err) {
                setError(err instanceof Error ? err.message : "비디오 정보를 불러올 수 없습니다.");
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [videoId, user, appSettings]);

    const handleStartAnalysis = async () => {
        if (!data) return;
        
        setIsAnalyzing(true);
        const apiKey = appSettings.apiKeys.youtube;
        
        try {
            const { commentInsights, deepDiveInsights } = await analyzeVideoDeeply(data, apiKey!);
            setData(prev => prev ? {
                ...prev,
                commentInsights,
                deepDiveInsights
            } : null);
            setHasAnalyzed(true);
        } catch (err) {
            console.error("Analysis failed", err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isLoading) {
        return <div className="h-full flex items-center justify-center py-20"><Spinner /></div>;
    }
    if (error) {
        return <div className="p-8 text-center text-red-400">
            <p>{error}</p>
            <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 rounded-md">← 뒤로 가기</button>
        </div>;
    }
    if (!data) {
        return <div className="p-8 text-center text-gray-500">
            <p>데이터가 없습니다.</p>
            <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 rounded-md">← 뒤로 가기</button>
        </div>;
    }

    const { title, publishedAt, channelTitle, channelId, viewCount, likeCount, commentCount, commentInsights, comments, deepDiveInsights, thumbnailUrl, durationMinutes } = data;
    
    return (
        <div className="p-4 md:p-6 lg:p-8">
             <button onClick={onBack} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
              ← 뒤로 가기
            </button>
            
            <header className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <button onClick={() => onShowChannelDetail(channelId)} className="font-semibold hover:text-white transition-colors">{channelTitle}</button>
                    <span>{new Date(publishedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <a href={`https://www.youtube.com/watch?v=${data.id}`} target="_blank" rel="noopener noreferrer" className="block group aspect-video bg-black rounded-lg overflow-hidden border border-gray-700/50">
                            <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        </a>
                        <a 
                            href={`https://www.youtube.com/watch?v=${data.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            YouTube에서 시청하기
                        </a>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-800/60 rounded-lg">
                        <StatItem icon="👁️" label="조회수" value={formatNumber(viewCount)} />
                        <StatItem icon="👍" label="좋아요" value={formatNumber(likeCount)} />
                        <StatItem icon="💬" label="댓글" value={formatNumber(commentCount)} />
                        <StatItem icon="🕒" label="영상 길이" value={`${Math.floor(durationMinutes)}분`} />
                    </div>

                    {!hasAnalyzed ? (
                        <div className="bg-gray-800/40 p-8 rounded-lg border border-gray-700/50 flex flex-col items-center justify-center text-center">
                            {isAnalyzing ? (
                                <div className="py-8">
                                    <Spinner message="AI가 영상 전략과 댓글 여론을 심층 분석하고 있습니다... (약 20~40초 소요)" />
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold text-white mb-2">🚀 AI 심층 분석 & 전략 리포트</h3>
                                    <p className="text-gray-400 mb-6 max-w-md">
                                        성공 요인, 시청자 페르소나, 이탈 방지 전략, 댓글 여론 분석 등<br/>
                                        전문적인 인사이트를 생성합니다.
                                    </p>
                                    <button 
                                        onClick={handleStartAnalysis}
                                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-full shadow-lg transform transition hover:scale-105"
                                    >
                                        AI 심층 분석 시작
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="animate-fade-in space-y-6">
                            <InsightSection title="주제 발굴 및 성공 요인 분석" icon="💡">
                                <p className="text-sm text-gray-300 mb-3">{deepDiveInsights.topicAnalysis.summary}</p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                                    {deepDiveInsights.topicAnalysis.successFactors.map((factor, i) => <li key={i}>{factor}</li>)}
                                </ul>
                            </InsightSection>

                            <InsightSection title="시청자 심층 분석 (AI 추정)" icon="👥">
                                <p className="text-sm text-gray-300 mb-3">{deepDiveInsights.audienceAnalysis.summary}</p>
                                <div>
                                    <h4 className="font-semibold text-sm text-green-400 mb-1">시청자 흥미 유발점</h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                                        {deepDiveInsights.audienceAnalysis.engagementPoints.map((point, i) => <li key={i}>{point}</li>)}
                                    </ul>
                                </div>
                            </InsightSection>
                            
                            <InsightSection title="성과 지표 심층 분석 (AI 추정)" icon="📊">
                                <p className="text-sm text-gray-300 mb-3">{deepDiveInsights.performanceAnalysis.summary}</p>
                                <div className="text-sm space-y-1">
                                    <p><strong>주요 트래픽 소스:</strong> {deepDiveInsights.performanceAnalysis.trafficSources.join(', ')}</p>
                                    <p><strong>구독자 증가 기여도:</strong> {deepDiveInsights.performanceAnalysis.subscriberImpact}</p>
                                </div>
                            </InsightSection>

                            <InsightSection title="시청 유지율 분석 및 개선 전략" icon="📈">
                                <p className="text-sm text-gray-300 mb-4">{deepDiveInsights.retentionStrategy.summary}</p>
                                <div className="space-y-4">
                                    {deepDiveInsights.retentionStrategy.improvementPoints.map((item, index) => (
                                        <div key={index} className="bg-gray-900/50 p-4 rounded-lg border-l-4 border-blue-500">
                                            <h4 className="font-bold text-base text-white">{item.point}</h4>
                                            <p className="text-xs text-gray-400 mt-1 mb-3">"{item.reason}"</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                <div>
                                                    <p className="font-semibold text-purple-400 mb-1">🎬 제작 전략</p>
                                                    <p className="text-gray-300">{item.productionTip}</p>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-orange-400 mb-1">✂️ 편집 전략</p>
                                                    <p className="text-gray-300">{item.editingTip}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </InsightSection>

                            <InsightSection title="결론: AI 추천 성장 전략" icon="🚀">
                                <p className="text-sm text-gray-300 mb-3"><strong>콘텐츠 전략:</strong> {deepDiveInsights.strategicRecommendations.contentStrategy}</p>
                                <p className="text-sm text-gray-300 mb-3"><strong>채널 성장 전략:</strong> {deepDiveInsights.strategicRecommendations.growthStrategy}</p>
                                <div>
                                    <h4 className="font-semibold text-sm text-yellow-400 mb-1">추천 신규 주제</h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                                        {deepDiveInsights.strategicRecommendations.newTopics.map((topic, i) => <li key={i}>{topic}</li>)}
                                    </ul>
                                </div>
                            </InsightSection>
                        </div>
                    )}
                </div>
                <div className="lg:col-span-1 space-y-6">
                    {hasAnalyzed && (
                        <div className="bg-gray-800/60 p-4 rounded-lg animate-fade-in">
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-yellow-400">🤖 AI 댓글 요약</h3>
                            <p className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-md mb-4">{commentInsights.summary}</p>
                            
                            <div className="space-y-3">
                                <div>
                                    <h4 className="font-semibold mb-1 text-green-400">긍정적 반응</h4>
                                    <ul className="space-y-1">
                                        {commentInsights.positivePoints.map((point, i) => (
                                            <li key={i} className="text-xs p-2 bg-green-900/30 rounded-md border-l-2 border-green-500">{point}</li>
                                        ))}
                                        {commentInsights.positivePoints.length === 0 && <li className="text-xs text-gray-500">긍정적인 반응이 없습니다.</li>}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1 text-red-400">부정적/개선 제안</h4>
                                    <ul className="space-y-1">
                                        {commentInsights.negativePoints.map((point, i) => (
                                            <li key={i} className="text-xs p-2 bg-red-900/30 rounded-md border-l-2 border-red-500">{point}</li>
                                        ))}
                                        {commentInsights.negativePoints.length === 0 && <li className="text-xs text-gray-500">부정적인 반응이 없습니다.</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <h2 className="text-xl font-bold mb-4">댓글 목록</h2>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {comments.length > 0 ? (
                                comments.map((comment, i) => <CommentCard key={i} comment={comment} />)
                            ) : (
                                <p className="text-center text-gray-500 py-8">댓글이 없습니다.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoDetailView;