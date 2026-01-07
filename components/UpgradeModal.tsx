import React from 'react';

interface UpgradeModalProps {
    onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md text-gray-200 flex flex-col items-center text-center p-8" onClick={(e) => e.stopPropagation()}>
        
        <div className="p-3 bg-blue-500/20 rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">분석 한도를 초과했습니다</h2>
        <p className="text-gray-400 mb-6">
          Free 요금제의 월간 분석 30회를 모두 사용하셨습니다. 더 많은 분석을 실행하려면 요금제를 업그레이드해주세요.
        </p>

        <div className="w-full space-y-3">
            <button
                // In a real app, this would navigate to the subscription plans page
                onClick={() => alert('요금제 페이지로 이동합니다.')}
                className="w-full px-4 py-3 text-sm font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white"
            >
                요금제 보러가기
            </button>
            <button
                onClick={onClose}
                className="w-full px-4 py-3 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500 text-gray-200"
            >
                닫기
            </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;