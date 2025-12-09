import React from 'react';
import type { VideoData } from '../../types';

interface ViewsDistributionChartProps {
  data: VideoData[];
}

const ViewsDistributionChart: React.FC<ViewsDistributionChartProps> = ({ data }) => {
    const buckets = [
        { name: '0-1만', min: 0, max: 10000, count: 0, color: 'bg-blue-900' },
        { name: '1-5만', min: 10001, max: 50000, count: 0, color: 'bg-blue-800' },
        { name: '5-10만', min: 50001, max: 100000, count: 0, color: 'bg-blue-700' },
        { name: '10-50만', min: 100001, max: 500000, count: 0, color: 'bg-blue-600' },
        { name: '50만+', min: 500001, max: Infinity, count: 0, color: 'bg-blue-500' },
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
            <h4 className="font-semibold mb-3 text-gray-300">조회수 분포</h4>
            <div className="space-y-2 flex-grow flex flex-col justify-center">
                {buckets.map(bucket => (
                    <div key={bucket.name} className="flex items-center">
                        <span className="text-xs text-gray-400 w-16">{bucket.name}</span>
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
        </div>
    );
};

export default ViewsDistributionChart;
