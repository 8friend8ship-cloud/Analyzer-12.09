import React, { useState, useEffect } from 'react';
import Spinner from './common/Spinner';
import InsightCard from './InsightCard';
import { getAIInsights } from '../services/geminiService';
import type { VideoData, AIInsights, AnalysisMode } from '../types';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: VideoData[];
  query: string;
  mode: AnalysisMode;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, videos, query, mode }) => {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchInsights = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await getAIInsights(videos, query, mode);
          setInsights(result);
        } catch (err) {
          setError('Content OS 분석 중 오류가 발생했습니다. (An error occurred during Content OS analysis.)');
        } finally {
          setIsLoading(false);
        }
      };
      fetchInsights();
    }
  }, [isOpen, videos, query, mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl text-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">'{query}' 데이터 요약 및 제안 (Data Summary & Suggestions)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        <div className="p-6 min-h-[300px]">
          {isLoading && <div className="flex justify-center items-center h-full"><Spinner /></div>}
          {error && <div className="text-center text-red-400">{error}</div>}
          {insights && !isLoading && <InsightCard insights={insights} />}
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;