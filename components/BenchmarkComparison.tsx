
import React from 'react';
import type { BenchmarkComparisonData } from '../types';
import BenchmarkTrendChart from './charts/BenchmarkTrendChart';

/*
  This component has been deprecated and its functionality removed due to a request to disable channel-to-channel comparison features.
*/
const BenchmarkComparison: React.FC<{data: BenchmarkComparisonData}> = ({data}) => {
    return (
        <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50">
            <h3 className="font-semibold text-xl mb-3 text-yellow-300">
                벤치마크 기능 비활성화 (Benchmark Feature Disabled)
            </h3>
            <p className="text-gray-400">정책상의 이유로 채널 간 비교 기능이 비활성화되었습니다. (For policy reasons, the channel comparison feature has been disabled.)</p>
        </div>
    );
};

export default BenchmarkComparison;