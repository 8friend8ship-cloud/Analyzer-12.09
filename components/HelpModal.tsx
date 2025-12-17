
import React from 'react';

// Icons
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const KeyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H5v-2H3v-2H1v-4a6 6 0 016-6h4a6 6 0 016 6z" /></svg>;
const RocketIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

interface HelpModalProps {
  onClose: () => void;
}

const HelpSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; color?: string }> = ({ title, icon, children, color = "text-blue-400" }) => (
  <section className="mb-8">
    <h3 className={`text-xl font-bold ${color} flex items-center gap-2 mb-3`}>
      {icon}
      <span>{title}</span>
    </h3>
    <div className="text-gray-300 text-sm leading-7 space-y-2 pl-2 border-l-2 border-gray-700 ml-2">
      {children}
    </div>
  </section>
);

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col transform transition-all" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 flex-shrink-0 bg-gray-900/50 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
              <BookOpenIcon /> Johnson YouTube Analyzer
            </h2>
            <p className="text-sm text-gray-400 mt-1">유튜브 데이터 기반 AI 인사이트 분석 자동화 가이드</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/30 mb-8">
            <p className="text-blue-200 font-medium text-center">
              "안녕하세요! 저는 당신의 유튜브 채널 성장을 돕는 AI 비서 <b>Johnson</b>입니다.<br/>
              복잡한 데이터는 제가 분석할게요. 크리에이터님은 멋진 콘텐츠만 만드세요!"
            </p>
          </div>

          <HelpSection title="1. 분석 (채널 건강검진)" icon={<SearchIcon />} color="text-yellow-400">
            <p>병원을 가서 건강검진을 받듯이, 유튜브 채널과 키워드의 상태를 확인하는 곳입니다.</p>
            <ul className="list-disc list-outside pl-5 space-y-1 mt-2 text-gray-400">
              <li><b>키워드 검색:</b> '먹방', '여행' 같은 단어를 입력하면, 사람들이 좋아하는 영상 스타일과 숨겨진 꿀팁을 찾아드려요.</li>
              <li><b>채널 검색:</b> 내 채널이나 라이벌 채널 주소를 넣으면, 구독자가 왜 늘지 않는지, 어떤 영상이 효자인지 AI가 분석해줍니다.</li>
            </ul>
          </HelpSection>

          <HelpSection title="2. 랭킹 (인기 순위표)" icon={<ChartBarIcon />} color="text-green-400">
            <p>지금 전 세계에서, 그리고 우리나라에서 무엇이 유행인지 한눈에 보여드립니다.</p>
            <ul className="list-disc list-outside pl-5 space-y-1 mt-2 text-gray-400">
              <li><b>급성장 (조대전):</b> 구독자는 적은데 조회수가 폭발한 '작은 거인' 채널들을 찾아보세요. 벤치마킹하기 딱 좋아요!</li>
              <li><b>국가별 트렌드:</b> 미국, 일본 등 다른 나라에서는 어떤 영상이 뜨고 있는지 확인하고 아이디어를 얻으세요.</li>
            </ul>
          </HelpSection>

          <HelpSection title="3. 워크플로우 (성장 도구 상자)" icon={<RocketIcon />} color="text-purple-400">
            <p>초보 유튜버를 위한 특별한 마법 도구들이 모여 있는 곳입니다.</p>
            <ul className="list-disc list-outside pl-5 space-y-1 mt-2 text-gray-400">
              <li><b>아웃라이어 분석:</b> 남들보다 5배, 10배 더 조회수가 나온 '대박 영상'만 골라 보여줍니다.</li>
              <li><b>썸네일 & 제목 분석:</b> AI가 잘된 썸네일들의 공통점을 찾아서 "이렇게 만드세요"라고 알려줍니다.</li>
              <li><b>채널 DNA 진단 (추천):</b> 심리 테스트처럼 6가지 질문에 답하면, 내 채널이 나아갈 방향과 딱 맞는 주제를 정해줍니다.</li>
              <li><b>A/B 테스트 게임:</b> 어떤 썸네일이 더 조회수가 높을까요? 게임을 통해 감각을 키워보세요!</li>
            </ul>
          </HelpSection>

          <HelpSection title="4. API 키 설정 (필수!)" icon={<KeyIcon />} color="text-red-400">
            <p>자동차가 달리려면 기름이 필요하듯, Johnson Analyzer가 작동하려면 <b>API 키</b>가 필요합니다.</p>
            <div className="bg-gray-700/30 p-3 rounded-lg mt-2">
                <p className="mb-2">🔑 <b>API 키가 무엇인가요?</b></p>
                <p className="text-xs text-gray-400">유튜브와 AI에게 정보를 요청할 수 있는 '디지털 열쇠'입니다. 구글 클라우드에서 무료로 발급받을 수 있습니다.</p>
            </div>
            <ul className="list-disc list-outside pl-5 space-y-1 mt-3 text-gray-400">
                <li><b>YouTube API:</b> 영상 정보를 가져오는 데 사용합니다.</li>
                <li><b>Gemini API:</b> 똑똑한 AI 분석을 하는 데 사용합니다.</li>
                <li>오른쪽 상단 메뉴의 <b>[계정 설정]</b>에서 '키 발급 받기' 링크를 눌러 쉽게 등록할 수 있습니다.</li>
            </ul>
          </HelpSection>

          <HelpSection title="5. 일일 사용량과 제한 (FAQ)" icon={<InfoIcon />} color="text-gray-200">
            <p>Google은 사용자가 하루에 요청할 수 있는 정보의 양을 정해두었습니다. (일일 쿼터)</p>
            <ul className="list-disc list-outside pl-5 space-y-2 mt-2 text-gray-400">
              <li>
                <b>YouTube 쿼터:</b> 하루에 약 10,000 유닛이 제공됩니다. 검색 1회당 약 100 유닛이 소모되므로, 
                <span className="text-yellow-400 font-semibold"> 하루에 약 100번 정도의 검색</span>이 가능합니다. 영상 상세 조회는 훨씬 적게 소모됩니다.
              </li>
              <li>
                <b>리셋 시간:</b> 매일 오후 4~5시(한국 시간) 경에 할당량이 초기화됩니다.
              </li>
              <li>
                <b>오류 발생 시:</b> "할당량 초과" 메시지가 뜨면, 해당 계정의 오늘치 YouTube 이용권을 다 쓰신 것입니다. 
                내일 다시 시도하거나, 다른 구글 계정으로 키를 발급받아 교체하시면 됩니다.
              </li>
            </ul>
          </HelpSection>

        </div>
        
        <div className="p-4 border-t border-gray-700 flex justify-center bg-gray-900/50 rounded-b-2xl">
            <button onClick={onClose} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-transform transform hover:scale-105 shadow-lg">
                이제 시작해볼까요?
            </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
