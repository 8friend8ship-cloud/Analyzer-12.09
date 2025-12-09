import React from 'react';
import type { BenchmarkComparisonData } from '../types';
import BenchmarkTrendChart from './charts/BenchmarkTrendChart';

interface BenchmarkComparisonProps {
    data: BenchmarkComparisonData;
}

const formatNumber = (num: number, compact = false): string => {
    if (num === null || num === undefined) return '-';
    if (compact) {
        if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
        if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toLocaleString();
};

const KPITableRow: React.FC<{ label: string; myValue: number; benchValue: number; }> = ({ label, myValue, benchValue }) => {
    const difference = myValue - benchValue;
    const percentageDiff = benchValue !== 0 ? (difference / benchValue) * 100 : 0;
    const isPositive = difference >= 0;

    return (
        <tr className="border-b border-gray-700/50">
            <td className="py-3 px-4 text-sm text-gray-300">{label}</td>
            <td className="py-3 px-4 text-center font-semibold text-lg">{formatNumber(myValue, true)}</td>
            <td className="py-3 px-4 text-center font-semibold text-lg">{formatNumber(benchValue, true)}</td>
            <td className={`py-3 px-4 text-center font-bold text-lg ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{formatNumber(difference, true)}
                <span className="block text-xs font-normal">({isPositive ? '+' : ''}{percentageDiff.toFixed(1)}%)</span>
            </td>
        </tr>
    );
};

const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = ({ data }) => {
    const { myChannelKpi, benchmarkChannelKpi, dailyComparison, aiInsight } = data;

    return (
        <div className="space-y-8">
            {/* AI Insight Card */}
            <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50">
                <h3 className="font-semibold text-xl mb-3 flex items-center text-yellow-300">
                    <span className="text-2xl mr-3">💡</span> AI 벤치마크 종합 진단
                </h3>
                <div className="space-y-4 text-sm">
                    <p className="text-gray-300 leading-relaxed">{aiInsight.summary}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-900/30 p-3 rounded-md border-l-4 border-green-500">
                            <h4 className="font-semibold text-green-400">강점</h4>
                            <p>{aiInsight.strength}</p>
                        </div>
                        <div className="bg-red-900/30 p-3 rounded-md border-l-4 border-red-500">
                             <h4 className="font-semibold text-red-400">약점</h4>
                            <p>{aiInsight.weakness}</p>
                        </div>
                        <div className="bg-blue-900/30 p-3 rounded-md border-l-4 border-blue-500">
                            <h4 className="font-semibold text-blue-400">추천 전략</h4>
                            <p>{aiInsight.recommendation}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* KPI Comparison Table */}
                <div>
                    <h3 className="text-xl font-bold mb-4">최근 30일 핵심 지표 비교</h3>
                    <div className="bg-gray-800/60 rounded-lg border border-gray-700/50 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-800 text-xs text-gray-400 uppercase">
                                <tr>
                                    <th className="py-3 px-4 text-left">지표</th>
                                    <th className="py-3 px-4 text-center">내 채널</th>
                                    <th className="py-3 px-4 text-center">벤치마크 (MrBeast)</th>
                                    <th className="py-3 px-4 text-center">격차</th>
                                </tr>
                            </thead>
                            <tbody>
                                <KPITableRow label="조회수" myValue={myChannelKpi.viewsLast30d} benchValue={benchmarkChannelKpi.viewsLast30d} />
                                <KPITableRow label="구독자 순증" myValue={myChannelKpi.netSubscribersLast30d} benchValue={benchmarkChannelKpi.netSubscribersLast30d} />
                                <KPITableRow label="시청 시간 (시간)" myValue={myChannelKpi.watchTimeHoursLast30d} benchValue={benchmarkChannelKpi.watchTimeHoursLast30d} />
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Daily Views Trend Chart */}
                <div className="bg-gray-800 p-4 rounded-lg h-[400px]">
                    <h3 className="text-xl font-bold mb-4">일일 조회수 성과 비교</h3>
                    <BenchmarkTrendChart data={dailyComparison} />
                </div>
            </div>
        </div>
    );
};

export default BenchmarkComparison;
