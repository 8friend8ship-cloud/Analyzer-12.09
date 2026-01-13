import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { VideoData } from '../../types';

interface LengthChartProps {
  data: VideoData[];
}

const COLORS = ['#4299E1', '#4FD1C5', '#F6E05E', '#F56565', '#B794F4'];

// A custom tooltip with better styling for visibility
const CustomTooltip = ({ active, payload, totalVideos }: { active?: boolean, payload?: any[], totalVideos: number }) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0];
        const percentage = totalVideos > 0 ? ((dataPoint.value / totalVideos) * 100).toFixed(1) : "0";
        return (
            <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-sm shadow-lg backdrop-blur-sm">
                <p className="font-bold" style={{ color: dataPoint.payload.fill }}>{dataPoint.name}</p>
                <p className="text-gray-200 mt-1">영상 수 (Videos): <span className="font-semibold">{dataPoint.value}</span></p>
                <p className="text-gray-300">비율 (Share): <span className="font-semibold">{percentage}%</span></p>
            </div>
        );
    }
    return null;
};


const LengthChart: React.FC<LengthChartProps> = ({ data }) => {
  const buckets = {
    '0-5 min': 0,
    '6-10 min': 0,
    '11-15 min': 0,
    '16-20 min': 0,
    '20+ min': 0,
  };

  data.forEach(video => {
    if (video.durationMinutes <= 5) buckets['0-5 min']++;
    else if (video.durationMinutes <= 10) buckets['6-10 min']++;
    else if (video.durationMinutes <= 15) buckets['11-15 min']++;
    else if (video.durationMinutes <= 20) buckets['16-20 min']++;
    else buckets['20+ min']++;
  });

  const chartData = Object.entries(buckets).map(([name, value]) => ({ name, value }));
  const totalVideos = data.length;

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-full flex flex-col">
      <h3 className="font-semibold text-center mb-3 text-gray-300">영상 길이 분포 (Video Length Distribution) <span className="font-normal text-sm">({totalVideos > 0 ? `${totalVideos} videos` : ''})</span></h3>
      <div className="flex-grow min-h-0">
          <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                  <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius="80%"
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                      {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip totalVideos={totalVideos} />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
          </ResponsiveContainer>
      </div>
       <p className="text-xs text-gray-500 text-center mt-auto pt-2">* 현재 표시된 {totalVideos}개 영상을 기준으로 합니다. (Based on {totalVideos} currently displayed videos.)</p>
    </div>
  );
};

export default LengthChart;