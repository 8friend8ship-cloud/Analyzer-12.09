import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../types';

interface HeaderProps {
    user: User;
    planLimit: number;
    onLogout: () => void;
    onOpenChat: () => void;
    onOpenHelp: () => void;
    onShowAdmin: () => void;
    onNavigate: (view: 'account') => void;
    onShowMain: () => void;
    onShowTopCharts: () => void;
    onShowWorkflow: () => void;
    onShowMyChannel: () => void; // Renamed for clarity, points to "AI Channel Diagnosis"
    onShowComparison: () => void; 
    currentView: string;
}

const HelpIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}> <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> </svg> );

const BarChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;

const Logo = () => (
    <div className="flex items-center gap-3">
        <BarChartIcon />
        <span className="text-xl font-bold text-white tracking-tight">Content OS</span>
        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-md border border-green-500/30 uppercase tracking-wider">
            Live Mode
        </span>
    </div>
);


const Header: React.FC<HeaderProps> = ({ user, planLimit, onLogout, onOpenChat, onOpenHelp, onShowAdmin, onNavigate, onShowMain, onShowTopCharts, onShowWorkflow, onShowMyChannel, onShowComparison, currentView }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAdminClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onShowAdmin();
        setIsDropdownOpen(false);
    };

    const handleAccountClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onNavigate('account');
        setIsDropdownOpen(false);
    };
    
    const getInitials = (name: string, email: string) => {
        if (name) {
            const parts = name.trim().split(' ');
            if (parts.length > 1) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        }
        return email?.[0]?.toUpperCase() || 'U';
    }

    const mainViews = ['main', 'channelDetail', 'videoDetail'];
    const workflowViews = ['workflow', 'thumbnailAnalysis', 'outlierAnalysis', 'abTestGame', 'identityFinder', 'collections', 'comparison', 'influencerMarketing'];

    const NavTab: React.FC<{ text: string; enText: string; activeViews: string[]; onClick: () => void; }> = ({ text, enText, activeViews, onClick }) => (
        <button
            onClick={onClick}
            className={`px-3 pt-2 pb-1.5 text-center transition-colors duration-200 border-b-2 ${activeViews.includes(currentView) ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
            <div className="text-sm font-semibold leading-tight">{text}</div>
            <div className="text-[10px] text-gray-500 font-medium leading-tight tracking-tighter">{enText}</div>
        </button>
    );

    return (
        <header className="flex-shrink-0 bg-[#1A1C23] border-b border-gray-700/50 z-20">
            <div className="flex items-center justify-between p-4 h-16">
                {/* Left Side */}
                <div className="flex items-center space-x-3">
                     <button onClick={onShowMain} className="flex items-center space-x-3">
                        <Logo />
                     </button>
                     <div className="hidden sm:flex items-center border-l border-gray-700 ml-4 pl-4">
                        <NavTab text="분석" enText="Analysis" activeViews={mainViews} onClick={onShowMain} />
                        <NavTab text="인기 차트" enText="Top Charts" activeViews={['topCharts']} onClick={onShowTopCharts} />
                        <NavTab text="워크플로우" enText="Workflow" activeViews={workflowViews} onClick={onShowWorkflow} />
                        <NavTab text="내 채널" enText="My Channel" activeViews={['myChannel']} onClick={onShowMyChannel} />
                     </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center space-x-3 text-gray-300">
                    <div className="hidden md:flex items-center space-x-2">
                        <div className="px-3 py-1.5 text-xs bg-gray-700/50 rounded-md border border-gray-600/50">
                            {planNameToKorean[user.plan]} (만료: {user.planExpirationDate || 'N/A'})
                        </div>
                    </div>

                    <button onClick={onOpenHelp} className="p-2 hover:bg-gray-700 rounded-full" title="도움말">
                        <HelpIcon />
                    </button>
                    
                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setIsDropdownOpen(prev => !prev)} className="flex items-center space-x-2 p-1 pr-2 hover:bg-gray-700 rounded-full">
                           <div className="w-8 h-8 flex items-center justify-center bg-orange-500 rounded-full font-bold text-white text-sm">
                                {getInitials(user.name, user.email)}
                           </div>
                           <span className="hidden md:inline text-sm font-medium">{user.name}</span>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-md shadow-lg py-1 border border-gray-700 animate-fade-in">
                                <a href="#" onClick={handleAccountClick} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">계정 설정</a>
                                
                                <div className="border-t border-gray-700 my-1"></div>
                                <div className="px-4 pt-2 pb-1">
                                    <p className="text-xs text-gray-500">크레딧 사용량 (Credit Usage)</p>
                                    <div className="w-full bg-gray-600 rounded-full h-1.5 my-1">
                                        <div 
                                            className="bg-blue-500 h-1.5 rounded-full" 
                                            style={{ width: `${user.usage.credits.limit === Infinity ? 0 : (user.usage.credits.used / user.usage.credits.limit) * 100}%` }}>
                                        </div>
                                    </div>
                                    <p className="text-xs text-right text-gray-400">
                                        {user.usage.credits.used} / {user.usage.credits.limit === Infinity ? '무제한' : user.usage.credits.limit}
                                    </p>
                                </div>
                                <div className="border-t border-gray-700 my-1"></div>

                                <a href="#" onClick={(e) => { e.preventDefault(); onOpenHelp(); setIsDropdownOpen(false); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">도움말 (Help)</a>

                                {user.isAdmin && <a href="#" onClick={handleAdminClick} className="block px-4 py-2 text-sm text-yellow-400 hover:bg-gray-700">관리자</a>}
                                
                                <div className="border-t border-gray-700 my-1"></div>
                                <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="block px-4 py-2 text-sm text-red-400 hover:bg-gray-700">로그아웃</a>
                            </div>
                        )}
                    </div>

                    <div className="sm:hidden">
                        <button onClick={() => setIsMobileMenuOpen(prev => !prev)} className="p-2 hover:bg-gray-700 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                        </button>
                    </div>
                </div>
            </div>
             {isMobileMenuOpen && (
                <div ref={mobileMenuRef} className="sm:hidden bg-gray-800 border-t border-gray-700 animate-fade-in">
                    <nav className="flex flex-col p-2 space-y-1">
                        <button onClick={() => { onShowMain(); setIsMobileMenuOpen(false); }} className={`block px-3 py-2 rounded-md text-base font-medium ${mainViews.includes(currentView) ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>분석</button>
                        <button onClick={() => { onShowTopCharts(); setIsMobileMenuOpen(false); }} className={`block px-3 py-2 rounded-md text-base font-medium ${currentView === 'topCharts' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>인기 차트</button>
                        <button onClick={() => { onShowWorkflow(); setIsMobileMenuOpen(false); }} className={`block px-3 py-2 rounded-md text-base font-medium ${workflowViews.includes(currentView) ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>워크플로우</button>
                        <button onClick={() => { onShowMyChannel(); setIsMobileMenuOpen(false); }} className={`block px-3 py-2 rounded-md text-base font-medium ${currentView === 'myChannel' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>내 채널</button>
                    </nav>
                </div>
            )}
        </header>
    );
};

const planNameToKorean: Record<string, string> = {
    'Free': '베이직',
    'Pro': '프로',
    'Biz': 'Agency'
};

export default Header;