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
                <p className="text-gray-200 mt-1">영상 수: <span className="font-semibold">{dataPoint.value}</span></p>
                <p className="text-gray-300">비율: <span className="font-semibold">{percentage}%</span></p>
            </div>
        );
    }
    return null;
};


const LengthChart: React.FC<LengthChartProps> = ({ data }) => {
  const buckets = {
    '0-5분': 0,
    '6-10분': 0,
    '11-15분': 0,
    '16-20분': 0,
    '20분 이상': 0,
  };

  data.forEach(video => {
    if (video.durationMinutes <= 5) buckets['0-5분']++;
    else if (video.durationMinutes <= 10) buckets['6-10분']++;
    else if (video.durationMinutes <= 15) buckets['11-15분']++;
    else if (video.durationMinutes <= 20) buckets['16-20분']++;
    else buckets['20분 이상']++;
  });

  const chartData = Object.entries(buckets).map(([name, value]) => ({ name, value }));

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-64">
      <h3 className="text-md font-semibold text-gray-200 mb-4">동영상 길이 분포</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip totalVideos={data.length} />} />
           <Legend iconSize={10} wrapperStyle={{fontSize: "12px", bottom: -10}}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LengthChart;