import React, { useState } from 'react';

interface ApiKeyModalProps {
  apiKey: { key: 'youtube' | 'gemini' | 'analytics' | 'reporting', name: string };
  currentValue: string;
  onSave: (key: string, value: string) => void;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ apiKey, currentValue, onSave, onClose }) => {
  const [keyValue, setKeyValue] = useState(currentValue);

  const handleSave = () => {
    onSave(apiKey.key, keyValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg text-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">{apiKey.name} 키 관리</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-300">
              API 키
            </label>
            <input
              id="api-key-input"
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="API 키를 여기에 붙여넣으세요"
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end items-center p-4 border-t border-gray-700 space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
            취소
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 hover:bg-blue-700">
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;