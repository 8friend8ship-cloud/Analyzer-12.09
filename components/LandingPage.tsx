import React, { useState } from 'react';
import TermsModal from './TermsModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';

interface LandingPageProps {
  onStart: () => void;
}

// Inline SVG icons to remove external dependencies
const ArrowRightIcon = ({ className }: {className?: string}) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;

// New Icons for Feature Section
const CompassIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>;
const BrainCircuitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.993.142M9 8a3 3 0 1 0 5.183 2.378M12 19a3 3 0 1 0 5.993-.142M15 16a3 3 0 1 0-5.183-2.378M14 12a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/><path d="M12 12h.01"/><path d="M17.5 14.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/><path d="M17.5 9.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/><path d="M6.5 14.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/><path d="M6.5 9.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/></svg>;
const WorkflowIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 18a10 10 0 0 0 10-10h-4.1"/><path d="M12 6V2"/><path d="M12 12v-4"/><path d="m16 6 1-1"/><path d="M6 12H2"/><path d="M7 17 6 18"/></svg>;


export default function LandingPage({ onStart }: LandingPageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-[#0F1117] text-white overflow-x-hidden font-sans selection:bg-blue-500 selection:text-white">
        
        {/* 1. Hero Section (메인) */}
        <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-4 pt-20 pb-16 md:pb-24 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
          
          <div 
            className="relative z-10 max-w-5xl mx-auto space-y-8 animate-fade-in"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              영상 콘텐츠 분석 솔루션 (Video Content Analysis Solution)
            </div>

            <h1 className="text-6xl md:text-8xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-500 mb-6">
              Content OS
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
              데이터 기반의 인사이트, <span className="text-blue-400 font-bold">AI를 활용한 전략 수립.</span>
              <br/>(Data-Driven Insights, AI-Powered Strategy Formulation.)
            </p>

            <button
              onClick={onStart}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group relative flex items-center gap-3 px-10 py-5 bg-white text-black rounded-full font-bold text-xl hover:bg-gray-100 transition-all shadow-[0_0_50px_-15px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 mx-auto"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google 계정으로 무료 시작 (Start Free with Google)
              <ArrowRightIcon className={`w-5 h-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
            </button>
            <p className="text-sm text-gray-500 mt-6">신용카드 필요 없음 • 월 30회 무료 분석 제공<br/>(No credit card required • 30 free analyses per month)</p>
          </div>
        </section>
        
        {/* 2. Core Value Section */}
        <section className="py-16 md:py-24 bg-[#0A0C10] border-y border-white/5">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">당신의 채널은 성장할 준비가 되었나요?<br/>(Is Your Channel Ready for Growth?)</h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-12 md:mb-16">
              Content OS는 단순한 데이터 분석 툴이 아닙니다. 아이디어 발상부터 전략 수립까지, 성장하는 크리에이터를 위한 통합 분석 환경입니다.<br/>(Content OS is more than a data tool; it's an integrated analysis environment for growing creators, from ideation to strategy.)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gray-800/30 p-8 rounded-2xl border border-white/10">
                <div className="inline-block p-4 bg-blue-500/10 rounded-xl mb-4 border border-blue-500/20 text-blue-400"><CompassIcon/></div>
                <h3 className="text-xl font-bold mb-2">데이터에서 기회 발견 (Discover Opportunities)</h3>
                <p className="text-gray-400 text-sm leading-relaxed">인기 차트, 트렌드, 경쟁 채널 데이터를 분석하여 성공의 실마리를 찾으세요.<br/>(Analyze charts, trends, and competitor data to find clues for success.)</p>
              </div>
              <div className="bg-gray-800/30 p-8 rounded-2xl border border-white/10">
                <div className="inline-block p-4 bg-blue-500/10 rounded-xl mb-4 border border-blue-500/20 text-blue-400"><BrainCircuitIcon/></div>
                <h3 className="text-xl font-bold mb-2">AI 기반 전략 수립 (AI-Based Strategy)</h3>
                <p className="text-gray-400 text-sm leading-relaxed">AI가 채널에 맞는 콘텐츠, 키워드, 썸네일 전략을 제시하여 성장을 돕습니다.<br/>(AI suggests content, keywords, and thumbnail strategies tailored to your channel.)</p>
              </div>
              <div className="bg-gray-800/30 p-8 rounded-2xl border border-white/10">
                <div className="inline-block p-4 bg-blue-500/10 rounded-xl mb-4 border border-blue-500/20 text-blue-400"><WorkflowIcon/></div>
                <h3 className="text-xl font-bold mb-2">체계적인 워크플로우 (Systematic Workflow)</h3>
                <p className="text-gray-400 text-sm leading-relaxed">전문가의 노하우가 담긴 워크플로우를 따라 채널 운영의 모든 단계를 해결하세요.<br/>(Follow an expert-designed workflow to navigate every stage of channel management.)</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Key Features Section */}
        <section className="py-16 md:py-20">
            <div className="max-w-6xl mx-auto px-4 text-center">
                <h2 className="text-4xl md:text-5xl font-bold mb-4">Content OS의 주요 기능 (Key Features)</h2>
                <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-10 md:mb-12">
                    채널 성장을 돕는 주요 기능으로 당신의 채널을 다음 단계로 이끄세요.<br/>(Take your channel to the next level with key features designed for growth.)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 rounded-2xl border border-white/10 transition-all hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10">
                        <h3 className="text-2xl font-bold text-blue-300 mb-3">채널 정체성 진단 (Channel Identity Diagnosis)</h3>
                        <p className="text-gray-400">6단계 진단을 통해 채널 방향성의 일관성을 점수로 확인하고, 콘텐츠 전략 수립에 활용해 보세요.<br/>(Check your channel's directional consistency with a 6-step diagnosis to inform your content strategy.)</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 rounded-2xl border border-white/10 transition-all hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10">
                        <h3 className="text-2xl font-bold text-purple-300 mb-3">아웃라이어 & 트렌드 분석 (Outlier & Trend Analysis)</h3>
                        <p className="text-gray-400">평균을 뛰어넘는 영상을 포착하고, 실시간 트렌드를 분석하여 바이럴 기회를 선점하세요.<br/>(Capture high-performing videos and analyze real-time trends to seize viral opportunities.)</p>
                    </div>
                     <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 rounded-2xl border border-white/10 transition-all hover:border-yellow-500/50 hover:shadow-2xl hover:shadow-yellow-500/10">
                        <h3 className="text-2xl font-bold text-yellow-300 mb-3">AI 썸네일 & 제목 분석 (AI Thumbnail & Title Analysis)</h3>
                        <p className="text-gray-400">AI가 경쟁 영상들을 분석하여 클릭을 유도하는 효과적인 썸네일과 제목의 패턴을 알려드립니다.<br/>(AI analyzes top videos to reveal effective thumbnail and title patterns that drive clicks.)</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 rounded-2xl border border-white/10 transition-all hover:border-green-500/50 hover:shadow-2xl hover:shadow-green-500/10">
                        <h3 className="text-2xl font-bold text-green-300 mb-3">병렬 분석 (Side-by-Side Comparison)</h3>
                        <p className="text-gray-400">경쟁 채널과 내 채널의 데이터를 나란히 비교하며 강점과 약점을 한눈에 파악하세요.<br/>(Compare your channel's data side-by-side with competitors to identify strengths and weaknesses.)</p>
                    </div>
                </div>
            </div>
        </section>

        <footer className="py-10 md:py-12 border-t border-white/5 text-center text-gray-500 bg-[#0A0C10]">
          <div className="mb-4 text-2xl font-bold text-white">Content OS</div>
          <p className="mb-6 md:mb-8">Data-Driven Insights for Creators</p>
          <div className="flex justify-center gap-6 mb-8">
            <button onClick={() => setIsTermsOpen(true)} className="footer-link">서비스 이용약관 (Terms of Service)</button>
            <button onClick={() => setIsPrivacyOpen(true)} className="footer-link">개인정보처리방침 (Privacy Policy)</button>
          </div>
          <p className="text-sm">© 2026 Content OS. All rights reserved.</p>
        </footer>
      </div>
      {isTermsOpen && <TermsModal onClose={() => setIsTermsOpen(false)} />}
      {isPrivacyOpen && <PrivacyPolicyModal onClose={() => setIsPrivacyOpen(false)} />}
    </>
  );
}