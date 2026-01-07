import React, { useState, useEffect, useRef } from 'react';
import { startChatSession } from '../services/geminiService';
import type { ChatMessage } from '../types';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
}

const BotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: "안녕하세요! 'Johnson'입니다. 유튜브 분석에 대해 무엇이든 물어보세요." }
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
            const responseStream = await chatSession.sendMessageStream({ message: input });
            let responseText = '';
            
            // This is tricky. We need to find the loading message and update it.
            // A more robust way would be using message IDs. For simplicity, we'll update the last one.
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
            setMessages(prev => [...prev.filter(m => !m.isLoading), { role: 'model', text: "죄송합니다, 오류가 발생했습니다. 다시 시도해주세요." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 right-5 w-full max-w-sm h-[60vh] z-40" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full h-full flex flex-col">
                <header className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-900/50 rounded-t-lg">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <BotIcon /> Johnson AI 챗봇
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </header>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0"><BotIcon/></div>}
                            <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                {msg.isLoading ? <div className="animate-pulse">...</div> : msg.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                            </div>
                            {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0"><UserIcon/></div>}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700 flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="메시지를 입력하세요..."
                        className="flex-grow bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                        전송
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chatbot;
