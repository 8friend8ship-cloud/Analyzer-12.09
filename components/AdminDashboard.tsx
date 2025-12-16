
import React, { useState, useRef, useEffect } from 'react';
import ApiKeyModal from './ApiKeyModal';
import EditUserModal from './EditUserModal';
import type { AppSettings, Plan, User } from '../types';
import { clearCache } from '../services/cacheService';
import { getStoredUsers, upsertUser } from '../services/storageService';

interface AdminDashboardProps {
  onBack: () => void;
  settings: AppSettings;
  onUpdateSettings: (updatedSettings: Partial<AppSettings>) => void;
}

// User interface for modal
interface UserForModal {
  id: string;
  name: string;
  email: string;
  plan: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, settings, onUpdateSettings }) => {
  const [users, setUsers] = useState<User[]>([]);
  
  // Local state for modal visibility and temporary data
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<{key: keyof AppSettings['apiKeys'], name: string} | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserForModal | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load users from storage
  const refreshUsers = () => {
      const storedUsers = getStoredUsers();
      setUsers(storedUsers);
  };

  useEffect(() => {
      refreshUsers();
  }, []);

  const handlePlanChange = (planKey: 'pro' | 'biz', field: 'analyses' | 'price', value: string) => {
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue) && numericValue >= 0) {
      const updatedPlans = {
        ...settings.plans,
        [planKey]: { ...settings.plans[planKey], [field]: numericValue }
      };
      onUpdateSettings({ plans: updatedPlans });
    }
  };

  const handleFreePlanLimitChange = (value: string) => {
    const numericValue = parseInt(value, 10);
     if (!isNaN(numericValue) && numericValue >= 0) {
        onUpdateSettings({ freePlanLimit: numericValue });
     }
  };

  const handleSaveSettings = (settingName: string) => {
      alert(`${settingName} 설정이 저장되었습니다. 즉시 반영됩니다.`);
  };

  const openApiKeyModal = (key: keyof AppSettings['apiKeys'], name: string) => {
    setEditingApiKey({ key, name });
    setIsApiKeyModalOpen(true);
  };

  const handleSaveApiKey = (key: string, value: string) => {
    const updatedApiKeys = {
        ...settings.apiKeys,
        [key]: value
    };
    onUpdateSettings({ apiKeys: updatedApiKeys });
    setIsApiKeyModalOpen(false);
    setEditingApiKey(null);
    alert(`${key} 키가 시스템에 영구 저장되었습니다.`);
  };

  const openUserModal = (user: User) => {
    setEditingUser({ id: user.id, name: user.name, email: user.email, plan: user.plan });
    setIsUserModalOpen(true);
  };
  
  const handleSaveUser = (updatedUserModalData: UserForModal) => {
      const targetUser = users.find(u => u.id === updatedUserModalData.id);
      if (targetUser) {
          const updatedUser = { ...targetUser, plan: updatedUserModalData.plan as any };
          
          // If plan changed to paid, set expiration (demo logic)
          if (updatedUserModalData.plan !== 'Free' && targetUser.plan === 'Free') {
              const date = new Date();
              date.setMonth(date.getMonth() + 1);
              updatedUser.planExpirationDate = date.toISOString().split('T')[0];
          }

          upsertUser(updatedUser);
          refreshUsers(); // Reload list
          alert(`${updatedUser.name}님의 정보를 수정했습니다.`);
      }
      setIsUserModalOpen(false);
      setEditingUser(null);
  };
  
  const handleExportSettings = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "content-os-settings.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    alert('설정이 내보내졌습니다.');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File is not a text file");
        const importedSettings = JSON.parse(text);
        
        const settingsToUpdate: Partial<AppSettings> = {};
        if (typeof importedSettings.freePlanLimit === 'number') {
            settingsToUpdate.freePlanLimit = importedSettings.freePlanLimit;
        }
        if (importedSettings.plans?.pro && importedSettings.plans?.biz) {
            settingsToUpdate.plans = importedSettings.plans;
        }
        if (importedSettings.apiKeys) {
            settingsToUpdate.apiKeys = importedSettings.apiKeys;
        }

        if (Object.keys(settingsToUpdate).length > 0) {
            onUpdateSettings(settingsToUpdate);
            alert('설정을 성공적으로 가져왔습니다.');
        } else {
            alert('가져올 유효한 설정이 파일에 없습니다.');
        }

      } catch (error) {
        console.error("Failed to parse settings file:", error);
        alert('잘못된 설정 파일입니다.');
      }
    };
    reader.readAsText(file);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleClearCache = () => {
    clearCache();
    alert('애플리케이션 캐시가 모두 삭제되었습니다.');
  };
  

  const apiConfigs = [
    { key: 'youtube' as const, name: 'YouTube Data API v3', description: '채널 정보 및 비디오 데이터 수집에 사용됩니다.' },
    { key: 'gemini' as const, name: 'Gemini API', description: 'AI 기능(연관 키워드, AI 분석)에 사용됩니다.' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 text-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">관리자 대시보드</h1>
        <button onClick={onBack} className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">
          ← 대시보드로 돌아가기
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
            <h2 className="text-xl font-semibold mb-4">앱 초기 설정</h2>
            <div>
              <label htmlFor="free-limit" className="block text-sm font-medium text-gray-400">무료 플랜 월간 사용량 제한</label>
              <div className="mt-2 flex items-center gap-3">
                <input type="number" id="free-limit" value={settings.freePlanLimit} onChange={(e) => handleFreePlanLimitChange(e.target.value)} className="block w-full max-w-xs bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
                <button onClick={() => handleSaveSettings('무료 플랜')} className="px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 hover:bg-blue-700">설정 저장</button>
              </div>
              <p className="mt-2 text-xs text-gray-500">모든 Free 플랜 사용자에게 즉시 적용됩니다.</p>
            </div>
          </div>
          
           {/* Pricing Plan Management */}
          <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
            <h2 className="text-xl font-semibold mb-4">요금제 관리</h2>
            <div className="space-y-4">
              {Object.entries(settings.plans).map(([key, plan]: [string, Plan]) => (
                <div key={key}>
                  <h3 className="font-semibold text-lg text-blue-400">{plan.name} Plan</h3>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label htmlFor={`${key}-analyses`} className="block text-sm font-medium text-gray-400">월 분석 횟수</label>
                      <input type="number" id={`${key}-analyses`} value={plan.analyses} onChange={e => handlePlanChange(key as 'pro' | 'biz', 'analyses', e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2"/>
                    </div>
                     <div>
                      <label htmlFor={`${key}-price`} className="block text-sm font-medium text-gray-400">가격 (원)</label>
                      <input type="number" id={`${key}-price`} value={plan.price} onChange={e => handlePlanChange(key as 'pro' | 'biz', 'price', e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2"/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => handleSaveSettings('요금제')} className="mt-4 w-full px-4 py-2 text-sm font-semibold rounded-md bg-green-600 hover:bg-green-700">요금제 변경사항 저장</button>
          </div>
           <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
            <h2 className="text-xl font-semibold mb-2">설정 및 캐시 관리</h2>
            <p className="text-sm text-gray-400 mb-4">현재 관리자 설정을 파일로 내보내거나, 백업 파일로부터 복원합니다.</p>
            <div className="flex gap-4">
              <button onClick={handleExportSettings} className="flex-1 px-4 py-3 text-sm font-bold rounded-md bg-green-600 hover:bg-green-700">설정 내보내기 (json)</button>
              <button onClick={handleImportClick} className="flex-1 px-4 py-3 text-sm font-bold rounded-md bg-blue-600 hover:bg-blue-700">설정 가져오기 (json)</button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700/50">
                 <h3 className="font-semibold text-gray-300 mb-2">세션 캐시 관리</h3>
                 <p className="text-xs text-gray-400 mb-3">현재 브라우저 세션에 저장된 API 응답 캐시를 지웁니다.</p>
                 <button onClick={handleClearCache} className="w-full px-4 py-3 text-sm font-bold rounded-md bg-red-600 hover:bg-red-700">세션 캐시 전체 삭제</button>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">가입자 관리 ({users.length}명)</h2>
                <button onClick={refreshUsers} className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">새로고침</button>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 sticky top-0 bg-gray-900">
                        <tr>
                            <th className="p-2">이름</th>
                            <th className="p-2">요금제</th>
                            <th className="p-2">사용량</th>
                            <th className="p-2">만료일</th>
                            <th className="p-2"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-700/30">
                                <td className="p-2">
                                    <div className="font-semibold text-white">{user.name} {user.isAdmin && <span className="text-xs text-yellow-400 ml-1">(Admin)</span>}</div>
                                    <div className="text-gray-400 text-xs">{user.email}</div>
                                </td>
                                <td className="p-2">
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${user.plan === 'Biz' ? 'bg-purple-500/20 text-purple-300' : user.plan === 'Pro' ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-600/20 text-gray-400'}`}>
                                        {user.plan}
                                    </span>
                                </td>
                                <td className="p-2 text-gray-300">{user.usage}회</td>
                                <td className="p-2 text-gray-400 text-xs">{user.planExpirationDate || '-'}</td>
                                <td className="p-2 text-right">
                                    <button onClick={() => openUserModal(user)} className="text-blue-400 hover:text-blue-300 text-xs bg-gray-700 px-2 py-1 rounded">수정</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
          <h2 className="text-xl font-semibold mb-2">공용 시스템 API 키 관리</h2>
          <p className="text-sm text-gray-400 mb-6">여기에 저장된 키는 개인 키가 없는 사용자들에게 기본으로 제공됩니다.<br/>한 번 저장하면 관리자 화면에서 영구적으로 유지됩니다.</p>
          <div className="space-y-4">
            {apiConfigs.map(config => (
              <div key={config.key} className="bg-gray-900/50 p-4 rounded-md flex justify-between items-center border border-gray-700/50">
                <div>
                  <h3 className="font-semibold text-white">{config.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{config.description}</p>
                  {settings.apiKeys[config.key] ? (
                     <div className="flex items-center gap-2 mt-2">
                        <span className="text-green-400 text-sm font-semibold">✅ 저장됨 (••••••••)</span>
                        <span className="text-xs text-gray-500">정상 작동 중</span>
                     </div>
                  ) : (
                     <p className="text-sm font-semibold text-yellow-400 mt-2">⚠️ 설정되지 않음</p>
                  )}
                </div>
                <button onClick={() => openApiKeyModal(config.key, config.name)} className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600">
                   {settings.apiKeys[config.key] ? '키 관리/수정' : '키 등록'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {isApiKeyModalOpen && editingApiKey && (
        <ApiKeyModal 
            apiKey={editingApiKey}
            currentValue={settings.apiKeys[editingApiKey.key]}
            onSave={handleSaveApiKey}
            onClose={() => setIsApiKeyModalOpen(false)}
        />
      )}
      {isUserModalOpen && editingUser && (
        <EditUserModal 
            user={{...editingUser, id: 0} as any} // Prop type compatibility mapping
            onSave={(u) => handleSaveUser({...u, id: editingUser.id} as UserForModal)}
            onClose={() => setIsUserModalOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
