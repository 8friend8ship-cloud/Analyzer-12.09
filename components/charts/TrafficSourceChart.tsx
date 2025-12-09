
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { TrafficSource } from '../../types';

interface TrafficSourceChartProps {
  data: TrafficSource[];
}

const COLORS = ['#4299E1', '#4FD1C5', '#F6E05E', '#F56565', '#B794F4'];

const TrafficSourceChart: React.FC<TrafficSourceChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-sm z-50">
          <p className="font-bold" style={{ color: entry.fill }}>{entry.name}</p>
          <p className="text-gray-300">비율: {entry.percentage}%</p>
          <p className="text-gray-300">조회수: {entry.views.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="w-full h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
            <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="percentage"
            nameKey="name"
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            >
            {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={10} wrapperStyle={{fontSize: "12px", bottom: 0}}/>
        </PieChart>
        </ResponsiveContainer>
    </div>
  );
};

export default TrafficSourceChart;
