// This component has been repurposed to act as the main Results Table
import React from 'react';
import type { VideoData } from '../types';
import { COUNTRY_FLAGS } from '../types';

interface ResultsTableProps {
  videos: VideoData[];
  onShowChannelDetail: (channelId: string) => void;
  onShowVideoDetail: (videoId: string) => void;
  onOpenCommentModal: (video: {id: string, title: string}) => void;
  selectedChannels: Record<string, { name: string; }>;
  onChannelSelect: (channel: { id: string, name: string }, isSelected: boolean) => void;
}

const formatNumber = (num: number): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString();
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toISOString().split('T')[0];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ videos, onShowChannelDetail, onShowVideoDetail, selectedChannels, onChannelSelect }) => {

    if (videos.length === 0) {
        return (
            <div className="text-center py-20 text-gray-500">
                <p>결과가 없습니다. (No results.)</p>
                <p className="text-sm">다른 키워드나 필터를 시도해보세요. (Try different keywords or filters.)</p>
            </div>
        );
    }
    
    const VideoRow: React.FC<{video: VideoData, index: number}> = ({ video, index }) => {
        const countryLabel = video.channelCountry ? (COUNTRY_FLAGS[video.channelCountry] || video.channelCountry) : '';
        const channelInfo = { id: video.channelId, name: video.channelTitle };
        
        return (
            <tr className="hover:bg-gray-800/50">
                <td className="px-4 py-3 align-top">
                    <div className="flex items-start space-x-3">
                         <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-gray-500 font-medium w-6 text-center">{index + 1}</span>
                        </div>
                        <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group">
                            <img className="w-32 h-[72px] rounded-md object-cover transition-transform group-hover:scale-105" src={video.thumbnailUrl} alt={video.title} />
                        </a>
                        <div className="flex-grow min-w-0">
                            <p className="font-semibold text-white line-clamp-2 leading-snug mb-1 text-left w-full">{video.title}</p>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                    checked={!!selectedChannels[channelInfo.id]}
                                    onChange={(e) => onChannelSelect(channelInfo, e.target.checked)}
                                    title="채널 병렬 분석 선택 (Select for comparison)"
                                />
                                {countryLabel && <span title={video.channelCountry} className="flex-shrink-0 text-sm">{countryLabel}</span>}
                                <button onClick={() => onShowChannelDetail(video.channelId)} className="text-xs text-gray-400 truncate hover:text-white text-left">{video.channelTitle}</button>
                            </div>
                        </div>
                    </div>
                </td>
                <td className="px-4 py-3 align-middle text-center">
                    <p className="font-mono text-white text-base">{formatNumber(video.viewCount)}</p>
                    <p className="text-xs text-gray-500">조회수</p>
                </td>
                <td className="px-4 py-3 align-middle text-center">
                    <p className="font-mono text-white text-base">{formatNumber(video.likeCount)}</p>
                    <p className="text-xs text-gray-500">좋아요</p>
                </td>
                 <td className="px-4 py-3 align-middle text-center">
                    <p className="font-mono text-white text-base">{formatDate(video.publishedAt)}</p>
                    <p className="text-xs text-gray-500">게시일</p>
                </td>
                <td className="px-4 py-3 align-middle">
                    <div className="flex flex-col items-center space-y-2">
                        <button className="px-2 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white w-24 text-center" onClick={() => onShowVideoDetail(video.id)}>
                            상세 분석 (Details)
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div>
            {/* Desktop Table View */}
            <div className="bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300 table-fixed">
                        <colgroup>
                            <col style={{ width: '50%' }} />
                            <col style={{ width: '12.5%' }} />
                            <col style={{ width: '12.5%' }} />
                            <col style={{ width: '12.5%' }} />
                            <col style={{ width: '12.5%' }} />
                        </colgroup>
                        <thead className="text-xs text-gray-400 uppercase bg-gray-800/60">
                            <tr>
                                <th scope="col" className="px-4 py-3 font-semibold text-left">영상 (Video)</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-center">조회수 (Views)</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-center">좋아요 (Likes)</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-center">게시일 (Published)</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-center">분석 (Actions)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {videos.map((video, index) => (
                                <VideoRow key={video.id} video={video} index={index} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ResultsTable;