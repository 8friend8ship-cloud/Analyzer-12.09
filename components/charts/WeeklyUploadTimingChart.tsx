
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface WeeklyUploadTimingChartProps {
  schedule: { day: string; hour: number; reason: string }[];
}

const WeeklyUploadTimingChart: React.FC<WeeklyUploadTimingChartProps> = ({ schedule }) => {
    // Reorder to start from Mon for consistent display
    const dayOrder = ['월', '화', '수', '목', '금', '토', '일'];
    const sortedData = [...schedule].sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl text-sm max-w-[200px]">
                    <p className="font-bold text-white mb-1">{label}요일</p>
                    <p className="text-blue-400 font-bold mb-2">추천 시간: {data.hour}시</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{data.reason}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" vertical={false} opacity={0.3} />
                <XAxis 
                    dataKey="day" 
                    tick={{ fill: '#CBD5E0', fontSize: 12, fontWeight: 'bold' }}
                    axisLine={{ stroke: '#4A5568' }}
                    tickLine={false}
                />
                <YAxis 
                    domain={[0, 24]} 
                    ticks={[0, 6, 12, 18, 24]}
                    tick={{ fill: '#718096', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    unit="시"
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                <Bar 
                    dataKey="hour" 
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                >
                    {sortedData.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={entry.day === '토' || entry.day === '일' ? '#F56565' : '#4299E1'} 
                            fillOpacity={0.8}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default WeeklyUploadTimingChart;
