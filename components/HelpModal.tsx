import React, { useState } from 'react';
import VideoFormulaView from './VideoFormulaView';

// Icons
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const KeyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H5v-2H3v-2H1v-4a6 6 0 016-6h4a6 6 0 016 6z" /></svg>;
const FormulaIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>;


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
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpenIcon /> 콘텐츠 OS 사용 설명서 (User Guide)
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto">
            <HelpSection title="핵심 메뉴 (Core Menus)" icon={<SearchIcon />}>
              <p>콘텐츠 OS는 영상 콘텐츠 데이터 분석을 위한 강력한 도구 모음입니다. 상단 메뉴를 통해 주요 기능에 접근할 수 있습니다.</p>
              <ul className="list-disc list-outside pl-5 space-y-1">
                <li><b>분석 (Analysis):</b> 메인 대시보드입니다. 키워드 또는 채널을 검색하여 관련 영상 등을 확인할 수 있습니다. 모든 분석의 시작점입니다.</li>
                <li><b>인기 차트 (Top Charts):</b> 국가 및 카테고리별 인기 채널/영상 목록을 제공합니다.</li>
                <li><b>워크플로우 (Workflow):</b> 채널 성장을 위한 전문 분석 도구 모음입니다. 아이디어 발상부터 전략 수립까지 단계별로 기능을 사용할 수 있습니다.</li>
                 <li><b>내 채널 (My Channel):</b> 분석하고 싶은 채널의 데이터를 심층 분석하고, 콘텐츠 OS를 통해 맞춤형 성장 전략을 진단받는 공간입니다.</li>
              </ul>
            </HelpSection>

            <HelpSection title="워크플로우 기능 상세 (Workflow Details)" icon={<FilterIcon />}>
              <p>'워크플로우' 메뉴는 아이디어 발상부터 전략 수립까지, 콘텐츠 제작의 전 과정을 돕는 다양한 도구들로 구성되어 있습니다.</p>
               <ul className="list-disc list-outside pl-5 space-y-1">
                <li><b>아웃라이어 & 트렌드 분석:</b> 평균을 훌쩍 뛰어넘는 '대박' 영상을 찾아내고, 국가별 실시간 트렌드를 분석하여 새로운 기회를 포착합니다.</li>
                <li><b>썸네일 & 제목 분석:</b> 특정 키워드의 상위 영상들을 콘텐츠 OS가 분석하여, 가장 효과적인 썸네일과 제목의 패턴을 알려드립니다.</li>
                <li><b>A/B 테스트 게임:</b> 어떤 썸네일과 제목이 더 높은 성과를 냈는지 맞추는 게임을 통해, 성과가 좋은 콘텐츠에 대한 감을 기를 수 있습니다.</li>
                <li><b>채널 정체성 진단:</b> 6단계 질문을 통해 내 채널의 정체성과 콘텐츠 방향성의 일관성을 분석하고, 맞춤형 콘텐츠 시리즈와 키워드 전략을 제안받습니다.</li>
                <li><b>컬렉션:</b> 분석 과정에서 발견한 중요한 채널이나 영상을 자동으로 저장하는 북마크 기능입니다.</li>
              </ul>
            </HelpSection>

            <HelpSection title="콘텐츠 OS 영상 공식 (Video Formula)" icon={<FormulaIcon />}>
                <p>콘텐츠 OS의 영상 분석 AI, 'Johnson'이 영상의 성공 가능성을 판단하는 핵심 분석 철학입니다. 이 공식을 이해하면 AI의 분석 결과를 더 깊이 있게 활용할 수 있습니다.</p>
                <button onClick={() => setIsFormulaModalOpen(true)} className="text-blue-400 hover:underline text-sm font-semibold mt-2">
                    영상 공식 전체 보기
                </button>
            </HelpSection>

            <HelpSection title="API 키 안내 (API Key Information)" icon={<KeyIcon />}>
                <p>콘텐츠 OS의 모든 기능은 관리자가 설정한 시스템 API 키를 통해 중앙에서 관리됩니다. 사용자는 별도의 API 키를 설정할 필요가 없습니다. 서비스 이용 중 API 관련 문제가 발생할 경우, 관리자(8friend8ship@hanmail.net)에게 문의해주세요.</p>
            </HelpSection>
          </div>
        </div>
      </div>
      {isFormulaModalOpen && <VideoFormulaView onClose={() => setIsFormulaModalOpen(false)} />}
    </>
  );
};

export default HelpModal;