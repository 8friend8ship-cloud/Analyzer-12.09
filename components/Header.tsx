

import React, { useState, useEffect, useRef } from 'react';
// FIX: Centralized types in types.ts
import type { User } from '../types';

interface HeaderProps {
    user: User;
    planLimit: number;
    onLogout: () => void;
    onOpenHelpModal: () => void;
    onShowAdmin: () => void;
    onNavigate: (view: 'account') => void;
    onShowMain: () => void;
    onShowRanking: () => void;
    onShowWorkflow: () => void;
    onShowMyChannel: () => void;
    currentView: 'main' | 'admin' | 'ranking' | 'channelDetail' | 'workflow' | 'videoDetail' | 'thumbnailAnalysis' | 'outlierAnalysis' | 'myChannel';
    hasApiKey: boolean; // New prop for status
}

// SVG Icons
const DeviceIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}> <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /> </svg> );
const HelpIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}> <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> </svg> );
const YouTubeLogo = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-auto" viewBox="0 0 120 84" fill="none"> <path d="M117.5 13.1C116.1 10.2 113.8 7.9 110.9 6.5C101.3 2 60 2 60 2C60 2 18.7 2 9.1 6.5C6.2 7.9 3.9 10.2 2.5 13.1C-1.94531e-06 22.4 0 42 0 42C0 42 -1.94531e-06 61.6 2.5 70.9C3.9 73.8 6.2 76.1 9.1 77.5C18.7 82 60 82 60 82C60 82 101.3 82 110.9 77.5C113.8 76.1 116.1 73.8 117.5 70.9C120 61.6 120 42 120 42C120 42 120 22.4 117.5 13.1Z" fill="#FF0000"/> <path d="M48 60L79 42L48 24V60Z" fill="white"/> </svg> );


const Header: React.FC<HeaderProps> = ({ user, planLimit, onLogout, onOpenHelpModal, onShowAdmin, onNavigate, onShowMain, onShowRanking, onShowWorkflow, onShowMyChannel, currentView, hasApiKey }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
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
    
    const handleStatusClick = () => {
        if (user.isAdmin) {
            onShowAdmin();
        } else {
            onNavigate('account');
        }
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

    const NavTab: React.FC<{ text: string; activeViews: (typeof currentView)[]; onClick: () => void; }> = ({ text, activeViews, onClick }) => (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeViews.includes(currentView) ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
            {text}
        </button>
    );

    return (
        <header className="flex-shrink-0 bg-[#1A1C23] border-b border-gray-700/50 z-20">
            <div className="flex items-center justify-between p-4 h-16">
                {/* Left Side */}
                <div className="flex items-center space-x-3">
                     <button onClick={onShowMain} className="flex items-center space-x-3">
                        <YouTubeLogo />
                        <h1 className="text-xl font-bold text-gray-200 hidden md:block">콘텐츠 OS</h1>
                     </button>
                     <div className="hidden sm:flex items-center border-l border-gray-700 ml-4 pl-4">
                        <NavTab text="분석" activeViews={['main', 'channelDetail', 'videoDetail']} onClick={onShowMain} />
                        <NavTab text="랭킹" activeViews={['ranking']} onClick={onShowRanking} />
                        <NavTab text="워크플로우" activeViews={['workflow', 'thumbnailAnalysis', 'outlierAnalysis']} onClick={onShowWorkflow} />
                        <NavTab text="내 채널" activeViews={['myChannel']} onClick={onShowMyChannel} />
                     </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center space-x-3 text-gray-300">
                    {/* API Status Light */}
                    <button 
                        onClick={handleStatusClick}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2C2F3B] hover:bg-[#363a49] transition-colors group"
                        title={hasApiKey ? "API 키 설정됨" : "API 키 미설정 (클릭하여 설정)"}
                    >
                        <div className={`w-3 h-3 rounded-full ${hasApiKey ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                        <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors hidden lg:block">API Status</span>
                    </button>

                    <div className="hidden md:flex items-center space-x-2">
                        <div className="px-3 py-1.5 text-sm bg-[#2C2F3B] rounded-lg">
                            <span className="font-semibold text-cyan-400">{user.plan}</span>
                            {user.plan !== 'Free' && <span className="text-gray-400 text-xs ml-1.5">(만료: 2025. 12. 31.)</span>}
                        </div>

                        <div className="px-3 py-1.5 text-sm bg-[#2C2F3B] rounded-lg">
                            <span className="text-gray-400">오늘 사용량: </span>
                            <span className="font-semibold text-white">{user.usage} / {planLimit}</span>
                        </div>
                    </div>
                    
                    <button onClick={onOpenHelpModal} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700/60 transition-colors" title="사용 설명서">
                        <HelpIcon />
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-10 h-10 flex items-center justify-center bg-orange-500 rounded-full font-bold text-lg text-white ring-2 ring-cyan-400 transition-all">
                           {getInitials(user.name, user.email)}
                        </button>
                        
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-[#2C2F3B] border border-gray-700/80 rounded-lg shadow-xl py-2 text-sm text-gray-200">
                                <div className="px-4 py-2 border-b border-gray-600/70">
                                    <p className="font-semibold text-base text-white truncate">{user.name}</p>
                                    <p className="text-gray-400 truncate">{user.email}</p>
                                </div>
                                <div className="px-4 py-3 border-b border-gray-600/70">
                                     <p className="text-gray-400">요금제: <span className="font-semibold text-cyan-400">{user.plan}</span></p>
                                </div>
                                {/* Mobile Nav */}
                                <div className="py-1 sm:hidden border-b border-gray-600/70">
                                    <a href="#" onClick={(e) => { e.preventDefault(); onShowMain(); setIsDropdownOpen(false); }} className={`block w-full text-left px-4 py-2 hover:bg-gray-700/50 transition-colors ${['main', 'channelDetail', 'videoDetail'].includes(currentView) ? 'bg-blue-600/50 text-white' : ''}`}>분석</a>
                                    <a href="#" onClick={(e) => { e.preventDefault(); onShowRanking(); setIsDropdownOpen(false); }} className={`block w-full text-left px-4 py-2 hover:bg-gray-700/50 transition-colors ${currentView === 'ranking' ? 'bg-blue-600/50 text-white' : ''}`}>랭킹</a>
                                    <a href="#" onClick={(e) => { e.preventDefault(); onShowWorkflow(); setIsDropdownOpen(false); }} className={`block w-full text-left px-4 py-2 hover:bg-gray-700/50 transition-colors ${['workflow', 'thumbnailAnalysis', 'outlierAnalysis'].includes(currentView) ? 'bg-blue-600/50 text-white' : ''}`}>워크플로우</a>
                                    <a href="#" onClick={(e) => { e.preventDefault(); onShowMyChannel(); setIsDropdownOpen(false); }} className={`block w-full text-left px-4 py-2 hover:bg-gray-700/50 transition-colors ${currentView === 'myChannel' ? 'bg-blue-600/50 text-white' : ''}`}>내 채널</a>
                                </div>
                                <div className="py-2">
                                    <a href="#" onClick={handleAccountClick} className="block w-full text-left px-4 py-2 hover:bg-gray-700/50 transition-colors">계정 설정</a>
                                    {user.isAdmin && (
                                        <a href="#" onClick={handleAdminClick} className="block w-full text-left px-4 py-2 hover:bg-gray-700/50 text-yellow-400 font-semibold transition-colors">관리자</a>
                                    )}
                                </div>
                                <div className="py-2 border-t border-gray-600/70">
                                    <button onClick={onLogout} className="block w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700/50 transition-colors">
                                        로그아웃
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
