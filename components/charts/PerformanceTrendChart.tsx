
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { TrendPoint } from '../../types';

interface PerformanceTrendChartProps {
  data: TrendPoint[];
  dataKey: 'views' | 'subscribers';
  color: string;
  name: string;
}

const VideoUploadIcon = (props: any) => {
    const { cx, cy } = props;
    return (
        <svg x={cx - 8} y={cy - 8} width="16" height="16" viewBox="0 0 24 24" fill="#A0AEC0">
            <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>
        </svg>
    );
};


const CustomizedDot = (props: any) => {
    const { cx, cy, stroke, payload } = props;
    if (payload.thumbnails && payload.thumbnails.length > 0) {
        return <VideoUploadIcon cx={cx} cy={cy} />;
    }
    return <circle cx={cx} cy={cy} r={2} fill={stroke} />;
};


const PerformanceTrendChart: React.FC<PerformanceTrendChartProps> = ({ data, dataKey, color, name }) => {

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 p-3 rounded-lg text-sm max-w-xs z-50 shadow-xl">
          <p className="label text-gray-400 font-medium mb-1">{`날짜 : ${label}`}</p>
          <p className="intro font-bold" style={{ color: color }}>
            {`${name} : ${payload[0].value.toLocaleString()}`}
          </p>
           {dataPoint.subscriberChange !== 0 && (
             <p className="text-green-400 text-xs">구독자: {dataPoint.subscriberChange > 0 ? '+' : ''}{dataPoint.subscriberChange.toLocaleString()}</p>
           )}
           {dataKey === 'subscribers' && (
              <p className="text-blue-400 text-xs">조회수: {dataPoint.views.toLocaleString()}</p>
           )}
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
        <div className="flex-grow min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                    data={data}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
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
                    domain={[ 'dataMin' , 'dataMax']}
                    allowDataOverflow={false}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#63B3ED', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Line 
                    type="monotone" 
                    dataKey={dataKey} 
                    name={name}
                    stroke={color} 
                    strokeWidth={2.5}
                    dot={<CustomizedDot />}
                    activeDot={{ r: 6, strokeWidth: 2, fill: '#1A202C', stroke: color }}
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
