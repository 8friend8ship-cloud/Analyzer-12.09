
import React from 'react';
import type { VideoData } from '../types';

interface VideoCardProps {
  video: VideoData;
}

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform transform hover:-translate-y-1">
      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-32 object-cover" />
      <div className="p-3">
        <h4 className="text-sm font-semibold text-gray-200 truncate leading-snug">{video.title}</h4>
        <p className="text-xs text-gray-400 mt-1 truncate">{video.channelTitle}</p>
        <div className="flex justify-between items-center mt-2 text-xs text-gray-300">
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            <span>{formatNumber(video.viewCount)}</span>
          </div>
           <div className="flex items-center space-x-1">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>{video.durationMinutes}m</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
