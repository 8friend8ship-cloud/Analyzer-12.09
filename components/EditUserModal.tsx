import React, { useState } from 'react';

// Simplified user type for this component
interface User {
  id: number;
  name: string;
  email: string;
  plan: string;
}

interface EditUserModalProps {
  user: User;
  onSave: (updatedUser: User) => void;
  onClose: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onSave, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState(user.plan);

  const handleSave = () => {
    onSave({ ...user, plan: selectedPlan });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg text-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">사용자 정보 수정</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400">이메일</label>
            <p className="text-white mt-1">{user.email}</p>
          </div>
          <div>
            <label htmlFor="plan-select" className="block text-sm font-medium text-gray-300">
              요금제
            </label>
            <select
              id="plan-select"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Free">Free</option>
              <option value="Pro">Pro</option>
              <option value="Biz">Biz</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end items-center p-4 border-t border-gray-700 space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
            취소
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 hover:bg-blue-700">
            변경사항 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
