
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const mockData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
        date: date.toISOString().split('T')[0].substring(5), // MM-DD
        myChannel: Math.floor(Math.random() * 5000) + 1000,
        benchmarkChannel: Math.floor(Math.random() * 8000) + 2000,
    };
});

const BenchmarkTrendChart: React.FC = () => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickMargin={10} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                    itemStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Line type="monotone" dataKey="myChannel" name="내 채널" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="benchmarkChannel" name="벤치마크 채널" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default BenchmarkTrendChart;