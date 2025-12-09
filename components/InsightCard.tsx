import React from 'react';
import type { AIInsights } from '../types';

interface InsightCardProps {
  insights: AIInsights;
}

const InsightCard: React.FC<InsightCardProps> = ({ insights }) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 h-full flex flex-col">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-blue-500/20 rounded-full mr-3">
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-100">AI 인사이트</h3>
      </div>
      
      <div className="space-y-6 text-gray-300">
        <div>
          <h4 className="font-semibold text-gray-200 mb-2">요약</h4>
          <p className="text-sm leading-relaxed">{insights.summary}</p>
        </div>
        
        <div>
          <h4 className="font-semibold text-gray-200 mb-2">주요 패턴</h4>
          <ul className="space-y-2 list-inside">
            {insights.patterns.map((pattern, index) => (
              <li key={index} className="flex items-start text-sm">
                <svg className="w-4 h-4 mr-2 mt-0.5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <span>{pattern}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-gray-200 mb-2">추천 사항</h4>
          <ul className="space-y-2 list-inside">
            {insights.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start text-sm">
                <svg className="w-4 h-4 mr-2 mt-0.5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InsightCard;