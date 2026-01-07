

import React, { useState, useEffect } from 'react';
import Spinner from './common/Spinner';
import { fetchVideoComments } from '../services/youtubeService';
import { getAICommentInsights } from '../services/geminiService';
// FIX: Centralized types in types.ts
import type { AppSettings, User } from '../types';
import type { CommentInsights } from '../types';

interface CommentAnalysisModalProps {
  video: { id: string; title: string };
  user: User;
  appSettings: AppSettings;
  onClose: () => void;
}

const ThumbsUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.085a2 2 0 00-1.736.97l-2.714 4z" /></svg>;
const ThumbsDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.085a2 2 0 001.736-.97l2.714-4z" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6.5 17l-1-1M19.5 7l-1-1M5.5 7l1-1M18.5 17l1-1m-6-15v4m-2-4h4m5 10l-1 1M11 21v-4m2 4h-4m1-12l1 1M13 3v4m5.5 7l-1 1M11 5l1 1" /></svg>;


const CommentAnalysisModal: React.FC<CommentAnalysisModalProps> = ({ video, user, appSettings, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [insights, setInsights] = useState<CommentInsights | null>(null);

    useEffect(() => {
        const analyzeComments = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const apiKey = appSettings.apiKeys.youtube;

                if (!apiKey) {
                    throw new Error("시스템 YouTube API 키가 설정되지 않았습니다. 관리자에게 문의하여 키를 등록해주세요.");
                }

                const comments = await fetchVideoComments(video.id, apiKey);
                if (comments.length === 0) {
                    setInsights({
                        summary: "분석할 댓글이 없습니다. 영상에 댓글이 없거나 댓글 수집에 실패했을 수 있습니다.",
                        positivePoints: [],
                        negativePoints: [],
                    });
                    setIsLoading(false);
                    return;
                }
                const aiInsights = await getAICommentInsights(comments);
                setInsights(aiInsights);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "댓글 분석에 실패했습니다. API 키 할당량을 확인해주세요.";
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        analyzeComments();
    }, [video.id, user, appSettings]);

    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl text-gray-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-700">
                    <div>
                        <h2 className="text-lg font-semibold">AI 댓글 분석</h2>
                        <p className="text-xs text-gray-400 truncate max-w-md" title={video.title}>{video.title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 min-h-[300px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full"><Spinner /></div>
                    ) : error ? (
                        <div className="text-center text-red-400 bg-red-900/30 p-4 rounded-md">{error}</div>
                    ) : insights && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-yellow-400"><SparklesIcon /> AI 요약</h3>
                                <p className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-md">{insights.summary}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-green-400"><ThumbsUpIcon /> 긍정적 반응</h3>
                                    <ul className="space-y-2 list-inside">
                                        {insights.positivePoints.map((point, i) => (
                                            <li key={i} className="text-sm p-2 bg-green-900/30 rounded-md border-l-4 border-green-500">{point}</li>
                                        ))}
                                        {insights.positivePoints.length === 0 && <li className="text-sm text-gray-500 p-2 bg-gray-900/30 rounded-md">긍정적인 반응이 없습니다.</li>}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-red-400"><ThumbsDownIcon /> 부정적/개선 제안</h3>
                                    <ul className="space-y-2 list-inside">
                                        {insights.negativePoints.map((point, i) => (
                                            <li key={i} className="text-sm p-2 bg-red-900/30 rounded-md border-l-4 border-red-500">{point}</li>
                                        ))}
                                        {insights.negativePoints.length === 0 && <li className="text-sm text-gray-500 p-2 bg-gray-900/30 rounded-md">부정적인 반응이 없습니다.</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                 <div className="flex-shrink-0 p-4 border-t border-gray-700 text-right">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentAnalysisModal;