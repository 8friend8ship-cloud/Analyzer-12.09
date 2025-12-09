import React from 'react';

// Icons
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>;
const LightbulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.122-1.28-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.122-1.28.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;


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
            <BookOpenIcon /> Trend Finder 사용 설명서
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <HelpSection title="핵심 기능" icon={<SearchIcon />}>
            <p>Trend Finder는 유튜브 데이터를 분석하여 콘텐츠 전략 수립에 필요한 인사이트를 제공하는 도구입니다.</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li><b>키워드 분석:</b> 특정 키워드로 검색하여 관련 인기 영상, 트렌드, 성과 지표를 분석합니다. 새로운 콘텐츠 아이디어를 얻거나 시장의 수요를 파악할 때 유용합니다.</li>
              <li><b>채널 분석:</b> 특정 채널의 URL이나 ID를 입력하여 해당 채널의 전체적인 성과와 영상 리스트를 분석합니다. 경쟁 채널을 벤치마킹할 때 활용할 수 있습니다.</li>
            </ul>
          </HelpSection>

          <HelpSection title="필터 상세" icon={<FilterIcon />}>
            <p>상단의 필터 바를 사용하여 분석 결과를 정밀하게 제어할 수 있습니다.</p>
             <ul className="list-disc list-outside pl-5 space-y-1">
              <li><b>국가:</b> 분석할 지역을 선택합니다. 대한민국 외 국가 선택 시, AI가 자동으로 키워드를 현지 언어로 번역하여 검색합니다.</li>
              <li><b>정렬:</b> 조회수, 시간당 조회수, 최신순 등 다양한 기준으로 영상 목록을 정렬합니다. '등급' 정렬 시 AI가 평가한 종합 점수가 높은 순으로 볼 수 있습니다.</li>
              <li><b>기간:</b> '최근 7일', '최근 30일' 등 특정 기간 내에 업로드된 영상만 필터링합니다.</li>
              <li><b>종류/조회수:</b> 롱폼/숏폼 영상만 따로 보거나, 최소 조회수 조건을 설정하여 성과가 좋은 영상에 집중할 수 있습니다.</li>
            </ul>
          </HelpSection>

          <HelpSection title="AI 분석 및 지표 이해" icon={<LightbulbIcon />}>
            <p>검색 결과 상단과 영상 리스트에서 제공되는 AI 분석 데이터는 다음과 같습니다.</p>
             <ul className="list-disc list-outside pl-5 space-y-1">
                <li><b>AI 분석 (상단):</b> 검색된 영상들의 데이터를 종합하여 조회수 분포, 영상 길이 분포, 주요 광고 키워드 등을 시각적으로 보여줍니다.</li>
                <li><b>주요 지표 (테이블):</b>
                    <ul className="list-decimal list-outside pl-5 mt-1 space-y-1">
                        <li><b>시간당 조회수:</b> 영상의 현재 인기도(화제성)를 나타내는 가장 중요한 지표입니다.</li>
                        <li><b>참여율:</b> (좋아요 + 댓글 수) / 조회수. 시청자들의 영상에 대한 반응도를 나타냅니다.</li>
                        <li><b>성과 점수 (등급):</b> 시간당 조회수, 참여율, 구독자 대비 조회수 등을 종합하여 S, A, B, C, D 등급으로 영상의 성과를 평가합니다.</li>
                    </ul>
                </li>
                 <li><b>AI 추천 키워드:</b> 검색창 아래에 AI가 추천하는 연관 키워드가 표시됩니다. 클릭하여 바로 검색할 수 있습니다.</li>
            </ul>
          </HelpSection>
          
           <HelpSection title="채널 비교" icon={<UsersIcon />}>
            <p>'채널 비교' 버튼을 클릭하여 두 개의 채널을 직접 비교 분석할 수 있습니다.</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
                <li><b>기본 정보:</b> 구독자, 총 조회수 등 채널의 기본 스탯을 나란히 비교합니다.</li>
                <li><b>최근 영상 / 태그 분석:</b> 두 채널의 최근 콘텐츠 전략과 핵심 키워드를 비교하여 강점과 약점을 파악합니다.</li>
                <li><b>AI 인사이트:</b> Gemini AI가 두 채널 데이터를 종합 분석하여 각 채널의 강점과 성장 전략을 자동으로 요약, 제안해줍니다.</li>
            </ul>
          </HelpSection>
          
           <HelpSection title="상세 인사이트" icon={<ChartBarIcon />}>
            <p>영상 목록의 '분석' 버튼을 클릭하면 해당 영상이 속한 채널에 대한 깊이 있는 분석이 제공됩니다.</p>
             <ul className="list-disc list-outside pl-5 space-y-1">
                <li><b>채널 개요:</b> 업로드 패턴, 채널 경쟁성, 인기 키워드 등 채널의 핵심 현황을 요약합니다.</li>
                <li><b>성과 트렌드:</b> 롱폼과 쇼츠의 성과를 비교하고, 일별 조회수 추이 그래프를 통해 채널의 성장세를 시각적으로 확인합니다.</li>
                <li><b>급상승 영상:</b> 최근 월/주/일별로 조회수가 급격히 증가한 '떡상' 영상을 찾아내어 성공 요인을 분석할 수 있습니다.</li>
            </ul>
          </HelpSection>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
