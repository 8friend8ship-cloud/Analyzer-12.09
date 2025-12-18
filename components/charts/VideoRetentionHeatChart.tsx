
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface VideoRetentionHeatChartProps {
  duration: number;
}

const generateSimulatedHeatMap = (duration: number) => {
    const points = 40; // 더 부드러운 곡선을 위해 포인트 증가
    const data = [];
    
    for (let i = 0; i <= points; i++) {
        const timePercent = (i / points) * 100;
        
        // Base retention curve (decaying line)
        let base = Math.max(30, 90 * Math.exp(-0.012 * timePercent));
        
        // 시청자가 몰리는 3개 구간 시뮬레이션 (Intro, Climax, CTA)
        const introPeak = Math.exp(-Math.pow(timePercent - 8, 2) / 25) * 20;
        const climaxPeak = Math.exp(-Math.pow(timePercent - 72, 2) / 120) * 45;
        const outroPeak = Math.exp(-Math.pow(timePercent - 92, 2) / 40) * 15;
        
        // 자연스러운 파동 추가
        const wave = Math.sin(timePercent * 0.4) * 4;
        
        const value = Math.min(100, Math.max(15, base + introPeak + climaxPeak + outroPeak + wave));
        
        data.push({
            time: Math.round((timePercent / 100) * duration * 60),
            label: `${Math.floor((timePercent / 100) * duration)}:${Math.round(((timePercent / 100) * duration % 1) * 60).toString().padStart(2, '0')}`,
            intensity: value
        });
    }
    return data;
};

const VideoRetentionHeatChart: React.FC<VideoRetentionHeatChartProps> = ({ duration }) => {
    const data = generateSimulatedHeatMap(duration);

    return (
        <div className="w-full h-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4299E1" stopOpacity={0.6}/>
                            <stop offset="95%" stopColor="#4299E1" stopOpacity={0.05}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} opacity={0.4} />
                    <XAxis 
                        dataKey="label" 
                        tick={{ fill: '#718096', fontSize: 11 }}
                        interval={Math.floor(data.length / 5)}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis hide domain={[0, 110]} />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#1A202C', 
                            border: '1px solid #4A5568', 
                            borderRadius: '12px', 
                            fontSize: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                        }}
                        itemStyle={{ color: '#63B3ED', fontWeight: 'bold' }}
                        labelStyle={{ color: '#A0AEC0', marginBottom: '4px' }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, '시청 몰입도']}
                        labelFormatter={(label) => `⏱️ 재생 시간: ${label}`}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="intensity" 
                        stroke="#63B3ED" 
                        fillOpacity={1} 
                        fill="url(#colorBlue)" 
                        strokeWidth={4}
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
            {/* 데이터가 높게 튀는 구간에 대한 시각적 강조 효과 (옵션) */}
            <div className="absolute top-2 right-2 pointer-events-none opacity-40">
                <div className="flex items-center gap-2 text-[10px] text-blue-400 font-bold uppercase tracking-tighter">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                    Peak Analysis Active
                </div>
            </div>
        </div>
    );
};

export default VideoRetentionHeatChart;
