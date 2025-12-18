
import React, { useState, useEffect, useRef } from 'react';
import { startChatSession } from '../services/geminiService';
import { getCollection } from '../services/collectionService';
import type { ChatMessage } from '../types';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
}

const BotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: "안녕하세요! 전략 파트너 'Johnson'입니다. 분석 데이터나 금고에 보관된 전략 자산에 대해 궁금한 점이 있으신가요?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const chatSession = startChatSession();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage, { role: 'model', text: '', isLoading: true }]);
        setInput('');
        setIsLoading(true);

        try {
            // [BIZ] Inject user collection summary into context
            const collection = getCollection();
            const collectionSummary = collection.length > 0 
                ? `[System Note: User has ${collection.length} items in Strategic Vault. Recent: ${collection.slice(0, 5).map(i => `'${i.title}'`).join(', ')}]`
                : "";

            const responseStream = await chatSession.sendMessageStream({ message: `${collectionSummary} ${input}` });
            let responseText = '';
            
            let firstChunk = true;
            for await (const chunk of responseStream) {
                 responseText += chunk.text;
                 if (firstChunk) {
                     setMessages(prev => {
                         const newMessages = [...prev];
                         const loadingMsgIndex = newMessages.findIndex(m => m.isLoading);
                         if (loadingMsgIndex !== -1) {
                             newMessages[loadingMsgIndex] = { role: 'model', text: responseText };
                         }
                         return newMessages;
                     });
                     firstChunk = false;
                 } else {
                     setMessages(prev => {
                         const newMessages = [...prev];
                         const lastMsg = newMessages[newMessages.length - 1];
                         if (lastMsg && lastMsg.role === 'model') {
                             lastMsg.text = responseText;
                         }
                         return newMessages;
                     });
                 }
            }
        } catch (error) {
            console.error("Chatbot error:", error);
            setMessages(prev => [...prev.filter(m => !m.isLoading), { role: 'model', text: "죄송합니다, 통신 오류가 발생했습니다. 다시 시도해주세요." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 right-5 w-full max-w-sm h-[65vh] z-40 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#1A1C23] border border-gray-700 rounded-2xl shadow-2xl w-full h-full flex flex-col overflow-hidden">
                <header className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/80">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <BotIcon /> Johnson AI 챗봇
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20"><BotIcon/></div>}
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'}`}>
                                {msg.isLoading ? <div className="flex gap-1 py-1"><div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></div></div> : msg.text.split('\n').map((line, i) => <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>)}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700 bg-gray-900/50 flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="분석이나 전략에 대해 질문하세요..."
                        className="flex-grow bg-gray-800 border border-gray-700 rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chatbot;
