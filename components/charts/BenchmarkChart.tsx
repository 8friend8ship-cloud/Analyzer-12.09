
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import type { VideoDetailData } from '../../types';

interface BenchmarkChartProps {
  video: VideoDetailData;
}

const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toLocaleString();
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-sm">
          <p className="font-bold text-gray-300">{label}</p>
          <p className="text-blue-400">
            {`조회수 (Views): ${payload[0].value.toLocaleString()}`}
          </p>
        </div>
      );
    }
    return null;
};

const BenchmarkChart: React.FC<BenchmarkChartProps> = ({ video }) => {
    if (!video.benchmarks || video.benchmarks.length === 0) {
        return null;
    }

    const chartData = [
        { name: '현재 영상 (Current)', views: video.viewCount },
        ...video.benchmarks.slice(0, 4).map((b, i) => ({
            name: `유사 영상 ${i + 1} (Similar ${i + 1})`,
            views: b.views,
        }))
    ];

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" vertical={false} />
                    <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#A0AEC0', fontSize: 12 }} 
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis 
                        tick={{ fill: '#A0AEC0', fontSize: 12 }} 
                        tickFormatter={(value) => formatNumber(value as number)}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(74, 85, 104, 0.3)' }} />
                    <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#38BDF8' : '#4B5563'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default BenchmarkChart;
