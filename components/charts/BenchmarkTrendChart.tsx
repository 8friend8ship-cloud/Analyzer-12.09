import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface BenchmarkTrendChartProps {
    data: {
        date: string;
        myChannelViews: number;
        benchmarkViews: number;
    }[];
}

const formatNumber = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};


const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-sm">
                <p className="font-bold text-gray-300">{`날짜: ${label}`}</p>
                {payload.map((p: any) => (
                    <p key={p.name} style={{ color: p.color }}>
                        {`${p.name}: ${p.value.toLocaleString()}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const BenchmarkTrendChart: React.FC<BenchmarkTrendChartProps> = ({ data }) => {
    return (
        <ResponsiveContainer width="100%" height="90%">
            <LineChart
                data={data}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis
                    dataKey="date"
                    tick={{ fill: '#A0AEC0', fontSize: 12 }}
                />
                <YAxis
                    tick={{ fill: '#A0AEC0', fontSize: 12 }}
                    tickFormatter={(value) => formatNumber(value as number)}
                    domain={['dataMin', 'dataMax']}
                    allowDataOverflow={true}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px", bottom: -10 }} />
                <Line
                    type="monotone"
                    dataKey="myChannelViews"
                    name="내 채널"
                    stroke="#4FD1C5"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                />
                <Line
                    type="monotone"
                    dataKey="benchmarkViews"
                    name="벤치마크 채널"
                    stroke="#F6E05E"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default BenchmarkTrendChart;
