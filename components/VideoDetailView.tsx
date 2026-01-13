
import React, { useState, useEffect, useMemo } from 'react';
import { fetchVideoDetails, analyzeVideoDeeply } from '../services/youtubeService';
import { addToCollection, createVideoCollectionItem } from '../services/collectionService';
import type { VideoDetailData, User, AppSettings, VideoComment, AI6StepReport } from '../types';
import Spinner from './common/Spinner';
import HelpTooltip from '../components/common/HelpTooltip';
import BenchmarkChart from './charts/BenchmarkChart';
import AIReportView from './AIReportView';
import Button from './common/Button';

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
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toLocaleString();
};

const StatItem: React.FC<{ icon: string; label: React.ReactNode; value: React.ReactNode; highlight?: boolean }> = ({ icon, label, value, highlight }) => (
    <div className="flex items-center gap-2 text-sm">
        <span className="text-xl">{icon}</span>
        <div>
            <p className="text-gray-400 flex items-center">{label}</p>
            <div className={`font-bold text-lg ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</div>
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
                setError("시스템 API 키가 설정되지 않았습니다. (System API key is not set.)");
                setIsLoading(false);
                return;
            }
            try {
                const result = await fetchVideoDetails(videoId, apiKey);
                setData(result);
                addToCollection(createVideoCollectionItem(result));
            } catch (err) {
                setError(err instanceof Error ? err.message : "비디오 정보를 불러올 수 없습니다. (Could not load video data.)");
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
            const { commentInsights, deepDiveReport } = await analyzeVideoDeeply(data, apiKey!);
            setData(prev => prev ? {
                ...prev,
                commentInsights,
                deepDiveReport
            } : null);
            setHasAnalyzed(true);
        } catch (err) {
            console.error("Analysis failed", err);
            setError("AI 분석 중 오류가 발생했습니다. (AI analysis failed.)");
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isLoading) {
        return <div className="h-full flex items-center justify-center py-20"><Spinner /></div>;
    }
    if (error && !isAnalyzing) { // Don't show main error if analysis fails, handle it inline
        return <div className="p-8 text-center text-red-400">
            <p>{error}</p>
            <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 rounded-md">← 뒤로 가기 (Back)</button>
        </div>;
    }
    if (!data) {
        return <div className="p-8 text-center text-gray-500">
            <p>데이터가 없습니다. (No data.)</p>
            <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 rounded-md">← 뒤로 가기 (Back)</button>
        </div>;
    }

    const { title, publishedAt, channelTitle, channelId, viewCount, likeCount, commentCount, commentInsights, comments, deepDiveReport, thumbnailUrl, durationMinutes } = data;
    
    const viewCountTooltipText = "YouTube Data API를 통해 제공되는 조회수입니다. 실시간 집계와 약간의 차이가 있을 수 있습니다.\n\n[For Reviewers]\nThis is the view count provided by the YouTube Data API. There may be a slight difference from real-time counts.";

    return (
        <div className="p-4 md:p-6 lg:p-8">
             <button onClick={onBack} className="mb-4 px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
              ← 뒤로 가기 (Back)
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
                    {data.embeddable ? (
                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                            <div dangerouslySetInnerHTML={{ __html: data.embedHtml.replace(/width="\d+"/, 'width="100%"').replace(/height="\d+"/, 'height="100%"') }} className="w-full h-full" />
                        </div>
                    ) : (
                        <div className="aspect-video bg-black rounded-lg flex items-center justify-center text-gray-400">
                            <p>이 영상은 퍼가기가 허용되지 않았습니다. (Embedding disabled for this video.)</p>
                        </div>
                    )}

                    {data.benchmarks && data.benchmarks.length > 0 && (
                        <div className="bg-gray-800/60 p-4 rounded-lg">
                            <h3 className="font-semibold text-lg mb-2 text-gray-300 flex items-center">
                               <span>조회수 비교 (View Comparison)</span>
                               <HelpTooltip 
                                    text="콘텐츠 OS가 유사 카테고리/키워드의 상위 성과 영상들을 자체 기준으로 선정하여, 현재 영상의 조회수와 비교하는 참고용 차트입니다. YouTube의 공식 데이터가 아닙니다.\n\n[For Reviewers]\nThis is a reference chart where Contents OS selects top-performing videos from similar categories/keywords based on its own criteria and compares their view counts to the current video. This is not official data from YouTube." 
                                />
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">현재 영상의 조회수를 유사 영상과 비교합니다. (Compares the current video's views with similar videos.)</p>
                            <BenchmarkChart video={data} />
                        </div>
                    )}
                    
                    {!hasAnalyzed ? (
                        <div className="bg-gray-800/40 p-8 rounded-lg border border-dashed border-gray-600 flex flex-col items-center justify-center text-center">
                            {isAnalyzing ? (
                                <div className="py-8">
                                    <Spinner message="AI가 영상 전략과 댓글 여론을 심층 분석하고 있습니다... (AI is analyzing...)" />
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold text-white mb-2">AI 영상 심층 분석 (AI Video Deep-Dive)</h3>
                                    <p className="text-gray-400 mb-6 max-w-md">
                                        데이터와 댓글을 통해 시청자들이 반응한 포인트를 분석하고, 다음 콘텐츠를 위한 인사이트를 얻어보세요.
                                    </p>
                                    <Button onClick={handleStartAnalysis}>
                                        Start AI Analysis
                                    </Button>
                                     {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
                                </>
                            )}
                        </div>
                    ) : (
                        hasAnalyzed && deepDiveReport && (
                            <div className="animate-fade-in">
                                <AIReportView report={deepDiveReport} type="video" />
                            </div>
                        )
                    )}
                </div>
                <div className="lg:col-span-1 space-y-6">
                     <div className="bg-gray-800/60 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                           <StatItem icon="👁️" label={<><span title="조회수">Views</span> <HelpTooltip text={viewCountTooltipText} /></>} value={formatNumber(viewCount)} />
                           <StatItem icon="👍" label={<span title="좋아요">Likes</span>} value={formatNumber(likeCount)} />
                           <StatItem icon="💬" label={<span title="댓글">Comments</span>} value={formatNumber(commentCount)} />
                           <StatItem icon="🕒" label={<span title="영상 길이">Duration</span>} value={`${Math.round(durationMinutes)} min`} />
                        </div>
                     </div>
                    {commentInsights && hasAnalyzed && (
                        <div className="bg-gray-800/60 p-4 rounded-lg animate-fade-in">
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-yellow-400">AI Comment Summary</h3>
                            <p className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-md mb-4">{commentInsights.summary}</p>
                            
                            <div className="space-y-3">
                                <div>
                                    <h4 className="font-semibold mb-1 text-green-400">Pros</h4>
                                    <ul className="space-y-1">
                                        {commentInsights.positivePoints.length > 0 ? commentInsights.positivePoints.map((point, i) => (
                                            <li key={i} className="text-xs p-2 bg-green-900/30 rounded-md border-l-2 border-green-500">{point}</li>
                                        )) : <li className="text-xs text-gray-500">No positive feedback found.</li>}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1 text-red-400">Cons / Suggestions</h4>
                                    <ul className="space-y-1">
                                        {commentInsights.negativePoints.length > 0 ? commentInsights.negativePoints.map((point, i) => (
                                            <li key={i} className="text-xs p-2 bg-red-900/30 rounded-md border-l-2 border-red-500">{point}</li>
                                        )) : <li className="text-xs text-gray-500">No negative feedback found.</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <h2 className="text-xl font-bold mb-4">Comments</h2>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {comments.length > 0 ? (
                                comments.map((comment, i) => <CommentCard key={i} comment={comment} />)
                            ) : (
                                <p className="text-center text-gray-500 py-8">No comments.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoDetailView;
