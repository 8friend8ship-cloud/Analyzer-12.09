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

const AdAnalysis: React.FC<AdAnalysisProps> = ({ videos }) => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
    // Skip the first render effect, only run on subsequent video changes
    if (!isMounted.current) {
      isMounted.current = true;
      if (videos && videos.length > 0) {
        // Run on initial load if videos are already present
      } else {
        return;
      }
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
        setKeywords(topicKeywords);
      } catch (err) {
        setError("키워드 추천 생성에 실패했습니다. (Failed to generate keyword recommendations.)");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchKeywords();
  }, [videos]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full"><SmallSpinner /></div>;
    }
    if (error) {
      return <div className="text-center text-red-400 p-4 text-xs">{error}</div>;
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
    if (videos.length > 0) {
         return <div className="flex justify-center items-center h-full"><SmallSpinner /></div>;
    }
    return <div className="text-center text-sm text-gray-500">검색 결과가 있으면 자동으로 추천을 시작합니다.<br/>(Recommendations will start automatically with search results.)</div>;
  };

  return (
    <div className="bg-gray-900/50 p-4 rounded-lg h-full flex flex-col">
      <h4 className="font-semibold text-center mb-3 text-gray-300">Content OS 토픽 키워드 제안 (Topic Keywords)<br/><span className="text-xs font-normal text-gray-400">(상위 {videos.length}개 영상 기준) (Based on top {videos.length} videos)</span></h4>
      <div className="flex-grow min-h-[50px] flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdAnalysis;