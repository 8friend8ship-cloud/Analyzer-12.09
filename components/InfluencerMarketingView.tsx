import React, { useState } from 'react';
import Button from './common/Button';
import Spinner from './common/Spinner';
import type { User, InfluencerChannelResult, InfluencerAnalysisDetail } from '../types';
import { fetchYouTubeData, resolveChannelId, fetchChannelAnalysis } from '../services/youtubeService';
import { getGeminiApiKey } from '../services/apiKeyService';
import { GoogleGenAI, Type } from "@google/genai";

interface InfluencerMarketingViewProps {
    user: User;
    appSettings: any;
    onBack: () => void;
}

// --- Main Component ---
const InfluencerMarketingView: React.FC<InfluencerMarketingViewProps> = ({ user, appSettings, onBack }) => {
    const [view, setView] = useState<'input' | 'loading' | 'results'>('input');
    const [keyword, setKeyword] = useState('');
    const [myChannelUrl, setMyChannelUrl] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({ country: 'KR', minSubs: 1000, minAvgViews: 1000 });
    const [loadingStep, setLoadingStep] = useState(0);
    const [results, setResults] = useState<InfluencerChannelResult[]>([]);
    const [myChannelResult, setMyChannelResult] = useState<InfluencerChannelResult | null>(null);
    const [detailModalChannel, setDetailModalChannel] = useState<InfluencerChannelResult | null>(null);
    const [detailReport, setDetailReport] = useState<InfluencerAnalysisDetail | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        console.log("handleSearch called with keyword:", keyword);
        if (!keyword.trim()) {
            alert("분석할 상품 키워드를 입력해주세요.");
            return;
        }

        setView('loading');
        setLoadingStep(0);
        setMyChannelResult(null);
        setResults([]);
        
        try {
            console.log("Starting analysis...");
            const apiKey = appSettings.apiKeys.youtube;
            if (!apiKey) throw new Error("YouTube API Key is required.");

            setLoadingStep(1); // 상품 키워드 분석
            console.log("Step 1 complete");
            
            setLoadingStep(2); // 벤치마킹 채널 검색
            console.log("Fetching YouTube data for keyword:", keyword);
            const videoData = await fetchYouTubeData('keyword', keyword, {
                resultsLimit: 10,
                country: filters.country,
                category: 'all',
                videoFormat: 'any',
                period: 'any',
                sortBy: 'relevance',
                minViews: 0,
                videoLength: 'any'
            }, apiKey);
            console.log("Fetched video data:", videoData.length, "items");

            setLoadingStep(3); // 1차 필터링
            // Extract unique channels
            const uniqueChannels = Array.from(new Set(videoData.map(v => v.channelId)))
                .map(id => videoData.find(v => v.channelId === id)!);
            console.log("Unique channels:", uniqueChannels.length);

            setLoadingStep(4); // AI 채널 매칭
            console.log("Starting AI channel matching...");
            const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
            const prompt = `As "Content OS", analyze these YouTube channels for product placement of "${keyword}".
            Channels: ${uniqueChannels.map(c => c.channelTitle).join(', ')}
            Provide a match rate (0-100) and a brief reason for each.`;

            const aiResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { 
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                channelName: { type: Type.STRING },
                                matchRate: { type: Type.NUMBER },
                                reason: { type: Type.STRING }
                            },
                            required: ["channelName", "matchRate", "reason"]
                        }
                    }
                }
            });

            console.log("AI Response received");
            const aiAnalysis = JSON.parse(aiResponse.text || '[]');
            console.log("Parsed AI analysis:", aiAnalysis.length, "items");

            const finalResults: InfluencerChannelResult[] = uniqueChannels.map(c => {
                const analysis = aiAnalysis.find((a: any) => a.channelName === c.channelTitle) || { matchRate: 70, reason: "관련 콘텐츠를 다루고 있어 적합도가 있습니다." };
                return {
                    id: c.channelId,
                    name: c.channelTitle,
                    thumbnailUrl: c.thumbnailUrl, // Using video thumbnail as fallback
                    subscriberCount: c.subscribers,
                    matchRate: analysis.matchRate,
                    algorithmReason: analysis.reason
                };
            }).sort((a, b) => b.matchRate - a.matchRate).slice(0, 5);

            setResults(finalResults);
            console.log("Results set");

            setLoadingStep(5); // 내 채널 적합도 분석
            if (myChannelUrl) {
                console.log("Analyzing my channel:", myChannelUrl);
                const myChannelId = await resolveChannelId(myChannelUrl, apiKey);
                if (myChannelId) {
                    const myChannelData = await fetchChannelAnalysis(myChannelId, apiKey);
                    const myPrompt = `Analyze the fit for product "${keyword}" on channel "${myChannelData.name}".`;
                    
                    const myAiResponse = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: myPrompt,
                        config: { 
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    matchRate: { type: Type.NUMBER },
                                    reason: { type: Type.STRING }
                                },
                                required: ["matchRate", "reason"]
                            }
                        }
                    });
                    
                    const myAnalysis = JSON.parse(myAiResponse.text || '{"matchRate": 50, "reason": "분석 불가"}');
                    
                    setMyChannelResult({
                        id: myChannelData.id,
                        name: myChannelData.name,
                        thumbnailUrl: myChannelData.thumbnailUrl,
                        subscriberCount: myChannelData.subscriberCount,
                        matchRate: myAnalysis.matchRate,
                        algorithmReason: myAnalysis.reason,
                        isMyChannel: true
                    });
                    console.log("My channel analysis complete");
                }
            }

            setLoadingStep(6); // 리포트 생성
            console.log("Setting view to results");
            setView('results');

        } catch (error) {
            console.error("Influencer search error:", error);
            alert("분석 중 오류가 발생했습니다: " + (error instanceof Error ? error.message : String(error)));
            setView('input');
        }
    };
    
    const handleShowDetailReport = async (channel: InfluencerChannelResult) => {
        setDetailModalChannel(channel);
        setIsDetailLoading(true);
        setDetailReport(null);

        try {
            const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
            const prompt = `As "Content OS", generate an influencer marketing strategy report for placing the product "${keyword}" on the YouTube channel "${channel.name}".`;

            const response = await ai.models.generateContent({
                model: 'gemini-3.1-pro-preview',
                contents: prompt,
                config: { 
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            channelName: { type: Type.STRING },
                            keyword: { type: Type.STRING },
                            coreSummary: { type: Type.STRING },
                            audienceAlignment: {
                                type: Type.OBJECT,
                                properties: {
                                    score: { type: Type.NUMBER },
                                    reason: { type: Type.STRING }
                                },
                                required: ["score", "reason"]
                            },
                            contentSynergy: { type: Type.STRING },
                            kpiRecommendations: {
                                type: Type.OBJECT,
                                properties: {
                                    core: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    secondary: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ["core", "secondary"]
                            },
                            finalConclusion: { type: Type.STRING }
                        },
                        required: ["channelName", "keyword", "coreSummary", "audienceAlignment", "contentSynergy", "kpiRecommendations", "finalConclusion"]
                    }
                }
            });

            setDetailReport(JSON.parse(response.text || '{}'));
        } catch (error) {
            console.error("Detail report error:", error);
            alert("리포트 생성 중 오류가 발생했습니다.");
            setDetailModalChannel(null);
        } finally {
            setIsDetailLoading(false);
        }
    };

    const loadingSteps = ["캐시 확인", "상품 키워드 분석", "벤치마킹 채널 검색", "1차 필터링", "AI 채널 매칭", "내 채널 적합도 분석", "리포트 생성"];

    const renderInputView = () => (
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <h1 className="text-4xl font-bold">AI 상품 적합도 분석 (AI Product Fit Analysis)</h1>
            <p className="text-gray-400 mt-4 max-w-2xl mx-auto">내 채널과 특정 상품의 적합도를 분석하고, 벤치마킹 채널과 비교하여 수익화 전략을 구체화합니다.</p>
            <div className="mt-8 flex flex-col gap-4 items-center">
                <div className="w-full max-w-xl flex flex-col sm:flex-row gap-2">
                    <input 
                        type="text"
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearch(e as any); }}
                        placeholder="분석할 상품 키워드 (예: '감성 캠핑용품')"
                        className="flex-grow bg-gray-700/50 border border-gray-600 rounded-lg py-3 px-5 text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button type="button" onClick={() => setShowFilters(!showFilters)} className="px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold whitespace-nowrap">{showFilters ? '조건 닫기' : '상세 조건'}</button>
                    <button type="button" onClick={handleSearch} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg whitespace-nowrap">분석 시작</button>
                </div>
                {showFilters && (
                    <div className="w-full max-w-xl p-6 bg-gray-800/50 border border-gray-700 rounded-lg text-left flex flex-col gap-4 animate-fade-in">
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">내 채널 URL 또는 핸들 (선택)</label>
                            <input type="text" value={myChannelUrl} onChange={e => setMyChannelUrl(e.target.value)} placeholder="https://youtube.com/@mychannel" className="w-full p-2 bg-gray-700 rounded border-gray-600" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm text-gray-400">국가</label>
                                <select value={filters.country} onChange={e => setFilters(f => ({...f, country: e.target.value}))} className="mt-1 w-full p-2 bg-gray-700 rounded border-gray-600">
                                    <option value="KR">대한민국</option>
                                    <option value="US">미국</option>
                                    <option value="JP">일본</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">최소 구독자</label>
                                <input type="number" value={filters.minSubs} onChange={e => setFilters(f => ({...f, minSubs: Number(e.target.value)}))} className="mt-1 w-full p-2 bg-gray-700 rounded border-gray-600" />
                            </div>
                             <div>
                                <label className="text-sm text-gray-400">최소 평균 조회수</label>
                                <input type="number" value={filters.minAvgViews} onChange={e => setFilters(f => ({...f, minAvgViews: Number(e.target.value)}))} className="mt-1 w-full p-2 bg-gray-700 rounded border-gray-600" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
    
    const renderLoadingView = () => (
        <div className="max-w-lg mx-auto text-center animate-fade-in">
             <Spinner message="AI가 상품 적합도를 분석 중입니다..." />
             <div className="mt-8 space-y-3 text-sm">
                {loadingSteps.map((step, i) => (
                    <div key={i} className={`flex items-center gap-3 transition-opacity duration-300 ${loadingStep >= i ? 'opacity-100' : 'opacity-30'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${loadingStep > i ? 'bg-green-600' : (loadingStep === i ? 'bg-blue-600 animate-pulse' : 'bg-gray-600')}`}>
                            {loadingStep > i ? '✔' : <span className="text-xs">{i+1}</span>}
                        </div>
                        <span>{step}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const ChannelCard: React.FC<{channel: InfluencerChannelResult}> = ({ channel }) => (
         <div className={`p-5 rounded-xl grid grid-cols-12 gap-6 items-center ${channel.isMyChannel ? 'bg-blue-900/20 border-2 border-blue-500' : 'bg-gray-800 border border-gray-700'}`}>
            {channel.isMyChannel && <div className="absolute -top-3 right-4 px-2 py-0.5 text-xs font-bold bg-blue-500 rounded-md">MY CHANNEL</div>}
            <div className="col-span-2 text-center">
                 <div className="relative w-24 h-24 mx-auto">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle className="text-gray-700" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                        <circle className="text-green-400" strokeWidth="8" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - channel.matchRate / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-white">{channel.matchRate}%</span>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">상품 적합도 (Fit)</p>
            </div>
            <div className="col-span-6">
                <div className="flex items-center gap-4">
                    <img src={channel.thumbnailUrl} alt={channel.name} className="w-16 h-16 rounded-full" />
                    <div>
                        <h3 className="text-xl font-bold">{channel.name}</h3>
                        <p className="text-sm text-gray-400">구독자 { (channel.subscriberCount / 10000).toFixed(1) }만</p>
                    </div>
                </div>
                <div className="mt-4 bg-gray-900/50 p-3 rounded-md border-l-4 border-gray-600">
                    <p className="text-sm font-semibold text-gray-300">AI 분석 요약 (AI Summary)</p>
                    <p className="text-sm text-gray-400 mt-1">{channel.algorithmReason}</p>
                </div>
            </div>
            <div className="col-span-4 space-y-3">
                 <button onClick={() => handleShowDetailReport(channel)} className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold">AI 쇼핑 연동 전략 리포트</button>
            </div>
        </div>
    );

    const renderResultsView = () => (
        <div className="max-w-5xl mx-auto w-full animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 text-center">벤치마킹 채널 (Benchmark Channels)</h2>
            <div className="space-y-4">
                {results.map(channel => (
                    <ChannelCard key={channel.id} channel={channel} />
                ))}
            </div>

            {myChannelResult && (
                <>
                <div className="text-center my-8 border-t-2 border-dashed border-gray-600 pt-8">
                    <h2 className="text-2xl font-bold text-yellow-400">내 채널 분석 결과 (My Channel Analysis)</h2>
                </div>
                <div className="relative">
                    <ChannelCard channel={myChannelResult} />
                </div>
                </>
            )}

        </div>
    );

    const renderDetailModal = () => {
        if (!detailModalChannel) return null;
        return (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDetailModalChannel(null)}>
                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-4 border-b border-gray-700">
                        <h2 className="text-lg font-semibold">AI 쇼핑 연동 전략 리포트: {detailModalChannel.name}</h2>
                        <button onClick={() => setDetailModalChannel(null)} className="text-gray-400 hover:text-white">&times;</button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-6 text-sm">
                        {isDetailLoading || !detailReport ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Spinner message="리포트를 생성 중입니다..." />
                            </div>
                        ) : (
                            <>
                                <section>
                                    <h3 className="font-bold text-lg text-white mb-2">1. 핵심 요약 (Core Summary)</h3>
                                    <p className="p-3 bg-gray-900/50 rounded-md text-gray-300">{detailReport.coreSummary}</p>
                                </section>
                                <section>
                                    <h3 className="font-bold text-lg text-white mb-2">2. 시청자-상품 적합도 (Audience-Product Fit)</h3>
                                    <div className="flex gap-4 items-center bg-gray-900/50 p-3 rounded-md">
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-green-400">{detailReport.audienceAlignment.score}%</p>
                                            <p className="text-xs text-gray-400">적합도 (Fit)</p>
                                        </div>
                                        <p className="text-gray-300">{detailReport.audienceAlignment.reason}</p>
                                    </div>
                                </section>
                                 <section>
                                    <h3 className="font-bold text-lg text-white mb-2">3. 추천 콘텐츠 전략 (Content Strategy)</h3>
                                    <div className="p-3 bg-gray-900/50 rounded-md text-yellow-300 italic border-l-4 border-yellow-500">{detailReport.contentSynergy}</div>
                                </section>
                                 <section>
                                    <h3 className="font-bold text-lg text-white mb-2">4. 예상 주요 성과 지표 (Expected KPIs)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-semibold text-gray-300">핵심 지표 (Core KPIs)</h4>
                                            <ul className="list-disc list-inside mt-1 text-gray-400">
                                                {detailReport.kpiRecommendations.core.map(kpi => <li key={kpi}>{kpi}</li>)}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-300">보조 지표 (Secondary KPIs)</h4>
                                             <ul className="list-disc list-inside mt-1 text-gray-400">
                                                {detailReport.kpiRecommendations.secondary.map(kpi => <li key={kpi}>{kpi}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </section>
                                 <section>
                                    <h3 className="font-bold text-lg text-white mb-2">5. 최종 결론 (Final Conclusion)</h3>
                                    <p className="p-3 bg-blue-900/30 text-blue-300 rounded-md font-semibold">{detailReport.finalConclusion}</p>
                                </section>
                            </>
                        )}
                    </div>
                     <div className="flex justify-end gap-4 p-4 border-t border-gray-700">
                        <Button variant="secondary" onClick={() => setDetailModalChannel(null)}>닫기</Button>
                        <Button variant="secondary" disabled={isDetailLoading || !detailReport}>TXT 저장</Button>
                    </div>
                </div>
            </div>
        );
    };

    let content;
    if (view === 'loading') content = renderLoadingView();
    else if (view === 'results') content = renderResultsView();
    else content = renderInputView();
    
    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-full flex flex-col">
             <div className="flex-shrink-0 mb-6">
                <Button onClick={view === 'input' ? onBack : () => { setView('input'); setKeyword(''); setShowFilters(false); setMyChannelUrl(''); }} variant="secondary">
                    ← {view === 'input' ? '워크플로우로 돌아가기' : '새로 분석하기'}
                </Button>
            </div>
            <main className="flex-grow flex flex-col justify-center">
                {content}
            </main>
            {renderDetailModal()}
        </div>
    );
};

export default InfluencerMarketingView;