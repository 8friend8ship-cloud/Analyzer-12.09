
import React from 'react';

// Icons
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const LightbulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const KeyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H5v-2H3v-2H1v-4a6 6 0 016-6h4a6 6 0 016 6z" /></svg>;


interface HelpModalProps {
  onClose: () => void;
}

const HelpSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="mb-6">
    <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2 mb-2">
      {icon}
      <span>{title}</span>
    </h3>
    <div className="text-gray-300 text-sm leading-relaxed space-y-2 pl-7">
      {children}
    </div>
  </section>
);

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpenIcon /> 콘텐츠 OS 사용 설명서
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <HelpSection title="핵심 메뉴" icon={<SearchIcon />}>
            <p>콘텐츠 OS는 유튜브 데이터 분석을 위한 강력한 도구 모음입니다. 상단 메뉴를 통해 주요 기능에 접근할 수 있습니다.</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li><b>분석:</b> 메인 대시보드입니다. 키워드 또는 채널을 검색하여 관련 영상, AI 분석 차트, 광고 키워드 등을 확인할 수 있습니다. 모든 분석의 시작점입니다.</li>
              <li><b>랭킹:</b> 국가 및 카테고리별 실시간 인기 채널/영상 순위를 제공합니다. 특히 '급성장(조대전)' 탭은 구독자 대비 조회수 비율이 높은 '알고리즘 픽' 영상을 찾아내는 데 유용합니다.</li>
              <li><b>워크플로우:</b> 채널 성장을 위한 전문 분석 도구 모음입니다. 아이디어 발상부터 전략 수립까지 단계별로 기능을 사용할 수 있습니다.</li>
               <li><b>내 채널:</b> 인증된 내 채널의 상세 데이터를 분석하고, AI를 통해 맞춤형 성장 전략을 진단받는 공간입니다.</li>
            </ul>
          </HelpSection>

          <HelpSection title="워크플로우 기능 상세" icon={<FilterIcon />}>
            <p>'워크플로우' 메뉴는 아이디어 발상부터 전략 수립까지, 콘텐츠 제작의 전 과정을 돕는 강력한 도구들로 구성되어 있습니다.</p>
             <ul className="list-disc list-outside pl-5 space-y-1">
              <li><b>아웃라이어 영상 분석:</b> 평균을 훌쩍 뛰어넘는 '대박' 영상을 찾아내고, 국가별 실시간 트렌드를 분석하여 새로운 기회를 포착합니다.</li>
              <li><b>썸네일 & 제목 분석:</b> 특정 키워드의 상위 영상들을 AI가 분석하여, 가장 효과적인 썸네일과 제목의 '성공 공식'을 알려줍니다.</li>
              <li><b>A/B 테스트 게임:</b> 어떤 썸네일과 제목이 더 높은 성과를 냈는지 맞추는 게임을 통해, 성공하는 콘텐츠에 대한 감을 기를 수 있습니다.</li>
              <li><b>채널 DNA 진단 (알고리즘 주제 찾기):</b> 6단계의 심리 테스트를 통해 내 채널의 정체성(페르소나)과 알고리즘 적합도를 분석하고, 맞춤형 콘텐츠 시리즈와 키워드 전략을 추천받습니다.</li>
              <li><b>컬렉션:</b> 분석 과정에서 발견한 중요한 채널이나 영상을 자동으로 저장하는 북마크 기능입니다. 수집된 데이터는 언제든지 다시 확인하거나 CSV 파일로 다운로드할 수 있습니다.</li>
            </ul>
          </HelpSection>

          <HelpSection title="API 키 설정" icon={<KeyIcon />}>
            <p>콘텐츠 OS의 모든 기능을 원활하게 사용하려면 API 키 설정이 필수입니다. 헤더의 'API Status' 아이콘을 통해 현재 상태를 확인할 수 있습니다.</p>
             <ul className="list-disc list-outside pl-5 space-y-1">
                <li><b>필수 API 키:</b>
                    <ul className="list-decimal list-outside pl-5 mt-1 space-y-1">
                        <li><b>YouTube Data API:</b> 영상 및 채널의 기본 데이터를 수집하는 데 사용됩니다.</li>
                        <li><b>Gemini API:</b> AI 심층 분석, 키워드 추천, 썸네일 분석 등 모든 AI 기능에 사용됩니다.</li>
                    </ul>
                </li>
                <li><b>설정 방법:</b>
                    <ul className="list-decimal list-outside pl-5 mt-1 space-y-1">
                        <li><b>일반 사용자:</b> '계정 설정' 메뉴에서 개인 API 키를 입력할 수 있습니다. 개인 키는 관리자가 설정한 공용 키보다 우선적으로 사용됩니다.</li>
                        <li><b>관리자:</b> '관리자' 메뉴에서 시스템 전체에 적용될 공용 API 키를 설정할 수 있습니다.</li>
                    </ul>
                </li>
                 <li><b>상태 확인:</b> 헤더의 'API Status' 아이콘이 <span className="text-green-400 font-semibold">녹색</span>이면 모든 키가 정상 설정된 상태이며, <span className="text-red-400 font-semibold">빨간색</span>이면 일부 또는 전체 키가 누락된 상태이니 설정을 확인해주세요.</li>
            </ul>
          </HelpSection>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
