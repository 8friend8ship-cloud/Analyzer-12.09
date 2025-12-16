
// This component has been repurposed to act as the main Results Table
import React, { useState } from 'react';
import type { VideoData } from '../types';
import { COUNTRY_FLAGS } from '../types';

interface ResultsTableProps {
  videos: VideoData[];
  onShowChannelDetail: (channelId: string) => void;
  onShowVideoDetail: (videoId: string) => void;
  onOpenCommentModal: (video: {id: string, title: string}) => void;
  selectedChannels: Record<string, { name: string }>;
  onChannelSelect: (channel: { id: string, name: string }, isSelected: boolean) => void;
}

// --- SVG Icons for metrics ---
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const FireIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 15.5 5.5 15.5 9c0 .333-.034.654-.1 1" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ThumbsUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.085a2 2 0 00-1.736.97l-2.714 4z" /></svg>;
const ChatBubbleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const TrendingUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const MoneyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0-1V4m0 2.01v.01M12 14c-1.11 0-2.08-.402-2.599-1M12 14v1m0-1v-.01m0-2v.01m0 2v1m0 1v1m0-1V14m5.334-5.334l.707-.707m-5.656 5.656l-.707-.707m0 0l.707.707m0 0l-.707-.707M4.666 8.666l.707.707M9.344 14.656l-.707.707M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>;
// --- End Icons ---


const formatNumber = (num: number, compact = false): string => {
  if (num === undefined || num === null) return '0'; // Safety check
  if (compact) {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 10000) return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
};

const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toISOString().split('T')[0];
    } catch (e) {
        return '-';
    }
}

const GradeBadge: React.FC<{ grade: string }> = ({ grade }) => {
    const gradeColors: { [key: string]: string } = {
        'S': 'bg-red-500 text-red-100',
        'A': 'bg-orange-500 text-orange-100',
        'B': 'bg-yellow-500 text-yellow-100',
        'C': 'bg-green-500 text-green-100',
        'D': 'bg-blue-500 text-blue-100',
    };
    return (
        <span className={`px-2.5 py-1 text-sm font-bold rounded-full ${gradeColors[grade] || 'bg-gray-500 text-gray-100'}`}>
            {grade}
        </span>
    );
};

const ResultsTable: React.FC<ResultsTableProps> = ({ videos, onShowChannelDetail, onShowVideoDetail, onOpenCommentModal, selectedChannels, onChannelSelect }) => {
    const [copiedChannelId, setCopiedChannelId] = useState<string | null>(null);

    const handleCopy = (textToCopy: string, videoId: string) => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopiedChannelId(videoId);
            setTimeout(() => {
                setCopiedChannelId(null);
            }, 2000); // Reset after 2 seconds
        }).catch(err => {
            console.error('Failed to copy channel name: ', err);
        });
    };

    if (!videos || videos.length === 0) {
        return (
            <div className="text-center py-20 text-gray-500">
                <p>결과가 없습니다.</p>
                <p className="text-sm">다른 키워드나 필터를 시도해보세요.</p>
            </div>
        );
    }
    
    // Helper for mobile metric display
    const MetricItem: React.FC<{ icon: React.ReactNode, label: string, value: React.ReactNode }> = ({ icon, label, value }) => (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">{icon}</span>
        <span className="text-gray-400 w-20">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
    );


    return (
        <div>
            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden md:block bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300 table-fixed">
                        <colgroup>
                            <col style={{ width: '35%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '12.5%' }} />
                            <col style={{ width: '12.5%' }} />
                            <col style={{ width: '12.5%' }} />
                            <col style={{ width: '12.5%' }} />
                        </colgroup>
                        <thead className="text-xs text-gray-400 uppercase bg-gray-800/60">
                            <tr>
                                {["영상 정보", "주요 지표", "참여 지표", "성과 점수", "영상 사양", "기능"].map((h, index) => 
                                    <th key={h} scope="col" className={`px-4 py-3 font-semibold whitespace-nowrap ${index > 0 ? 'text-center' : 'text-left'}`}>{h}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {videos.map((video, index) => {
                                // Safety guard: skip invalid items to prevent crash
                                if (!video || !video.id) return null;
                                
                                const countryLabel = video.channelCountry ? (COUNTRY_FLAGS[video.channelCountry] || video.channelCountry) : '';
                                
                                return (
                                <tr key={video.id} className="hover:bg-gray-800/50">
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex items-start space-x-3">
                                            <div className="flex items-center pt-0.5 space-x-2">
                                                <span className="text-gray-500 font-medium w-6 text-center">{index + 1}</span>
                                                <input 
                                                    type="checkbox" 
                                                    className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
                                                    checked={!!selectedChannels[video.channelId]}
                                                    onChange={(e) => onChannelSelect({ id: video.channelId, name: video.channelTitle }, e.target.checked)}
                                                    title="채널 비교 선택"
                                                />
                                            </div>
                                            <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group">
                                                <img className="w-32 h-[72px] rounded-md object-cover transition-transform group-hover:scale-105" src={video.thumbnailUrl} alt={video.title} />
                                            </a>
                                            <div className="flex-grow min-w-0">
                                                <button onClick={() => onShowVideoDetail(video.id)} className="font-semibold text-white line-clamp-2 leading-snug mb-1 text-left hover:text-blue-400 transition-colors bg-transparent border-none p-0 cursor-pointer focus:outline-none w-full">{video.title}</button>
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {countryLabel && (
                                                        <span title={video.channelCountry} className="flex-shrink-0 text-sm">
                                                            {countryLabel}
                                                        </span>
                                                    )}
                                                    <p className="text-xs text-gray-400 truncate">{video.channelTitle}</p>
                                                    <button onClick={() => handleCopy(video.channelTitle, video.id)} className="text-gray-500 hover:text-white transition-colors duration-150 flex-shrink-0" title="채널명 복사">
                                                        {copiedChannelId === video.id ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-middle whitespace-nowrap"><div className="flex flex-col space-y-1.5 text-xs"><div className="flex items-center gap-1.5 text-gray-300" title="조회수"><span className="text-gray-400"><EyeIcon /></span><span className="font-bold text-base text-white">{formatNumber(video.viewCount)}</span></div><div className="flex items-center gap-1.5 text-gray-300" title="시간당 조회수"><span className="text-gray-400"><FireIcon /></span><span className="font-semibold">{formatNumber(video.viewsPerHour)}</span></div><div className="flex items-center gap-1.5 text-gray-400" title="게시일"><span className="text-gray-400"><CalendarIcon /></span><span>{formatDate(video.publishedAt)}</span></div><div className="flex items-center gap-1.5 text-gray-300" title="영상 추정 수익"><span className="text-gray-400"><MoneyIcon /></span><span className="font-semibold text-green-400">${formatNumber(video.estimatedRevenue)}</span></div></div></td>
                                    <td className="px-4 py-3 align-middle whitespace-nowrap"><div className="flex flex-col space-y-1.5 text-xs"><div className="flex items-center gap-1.5 text-gray-300" title="좋아요"><span className="text-gray-400"><ThumbsUpIcon /></span><span>{formatNumber(video.likeCount)}</span></div><div className="flex items-center gap-1.5 text-gray-300" title="댓글"><span className="text-gray-400"><ChatBubbleIcon /></span><span>{formatNumber(video.commentCount)}</span></div><div className="flex items-center gap-1.5 text-gray-300" title="참여율"><span className="text-gray-400"><TrendingUpIcon /></span><span className="font-bold text-blue-400">{video.engagementRate ? video.engagementRate.toFixed(1) : 0}%</span></div></div></td>
                                    <td className="px-4 py-3 align-middle text-center"><GradeBadge grade={video.grade} /><div className="text-xs mt-2 space-y-1"><p><span className="text-gray-400">성과:</span> <span className="font-semibold text-white">{video.performanceRatio ? video.performanceRatio.toFixed(2) : '0.00'}</span></p><p><span className="text-gray-400">만족:</span> <span className="font-semibold text-white">{formatNumber(video.satisfactionScore)}</span></p></div></td>
                                    <td className="px-4 py-3 align-middle text-center"><div className="text-xs flex flex-col items-center justify-center space-y-2"><div className="flex items-center gap-1.5" title="영상 길이"><span className="text-gray-400"><ClockIcon /></span><span className="font-semibold text-white">{Math.floor(video.durationMinutes || 0)}분</span></div><div className="flex items-center gap-1.5" title="채널 구독자 수"><span className="text-gray-400"><UsersIcon /></span><span className="font-semibold text-white">{formatNumber(video.subscribers)}</span></div></div></td>
                                    <td className="px-4 py-3 align-middle"><div className="flex flex-col items-center space-y-1.5"><button className="px-2 py-1.5 text-xs font-semibold rounded bg-purple-600 hover:bg-purple-700 text-white w-20 text-center" onClick={() => onShowVideoDetail(video.id)}>상세 분석</button><button onClick={() => onOpenCommentModal({id: video.id, title: video.title})} className="px-2 py-1.5 text-xs font-semibold rounded bg-gray-600 hover:bg-gray-500 text-white w-20 text-center">댓글 분석</button><button onClick={() => onShowChannelDetail(video.channelId)} className="px-2 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white w-20 text-center">채널 분석</button></div></td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View (visible on mobile) */}
            <div className="md:hidden space-y-3">
                {videos.map((video, index) => {
                    // Safety guard for mobile view
                    if (!video || !video.id) return null;
                    const countryLabel = video.channelCountry ? (COUNTRY_FLAGS[video.channelCountry] || video.channelCountry) : '';
                    
                    return (
                    <div key={video.id} className="bg-gray-800/80 rounded-lg p-3 border border-gray-700/50">
                        <div className="flex items-start space-x-3 mb-3">
                            <div className="flex items-center pt-0.5 space-x-2">
                                <span className="text-gray-500 font-medium w-6 text-center">{index + 1}</span>
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
                                    checked={!!selectedChannels[video.channelId]}
                                    onChange={(e) => onChannelSelect({ id: video.channelId, name: video.channelTitle }, e.target.checked)}
                                    title="채널 비교 선택"
                                />
                            </div>
                             <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group">
                                <img className="w-28 h-[63px] rounded-md object-cover flex-shrink-0 transition-transform group-hover:scale-105" src={video.thumbnailUrl} alt={video.title} />
                            </a>
                            <div className="flex-grow min-w-0">
                                <button onClick={() => onShowVideoDetail(video.id)} className="font-semibold text-white text-sm line-clamp-2 leading-snug mb-1 text-left hover:text-blue-400 transition-colors bg-transparent border-none p-0 cursor-pointer focus:outline-none w-full">{video.title}</button>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    {countryLabel && (
                                        <span title={video.channelCountry} className="flex-shrink-0 text-sm">
                                            {countryLabel}
                                        </span>
                                    )}
                                    <p className="text-xs text-gray-400 truncate">{video.channelTitle}</p>
                                    <button onClick={() => handleCopy(video.channelTitle, video.id)} className="text-gray-500 hover:text-white transition-colors duration-150 flex-shrink-0" title="채널명 복사">
                                      {copiedChannelId === video.id ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>)}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-700/70 pt-3">
                           <div className="space-y-1.5">
                              <MetricItem icon={<EyeIcon />} label="조회수" value={formatNumber(video.viewCount)} />
                              <MetricItem icon={<FireIcon />} label="시간당 조회수" value={formatNumber(video.viewsPerHour)} />
                              <MetricItem icon={<CalendarIcon />} label="게시일" value={formatDate(video.publishedAt)} />
                              <MetricItem icon={<MoneyIcon />} label="영상 추정 수익" value={<span className="font-bold text-green-400">${formatNumber(video.estimatedRevenue)}</span>} />
                           </div>
                           <div className="space-y-1.5">
                               <MetricItem icon={<ThumbsUpIcon />} label="좋아요" value={formatNumber(video.likeCount)} />
                               <MetricItem icon={<ChatBubbleIcon />} label="댓글" value={formatNumber(video.commentCount)} />
                               <MetricItem icon={<TrendingUpIcon />} label="참여율" value={<span className="font-bold text-blue-400">{video.engagementRate ? video.engagementRate.toFixed(1) : 0}%</span>} />
                               <MetricItem icon={<ClockIcon />} label="영상 길이" value={`${Math.floor(video.durationMinutes || 0)}분`} />
                           </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700/70">
                            <div className="flex items-center gap-3">
                                <GradeBadge grade={video.grade} />
                                <div className="text-xs">
                                   <p><span className="text-gray-400">성과:</span> <span className="font-semibold text-white">{video.performanceRatio ? video.performanceRatio.toFixed(2) : '0.00'}</span></p>
                                   <p><span className="text-gray-400">만족:</span> <span className="font-semibold text-white">{formatNumber(video.satisfactionScore)}</span></p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-1.5 w-full max-w-[240px]">
                               <button className="px-2 py-1.5 text-xs font-semibold rounded bg-purple-600 hover:bg-purple-700 text-white flex-1 text-center" onClick={() => onShowVideoDetail(video.id)}>상세</button>
                               <button className="px-2 py-1.5 text-xs font-semibold rounded bg-gray-600 hover:bg-gray-500 text-white flex-1 text-center" onClick={() => onOpenCommentModal({id: video.id, title: video.title})}>댓글</button>
                               <button onClick={() => onShowChannelDetail(video.channelId)} className="px-2 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white flex-1 text-center">채널</button>
                            </div>
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
};

export default ResultsTable;
