import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area } from 'recharts';
import type { VideoDetailData } from '../../types';

interface VideoPerformanceChartProps {
  video: VideoDetailData;
}

// Generates simulated performance data. Shows hourly data for videos newer than 48 hours,
// and daily data for older videos. This provides more relevant insights for newly uploaded content.
const generateSimulatedData = (video: VideoDetailData) => {
    const now = new Date();
    const published = new Date(video.publishedAt);
    const hoursSincePublished = Math.max(1, (now.getTime() - published.getTime()) / (1000 * 60 * 60));

    // For videos published within the last 48 hours, show hourly data
    if (hoursSincePublished < 48) {
        // Weights for the first 48 hours, modeling an initial boost then stabilization
        const hourlyWeights = [
            0.5, 1, 2, 4, 7, 10, 12, 11, 10, 9, 8, 7, // First 12 hours
            6, 6, 5, 5, 4, 4, 3, 3, 3, 3, 3, 3,       // Next 12 hours (24h total)
            2.5, 2.5, 2.5, 2.5, 2, 2, 2, 2, 1.5, 1.5, 1.5, 1.5, // Next 12 hours (36h total)
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1        // Next 12 hours (48h total)
        ];
        
        const currentHourIndex = Math.floor(hoursSincePublished) - 1;
        const relevantWeights = hourlyWeights.slice(0, currentHourIndex + 1);
        const totalWeight = relevantWeights.reduce((sum, w) => sum + w, 0);

        if (totalWeight === 0) {
            // Fallback for very new videos (less than 1 hour)
            return [{ time: '0시간차', views: 0 }, { time: '1시간차', views: video.viewCount }];
        }

        const scaleFactor = video.viewCount / totalWeight;

        const hourlyData = relevantWeights.map((weight, i) => ({
            time: `${i + 1}시간차`, // "Hour X"
            views: Math.round(weight * scaleFactor),
        }));

        // Add a starting point for a better-looking graph
        return [{ time: '0시간차', views: 0 }, ...hourlyData];
    }

    // For older videos, show daily data for the first 30 days
    const daysSincePublished = Math.ceil(hoursSincePublished / 24);
    const duration = Math.min(daysSincePublished, 30);
    
    // Fallback for edge cases
    if (duration < 2) {
        return [{ time: '0일차', views: 0 }, { time: '1일차', views: video.viewCount }];
    }

    const viewsPerHour = video.viewCount / hoursSincePublished;
    const peakValue = viewsPerHour * 24; // Estimated first-day views as a heuristic

    const rawData = [];
    for (let i = 0; i < duration; i++) {
        const day = i + 1;
        // Exponential decay model
        const value = peakValue * Math.exp(-0.15 * (day - 1));
        rawData.push(value);
    }

    const rawTotal = rawData.reduce((sum, val) => sum + val, 0);
    if (rawTotal === 0) {
        return [{ time: '1일차', views: video.viewCount }];
    }

    const scaleFactor = video.viewCount / rawTotal;

    const dailyData = rawData.map((value, i) => ({
        time: `${i + 1}일차`, // "Day X"
        views: Math.round(value * scaleFactor),
    }));

     // Add a starting point for a better-looking graph
    return [{ time: '0일차', views: 0 }, ...dailyData];
};


const VideoPerformanceChart: React.FC<VideoPerformanceChartProps> = ({ video }) => {
    const chartData = generateSimulatedData(video);

    if (chartData.length <= 1) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                과거 조회수 데이터가 부족하여 그래프를 생성할 수 없습니다.
            </div>
        );
    }
    
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-sm">
                    <p className="font-bold text-gray-300">{label}</p>
                    <p className="text-blue-400">
                        {`추정 조회수 : ${payload[0].value.toLocaleString()}`}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4299E1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4299E1" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis 
                    dataKey="time"
                    tick={{ fill: '#A0AEC0', fontSize: 12 }}
                    interval={Math.floor(chartData.length / 5)} // Show ~5 ticks
                />
                <YAxis 
                    tick={{ fill: '#A0AEC0', fontSize: 12 }} 
                    tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="views" stroke="#4299E1" fillOpacity={1} fill="url(#colorViews)" />
                <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#4299E1" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default VideoPerformanceChart;
