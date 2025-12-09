import React from 'react';
import type { VideoData } from '../../types';

interface UploadHeatmapProps {
  data: VideoData[];
}

const UploadHeatmap: React.FC<UploadHeatmapProps> = ({ data }) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayCounts = Array(7).fill(0);

  data.forEach(video => {
    const dayIndex = new Date(video.publishedAt).getDay();
    dayCounts[dayIndex]++;
  });

  const maxCount = Math.max(...dayCounts, 1);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-700';
    const intensity = Math.round((count / maxCount) * 4);
    switch (intensity) {
      case 0: return 'bg-blue-900';
      case 1: return 'bg-blue-800';
      case 2: return 'bg-blue-700';
      case 3: return 'bg-blue-600';
      case 4: return 'bg-blue-500';
      default: return 'bg-gray-700';
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-md font-semibold text-gray-200 mb-4">요일별 업로드 빈도</h3>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => (
          <div key={day} className="text-center">
            <div
              className={`w-full h-16 rounded-md flex items-center justify-center ${getColor(dayCounts[index])}`}
              title={`${dayCounts[index]} uploads`}
            >
              <span className="font-bold text-lg text-white drop-shadow-md">{dayCounts[index]}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{day}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UploadHeatmap;