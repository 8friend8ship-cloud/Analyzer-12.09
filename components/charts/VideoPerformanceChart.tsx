import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area } from 'recharts';
import type { VideoDetailData } from '../../types';

interface VideoPerformanceChartProps {
  video: VideoDetailData;
}

// Generates simulated performance data for the first 28 days post-upload.
// This standardizes the comparison metric for all videos, regardless of age.
const generateSimulatedData = (video: VideoDetailData) => {
    const duration = 28;
    if (!video.viewCount || video.viewCount <= 0) {
        return Array.from({ length: duration + 1 }, (_, i) => ({ time: `${i}일 (Day)`, views: 0 }));
    }

    const rawData = [];
    // This model peaks around day 3-4 and then decays.
    // k affects how quickly it decays. A smaller k means a slower decay.
    const k = 0.25; 
    
    // Generate raw "virality" scores for each day
    for (let i = 0; i < duration; i++) {
        const t = i + 1;
        // The model t * exp(-k*t) gives a rise-and-fall curve, simulating initial growth and later decay
        const value = t * Math.exp(-k * t);
        rawData.push(value);
    }
    
    const rawTotal = rawData.reduce((sum, val) => sum + val, 0);

    if (rawTotal === 0) {
        // This should not happen with the new model, but as a safeguard:
        return Array.from({ length: duration + 1 }, (_, i) => ({ time: `${i}일 (Day)`, views: 0 }));
    }
    
    // Scale the raw data so that the total sum of simulated views matches the video's actual total view count
    const scaleFactor = video.viewCount / rawTotal;

    const dailyData = rawData.map((value, i) => ({
        time: `${i + 1}일 (Day)`,
        views: Math.round(value * scaleFactor),
    }));

    // Add a starting point at Day 0 for a better-looking graph origin
    return [{ time: '0일 (Day)', views: 0 }, ...dailyData];
};


const VideoPerformanceChart: React.FC<VideoPerformanceChartProps> = ({ video }) => {
    const chartData = generateSimulatedData(video);

    if (chartData.length <= 1) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                과거 조회수 데이터가 부족하여 그래프를 생성할 수 없습니다. (Insufficient data to generate chart.)
            </div>
        );
    }
    
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-sm">
                    <p className="font-bold text-gray-300">{label}</p>
                    <p className="text-blue-400">
                        {`추정 조회수 (Est. Views): ${payload[0].value.toLocaleString()}`}
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
                    interval={6} // Show ticks for day 0, 7, 14, 21, 28
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