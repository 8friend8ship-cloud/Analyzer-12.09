import React, { useState } from 'react';

interface LandingPageProps {
  onStart: () => void;
}

// Inline SVG icons to remove external dependencies
const CheckIcon = () => <svg className="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const ProCheckIcon = () => <svg className="w-5 h-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const BizCheckIcon = () => <svg className="w-5 h-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const ArrowRightIcon = ({ className }: {className?: string}) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
const BarChart2Icon = () => <svg className="w-7 h-7 text-red-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>;
const LockIcon = () => <svg className="w-7 h-7 text-red-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const MousePointerClickIcon = () => <svg className="w-7 h-7 text-red-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 9 5 12 1.8-5.2L21 14l-4.3-4.3"/><path d="m14.5 14.5.7-2.3.7-2.3 2.3-.7 2.3-.7"/><path d="M9 9a3 3 0 0 1 4 0"/><path d="M9 9a3 3 0 0 0 0 4"/><path d="m2 2 4 10 3-1 4 10 3-1 4-10-10-4Z"/></svg>;
const XIcon = () => <svg className="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const FeatureLockIcon = () => <svg className="text-white w-8 h-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const ZapIcon = () => <svg className="text-white w-8 h-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const FeatureBarChart2Icon = () => <svg className="text-white w-8 h-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>;


export default function LandingPage({ onStart }: LandingPageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const APP_URL = "https://analyzer-12-09-42793942510.us-west1.run.app";

  return (
    <div className="min-h-screen bg-[#0F1117] text-white overflow-x-hidden font-sans selection:bg-blue-500 selection:text-white">
      
      {/* 1. Hero Section (메인) */}
      <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-4 pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div 
          className="relative z-10 max-w-5xl mx-auto space-y-8 animate-fade-in"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Content OS 1.0 런칭
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-500 mb-6">
            Content OS
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
            크리에이터 성장을 위한 <span className="text-blue-400 font-bold">AI 운영체제</span>.<br />
            남의 채널 벤치마킹은 그만, 이제 <span className="text-white font-semibold">내 데이터</span>를 분석하세요.
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
            Google 계정으로 무료 시작
            <ArrowRightIcon className={`w-5 h-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
          </button>
          <p className="text-sm text-gray-500 mt-6">신용카드 필요 없음 • 월 30회 무료 분석 제공</p>
        </div>
      </section>

      {/* 2. Problem Section */}
      <section className="py-24 bg-gray-900/50 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">기존 분석 툴, <span className="text-red-400">비싸고 어렵지 않나요?</span></h2>
            <p className="text-gray-400 text-lg">남의 채널만 쳐다봐서는 내 채널을 성장시킬 수 없습니다.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-red-500/30 transition-all">
              <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <LockIcon />
              </div>
              <h3 className="text-xl font-bold mb-3">비싼 요금</h3>
              <p className="text-gray-400">월 5만 원이 넘는 부담스러운 가격,<br/>초보 유튜버에겐 사치입니다.</p>
            </div>
            <div className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-red-500/30 transition-all">
              <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <MousePointerClickIcon />
              </div>
              <h3 className="text-xl font-bold mb-3">남의 데이터</h3>
              <p className="text-gray-400">'떡상 영상' 찾기만 반복하다가<br/>정작 내 채널의 색깔을 잃어버립니다.</p>
            </div>
            <div className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-red-500/30 transition-all">
              <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <BarChart2Icon />
              </div>
              <h3 className="text-xl font-bold mb-3">겉핥기 분석</h3>
              <p className="text-gray-400">조회수만 보여줍니다.<br/>수익, 클릭률 등 진짜 데이터는 모릅니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold">Content OS는 다릅니다</h2>
            <p className="text-xl text-blue-400">내 데이터를 가장 깊고, 싸게 분석합니다.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-10 rounded-3xl bg-gradient-to-b from-blue-900/10 to-transparent border border-blue-500/20 hover:border-blue-500/50 transition-all hover:-translate-y-2">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/20">
                <FeatureLockIcon />
              </div>
              <h3 className="text-2xl font-bold mb-4">Private Data</h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                구글 공식 인증(OAuth)을 통해 외부인은 절대 볼 수 없는 
                <span className="text-white font-semibold"> 수익, 클릭률, 시청 지속시간</span>을 
                정밀하게 진단합니다.
              </p>
            </div>
            <div className="group p-10 rounded-3xl bg-gradient-to-b from-purple-900/10 to-transparent border border-purple-500/20 hover:border-purple-500/50 transition-all hover:-translate-y-2">
              <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-purple-500/20">
                <ZapIcon />
              </div>
              <h3 className="text-2xl font-bold mb-4">AI 코칭</h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                단순 통계 나열이 아닙니다. Gemini AI가 데이터를 분석해 
                <span className="text-white font-semibold"> "썸네일 텍스트를 줄이세요"</span> 같은 
                구체적 행동 지침을 줍니다.
              </p>
            </div>
            <div className="group p-10 rounded-3xl bg-gradient-to-b from-green-900/10 to-transparent border border-green-500/20 hover:border-green-500/50 transition-all hover:-translate-y-2">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-green-500/20">
                <FeatureBarChart2Icon />
              </div>
              <h3 className="text-2xl font-bold mb-4">압도적 가성비</h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                비싼 서버 비용을 기술적으로 없앴습니다. 
                <span className="text-white font-semibold"> 월 19,000원</span>으로 
                나만의 전담 데이터 분석팀을 고용하세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Comparison Table */}
      <section className="py-24 bg-gray-900/30">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">한눈에 비교하기</h2>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0F1117]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-6 text-gray-400 font-medium text-sm md:text-base">구분</th>
                  <th className="p-6 text-gray-400 font-medium text-sm md:text-base hidden md:table-cell">VidIQ (글로벌)</th>
                  <th className="p-6 text-gray-400 font-medium text-sm md:text-base hidden md:table-cell">뷰트랩 (국내)</th>
                  <th className="p-6 text-blue-400 font-bold bg-blue-500/10 border-l border-r border-blue-500/20 text-lg">🚀 Content OS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="p-6 font-medium text-gray-300">월 요금</td>
                  <td className="p-6 text-gray-500 line-through hidden md:table-cell">50,000원+</td>
                  <td className="p-6 text-gray-500 line-through hidden md:table-cell">38,500원+</td>
                  <td className="p-6 text-2xl font-bold text-white bg-blue-500/5 border-x border-blue-500/20">19,000원</td>
                </tr>
                <tr>
                  <td className="p-6 font-medium text-gray-300">데이터 방식</td>
                  <td className="p-6 text-gray-400 hidden md:table-cell">중앙 서버 (공개)</td>
                  <td className="p-6 text-gray-400 hidden md:table-cell">크롤링 (공개)</td>
                  <td className="p-6 text-white font-semibold bg-blue-500/5 border-x border-blue-500/20">개인 API (비밀 데이터)</td>
                </tr>
                <tr>
                  <td className="p-6 font-medium text-gray-300">핵심 가치</td>
                  <td className="p-6 text-gray-400 hidden md:table-cell">검색량 조회</td>
                  <td className="p-6 text-gray-400 hidden md:table-cell">벤치마킹</td>
                  <td className="p-6 text-blue-400 font-semibold bg-blue-500/5 border-x border-blue-500/20">채널 DNA 진단 & AI 코칭</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-center text-gray-500 text-sm mt-4 md:hidden">* 모바일에서는 주요 비교 항목만 표시됩니다.</p>
        </div>
      </section>

      {/* 5. Pricing Section */}
      <section className="py-24 relative">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">심플한 요금제</h2>
          <p className="text-gray-400 mb-16">약정 없음. 언제든 해지 가능. 치킨 한 마리 가격으로 시작하세요.</p>
          
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="p-8 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <div className="text-4xl font-bold mb-4">₩0<span className="text-lg text-gray-400 font-normal">/월</span></div>
              <p className="text-gray-400 mb-8 text-sm h-10">내 채널의 현재 상태를<br/>가볍게 진단해보세요.</p>
              <ul className="space-y-4 mb-8 text-left text-sm text-gray-300">
                <li className="flex gap-3"><CheckIcon /> 월 30회 무료 분석</li>
                <li className="flex gap-3"><CheckIcon /> 기본 데이터 조회</li>
                <li className="flex gap-3"><XIcon /> AI 심층 코칭 제외</li>
              </ul>
              <button onClick={onStart} className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 transition font-semibold">무료로 시작하기</button>
            </div>

            <div className="relative p-8 rounded-3xl border-2 border-blue-500 bg-blue-900/10 transform md:-translate-y-4 shadow-2xl shadow-blue-500/20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide shadow-lg">
                가장 인기 있는 선택
              </div>
              <h3 className="text-xl font-bold mb-2 text-blue-400">Pro</h3>
              <div className="text-5xl font-bold mb-4">₩19,000<span className="text-lg text-gray-400 font-normal">/월</span></div>
              <p className="text-gray-300 mb-8 text-sm h-10">AI 코치와 함께<br/>채널을 급성장시키세요.</p>
              <ul className="space-y-4 mb-8 text-left text-sm text-gray-200">
                <li className="flex gap-3"><ProCheckIcon /> <strong>무제한</strong> 분석</li>
                <li className="flex gap-3"><ProCheckIcon /> <strong>AI 심층 코칭 (Gemini)</strong></li>
                <li className="flex gap-3"><ProCheckIcon /> 채널 비교 분석</li>
                <li className="flex gap-3"><ProCheckIcon /> 성장 전략 리포트</li>
              </ul>
              <button onClick={onStart} className="w-full py-4 rounded-xl bg-blue-500 hover:bg-blue-600 transition font-bold text-white shadow-lg shadow-blue-500/30">Pro 시작하기</button>
            </div>

            <div className="p-8 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <h3 className="text-xl font-bold mb-2">Biz</h3>
              <div className="text-4xl font-bold mb-4">₩29,000<span className="text-lg text-gray-400 font-normal">/월</span></div>
              <p className="text-gray-400 mb-8 text-sm h-10">데이터 기반의<br/>치밀한 전략이 필요할 때.</p>
              <ul className="space-y-4 mb-8 text-left text-sm text-gray-300">
                <li className="flex gap-3"><BizCheckIcon /> <strong>Pro 기능 전체 포함</strong></li>
                <li className="flex gap-3"><BizCheckIcon /> 상세 시청자 분석</li>
                <li className="flex gap-3"><BizCheckIcon /> 우선 고객 지원</li>
              </ul>
              <button onClick={onStart} className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 transition font-semibold">Biz 시작하기</button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-gray-500 bg-[#0A0C10]">
        <div className="mb-4 text-2xl font-bold text-white">Content OS</div>
        <p className="mb-8">Data for YOU, Not Others.</p>
        <p className="text-sm">© 2025 Content OS. All rights reserved.</p>
        <p className="text-xs mt-4 opacity-30">Deployed at: {APP_URL}</p>
      </footer>
    </div>
  );
}