
import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { VideoData, AIInsights, AnalysisMode, ComparisonInsights, VideoComment, CommentInsights, ChannelAnalysisData, AudienceProfile, VideoDetailData, AIVideoDeepDiveInsights, AIThumbnailInsights, ChannelRankingData, VideoRankingData, MyChannelAnalyticsData } from '../types';
import { getGeminiApiKey } from './apiKeyService';

const countryToLanguageMap: { [key: string]: string } = {
    'US': 'English',
    'JP': 'Japanese',
    'GB': 'English',
    'DE': 'German',
    'FR': 'French',
    'CN': 'Chinese (Simplified)',
    'RU': 'Russian',
    'CA': 'English',
    'AU': 'English',
    'VN': 'Vietnamese',
    'ID': 'Indonesian',
    'TH': 'Thai',
    'MY': 'Malay',
    'SG': 'English',
    'PH': 'English',
    'MX': 'Spanish',
    'CL': 'Spanish',
    'PE': 'Spanish',
    'NZ': 'English',
    'HK': 'Chinese (Traditional)',
    'TW': 'Chinese (Traditional)',
    'IN': 'Hindi',
    'BN': 'Malay',
    'PG': 'English',
    'KR': 'Korean',
};


// Uses the Gemini API to translate a keyword.
export const translateKeyword = async (keyword: string, targetCountry: string): Promise<string> => {
  const targetLanguage = countryToLanguageMap[targetCountry];
  if (!targetLanguage) {
    console.log(`No language mapping for country ${targetCountry}, returning original keyword.`);
    return keyword;
  }

  console.log(`Translating "${keyword}" to ${targetLanguage} for country ${targetCountry}`);

  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const translationPrompt = `Translate the following Korean keyword into ${targetLanguage}. Return only the translated keyword and nothing else.\nKorean keyword: "${keyword}"`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: translationPrompt
    });

    const translatedText = response.text.trim().replace(/"/g, ''); // Clean up quotes
    console.log(`Translation successful: ${translatedText}`);
    return translatedText;

  } catch (error) {
    console.error("Error calling Gemini API for translation:", error);
    // Fallback to a mock translation
    return `${keyword} (${targetCountry} translation)`;
  }
};

export const getAIBenchmarkRecommendations = async (channelName: string, topics: string[]): Promise<{ name: string; reason: string }[]> => {
    console.log(`Generating AI benchmark recommendations for "${channelName}"`);
    try {
        const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
        const prompt = `
            Suggest 3 REAL, EXISTING YouTube channels that are successful in the same niche as "${channelName}" (Topics: ${topics.join(', ')}).
            Focus on channels that have shown significant growth in the last 1 year (Rising Stars).
            Avoid global superstars like MrBeast; suggest realistic role models.
            Return JSON: { "channels": [{ "name": "Exact Channel Name", "reason": "Why this is a good benchmark (Korean)" }] }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        channels: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }
                            }
                        }
                    },
                    required: ["channels"]
                },
            },
        });

        const result = JSON.parse(response.text.trim());
        return result.channels || [];

    } catch (error) {
        console.error("Error calling Gemini API for benchmark recommendations:", error);
        return [
            { name: "신사임당", reason: "경제/비즈니스 분야의 독보적인 성장 사례입니다." },
            { name: "드로우앤드류", reason: "퍼스널 브랜딩과 감성적인 편집 스타일이 유사합니다." },
            { name: "너진똑", reason: "깊이 있는 분석 콘텐츠로 최근 급성장했습니다." }
        ];
    }
};

export const getAIChannelRecommendations = async (category: string, keyword: string): Promise<{ korea: { name: string; reason: string }[]; global: { name: string; reason: string }[] }> => {
    console.log(`Generating AI channel recommendations for Category: ${category}, Keyword: ${keyword}`);
    try {
        const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
        const prompt = `
            Recommend REAL, EXISTING YouTube channels that fit the category "${category}" and focus on "${keyword}".
            Task:
            1. Suggest 3 successful **Korean** channels.
            2. Suggest 3 successful **Global** (English/International) channels.
            
            Do NOT invent names. Suggest actual existing channels.
            Provide a specific reason for benchmarking each channel in Korean.
            
            Return JSON: 
            { 
              "korea": [{ "name": "Channel Name", "reason": "Reason" }],
              "global": [{ "name": "Channel Name", "reason": "Reason" }]
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        korea: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }
                            }
                        },
                        global: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }
                            }
                        }
                    },
                    required: ["korea", "global"]
                },
            },
        });

        const result = JSON.parse(response.text.trim());
        return {
            korea: result.korea || [],
            global: result.global || []
        };

    } catch (error) {
        console.error("Error calling Gemini API for channel recommendations:", error);
        // Fallback
        return {
            korea: [
                { name: `${keyword} 전문 채널`, reason: "해당 분야의 가장 대중적인 성공 사례입니다." },
                { name: `트렌드 헌터`, reason: "카테고리 내에서 독보적인 캐릭터를 구축했습니다." },
                { name: `라이징 스타`, reason: "최근 급성장 중인 채널입니다." }
            ],
            global: [
                { name: `${keyword} World`, reason: "글로벌 시장을 선도하는 채널입니다." },
                { name: `Global ${category}`, reason: "해외 트렌드를 파악하기 좋은 채널입니다." },
                { name: `International Creator`, reason: "전 세계적으로 팬덤을 보유하고 있습니다." }
            ]
        };
    }
};


// Uses the Gemini API to generate insights from video data.
export const getAIInsights = async (videoData: VideoData[], query: string, mode: AnalysisMode): Promise<AIInsights> => {
  console.log(`Generating AI insights for ${mode}: "${query}"`);

  if (videoData.length === 0) {
    return {
      summary: "인사이트를 생성하기에 데이터가 충분하지 않습니다. 유효한 검색어를 입력해주세요.",
      patterns: [],
      recommendations: [],
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const analysisPrompt = `
      다음은 "${query}"(${mode} 모드)에 대한 유튜브 동영상 데이터입니다.
      이 데이터를 분석하여 주요 패턴, 실행 가능한 추천 사항, 그리고 간결한 요약을 제공해주세요.
      결과는 반드시 유효한 JSON 객체 형식이어야 합니다.
      데이터: ${JSON.stringify(videoData.slice(0, 10), null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: analysisPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "조사 결과에 대한 간결한 요약." },
            patterns: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "데이터에서 관찰된 주요 패턴 (예: 제목 형식, 동영상 길이)."
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "콘텐츠 제작자를 위한 실행 가능한 추천 사항."
            }
          },
          required: ["summary", "patterns", "recommendations"]
        },
      },
    });

    const insights: AIInsights = JSON.parse(response.text.trim());
    return insights;
  } catch (error) {
    console.error("Error calling Gemini API for single analysis:", error);
    return generateMockInsights(query);
  }
};

export const getAIComparisonInsights = async (channelA: {query: string, videos: VideoData[]}, channelB: {query: string, videos: VideoData[]}): Promise<ComparisonInsights> => {
    console.log(`Generating AI comparison for "${channelA.query}" vs "${channelB.query}"`);

    if (channelA.videos.length === 0 || channelB.videos.length === 0) {
        return generateMockComparisonInsights(channelA.query, channelB.query); // Fallback for safety
    }

    try {
        const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
        // Simplify data to reduce token usage
        const simplify = (videos: VideoData[]) => videos.slice(0, 5).map(v => ({ title: v.title, views: v.viewCount, duration: v.durationMinutes }));

        const analysisPrompt = `
          유튜브 채널 A와 채널 B의 데이터를 비교 분석합니다.
          채널 A: "${channelA.query}"
          채널 B: "${channelB.query}"

          각 채널의 데이터 샘플:
          채널 A 데이터: ${JSON.stringify(simplify(channelA.videos), null, 2)}
          채널 B 데이터: ${JSON.stringify(simplify(channelB.videos), null, 2)}

          분석 작업:
          1. 두 채널의 핵심 성과 지표를 비교합니다.
          2. 각 채널의 강점을 2-3가지 식별합니다.
          3. 두 채널의 전략을 비교하여 종합적인 요약을 제공합니다.
          4. 두 채널의 데이터를 기반으로 한 채널 성장 전략을 한 문장으로 추천합니다.
          5. 아래의 responseSchema에 맞춰 유효한 JSON 객체로 결과를 반환해야 합니다.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: analysisPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING, description: "두 채널의 전략에 대한 종합적인 비교 요약." },
                        channelA_summary: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                stats: { type: Type.OBJECT, properties: {
                                    "평균 조회수": { type: Type.STRING },
                                    "평균 영상 길이": { type: Type.STRING },
                                }}
                            }
                        },
                        channelB_summary: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                stats: { type: Type.OBJECT, properties: {
                                    "평균 조회수": { type: Type.STRING },
                                    "평균 영상 길이": { type: Type.STRING },
                                }}
                            }
                        },
                        recommendation: { type: Type.STRING, description: "두 채널 분석에 기반한 종합적인 성장 전략 추천." }
                    },
                    required: ["summary", "channelA_summary", "channelB_summary", "recommendation"]
                }
            }
        });
        
        const insights: ComparisonInsights = JSON.parse(response.text.trim());
        return insights;
    } catch (error) {
        console.error("Error calling Gemini API for comparison:", error);
        return generateMockComparisonInsights(channelA.query, channelB.query);
    }
};

export const getRelatedKeywords = async (keyword: string): Promise<string[]> => {
  if (!keyword.trim()) {
    return [];
  }
  console.log(`Fetching related keywords for "${keyword}"`);
  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const prompt = `Suggest 5 related YouTube trend keywords for "${keyword}". Return JSON: { "keywords": ["k1", "k2", ...] }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            }
          },
          required: ["keywords"]
        },
      },
    });

    const result = JSON.parse(response.text.trim());
    return result.keywords || [];
  } catch (error) {
    console.error("Error calling Gemini API for related keywords:", error);
    return [`${keyword} 꿀팁`, `초보자 ${keyword}`, `${keyword} 추천`, `최고의 ${keyword} 2024`, `${keyword} 트렌드`];
  }
};

export const getAIAdKeywords = async (videoData: VideoData[]): Promise<string[]> => {
  console.log(`Generating AI Ad Keywords for ${videoData.length} videos.`);

  if (videoData.length === 0) {
    return [];
  }

  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    // Optimized input: only send titles and channel names to save tokens
    const optimizedInput = videoData.slice(0, 10).map(v => `${v.title} (${v.channelTitle})`).join('\n');

    const analysisPrompt = `
      Analyze these YouTube video titles:
      ${optimizedInput}

      Suggest 10 shopping/service/product keywords for ads.
      Return JSON: { "keywords": ["kw1", "kw2", ...] }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: analysisPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            }
          },
          required: ["keywords"]
        },
      },
    });

    const result = JSON.parse(response.text.trim());
    return result.keywords || [];
  } catch (error) {
    console.error("Error calling Gemini API for ad keywords:", error);
    return ["AI 분석 실패", "건강", "피부", "면역력", "노화 방지", "비타민", "관절", "보험", "여행", "운동"];
  }
};

// Combined function to reduce API calls (RPM optimization)
export const getAIChannelComprehensiveAnalysis = async (
    channelStats: { name: string; publishedAt: string; subscriberCount: number; totalViews: number; totalVideos: number; },
    videoSnippets: { title: string; tags: string[] }[],
    knownFirstVideoDate: string | null
): Promise<{
    overview: Omit<ChannelAnalysisData['overview'], 'uploadPattern'>;
    audienceProfile: AudienceProfile;
}> => {
    console.log(`Generating comprehensive AI analysis for channel "${channelStats.name}"`);
    
    // Fallback data in case of error
    const fallback = {
        overview: { competitiveness: { categories: ['분석 불가'], tags: ['AI 분석 실패'] }, popularKeywords: [{ keyword: '분석 불가', score: 0 }] },
        audienceProfile: generateMockAudienceProfile(),
    };

    try {
        const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
        
        // Optimizing input tokens: only take top 15 videos, remove unnecessary punctuation in tags if needed
        const videosInput = videoSnippets.slice(0, 15).map(v => `- ${v.title} [${v.tags.slice(0,3).join(',')}]`).join('\n');

        const prompt = `
            Analyze the following YouTube channel data and return a comprehensive report in JSON format.
            
            Channel Info:
            - Name: ${channelStats.name}
            - Created: ${channelStats.publishedAt}
            - Subscribers: ${channelStats.subscriberCount}
            - Views: ${channelStats.totalViews}
            - Videos: ${channelStats.totalVideos}

            Recent Videos:
            ${videosInput}

            Tasks:
            1. Overview: Identify 2-3 categories, 5-10 main tags, and 5 popular keywords with score (0-100).
            2. Audience: Summarize audience, list interests, estimate gender ratio (sum 100), age groups (sum 100), and top countries (sum 100). All text in Korean.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        overview: {
                            type: Type.OBJECT,
                            properties: {
                                competitiveness: {
                                    type: Type.OBJECT,
                                    properties: {
                                        categories: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                                    }
                                },
                                popularKeywords: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            keyword: { type: Type.STRING },
                                            score: { type: Type.INTEGER }
                                        }
                                    }
                                }
                            }
                        },
                        audienceProfile: {
                            type: Type.OBJECT,
                            properties: {
                                summary: { type: Type.STRING },
                                interests: { type: Type.ARRAY, items: { type: Type.STRING } },
                                genderRatio: {
                                    type: Type.ARRAY,
                                    items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, value: { type: Type.INTEGER } } }
                                },
                                ageGroups: {
                                    type: Type.ARRAY,
                                    items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, value: { type: Type.INTEGER } } }
                                },
                                topCountries: {
                                    type: Type.ARRAY,
                                    items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, value: { type: Type.INTEGER } } }
                                }
                            }
                        }
                    },
                    required: ["overview", "audienceProfile"]
                },
            },
        });

        const result = JSON.parse(response.text.trim());
        return result;

    } catch (error) {
        console.error("Error calling Gemini API for comprehensive analysis:", error);
        return fallback;
    }
};

export const getAIChannelDashboardInsights = async (
    channelName: string,
    stats: { subscribers: number; totalViews: number; videoCount: number },
    recentVideos: { title: string; views: number; publishedAt: string }[]
): Promise<Partial<MyChannelAnalyticsData>> => {
    console.log(`Generating Dashboard Insights for ${channelName}`);
    
    try {
        const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
        const prompt = `
            Analyze this YouTube channel data and provide strategic insights for a dashboard.
            Channel: ${channelName}
            Stats: ${JSON.stringify(stats)}
            Recent Videos (last 10): ${JSON.stringify(recentVideos.slice(0, 10))}

            Provide JSON output with:
            1. aiExecutiveSummary: Overall performance summary, strengths, opportunities.
            2. aiGrowthInsight: Insights on growth trends (subs/views).
            3. aiFunnelInsight: Insights on viewer conversion funnel (impression to view).
            4. contentSuccessFormula: title patterns, optimal length, thumbnail style.
            5. contentIdeas: 3 specific video ideas with reasons.
            6. viewerPersona: Name, description, and strategy for target audience.
            
            Language: Korean.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        aiExecutiveSummary: {
                            type: Type.OBJECT,
                            properties: {
                                summary: { type: Type.STRING },
                                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        },
                        aiGrowthInsight: {
                            type: Type.OBJECT,
                            properties: {
                                summary: { type: Type.STRING },
                                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        },
                        aiFunnelInsight: {
                            type: Type.OBJECT,
                            properties: {
                                summary: { type: Type.STRING },
                                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        },
                        contentSuccessFormula: {
                            type: Type.OBJECT,
                            properties: {
                                titlePatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                                optimalLength: { type: Type.STRING },
                                thumbnailStyle: { type: Type.STRING }
                            }
                        },
                        contentIdeas: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }
                            }
                        },
                        viewerPersona: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                strategy: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        });

        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error generating dashboard insights:", error);
        return {};
    }
};

// Keep specific exports for backward compatibility if needed, but make them use the mock or lighter logic
export const getAIChannelAnalysisOverview = async (videoSnippets: { title: string; tags: string[] }[]): Promise<Omit<ChannelAnalysisData['overview'], 'uploadPattern'>> => {
    // This should ideally not be called directly anymore in the optimized flow
    return { competitiveness: { categories: [], tags: [] }, popularKeywords: [] };
};

export const getAIAudienceProfile = async (videoSnippets: { title: string; tags: string[] }[]): Promise<AudienceProfile> => {
     return generateMockAudienceProfile();
};

const generateMockInsights = (query: string): AIInsights => {
    return {
        summary: `"${query}"에 대한 분석 결과, 8-12분 길이의 동영상이 강세를 보입니다. 감성적이고 놀라운 제목이 가장 높은 참여를 유도합니다.`,
        patterns: [
            "제목에 '감성' 키워드가 포함된 동영상의 참여도가 높습니다.",
            "사람 얼굴이 포함된 썸네일은 클릭률이 15% 더 높습니다.",
            "주말에 게시된 동영상은 초기 조회수가 30% 더 높습니다.",
        ],
        recommendations: [
            "최적의 참여를 위해 8-12분 길이의 동영상을 목표로 하세요.",
            "제목과 썸네일에 감성적이거나 놀라운 요소를 포함시키세요.",
            "토요일 또는 일요일 오전에 초점을 맞춰 일관된 업로드 일정을 수립하세요.",
        ],
    };
};

const generateMockComparisonInsights = (queryA: string, queryB: string): ComparisonInsights => {
    return {
        summary: `'${queryA}' 채널은 전문적인 주제에 집중하여 깊이 있는 정보를 제공하는 반면, '${queryB}' 채널은 다양한 일상 주제로 폭넓은 시청자층을 확보하고 있습니다.`,
        channelA_summary: {
            name: queryA,
            strengths: ["높은 주제 전문성", "충성도 높은 구독자층 형성"],
            stats: { "평균 조회수": "85,400", "평균 영상 길이": "14.5분" }
        },
        channelB_summary: {
            name: queryB,
            strengths: ["다양한 콘텐츠 포트폴리오", "높은 영상 업로드 빈도"],
            stats: { "평균 조회수": "42,100", "평균 영상 길이": "8.2분" }
        },
        recommendation: "A채널은 쇼츠를 활용해 신규 시청자 유입을 늘리고, B채널은 특정 인기 주제에 대한 심층 시리즈를 기획하여 전문성을 강화하는 전략이 유효합니다."
    };
};

export const getAICommentInsights = async (comments: VideoComment[]): Promise<CommentInsights> => {
    console.log(`Generating AI insights for ${comments.length} comments.`);

    if (comments.length === 0) {
        return {
            summary: "분석할 댓글이 없습니다.",
            positivePoints: [],
            negativePoints: [],
        };
    }

    try {
        const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
        const analysisPrompt = `
          Analyze these YouTube comments. Summarize sentiment, find 3 pros, 3 cons/suggestions. Return JSON.
          **IMPORTANT: All output text (summary, points) MUST be in Korean.**
          Comments: ${JSON.stringify(comments.slice(0, 20).map(c => c.text), null, 2)}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: analysisPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                        negativePoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["summary", "positivePoints", "negativePoints"]
                },
            },
        });

        const insights: CommentInsights = JSON.parse(response.text.trim());
        return insights;
    } catch (error) {
        console.error("Error calling Gemini API for comment analysis:", error);
        // Mock fallback
        return {
            summary: "AI 분석 중 오류가 발생했습니다. 댓글들은 영상의 내용에 대해 전반적으로 긍정적이며, 특히 편집 스타일을 칭찬하는 의견이 많습니다.",
            positivePoints: ["편집이 재미있어요.", "설명이 귀에 쏙쏙 들어와요.", "다음 영상도 기대됩니다!"],
            negativePoints: ["음악 소리가 조금 큰 것 같아요.", "초반 인트로가 너무 길어요."],
        };
    }
};

export const getAIVideoDeepDiveInsights = async (video: Omit<VideoDetailData, 'deepDiveInsights'>): Promise<AIVideoDeepDiveInsights> => {
  console.log(`Generating AI deep dive insights for video: "${video.title}"`);

  const videoDataForPrompt = {
    title: video.title,
    duration: video.durationMinutes,
    views: video.viewCount,
    subs: video.channelSubscriberCount,
    commentsSummary: video.commentInsights.summary,
  };
  
  const fallback: AIVideoDeepDiveInsights = {
      topicAnalysis: { summary: "AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.", successFactors: [] },
      audienceAnalysis: { summary: "AI 분석에 실패했습니다.", engagementPoints: [] },
      performanceAnalysis: { summary: "AI 분석에 실패했습니다.", trafficSources: [], subscriberImpact: "알 수 없음" },
      retentionStrategy: { summary: "AI 분석에 실패했습니다.", improvementPoints: [] },
      strategicRecommendations: { contentStrategy: "AI 분석에 실패했습니다.", newTopics: [], growthStrategy: "알 수 없음" },
  };

  try {
    // Changed model from gemini-3-pro-preview to gemini-2.5-flash for stability and cost
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const prompt = `
      Analyze YouTube video data. Return JSON strategy report in Korean.
      Data: ${JSON.stringify(videoDataForPrompt)}

      Sections:
      1. Topic/Success Factors
      2. Audience Analysis
      3. Performance Analysis (Sources, Sub Impact)
      4. Retention Strategy (Improvement Points)
      5. Strategic Recommendations (Content Strategy, New Topics, Growth Strategy)
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                topicAnalysis: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        successFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                     required: ["summary", "successFactors"]
                },
                audienceAnalysis: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        engagementPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["summary", "engagementPoints"]
                },
                performanceAnalysis: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        trafficSources: { type: Type.ARRAY, items: { type: Type.STRING } },
                        subscriberImpact: { type: Type.STRING },
                    },
                     required: ["summary", "trafficSources", "subscriberImpact"]
                },
                retentionStrategy: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        improvementPoints: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    point: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    productionTip: { type: Type.STRING },
                                    editingTip: { type: Type.STRING },
                                },
                            }
                        }
                    },
                    required: ["summary", "improvementPoints"]
                },
                strategicRecommendations: {
                    type: Type.OBJECT,
                    properties: {
                        contentStrategy: { type: Type.STRING },
                        newTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                        growthStrategy: { type: Type.STRING },
                    },
                    required: ["contentStrategy", "newTopics", "growthStrategy"]
                },
            },
        },
      },
    });

    const insights: AIVideoDeepDiveInsights = JSON.parse(response.text.trim());
    return insights;
  } catch (error) {
    console.error("Error calling Gemini API for video deep dive analysis:", error);
    return fallback;
  }
};


const generateMockAudienceProfile = (): AudienceProfile => ({
    summary: "AI 분석에 따르면 이 채널의 주요 시청자층은 기술과 생산성 도구에 관심이 많은 20-30대 남성으로 추정됩니다. 최신 IT 트렌드와 소프트웨어 활용법에 대한 콘텐츠가 높은 참여를 유도할 가능성이 높습니다.",
    interests: ["Productivity Software", "Tech Gadgets", "Web Development", "AI Tools", "Startups"],
    genderRatio: [
        { label: '남성', value: 75 },
        { label: '여성', value: 25 },
    ],
    ageGroups: [
        { label: '18-24', value: 35 },
        { label: '25-34', value: 45 },
        { label: '35-44', value: 15 },
        { label: '기타', value: 5 },
    ],
    topCountries: [
        { label: '대한민국', value: 85 },
        { label: '미국', value: 7 },
        { label: '일본', value: 3 },
        { label: '베트남', value: 2 },
    ]
});

export const getAISimilarChannels = async (channelData: ChannelAnalysisData): Promise<{ channels: { name: string; reason: string }[] }> => {
    console.log(`Generating AI similar channels for "${channelData.name}"`);
    try {
        const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
        const prompt = `
            Recommend 3 REAL, EXISTING YouTube channels that are similar to "${channelData.name}".
            Do NOT invent names. Suggest actual active channels.
            
            Context:
            - Channel Topics: ${channelData.overview.popularKeywords.map(k => k.keyword).join(', ')}.
            - Recent Videos: ${channelData.videoList.slice(0, 5).map(v => v.title).join(', ')}.
            
            Return JSON: { "channels": [{ "name": "Exact Channel Name", "reason": "Reason in Korean" }] }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        channels: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }
                            }
                        }
                    },
                    required: ["channels"]
                },
            },
        });

        const result = JSON.parse(response.text.trim());
        return result;

    } catch (error) {
        console.error("Error calling Gemini API for similar channels:", error);
        // Fallback
        return {
            channels: [
                { name: `"${channelData.name}"와 비슷한 채널`, reason: "AI 분석 실패: API 응답을 받지 못했습니다." }
            ]
        };
    }
};

export const getAIThumbnailAnalysis = async (
  videoData: { id: string; title: string; thumbnailUrl: string }[],
  query: string
): Promise<AIThumbnailInsights> => {
  console.log(`Generating AI thumbnail analysis for query: "${query}"`);
  
  const fallbackInsights: AIThumbnailInsights = {
    analysis: {
      focalPoint: "AI 분석 중 오류 발생.",
      colorContrast: "AI 분석 중 오류 발생.",
      faceEmotionCTR: "AI 분석 중 오류 발생.",
      textReadability: "AI 분석 중 오류 발생.",
      brandingConsistency: "AI 분석 중 오류 발생.",
      mobileReadability: "AI 분석 중 오류 발생.",
      categoryRelevance: "AI 분석 중 오류 발생.",
      titlePatterns: "AI 분석 중 오류 발생.",
      titleLength: "AI 분석 중 오류 발생.",
      titleCredibility: "AI 분석 중 오류 발생.",
    },
    results: {
      thumbnailSummary: "AI 분석 중 오류 발생.",
      improvedConcepts: [{ concept: "오류", description: "개선된 콘셉트를 생성할 수 없습니다." }],
      textCandidates: ["오류"],
      designGuide: { colors: "오류", fonts: "오류", layout: "오류" },
      titleSummary: "AI 분석 중 오류 발생.",
      titleSuggestions: [{ title: "오류", reason: "추천 제목을 생성할 수 없습니다." }],
    },
  };

  if (videoData.length === 0) return fallbackInsights;

  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

    // Single step: Comprehensive Analysis
    const fullAnalysisPrompt = `
      Analyze top YouTube videos for "${query}".
      Checklist: Thumbnails (Contrast, Face, Text), Titles (Concise, Curiosity).
      
      **IMPORTANT: All string values in the JSON response (analysis, suggestions, descriptions) MUST BE IN KOREAN.**
      
      Return analysis, improvement suggestions, and score (0-100) per video in JSON.
      Videos: ${JSON.stringify(videoData.slice(0, 10).map(v=>v.title), null, 2)}
    `;
    const fullAnalysisResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullAnalysisPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: {
              type: Type.OBJECT,
              properties: {
                focalPoint: { type: Type.STRING }, colorContrast: { type: Type.STRING },
                faceEmotionCTR: { type: Type.STRING }, textReadability: { type: Type.STRING },
                brandingConsistency: { type: Type.STRING }, mobileReadability: { type: Type.STRING },
                categoryRelevance: { type: Type.STRING }, titlePatterns: { type: Type.STRING },
                titleLength: { type: Type.STRING }, titleCredibility: { type: Type.STRING },
              },
            },
            results: {
              type: Type.OBJECT,
              properties: {
                thumbnailSummary: { type: Type.STRING },
                improvedConcepts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { concept: { type: Type.STRING }, description: { type: Type.STRING } } } },
                textCandidates: { type: Type.ARRAY, items: { type: Type.STRING } },
                designGuide: { type: Type.OBJECT, properties: { colors: { type: Type.STRING }, fonts: { type: Type.STRING }, layout: { type: Type.STRING } } },
                titleSummary: { type: Type.STRING },
                titleSuggestions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, reason: { type: Type.STRING } } } },
              },
            },
            scoredThumbnails: {
              type: Type.ARRAY,
              items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, totalScore: { type: Type.INTEGER } } },
            },
          },
          required: ["analysis", "results", "scoredThumbnails"],
        },
      },
    });

    const finalInsights: AIThumbnailInsights = JSON.parse(fullAnalysisResponse.text.trim());
    return finalInsights;
  } catch (error) {
    console.error("Error calling Gemini API for thumbnail analysis:", error);
    return fallbackInsights;
  }
};


export const getAIRankingAnalysis = async (
  items: (ChannelRankingData | VideoRankingData)[],
  type: 'channels' | 'videos'
): Promise<{ id: string; insight: string }[]> => {
  if (items.length === 0) {
    return [];
  }
  console.log(`Generating AI ranking analysis for ${items.length} ${type}.`);

  const itemType = type === 'channels' ? '채널' : '영상';
  // Optimized prompt
  const prompt = `
    Analyze ${itemType} ranking changes. Explain *why* rank changed in 1 sentence (Korean).
    Data: ${JSON.stringify(items.slice(0, 15).map(item => ({ id: item.id, name: item.name, change: item.rankChange })), null, 2)}
    Return JSON: { "analysis": [{ "id": "...", "insight": "..." }] }
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  insight: { type: Type.STRING },
                },
                required: ['id', 'insight'],
              },
            },
          },
          required: ['analysis'],
        },
      },
    });

    const result = JSON.parse(response.text.trim());
    return result.analysis || [];
  } catch (error) {
    console.error('Error calling Gemini API for ranking analysis:', error);
    return items.map(item => ({ id: item.id, insight: 'AI 분석 중 오류가 발생했습니다.' }));
  }
};


export const getAITrendingInsight = async (
    countryCode: string,
    trendingVideos: { title: string; channelTitle: string }[],
    excludedCategories: string[] = [],
    topChannelsList: string[] = []
): Promise<{
  summary: string;
  viralFactors: string[];
  topKeywords: string[];
}> => {
    console.log(`Generating AI Trending Insight for country: ${countryCode}`);
    
    const fallback = {
        summary: "트렌드 분석에 실패했습니다. 다시 시도해주세요.",
        viralFactors: [],
        topKeywords: [],
    };

    if (!trendingVideos || trendingVideos.length === 0) return fallback;

    try {
        const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
        // Optimize input data: Just titles and channels, limit to 30
        const prompt = `
            Analyze top 30 trending videos in ${countryCode}.
            Excluded topics: ${excludedCategories.join(', ')}.
            Top Channels context: ${topChannelsList.join(', ')}.

            Data: ${JSON.stringify(trendingVideos.slice(0, 30), null, 2)}

            1. Root Cause: Why are these specific topics exploding today? (Korean, ignore excluded topics)
            2. Viral Factors: 3-5 key reasons (e.g., "Seasonality").
            3. Top Keywords: 10 most recurring keywords.

            **Output Language: Korean (Must translate all English terms)**
            Return JSON.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        viralFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
                        topKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["summary", "viralFactors", "topKeywords"]
                },
            },
        });

        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error generating AI trending insight:", error);
        return fallback;
    }
};


let chat: Chat | null = null;
let chatApiKey: string | null = null;

export const startChatSession = (): Chat => {
    const currentApiKey = getGeminiApiKey();
    if (chat && chatApiKey === currentApiKey) {
        return chat;
    }
    
    console.log("Initializing new chat session.");
    chatApiKey = currentApiKey;
    const ai = new GoogleGenAI({ apiKey: chatApiKey });
    chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are 'Johnson', an expert YouTube analyst. Help users with YouTube data. Be concise.`,
        },
    });
    return chat;
}
