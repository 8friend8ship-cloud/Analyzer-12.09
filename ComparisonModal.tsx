import React, { useState, useEffect } from 'react';
import { getAIComparisonInsights } from '../services/geminiService';
import { fetchChannelAnalysis } from '../services/youtubeService';
import type { VideoData, ComparisonInsights, AppSettings, ChannelVideo, ChannelSummary } from '../types';
import Spinner from './common/Spinner';

interface ComparisonModalProps {
  onClose: () => void;
  // EITHER pass full data
  channelA?: { query: string; videos: VideoData[] };
  channelB?: { query: string; videos: VideoData[] };
  // OR pass info to fetch
  channelAInfo?: { id: string; name: string };
  channelBInfo?: { id: string; name: string };
  appSettings?: AppSettings;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({ onClose, channelA, channelB, channelAInfo, channelBInfo, appSettings }) => {
  const [insights, setInsights] = useState<ComparisonInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let finalChannelA: { query: string; videos: VideoData[] };
        let finalChannelB: { query: string; videos: VideoData[] };

        if (channelA && channelB) { // Data is passed directly
          finalChannelA = channelA;
          finalChannelB = channelB;
        } else if (channelAInfo && channelBInfo && appSettings) { // Fetch data
            const apiKey = appSettings.apiKeys.youtube;
            if (!apiKey) throw new Error("API Key is missing.");

            const [channelAData, channelBData] = await Promise.all([
              fetchChannelAnalysis(channelAInfo.id, apiKey),
              fetchChannelAnalysis(channelBInfo.id, apiKey)
            ]);
            
            // FIX: Map ChannelVideo[] to VideoData[] by adding missing properties from the parent channel data, resolving the type mismatch.
            finalChannelA = {
              query: channelAData.name,
              videos: channelAData.videoList.map(v => ({
                ...v,
                channelId: channelAData.id,
                channelTitle: channelAData.name,
                subscribers: channelAData.subscriberCount,
                // Add dummy values for properties not in ChannelVideo if needed by VideoData
                engagementRate: v.engagementRate || 0,
              })) as VideoData[]
            };
            finalChannelB = {
              query: channelBData.name,
              videos: channelBData.videoList.map(v => ({
                ...v,
                channelId: channelBData.id,
                channelTitle: channelBData.name,
                subscribers: channelBData.subscriberCount,
                engagementRate: v.engagementRate || 0,
              })) as VideoData[]
            };
        } else {
            throw new Error("Insufficient props for comparison.");
        }

        const result = await getAIComparisonInsights(finalChannelA, finalChannelB);
        setInsights(result);
      } catch (err) {
        console.error("Error in ComparisonModal fetchInsights:", err);
        setError("비교 요약 생성 중 오류가 발생했습니다. (An error occurred while generating the comparison summary.)");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [channelA, channelB, channelAInfo, channelBInfo, appSettings]);

  const renderChannelSummary = (summary: ChannelSummary) => (
    <div className="bg-gray-900/50 p-4 rounded-lg">
      <h4 className="font-bold text-lg text-blue-400 mb-2">{summary.name}</h4>
      <p className="text-sm font-semibold text-gray-300 mb-1">관찰되는 특징 (Observed Characteristics):</p>
      <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
        {summary.observedCharacteristics.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl text-gray-200 flex flex-col max-h-[90vh]" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">채널 비교 요약 (Channel Comparison Summary)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {isLoading && <div className="flex justify-center items-center min-h-[300px]"><Spinner /></div>}
          {error && <div className="text-center text-red-400">{error}</div>}
          {insights && !isLoading && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-yellow-400 mb-2">종합 요약 및 추천 전략 (Overall Summary & Recommendation)</h3>
                <p className="text-gray-300 leading-relaxed mb-2">{insights.summary}</p>
                <p className="text-sm bg-blue-900/30 text-blue-300 p-3 rounded-md border border-blue-500/30">
                  <strong>추천 (Recommendation):</strong> {insights.recommendation}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderChannelSummary(insights.channelA_summary)}
                {renderChannelSummary(insights.channelB_summary)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;