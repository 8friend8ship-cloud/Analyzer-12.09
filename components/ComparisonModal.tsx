
import React, { useState, useCallback, useEffect } from 'react';
import { fetchChannelAnalysis } from '../services/youtubeService';
import { getAIComparisonInsights } from '../services/geminiService';
import type { ChannelAnalysisData, ComparisonInsights, ChannelVideo, User, AppSettings } from '../types';
import Spinner from './common/Spinner';

interface ComparisonModalProps {
  onClose: () => void;
  initialSelectedChannels: Record<string, { name: string }>;
  user: User;
  appSettings: AppSettings;
}

const formatNumber = (num: number): string => {
  if (num >= 10_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 10_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
};

const SmallSpinner = () => (
    <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const ComparisonModal: React.FC<ComparisonModalProps> = ({ onClose, initialSelectedChannels, user, appSettings }) => {
  const [channelA, setChannelA] = useState<ChannelAnalysisData | null>(null);
  const [channelB, setChannelB] = useState<ChannelAnalysisData | null>(null);

  const [channelAId, setChannelAId] = useState<string | null>(null);
  const [channelBId, setChannelBId] = useState<string | null>(null);

  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const [errorA, setErrorA] = useState<string | null>(null);
  const [errorB, setErrorB] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('기본 정보');
  
  const [comparisonInsights, setComparisonInsights] = useState<ComparisonInsights | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  
  const selectedChannelOptions = Object.entries(initialSelectedChannels).map(([id, data]: [string, { name: string }]) => ({ id, name: data.name }));

  // Pre-select first two channels from the list
  useEffect(() => {
    if (selectedChannelOptions.length > 0 && !channelAId) {
        setChannelAId(selectedChannelOptions[0].id);
    }
    if (selectedChannelOptions.length > 1 && !channelBId) {
        setChannelBId(selectedChannelOptions[1].id);
    }
  }, [initialSelectedChannels]);


  const handleFetchChannel = useCallback(async (channelId: string, channelSetter: React.Dispatch<React.SetStateAction<ChannelAnalysisData | null>>, loadingSetter: React.Dispatch<React.SetStateAction<boolean>>, errorSetter: React.Dispatch<React.SetStateAction<string | null>>) => {
    if (!channelId) {
      channelSetter(null);
      return;
    };

    loadingSetter(true);
    errorSetter(null);
    setComparisonInsights(null);

    const apiKey = appSettings.apiKeys.youtube;

    if (!apiKey) {
        errorSetter("시스템 API 키를 설정해주세요.");
        loadingSetter(false);
        return;
    }

    try {
      const details = await fetchChannelAnalysis(channelId, apiKey);
      channelSetter(details);
    } catch (err) {
      errorSetter(err instanceof Error ? err.message : '채널 정보를 불러오는데 실패했습니다.');
      channelSetter(null);
    } finally {
      loadingSetter(false);
    }
  }, [appSettings]);
  
  useEffect(() => {
      if (channelAId) handleFetchChannel(channelAId, setChannelA, setLoadingA, setErrorA);
  }, [channelAId, handleFetchChannel]);
  
  useEffect(() => {
      if (channelBId) handleFetchChannel(channelBId, setChannelB, setLoadingB, setErrorB);
  }, [channelBId, handleFetchChannel]);
  
  const comparisonMetrics = [
    { key: 'subscriberCount', label: '구독자 수' },
    { key: 'totalVideos', label: '총 업로드 수' },
    { key: 'totalViews', label: '총 조회수' },
    { key: 'recentUploads', label: '최근 30일 업로드' },
  ];

  const renderMetric = (channel: ChannelAnalysisData | null, key: string) => {
    if (!channel) return <span className="text-gray-500">-</span>;
    switch (key) {
      case 'subscriberCount':
      case 'totalViews':
      case 'totalVideos':
        return formatNumber(channel[key as keyof ChannelAnalysisData] as number);
      case 'recentUploads':
        return `${channel.overview.uploadPattern.last30Days} 개`;
      default:
        return '-';
    }
  };
  
  const tabs = ['기본 정보', '최근 영상'];
  
  const VideoItem: React.FC<{video: ChannelVideo}> = ({ video }) => (
    <div className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-700/50">
      <img src={video.thumbnailUrl} alt={video.title} className="w-24 h-[54px] rounded object-cover flex-shrink-0" />
      <div className="flex-grow">
        <p className="text-xs font-semibold line-clamp-2 leading-snug">{video.title}</p>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
          <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
          <span>조회 {formatNumber(video.viewCount)}</span>
        </div>
      </div>
    </div>
  );
  
  const renderRecentVideos = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-center mb-2">{channelA?.name || '채널 A'}</h3>
        <div className="space-y-2">
          {channelA ? channelA.videoList.slice(0, 5).map(v => <VideoItem key={v.id} video={v}/>) : <p className="text-center text-gray-500 py-4">데이터 없음</p>}
        </div>
      </div>
       <div>
        <h3 className="font-semibold text-center mb-2">{channelB?.name || '채널 B'}</h3>
        <div className="space-y-2">
          {channelB ? channelB.videoList.slice(0, 5).map(v => <VideoItem key={v.id} video={v}/>) : <p className="text-center text-gray-500 py-4">데이터 없음</p>}
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl text-gray-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">채널 비교</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {/* Inputs */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
                <label htmlFor="channel-a-select" className="block text-sm font-medium text-gray-400 mb-1">채널 1 선택</label>
                <select 
                    id="channel-a-select"
                    value={channelAId || ''} 
                    onChange={e => setChannelAId(e.target.value)}
                    className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                    disabled={selectedChannelOptions.length === 0}
                >
                    <option value="" disabled>-- 목록에서 선택 --</option>
                    {selectedChannelOptions.map(ch => (
                        <option key={ch.id} value={ch.id} disabled={ch.id === channelBId}>
                            {ch.name}
                        </option>
                    ))}
                </select>
                {errorA && <p className="text-red-400 text-xs mt-1">{errorA}</p>}
            </div>
            <div>
                 <label htmlFor="channel-b-select" className="block text-sm font-medium text-gray-400 mb-1">채널 2 선택</label>
                <select 
                    id="channel-b-select"
                    value={channelBId || ''}
                    onChange={e => setChannelBId(e.target.value)}
                    className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                    disabled={selectedChannelOptions.length === 0}
                >
                    <option value="" disabled>-- 목록에서 선택 --</option>
                    {selectedChannelOptions.map(ch => (
                        <option key={ch.id} value={ch.id} disabled={ch.id === channelAId}>
                            {ch.name}
                        </option>
                    ))}
                </select>
                 {errorB && <p className="text-red-400 text-xs mt-1">{errorB}</p>}
            </div>
        </div>

        {/* Tabs */}
        <div className="px-4 border-b border-gray-700">
          <nav className="flex space-x-4">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 font-medium text-sm rounded-t-md ${activeTab === tab ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] min-h-[300px]">
          {activeTab === '기본 정보' && (
            <table className="w-full text-sm text-center">
              <thead>
                <tr>
                  <th className="w-1/3 py-2 text-left text-gray-400 font-normal">비교 항목</th>
                  <th className="w-1/3 py-2">
                    {loadingA ? <div className="h-20 flex justify-center items-center"><SmallSpinner/></div> : channelA ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={channelA.thumbnailUrl} alt={channelA.name} className="w-12 h-12 rounded-full" />
                        <span className="font-semibold">{channelA.name}</span>
                      </div>
                    ) : <div className="h-20"></div>}
                  </th>
                  <th className="w-1/3 py-2">
                    {loadingB ? <div className="h-20 flex justify-center items-center"><SmallSpinner/></div> : channelB ? (
                       <div className="flex flex-col items-center gap-2">
                        <img src={channelB.thumbnailUrl} alt={channelB.name} className="w-12 h-12 rounded-full" />
                        <span className="font-semibold">{channelB.name}</span>
                      </div>
                    ) : <div className="h-20"></div>}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {comparisonMetrics.map(({ key, label }) => (
                  <tr key={key}>
                    <td className="py-3 text-left text-gray-400">{label}</td>
                    <td className="py-3 font-medium">{renderMetric(channelA, key as keyof ChannelAnalysisData)}</td>
                    <td className="py-3 font-medium">{renderMetric(channelB, key as keyof ChannelAnalysisData)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === '최근 영상' && renderRecentVideos()}
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
