import React, { useState, useEffect, useRef } from 'react';
import { startChatSession } from '../services/geminiService';
import type { ChatMessage } from '../types';
import { GenerateContentResponse } from '@google/genai';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
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
    "광고주를 위한 기능은 뭐가 있나요?",
    "유튜버를 위한 기능은 뭐가 있나요?",
    "콘텐츠 OS 등급이 뭐야?",
];

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: "👋 안녕하세요, Content OS AI 챗봇 Johnson이에요!\n궁금한 점이 있다면 무엇이든 물어보세요!" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const chatSession = startChatSession();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleResetChat = () => {
        setMessages([
            { role: 'model', text: "👋 안녕하세요, Content OS AI 챗봇 Johnson이에요!\n궁금한 점이 있다면 무엇이든 물어보세요!" }
        ]);
        setShowSuggestions(true);
    };

    const sendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        setIsLoading(true);
        setShowSuggestions(false);

        const userMessage: ChatMessage = { role: 'user', text: messageText };
        setMessages(prev => [...prev, userMessage, { role: 'model', text: '', isLoading: true }]);

        try {
            const responseStream = await chatSession.sendMessageStream({ message: messageText });
            let responseText = '';
            let isFirstChunk = true;

            for await (const chunk of responseStream) {
                const c = chunk as GenerateContentResponse;
                const chunkText = c.text;
                if (!chunkText) continue;

                responseText += chunkText;

                if (isFirstChunk) {
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const loadingMsgIndex = newMessages.findIndex(m => m.isLoading);
                        if (loadingMsgIndex > -1) {
                            newMessages[loadingMsgIndex] = { role: 'model', text: responseText };
                        }
                        return newMessages;
                    });
                    isFirstChunk = false;
                } else {
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMsg = newMessages[newMessages.length - 1];
                        if (lastMsg?.role === 'model') {
                            lastMsg.text = responseText;
                        }
                        return newMessages;
                    });
                }
            }
        } catch (error) {
            console.error("Chatbot error:", error);
            setMessages(prev => [...prev.filter(m => !m.isLoading), { role: 'model', text: "죄송합니다, 오류가 발생했습니다. 다시 시도해주세요." }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
        setInput('');
    };
    
    const handleSuggestionClick = (suggestion: string) => {
        sendMessage(suggestion);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 right-5 w-full max-w-sm h-[70vh] z-40">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full h-full flex flex-col">
                <header className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-900/50 rounded-t-lg">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <VlingBotIcon /> Content OS AI 챗봇
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
                                        onClick={() => handleSuggestionClick(text)}
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
                            placeholder="유튜브 조회수 올리기"
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