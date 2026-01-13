import React from 'react';
import Button from './common/Button';

interface VideoFormulaViewProps {
  onClose: () => void;
}

const FormulaItem: React.FC<{ title: string; formula: string; description: string; }> = ({ title, formula, description }) => (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
        <h4 className="font-bold text-blue-300">{title}</h4>
        <p className="font-mono text-lg text-white my-2 bg-gray-800 p-2 rounded-md">{formula}</p>
        <p className="text-xs text-gray-400">{description}</p>
    </div>
);

const VideoFormulaView: React.FC<VideoFormulaViewProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold">콘텐츠 OS 영상 공식 (Content OS Video Formula)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
            <p className="text-sm text-gray-300">이 공식은 AI 'Johnson'이 영상의 성공 가능성을 판단하는 핵심 분석 철학입니다. 절대적인 정답은 아니지만, 시청자의 마음을 움직이는 콘텐츠의 공통적인 특징을 담고 있습니다.</p>
            
            <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg text-center">
                <h3 className="text-sm font-bold text-purple-300 uppercase tracking-widest">Overall Formula</h3>
                <p className="font-mono text-2xl text-white my-2">영상 = (웃음 × 공감) + 생각 − 정답</p>
                <p className="text-xs text-purple-400">가장 이상적인 영상은 재미와 공감대를 기반으로, 시청자에게 생각할 거리를 던져주지만, 섣불리 정답을 규정하지 않습니다.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormulaItem title="기본 시작 공식 (Basic Start)" formula="영상 = 상황 + 실수 + 질문" description="좋은 영상은 공감할 수 있는 '상황'으로 시작해, 시청자가 흔히 하는 '실수'를 보여주고, '질문'을 던져 몰입을 유도합니다." />
                <FormulaItem title="유입 영상 (Shorts)" formula="유입 = 웃긴상황 + 같은실수 − 설명" description="짧은 영상은 재미있는 상황과 공감가는 실수로 빠르게 시선을 사로잡되, 긴 설명은 생략하여 속도감을 유지해야 합니다." />
                <FormulaItem title="체류 영상 (Long-form)" formula="체류 = 같은실수 + 생각하나 + 순서문제" description="시청 시간을 늘리려면, 반복되는 실수에 대해 '하나의 생각'을 깊이 있게 전달하고, 문제 해결의 '순서'를 다루는 것이 효과적입니다." />
                <FormulaItem title="구독 영상 (Subscription)" formula="구독 = 반복문제 + 구조설명 + 채널선언" description="구독을 유도하려면, 시청자의 '반복적인 문제'를 해결하는 '구조'를 설명하고, 이것이 바로 '우리 채널의 역할'임을 선언해야 합니다." />
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <FormulaItem title="썸네일 공식" formula="썸네일 = 생각조각(2~4글자)" description="썸네일 텍스트는 완성된 문장이 아닌, 머릿속에 떠오른 생각의 파편처럼 짧고 강렬해야 합니다." />
                    <FormulaItem title="제목 공식" formula="제목 = 상태 + 질문" description="현재 '상태'를 보여주고, 그에 대한 '질문'을 던지는 형식은 시청자의 호기심을 자극합니다." />
                </div>
                 <div className="space-y-4">
                     <FormulaItem title="성공 판별 공식" formula="성공 = (웃음 + 찝찝함) ≥ 2" description="성공적인 영상은 단순히 웃기기만 한 것이 아니라, 약간의 '찝찝함'(생각할 거리, 미완의 느낌)을 남겨 시청자가 곱씹게 만듭니다." />
                    <FormulaItem title="최종 요약 공식" formula="웃음 + 실수 + 질문 = 구독" description="결국, 유머와 공감가는 실수, 그리고 생각하게 만드는 질문의 조합이 채널의 팬(구독자)을 만드는 핵심입니다." />
                </div>
            </div>

        </div>
        
        <div className="p-4 border-t border-gray-700 text-right flex-shrink-0">
          <Button onClick={onClose}>닫기</Button>
        </div>
      </div>
    </div>
  );
};

export default VideoFormulaView;
