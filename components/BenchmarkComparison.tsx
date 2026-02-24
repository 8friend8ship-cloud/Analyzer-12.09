
import React from 'react';
import type { BenchmarkComparisonData } from '../types';
import BenchmarkTrendChart from './charts/BenchmarkTrendChart';

const BenchmarkComparison: React.FC<{data: BenchmarkComparisonData}> = ({data}) => {
    return (
        <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50">
            <h3 className="font-semibold text-xl mb-3 text-yellow-300">
                AI 벤치마크 분석 (AI Benchmark Analysis)
            </h3>
            <p className="text-gray-300 mb-6">{data.aiSummary}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-gray-400 mb-4">주요 지표 비교</h4>
                    <div className="space-y-4">
                        {data.comparison.map((comp, idx) => (
                            <div key={idx} className="bg-gray-700/50 p-4 rounded-lg flex justify-between items-center">
                                <span className="text-gray-300">{comp.metric}</span>
                                <div className="text-right">
                                    <div className="text-sm text-gray-400">{data.myChannelName}</div>
                                    <div className="font-bold text-white">{comp.myValue}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-400">{data.benchmarkChannelName}</div>
                                    <div className="font-bold text-blue-400">{comp.benchmarkValue}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-gray-400 mb-4">조회수 트렌드 비교 (최근 30일)</h4>
                    <div className="h-64 bg-gray-700/30 rounded-lg p-4">
                        <BenchmarkTrendChart />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BenchmarkComparison;