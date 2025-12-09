
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import type { RetentionDataPoint } from '../../types';

interface RetentionChartProps {
  data: {
    average: RetentionDataPoint[];
    topVideo: RetentionDataPoint[];
  };
}

const RetentionChart: React.FC<RetentionChartProps> = ({ data }) => {
  const combinedData = data.average.map((avgPoint, index) => ({
    time: avgPoint.time,
    average: avgPoint.retention,
    topVideo: data.topVideo[index]?.retention || null,
  }));
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-sm z-50">
          <p className="font-bold text-gray-300">{`영상 진행률: ${label}%`}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }}>
              {`${p.name}: ${p.value.toFixed(1)}%`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart 
            data={combinedData}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        >
            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
            <XAxis 
            dataKey="time" 
            type="number"
            domain={[0, 100]}
            tick={{ fill: '#A0AEC0', fontSize: 12 }} 
            tickFormatter={(tick) => `${tick}%`}
            label={{ value: '영상 진행률', position: 'insideBottom', offset: -5, fill: '#A0AEC0', fontSize: 12 }}
            height={30}
            />
            <YAxis 
            domain={[0, 100]}
            tick={{ fill: '#A0AEC0', fontSize: 12 }} 
            tickFormatter={(tick) => `${tick}%`}
            label={{ value: '유지율', angle: -90, position: 'insideLeft', fill: '#A0AEC0', fontSize: 12, dx: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{fontSize: "12px", bottom: 0}} />
            <ReferenceLine y={50} label={{ value: '50%', position: 'insideTopLeft', fill: '#A0AEC0', fontSize: 10 }} stroke="#636363" strokeDasharray="3 3" />
            <Line 
            type="monotone" 
            dataKey="average" 
            name="채널 평균"
            stroke="#4FD1C5" 
            strokeWidth={2}
            dot={false}
            />
            <Line 
            type="monotone" 
            dataKey="topVideo" 
            name="인기 영상"
            stroke="#F6E05E" 
            strokeWidth={2}
            dot={false}
            />
        </LineChart>
        </ResponsiveContainer>
    </div>
  );
};

export default RetentionChart;
