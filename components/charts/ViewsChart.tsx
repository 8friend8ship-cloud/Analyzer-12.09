import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { VideoData } from '../../types';

interface ViewsChartProps {
  data: VideoData[];
}

const ViewsChart: React.FC<ViewsChartProps> = ({ data }) => {
  const chartData = data.slice(0, 15).map(v => ({
    name: v.title.substring(0, 10) + '...',
    views: v.viewCount,
  })).sort((a,b) => b.views - a.views);

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-64">
      <h3 className="text-md font-semibold text-gray-200 mb-4">조회수 기준 상위 15개 동영상 (Top 15 Videos by Views)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
          <XAxis dataKey="name" tick={{ fill: '#A0AEC0', fontSize: 10 }} angle={-45} textAnchor="end" height={50} interval={0} />
          <YAxis tick={{ fill: '#A0AEC0', fontSize: 12 }} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568', color: '#CBD5E0' }}
            cursor={{ fill: 'rgba(74, 85, 104, 0.3)' }}
          />
          <Bar dataKey="views" fill="#4299E1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ViewsChart;