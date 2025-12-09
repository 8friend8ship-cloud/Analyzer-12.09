
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { TrendPoint } from '../../types';

interface PerformanceTrendChartProps {
  data: TrendPoint[];
}

type Metric = 'views' | 'engagements' | 'likes';

const metricInfo = {
    views: { name: '조회수', color: '#4299E1' },
    engagements: { name: '참여수', color: '#4FD1C5' },
    likes: { name: '좋아요', color: '#F6E05E' },
};

const CustomizedDot = (props: any) => {
    const { cx, cy, stroke, payload } = props;
    // Render a larger, more prominent dot for days with uploads
    if (payload.thumbnails && payload.thumbnails.length > 0) {
        return <circle cx={cx} cy={cy} r={5} stroke="#4299E1" strokeWidth={2} fill="#1A1C23" />;
    }
    // Render a small default dot for other days
    return <circle cx={cx} cy={cy} r={2} fill={stroke} />;
};


const PerformanceTrendChart: React.FC<PerformanceTrendChartProps> = ({ data }) => {
  const [activeMetric, setActiveMetric] = useState<Metric>('views');

  // Check if data is essentially empty or all zeros to show fallback message if needed
  // However, with domain=[0, 'auto'], chart should render fine even with 0s. 
  // We'll trust Recharts but ensure container has size.

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 p-3 rounded-lg text-sm max-w-xs z-50 shadow-xl">
          <p className="label text-gray-400 font-medium mb-1">{`날짜 : ${label}`}</p>
          <p className="intro font-bold" style={{ color: metricInfo[activeMetric].color }}>
            {`${metricInfo[activeMetric].name} : ${payload[0].value.toLocaleString()}`}
          </p>
          {dataPoint.thumbnails && dataPoint.thumbnails.length > 0 && (
             <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-xs font-semibold text-white mb-1">{dataPoint.thumbnails.length}개 영상 업로드</p>
                <div className="flex flex-wrap gap-1">
                    {dataPoint.thumbnails.slice(0, 8).map((thumb: string, index: number) => (
                        <img key={index} src={thumb} className="w-12 h-auto rounded-sm border border-gray-700" alt="video thumbnail"/>
                    ))}
                </div>
             </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col min-h-[300px]">
        <div className="flex-shrink-0 flex items-center justify-end space-x-2 mb-2">
            {Object.keys(metricInfo).map((key) => (
                <button 
                    key={key} 
                    onClick={() => setActiveMetric(key as Metric)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeMetric === key ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                >
                    {metricInfo[key as Metric].name}
                </button>
            ))}
        </div>
        <div className="flex-grow min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                    data={data}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" vertical={false} />
                <XAxis 
                    dataKey="date"
                    tick={{ fill: '#A0AEC0', fontSize: 11 }}
                    tickFormatter={(label) => label.slice(-5)} // "MM/DD"
                    height={30}
                    interval={Math.floor(data.length / 6)} // Show roughly 6 labels
                    axisLine={{ stroke: '#4A5568' }}
                    tickLine={false}
                />
                <YAxis 
                    tick={{ fill: '#A0AEC0', fontSize: 11 }} 
                    tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)}
                    domain={[0, 'auto']}
                    allowDataOverflow={false}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#63B3ED', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Line 
                    type="monotone" 
                    dataKey={activeMetric} 
                    stroke={metricInfo[activeMetric].color} 
                    strokeWidth={2}
                    dot={<CustomizedDot />}
                    activeDot={{ r: 6, strokeWidth: 2, fill: '#1A202C', stroke: metricInfo[activeMetric].color }}
                    isAnimationActive={true}
                    animationDuration={1000}
                />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default PerformanceTrendChart;
