import React from 'react';
import type { VideoData } from '../../types';

interface ViewsDistributionChartProps {
  data: VideoData[];
}

const ViewsDistributionChart: React.FC<ViewsDistributionChartProps> = ({ data }) => {
    const buckets = [
        { name: '0-1만 (0-10K)', min: 0, max: 10000, count: 0, color: 'bg-blue-900' },
        { name: '1-5만 (10-50K)', min: 10001, max: 50000, count: 0, color: 'bg-blue-800' },
        { name: '5-10만 (50-100K)', min: 50001, max: 100000, count: 0, color: 'bg-blue-700' },
        { name: '10-50만 (100-500K)', min: 100001, max: 500000, count: 0, color: 'bg-blue-600' },
        { name: '50만+ (500K+)', min: 500001, max: Infinity, count: 0, color: 'bg-blue-500' },
    ];

    data.forEach(video => {
        for (const bucket of buckets) {
            if (video.viewCount >= bucket.min && video.viewCount <= bucket.max) {
                bucket.count++;
                break;
            }
        }
    });

    const maxValue = Math.max(...buckets.map(b => b.count), 1); // Avoid division by zero

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg h-full flex flex-col">
            <h4 className="font-semibold text-center mb-3 text-gray-300">조회수 분포 (Views Distribution) <span className="font-normal text-sm">({data.length} videos)</span></h4>
            <div className="space-y-2 flex-grow flex flex-col justify-center">
                {buckets.map(bucket => (
                    <div key={bucket.name} className="flex items-center">
                        <span className="text-xs text-gray-400 w-24 flex-shrink-0">{bucket.name}</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-4">
                            <div
                                className={`${bucket.color} h-4 rounded-full flex items-center justify-end pr-2 text-xs font-bold text-white`}
                                style={{ width: `${(bucket.count / maxValue) * 100}%` }}
                                title={`${bucket.count} videos`}
                            >
                                {bucket.count > 0 ? bucket.count : ''}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">* 현재 표시된 {data.length}개 영상을 기준으로 합니다. (Based on {data.length} currently displayed videos.)</p>
        </div>
    );
};

export default ViewsDistributionChart;