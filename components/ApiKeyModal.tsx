import React from 'react';

interface ApiKeyModalProps {
  apiKey: { key: 'youtube' | 'gemini' | 'analytics' | 'reporting', name: string };
  currentValue: string;
  onSave: (key: string, value: string) => void;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ apiKey, onClose }) => {
  const isYoutube = apiKey.key === 'youtube';
  const isGemini = apiKey.key === 'gemini';

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg text-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">{apiKey.name} 실행 상태</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4 text-sm leading-6">
          {isYoutube ? (
            <>
              <div className="rounded-md border border-green-700/40 bg-green-950/30 p-4 text-green-200">
                브라우저 YouTube API Key 저장은 사용하지 않습니다.
              </div>
              <p className="text-gray-300">검색은 먼저 Local/Drive/Queens/Seed 백데이터를 확인합니다. 새 데이터가 꼭 필요할 때만 같은 도메인의 서버 수집기 경로로 전달됩니다.</p>
              <p className="text-gray-400">현재 중앙 서버 키가 미설정이면 외부 API를 호출하지 않고 종료합니다.</p>
            </>
          ) : isGemini ? (
            <>
              <div className="rounded-md border border-green-700/40 bg-green-950/30 p-4 text-green-200">
                Gemini 브라우저 호출은 비활성화되어 있습니다.
              </div>
              <p className="text-gray-300">Content OS 분석은 저장된 메타데이터와 Queens → Seed → T1/T2 결과로 계산합니다.</p>
            </>
          ) : (
            <p className="text-gray-300">이 기능은 브라우저 비밀키 입력 방식으로 운영하지 않습니다. 필요한 권한은 중앙 서버/승인된 연결에서 관리합니다.</p>
          )}
        </div>
        <div className="flex justify-end items-center p-4 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 hover:bg-blue-700">
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
