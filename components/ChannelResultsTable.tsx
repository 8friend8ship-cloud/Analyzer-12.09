
import React from 'react';
import type { ChannelRankingData } from '../types';
import { COUNTRY_FLAGS } from '../types';

interface ChannelResultsTableProps {
  channels: ChannelRankingData[];
  onShowChannelDetail: (channelId: string) => void;
  selectedChannels: Record<string, { name: string; }>;
  onChannelSelect: (channel: { id: string, name: string }, isSelected: boolean) => void;
}

const formatSubscribers = (num?: number): string => {
    if (num === undefined || num === null || isNaN(num)) return '-';
    if (num >= 10000) return `${(num / 10000).toFixed(1).replace('.0', '')}만`;
    return num.toLocaleString();
};

const formatNumber = (num?: number): string => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toLocaleString();
};


const ChannelResultsTable: React.FC<ChannelResultsTableProps> = ({ channels, onShowChannelDetail, selectedChannels, onChannelSelect }) => {

    if (channels.length === 0) {
        return (
            <div className="text-center py-20 text-gray-500">
                <p>결과가 없습니다. (No results.)</p>
                <p className="text-sm">다른 키워드를 시도해보세요. (Try different keywords.)</p>
            </div>
        );
    }
    
    const ChannelRow: React.FC<{channel: ChannelRankingData, index: number}> = ({ channel, index }) => {
        const countryLabel = channel.channelCountry ? (COUNTRY_FLAGS[channel.channelCountry] || channel.channelCountry) : '';
        const channelInfo = { id: channel.id, name: channel.name };
        
        return (
            <tr className="hover:bg-gray-800/50">
                <td className="px-4 py-3 align-middle text-center text-gray-400 font-medium">{index + 1}</td>
                <td className="px-4 py-3 align-top">
                    <div className="flex items-center space-x-3">
                        <input 
                            type="checkbox" 
                            className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500 flex-shrink-0"
                            checked={!!selectedChannels[channelInfo.id]}
                            onChange={(e) => onChannelSelect(channelInfo, e.target.checked)}
                            title="채널 병렬 분석 선택 (Select for comparison)"
                        />
                        <img className="w-12 h-12 rounded-full object-cover" src={channel.thumbnailUrl} alt={channel.name} />

                        <div className="flex-grow min-w-0">
                            <p className="font-semibold text-white truncate">{channel.name}</p>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                {countryLabel && <span title={channel.channelCountry} className="flex-shrink-0 text-sm">{countryLabel}</span>}
                                <p className="truncate">{channel.channelHandle}</p>
                            </div>
                        </div>
                    </div>
                </td>
                <td className="px-4 py-3 align-middle text-center font-mono text-white text-base">{formatSubscribers(channel.subscriberCount)}</td>
                <td className="px-4 py-3 align-middle text-center font-mono text-white text-base">{formatNumber(channel.viewCount)}</td>
                <td className="px-4 py-3 align-middle text-center font-mono text-white text-base">{formatNumber(channel.videoCount)}</td>

                <td className="px-4 py-3 align-middle text-center">
                    <button className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white w-24 text-center" onClick={() => onShowChannelDetail(channel.id)}>
                        상세 분석
                    </button>
                </td>
            </tr>
        );
    };

    return (
        <div className="bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700/50">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-800/60">
                        <tr>
                            <th scope="col" className="px-4 py-3 font-semibold text-center w-12">#</th>
                            <th scope="col" className="px-4 py-3 font-semibold text-left w-2/5">채널 (Channel)</th>
                            <th scope="col" className="px-4 py-3 font-semibold text-center">구독자 (Subscribers)</th>
                            <th scope="col" className="px-4 py-3 font-semibold text-center">총 조회수 (Total Views)</th>
                            <th scope="col" className="px-4 py-3 font-semibold text-center">영상 수 (Videos)</th>
                            <th scope="col" className="px-4 py-3 font-semibold text-center">분석 (Actions)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {channels.map((channel, index) => (
                            <ChannelRow key={channel.id} channel={channel} index={index} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ChannelResultsTable;
