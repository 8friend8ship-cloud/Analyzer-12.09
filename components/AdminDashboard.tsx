
import React, { useState, useRef, useEffect } from 'react';
import ApiKeyModal from './ApiKeyModal';
import EditUserModal from './EditUserModal';
// FIX: Centralized types in types.ts
import type { AppSettings, Plan } from '../types';
import { clearCache } from '../services/cacheService';

// Mock data for user management
const initialUsers = [
  { id: 1, name: 'Admin User', email: 'adm***@corp.com', isAdmin: true, plan: 'Biz', status: 'Active', expires: '2025. 12. 31.', },
  { id: 2, name: 'Demo User', email: 'demo@user.com', isAdmin: false, plan: 'Free', status: 'N/A', expires: 'N/A', },
  { id: 3, name: 'Pro User', email: 'pro@user.com', isAdmin: false, plan: 'Pro', status: 'Active', expires: '2025. 11. 20.', },
];

interface AdminDashboardProps {
  onBack: () => void;
  settings: AppSettings;
  onUpdateSettings: (updatedSettings: Partial<AppSettings>) => void;
}

// This is a simplified version for the modal
interface UserForModal {
  id: number;
  name: string;
  email: string;
  plan: string;
}

const PlanPreviewCard: React.FC<{ plan: Plan, isRecommended?: boolean }> = ({ plan, isRecommended = false }) => (
    <div className={`relative rounded-xl border p-6 text-center h-full flex flex-col ${isRecommended ? 'border-blue-500 bg-gray-800/50' : 'border-gray-700 bg-gray-800/60'}`}>
        {isRecommended && <div className="absolute top-0 right-6 -mt-3 inline-block rounded-full bg-blue-500 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white">추천</div>}
        <h3 className="text-2xl font-semibold">{plan.name}</h3>
        <p className="mt-2 text-gray-400 text-sm flex-grow h-10">{plan.description}</p>
        <div className="mt-6">
            <span className="text-4xl font-bold">₩{plan.price.toLocaleString()}</span>
            <span className="text-base font-medium text-gray-400">/월</span>
        </div>
        <ul className="mt-6 space-y-3 text-left text-sm">
            {plan.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-start">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="ml-3 text-gray-300">{feature}</span>
                </li>
            ))}
        </ul>
    </div>
);


const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, settings, onUpdateSettings }) => {
  // User management state remains local as it's a mock feature for now
  const [users, setUsers] = useState(initialUsers);

  // Local state for settings to enable "save" functionality
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  
  // Local state for modal visibility and temporary data
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<{key: keyof AppSettings['apiKeys'], name: string} | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserForModal | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers now update local state. The save button will commit to parent.
  const handlePlanChange = (planKey: 'free' | 'pro' | 'biz', field: 'analyses' | 'price', value: string) => {
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setLocalSettings(prev => {
          const newPlans = { ...prev.plans };
          newPlans[planKey] = { ...newPlans[planKey], [field]: numericValue };
          return { ...prev, plans: newPlans };
      });
    }
  };

  const handleTextChange = (planKey: 'free' | 'pro' | 'biz', field: 'description', value: string) => {
      setLocalSettings(prev => {
          const newPlans = { ...prev.plans };
          newPlans[planKey] = { ...newPlans[planKey], [field]: value };
          return { ...prev, plans: newPlans };
      });
  };

  const handleFeaturesChange = (planKey: 'free' | 'pro' | 'biz', value: string) => {
      const featuresArray = value.split('\n').map(f => f.trim()).filter(f => f);
      setLocalSettings(prev => {
          const newPlans = { ...prev.plans };
          newPlans[planKey] = { ...newPlans[planKey], features: featuresArray };
          return { ...prev, plans: newPlans };
      });
  };

  const handleSaveSettings = (settingName: string) => {
      onUpdateSettings({ plans: localSettings.plans });
      alert(`${settingName} 설정이 저장되었습니다.`);
  };

  const openApiKeyModal = (key: keyof AppSettings['apiKeys'], name: string) => {
    setEditingApiKey({ key, name });
    setIsApiKeyModalOpen(true);
  };

  const handleSaveApiKey = (key: string, value: string) => {
    // This can still update directly as it's a separate concern from plans
    const updatedApiKeys = {
        ...settings.apiKeys,
        [key]: value
    };
    onUpdateSettings({ apiKeys: updatedApiKeys });
    setIsApiKeyModalOpen(false);
    setEditingApiKey(null);
  };

  const openUserModal = (user: (typeof initialUsers)[0]) => {
    setEditingUser({ id: user.id, name: user.name, email: user.email, plan: user.plan });
    setIsUserModalOpen(true);
  };
  
  const handleSaveUser = (updatedUser: UserForModal) => {
      setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? { ...u, plan: updatedUser.plan } : u));
      setIsUserModalOpen(false);
      setEditingUser(null);
  };
  
  const handleExportSettings = () => {
    // Export settings from props (saved state)
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
        
        // Construct a partial settings object to update
        const settingsToUpdate: Partial<AppSettings> = {};
        if (importedSettings.plans?.free && importedSettings.plans?.pro && importedSettings.plans?.biz) {
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
    { 
      key: 'youtube' as const, 
      name: 'YouTube Data API v3', 
      description: '채널 정보 및 비디오 데이터 수집에 사용됩니다.',
      instructions: {
        link: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
        steps: [
            'Google Cloud Console로 이동하여 프로젝트를 선택/생성합니다.',
            'YouTube Data API v3를 "사용 설정"합니다.',
            '좌측 메뉴에서 "사용자 인증 정보"로 이동합니다.',
            '"사용자 인증 정보 만들기" > "API 키"를 선택하여 키를 생성합니다.',
            '생성된 키를 복사하여 여기에 붙여넣습니다.'
        ]
      }
    },
    { 
      key: 'gemini' as const, 
      name: 'Gemini API', 
      description: 'AI 기능(연관 키워드, AI 분석)에 사용됩니다.',
      instructions: {
        link: 'https://aistudio.google.com/app/apikey',
        steps: [
            'Google AI Studio로 이동하여 로그인합니다.',
            '"Get API key"를 클릭합니다.',
            '"Create API key in new project"를 선택하여 키를 생성합니다.',
            '생성된 키를 복사하여 여기에 붙여넣습니다.'
        ]
      }
    },
    { 
      key: 'analytics' as const, 
      name: 'YouTube Analytics API', 
      description: '채널의 심층적인 시청자 데이터 분석에 사용됩니다.',
      instructions: {
        link: 'https://console.cloud.google.com/apis/library/youtubeanalytics.googleapis.com',
        steps: [
            'YouTube Data API와 동일한 Google Cloud 프로젝트를 사용하세요.',
            'YouTube Analytics API를 "사용 설정"합니다.',
            '이 API는 OAuth 2.0 인증이 필요하며, 현재 앱에서는 제한적으로 사용됩니다.'
        ]
      }
    },
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
            <h2 className="text-xl font-semibold mb-4">요금제 관리</h2>
            <div className="space-y-6">
              {Object.entries(localSettings.plans).map(([key, plan]: [string, Plan]) => (
                <div key={key}>
                  <h3 className="font-semibold text-lg text-blue-400">{plan.name} Plan</h3>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label htmlFor={`${key}-analyses`} className="block text-sm font-medium text-gray-400">월 분석 횟수</label>
                      <input type="number" id={`${key}-analyses`} value={plan.analyses} onChange={e => handlePlanChange(key as 'free' | 'pro' | 'biz', 'analyses', e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2"/>
                    </div>
                     <div>
                      <label htmlFor={`${key}-price`} className="block text-sm font-medium text-gray-400">가격 (원)</label>
                      <input type="number" id={`${key}-price`} value={plan.price} onChange={e => handlePlanChange(key as 'free' | 'pro' | 'biz', 'price', e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2"/>
                    </div>
                  </div>
                  <div className="mt-3">
                      <label htmlFor={`${key}-description`} className="block text-sm font-medium text-gray-400">설명</label>
                      <input type="text" id={`${key}-description`} value={plan.description} onChange={e => handleTextChange(key as 'free'|'pro'|'biz', 'description', e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2"/>
                  </div>
                  <div className="mt-3">
                      <label htmlFor={`${key}-features`} className="block text-sm font-medium text-gray-400">기능 목록 (한 줄에 하나씩)</label>
                      <textarea id={`${key}-features`} rows={4} value={plan.features.join('\n')} onChange={e => handleFeaturesChange(key as 'free'|'pro'|'biz', e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2"/>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => handleSaveSettings('요금제')} className="mt-6 w-full px-4 py-2 text-sm font-semibold rounded-md bg-green-600 hover:bg-green-700">요금제 변경사항 저장</button>
          </div>

          <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
              <h2 className="text-xl font-semibold mb-4">요금제 미리보기</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <PlanPreviewCard plan={localSettings.plans.free} />
                  <PlanPreviewCard plan={localSettings.plans.pro} isRecommended={true} />
                  <PlanPreviewCard plan={localSettings.plans.biz} />
              </div>
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
                 <p className="text-xs text-gray-400 mb-3">현재 브라우저 세션에 저장된 API 응답 캐시를 지웁니다. 데이터가 갱신되지 않는 문제가 있을 때 사용하세요.</p>
                 <button onClick={handleClearCache} className="w-full px-4 py-3 text-sm font-bold rounded-md bg-red-600 hover:bg-red-700">세션 캐시 전체 삭제</button>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
           <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
            <h2 className="text-xl font-semibold mb-2">API 키 관리</h2><p className="text-sm text-gray-400 mb-6">어플리케이션에서 사용하는 외부 API 키를 관리합니다. 키는 안전하게 저장됩니다.</p>
            <div className="space-y-4">
                {apiConfigs.map(config => (
                <div key={config.key} className="bg-gray-900/50 p-4 rounded-md">
                    <div className="flex justify-between items-start gap-4">
                    <div>
                        <h3 className="font-semibold text-white">{config.name}</h3>
                        <p className="text-xs text-gray-400 mt-1">{config.description}</p>
                        {settings.apiKeys[config.key] ? (
                        <p className="text-sm font-semibold text-green-400 mt-2">설정됨</p>
                        ) : (
                        <p className="text-sm font-semibold text-yellow-400 mt-2">설정되지 않음</p>
                        )}
                    </div>
                    <button onClick={() => openApiKeyModal(config.key, config.name)} className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500 flex-shrink-0">
                        {settings.apiKeys[config.key] ? '키 수정' : '키 추가'}
                    </button>
                    </div>
                    {config.instructions && (
                        <details className="mt-3 text-xs">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-300">API 키 발급 방법 보기</summary>
                        <div className="mt-2 p-3 bg-gray-800 rounded-md space-y-2">
                            <ol className="list-decimal list-inside space-y-1 text-gray-400">
                            {config.instructions.steps.map((step, i) => <li key={i}>{step}</li>)}
                            </ol>
                            <a href={config.instructions.link} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-400 hover:text-blue-300 font-semibold">
                            API 키 발급 페이지로 바로가기 &rarr;
                            </a>
                        </div>
                        </details>
                    )}
                </div>
                ))}
            </div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700/50">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">사용자 관리</h2><button className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-600 hover:bg-gray-500">새로고침</button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-gray-400"><tr><th className="p-2">이름</th><th className="p-2">요금제</th><th className="p-2">상태</th><th className="p-2">만료일</th><th className="p-2"></th></tr></thead><tbody className="divide-y divide-gray-700/50">{users.map(user => (<tr key={user.id}><td className="p-2"><div className="font-semibold text-white">{user.name} {user.isAdmin && <span className="text-xs text-yellow-400">(Admin)</span>}</div><div className="text-gray-400">{user.email}</div></td><td className="p-2">{user.plan}</td><td className="p-2">{user.status === 'Active' ? (<span className="px-2 py-1 text-xs font-semibold bg-green-500/30 text-green-300 rounded-full">{user.status}</span>) : (<span className="text-gray-500">{user.status}</span>)}</td><td className="p-2">{user.expires}</td><td className="p-2 text-right"><button onClick={() => openUserModal(user)} className="text-blue-400 hover:text-blue-300">수정</button></td></tr>))}</tbody></table></div>
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
            user={editingUser}
            onSave={handleSaveUser}
            onClose={() => setIsUserModalOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
