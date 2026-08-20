import React, { useState, useEffect, useRef } from 'react';
import { reportIssue } from '../services/systemService';
import type { ChatMessage, User } from '../types';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const VlingBotIcon = () => (
    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 text-white">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-2h4v2H10zm5.91-4.5H8.09c-.49 0-.85-.59-.57-1.02l1.9-2.92c.2-.31.54-.51.92-.51h3.32c.38 0 .72.2.92.51l1.9 2.92c.28.43-.08 1.02-.57 1.02z"/>
        </svg>
    </div>
);

const suggestions = [
    "Content OS는 어떤 서비스인가요?",
    "저장된 백데이터는 어떻게 찾나요?",
    "Queens와 Seed는 어떻게 연결되나요?",
    "시스템 문제 신고 (Report Issue)",
];

const getStaticAnswer = (question: string): string | null => {
    const q = question.toLowerCase();
    if (q.includes('content os') && (q.includes('어떤') || q.includes('서비스'))) {
        return 'Content OS는 중앙에 저장된 Queens/Seed/T1/T2 백데이터를 먼저 검색하고, 필요한 자료를 앱별 워크플로우에 연결하는 콘텐츠 운영 허브입니다. 브라우저에서 외부 Gemini/YouTube API 키를 직접 사용하지 않습니다.';
    }
    if (q.includes('queens') || q.includes('seed')) {
        return '기본 흐름은 Queens 원천자료 → Seed 구조화 → T1 공용 템플릿 → T2 Persona/상황별 템플릿입니다. 프런트에서는 저장된 백데이터를 먼저 찾고, 없는 부분만 중앙 라우터에 요청합니다.';
    }
    return null;
};

const buildBackdataAnswer = async (question: string): Promise<string> => {
    const staticAnswer = getStaticAnswer(question);
    if (staticAnswer) return staticAnswer;

    const params = new URLSearchParams({
        query: question,
        asset_type: 'TEXT',
        limit: '3',
    });

    const response = await fetch(`/api/backend?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`CENTRAL_BACKDATA_HTTP_${response.status}`);
    }

    const payload = await response.json().catch(() => ({}));
    const results = Array.isArray(payload?.results) ? payload.results : [];
    if (results.length === 0) {
        return '현재 중앙 저장 백데이터에서 바로 연결할 자료를 찾지 못했습니다. 관련 Queens/Seed가 추가되면 같은 질문에서 자동으로 연결됩니다.';
    }

    const lines = results.slice(0, 3).map((item: any, index: number) => {
        const title = String(item?.TITLE || item?.title || item?.SUMMARY || item?.summary || `자료 ${index + 1}`).trim();
        const summary = String(item?.SUMMARY || item?.summary || item?.TEXT || item?.text || '').trim();
        const url = String(item?.ARTICLE_URL || item?.SOURCE_URL || item?.url || '').trim();
        const shortSummary = summary && summary !== title ? ` — ${summary.slice(0, 180)}` : '';
        const source = url ? `\n${url}` : '';
        return `${index + 1}. ${title}${shortSummary}${source}`;
    });

    return `중앙 저장 백데이터에서 관련 자료를 찾았습니다.\n${lines.join('\n\n')}`;
};

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, user }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: "👋 안녕하세요. Content OS 중앙 백데이터 도우미입니다.\n저장된 Queens/Seed/T1/T2 자료를 먼저 찾아 안내합니다." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleResetChat = () => {
        setMessages([
            { role: 'model', text: "👋 안녕하세요. Content OS 중앙 백데이터 도우미입니다.\n저장된 Queens/Seed/T1/T2 자료를 먼저 찾아 안내합니다." }
        ]);
        setShowSuggestions(true);
    };

    const sendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        if (messageText === "시스템 문제 신고 (Report Issue)") {
            setMessages(prev => [...prev, { role: 'user', text: messageText }]);
            setIsLoading(true);
            reportIssue(user.email, "사용자가 Content OS 챗봇을 통해 시스템 문제를 신고했습니다.");
            setTimeout(() => {
                setMessages(prev => [...prev, { role: 'model', text: "⚠️ 시스템 문제 신고가 접수되었습니다. 중앙 운영 기록에서 확인할 수 있도록 남겼습니다." }]);
                setIsLoading(false);
            }, 500);
            return;
        }

        setIsLoading(true);
        setShowSuggestions(false);
        setMessages(prev => [...prev, { role: 'user', text: messageText }, { role: 'model', text: '', isLoading: true }]);

        try {
            const responseText = await buildBackdataAnswer(messageText);
            setMessages(prev => {
                const next = [...prev];
                const loadingIndex = next.findIndex(m => m.isLoading);
                if (loadingIndex >= 0) next[loadingIndex] = { role: 'model', text: responseText };
                return next;
            });
        } catch (error) {
            console.error('Content OS backdata chatbot error:', error);
            setMessages(prev => [...prev.filter(m => !m.isLoading), {
                role: 'model',
                text: '중앙 백데이터 연결을 확인하는 중 오류가 발생했습니다. 앱의 다른 기능은 계속 사용할 수 있습니다.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
        setInput('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 right-5 w-full max-w-sm h-[70vh] z-40">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full h-full flex flex-col">
                <header className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-900/50 rounded-t-lg">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <VlingBotIcon /> Content OS 백데이터 챗봇
                    </h2>
                    <div className="flex items-center gap-3">
                        <button onClick={handleResetChat} className="text-gray-400 hover:text-white" title="새로고침">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M20 4h-5v5M4 20h5v-5" /></svg>
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                </header>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <VlingBotIcon />}
                            <div className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                {msg.isLoading ? <div className="animate-pulse">...</div> : msg.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                            </div>
                        </div>
                    ))}
                    {showSuggestions && (
                        <div className="flex items-start gap-3 animate-fade-in">
                            <div className="flex flex-col gap-2 pt-2 w-full">
                                {suggestions.map(text => (
                                    <button
                                        key={text}
                                        onClick={() => sendMessage(text)}
                                        className="bg-gray-700 hover:bg-gray-600 text-left text-sm text-gray-200 px-4 py-2 rounded-lg border border-gray-600 transition-colors w-full"
                                    >
                                        {text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleFormSubmit} className="p-3 border-t border-gray-700 flex gap-2 relative items-center">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="저장된 자료를 질문하세요"
                            className="w-full bg-gray-700 border-gray-600 rounded-full shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-3 pl-4 pr-10"
                            disabled={isLoading}
                        />
                        {input && (
                            <button type="button" onClick={() => setInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                    <button type="submit" disabled={isLoading || !input.trim()} className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chatbot;
