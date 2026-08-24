import React, { useState, useEffect, useRef } from 'react';
import type { VideoData } from '../types';
import { getAITopicKeywords } from '../services/geminiService';

interface AdAnalysisProps {
  videos: VideoData[];
}

const SmallSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const fallbackKeywords = (videos: VideoData[]): string[] => {
  const stop = new Set(['영상','유튜브','youtube','shorts','쇼츠','official','video','feat','추천','리뷰']);
  const counts = new Map<string, number>();
  (videos || []).forEach(video => {
    String(video.title || '')
      .toLowerCase()
      .replace(/[^0-9a-zA-Z가-힣ぁ-んァ-ヶ一-龥\s]/g, ' ')
      .split(/\s+/)
      .map(v => v.trim())
      .filter(v => v.length >= 2 && !stop.has(v))
      .forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([term]) => term);
};

const AdAnalysis: React.FC<AdAnalysisProps> = ({ videos }) => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      if (!videos || videos.length === 0) return;
    }

    const fetchKeywords = async () => {
      if (videos.length === 0) {
        setKeywords([]);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const topicKeywords = await getAITopicKeywords(videos);
        const resolved = Array.isArray(topicKeywords) && topicKeywords.length ? topicKeywords : fallbackKeywords(videos);
        setKeywords(resolved);
        if (!resolved.length) setError('현재 표본이 적어 추천 키워드를 만들 수 없습니다. 백데이터 수집 후 자동 갱신됩니다.');
      } catch (err) {
        console.warn('[ContentOS] topic keyword primary analysis failed; local fallback used:', err);
        const resolved = fallbackKeywords(videos);
        setKeywords(resolved);
        setError(resolved.length ? null : '현재 표본이 적어 추천 키워드를 만들 수 없습니다. 백데이터 수집 후 자동 갱신됩니다.');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchKeywords();
  }, [videos]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full"><SmallSpinner /></div>;
    }
    if (keywords.length > 0) {
      return (
        <div className="flex flex-wrap gap-2 justify-center">
          {keywords.map(kw => (
            <span key={kw} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-md">{kw}</span>
          ))}
        </div>
      );
    }
    if (error) {
      return <div className="text-center text-amber-300 p-4 text-xs">{error}</div>;
    }
    return <div className="text-center text-sm text-gray-500">검색 결과가 있으면 자동으로 추천을 시작합니다.<br/>(Recommendations will start automatically with search results.)</div>;
  };

  return (
    <div className="bg-gray-900/50 p-4 rounded-lg h-full flex flex-col">
      <h4 className="font-semibold text-center mb-3 text-gray-300">Content OS 토픽 키워드 제안 (Topic Keywords)<br/><span className="text-xs font-normal text-gray-400">(상위 {videos.length}개 영상 기준) (Based on top {videos.length} videos)</span></h4>
      <div className="flex-grow min-h-[50px] flex items-center justify-center py-2">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdAnalysis;