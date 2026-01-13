import React from 'react';
import type { AI6StepReport } from '../types';
import HelpTooltip from './common/HelpTooltip';

const Section: React.FC<{ title: string; number: number; children: React.ReactNode; }> = ({ title, number, children }) => (
    <div className="border-t border-gray-700/50 pt-4 mt-4 first:mt-0 first:border-t-0 first:pt-0">
        <h3 className="font-bold text-lg text-gray-200 flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-700 text-blue-300 text-sm font-bold flex-shrink-0">{number}</span>
            <span>{title}</span>
        </h3>
        <div className="pl-9 text-sm text-gray-300 space-y-2">{children}</div>
    </div>
);

interface AIReportViewProps {
    report: AI6StepReport;
    type: 'channel' | 'video';
}

const AIReportView: React.FC<AIReportViewProps> = ({ report, type }) => {
    const footer = type === 'channel' ? (
        <p>※ 본 채널 분석은 일반 AI 답변이 아닌, 데이터 기반 심층 분석 결과입니다.</p>
    ) : (
        <>
            <p>※ 본 분석은 영상 내용을 직접 분석한 것이 아니라, YouTube 공식 API로 제공되는 데이터와 실제 댓글 반응을 기반으로 시청자 반응을 관측·해석한 결과입니다.</p>
            <p className="mt-2">※ 이 AI 분석은 참고용 인사이트를 제공하며, 최종 판단은 크리에이터의 선택을 존중합니다.</p>
        </>
    );

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center">
                    AI Deep-Dive Report
                    <HelpTooltip text={
                        "이 AI 분석은 영상의 장면, 연출, 의미를 직접 분석하지 않습니다.\nYouTube 공식 API로 제공되는 공개 데이터(조회수, 댓글 등)와 AI의 해석만을 사용합니다.\n분석 결과는 정답이나 단정이 아닌 다음 선택을 돕기 위한 가이드입니다."
                    } />
                </h2>
            </div>

            <Section number={1} title="분석 단계 (Analysis Stage)">
                <p className="font-semibold text-blue-300 bg-blue-900/20 px-3 py-1 rounded-md inline-block">{report.currentStage}</p>
            </Section>

            <Section number={2} title="시청자 가치 (Viewer Value)">
                <p className="italic bg-gray-900/30 p-3 rounded-md">"{report.viewerValue}"</p>
            </Section>
            
            <Section number={3} title="데이터 요약 (Data Facts)">
                <ul className="list-disc list-outside pl-5 space-y-1">
                    {report.dataFacts.map((fact, i) => <li key={i}>{fact}</li>)}
                </ul>
            </Section>

            <Section number={4} title="AI 해석 (AI Interpretation)">
                <p className="leading-relaxed bg-gray-900/30 p-3 rounded-md">{report.interpretation}</p>
            </Section>

            <Section number={5} title="참여 유도 전략 (Engagement Levers)">
                <div className="space-y-3">
                    {report.engagementLevers.map((lever, i) => (
                        <div key={i} className="bg-gray-900/50 p-3 rounded-md border-l-4 border-yellow-500">
                            <p className="font-semibold text-yellow-400 capitalize">{lever.type} Trigger</p>
                            <p className="text-gray-300 mt-1">{lever.recommendation}</p>
                        </div>
                    ))}
                </div>
            </Section>

            <Section number={6} title="다음 행동 제안 (Next Action)">
                <p className="font-bold text-green-400 bg-green-900/20 p-3 rounded-md border border-green-500/30">{report.nextAction}</p>
            </Section>

            {report.hybridFormulaAnalysis && (
                <Section number={7} title="하이브리드 영상 공식 분석 (Hybrid Formula Analysis)">
                    <dl className="space-y-3">
                        {Object.entries(report.hybridFormulaAnalysis).map(([formula, analysis]) => (
                            <div key={formula} className="bg-gray-900/50 p-3 rounded-md border-l-4 border-purple-500/50">
                                <dt className="font-bold text-sm text-purple-300 mb-1">{formula}</dt>
                                <dd className="text-gray-300 leading-relaxed">{analysis}</dd>
                            </div>
                        ))}
                    </dl>
                </Section>
            )}

            <div className="mt-6 pt-4 border-t border-gray-700/50 text-center text-xs text-gray-500">
                {footer}
            </div>
        </div>
    );
};

export default AIReportView;