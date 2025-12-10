


import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { AnalysisMode, FilterState, VideoLength, Period, SortBy, VideoFormat } from '../types';
import { YOUTUBE_CATEGORY_OPTIONS, COUNTRY_OPTIONS } from '../types';
import Button from './common/Button';
import { translateKeyword, getRelatedKeywords } from '../services/geminiService';

interface FilterBarProps {
  onAnalyze: (searchQuery: string) => void;
  isLoading: boolean;
  onOpenCompareModal: () => void;
  selectedChannelCount: number;
  query: string;
  onQueryChange: (q: string) => void;
  mode: AnalysisMode;
  onModeChange: (m: AnalysisMode) => void;
  filters: FilterState;
  onFiltersChange: (f: FilterState | ((prevState: FilterState) => FilterState)) => void;
}

const viewOptions = [
    { label: "10만+", value: 100000 },
    { label: "1만+", value: 10000 },
    { label: "1천+", value: 1000 },
    { label: "전체", value: 0 },
];

const limitOptions = [
    { label: "50개", value: 50 },
    { label: "75개", value: 75 },
    { label: "100개", value: 100 },
];

const videoFormatOptions = [
    { label: "전체", value: 'any' },
    { label: "3분 초과 (Long)", value: 'longform' },
    { label: "3분 이하 (Shorts)", value: 'shorts' },
];

const initialFilterState: FilterState = {
  minViews: 100000,
  videoLength: 'any',
  videoFormat: 'any',
  period: '30',
  sortBy: 'viewCount',
  resultsLimit: 50,
  country: 'KR',
  category: 'all',
};

const CountrySelect: React.FC<{ selectedCountry: string; onChange: (value: string) => void; }> = ({ selectedCountry, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);
    
    const selectedOption = COUNTRY_OPTIONS.find(o => o.value === selectedCountry) || COUNTRY_OPTIONS[0];

    return (
        <div className="relative w-28" ref={ref}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-1.5 flex items-center justify-between text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                <span className="flex items-center gap-2">
                    {selectedOption.value === 'WW' ? (
                        <span role="img" aria-label="Worldwide">🌍</span>
                    ) : (
                        <img src={`https://flagcdn.com/w20/${selectedOption.value.toLowerCase()}.png`} alt={selectedOption.label} className="w-5 h-auto" />
                    )}
                    {selectedOption.label}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isOpen && (
                <ul className="absolute z-10 mt-1 w-48 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto text-xs py-1">
                    {COUNTRY_OPTIONS.map(opt => (
                        <li key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className="px-3 py-2 flex items-center gap-3 hover:bg-gray-600 cursor-pointer text-gray-200">
                            {opt.value === 'WW' ? (
                                <span role="img" aria-label="Worldwide" className="text-lg">🌍</span>
                            ) : (
                                <img src={`https://flagcdn.com/w20/${opt.value.toLowerCase()}.png`} alt={opt.label} className="w-5 h-auto flex-shrink-0" />
                            )}
                            <span className="font-semibold">{opt.label}</span>
                            <span className="text-gray-400">{opt.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


const FilterBar: React.FC<FilterBarProps> = ({ 
    onAnalyze, 
    isLoading, 
    onOpenCompareModal, 
    selectedChannelCount,
    query,
    onQueryChange,
    mode,
    onModeChange,
    filters,
    onFiltersChange
}) => {
  const [translatedKeyword, setTranslatedKeyword] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [relatedKeywords, setRelatedKeywords] = useState<string[]>([]);
  const [isFetchingKeywords, setIsFetchingKeywords] = useState(false);

  const handleFilterChange = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange(prev => ({ ...prev, [key]: value }));
  }, [onFiltersChange]);

  const handleResetFilters = () => {
    onFiltersChange(initialFilterState);
    onModeChange('keyword');
    setTranslatedKeyword(null);
  }

  useEffect(() => {
    const handler = setTimeout(async () => {
        const country = filters.country;
        if (country && country !== 'KR' && country !== 'WW' && query.trim()) {
            setIsTranslating(true);
            setTranslatedKeyword(null);
            try {
                const translation = await translateKeyword(query, country);
                setTranslatedKeyword(translation);
            } catch (error) {
                console.error("Translation failed:", error);
                setTranslatedKeyword("번역 실패");
            } finally {
                setIsTranslating(false);
            }
        } else {
            setTranslatedKeyword(null);
        }
    }, 500);

    return () => clearTimeout(handler);
  }, [query, filters.country]);
  
  useEffect(() => {
    const handler = setTimeout(async () => {
        if (query.trim()) {
            setIsFetchingKeywords(true);
            try {
                const keywords = await getRelatedKeywords(query);
                setRelatedKeywords(keywords);
            } catch (error) {
                console.error("Failed to fetch related keywords:", error);
                setRelatedKeywords([]);
            } finally {
                setIsFetchingKeywords(false);
            }
        } else {
            setRelatedKeywords([]);
        }
    }, 700);

    return () => clearTimeout(handler);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let searchQuery = query;
    if (mode === 'keyword') {
        const isForeignSearch = filters.country !== 'KR' && filters.country !== 'WW';
        if (isForeignSearch && translatedKeyword && translatedKeyword !== "번역 실패") {
            searchQuery = translatedKeyword;
        }
    }
    onAnalyze(searchQuery);
  };
  
  return (
    <div className="bg-gray-900 p-3 border-b border-gray-700/50 flex-shrink-0">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-shrink-0 grid grid-cols-2 gap-1 rounded-md bg-gray-700/50 p-1">
            <button type="button" onClick={() => onModeChange('keyword')} className={`px-3 py-1 text-sm font-medium rounded ${mode === 'keyword' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>키워드</button>
            <button type="button" onClick={() => onModeChange('channel')} className={`px-3 py-1 text-sm font-medium rounded ${mode === 'channel' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>채널</button>
          </div>
          <div className="flex-grow relative min-w-[200px]">
            <input id="query" type="text" value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder={mode === 'keyword' ? '검색 키워드' : '채널 URL 또는 ID'} className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 placeholder-gray-400" />
            {isTranslating && <div className="text-xs text-blue-400 px-1 pt-1 absolute top-full left-0">키워드 번역 중...</div>}
            {translatedKeyword && <div className="text-xs text-gray-300 px-1 pt-1 absolute top-full left-0"><span className="font-semibold text-green-400">번역:</span> {translatedKeyword}</div>}
          </div>
          <Button type="submit" disabled={isLoading || !query} className="flex-shrink-0">
            {isLoading ? '검색 중...' : '검색'}
          </Button>
        </div>

        {(isFetchingKeywords || relatedKeywords.length > 0) && (
          <div className="p-2 bg-gray-800/60 rounded-lg min-h-[40px] flex items-center">
            {isFetchingKeywords ? (
              <p className="text-sm text-gray-400 px-2">AI가 연관 키워드를 찾고 있어요...</p>
            ) : (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-semibold text-gray-400 self-center pr-2">추천:</span>
                {relatedKeywords.map((keyword, index) => (
                  <button key={index} type="button" onClick={() => onQueryChange(keyword)} className="px-3 py-1 text-xs font-medium bg-gray-700 text-gray-200 rounded-full hover:bg-gray-600 hover:text-white transition-colors">
                    {keyword}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <h3 className="text-sm font-semibold text-gray-400 mr-2">필터 조건:</h3>
            <div className="flex items-center gap-1.5">
                <label className="text-gray-300">국가:</label>
                <CountrySelect selectedCountry={filters.country} onChange={(value) => handleFilterChange('country', value)} />
            </div>
            <div className="flex items-center gap-1.5">
                <label htmlFor="category" className="text-gray-300">카테고리:</label>
                <select 
                    id="category" 
                    value={filters.category} 
                    onChange={e => handleFilterChange('category', e.target.value)} 
                    disabled={mode === 'channel'}
                    className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {YOUTUBE_CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-1.5">
                <label htmlFor="sortBy" className="text-gray-300">정렬:</label>
                <select id="sortBy" value={filters.sortBy} onChange={e => handleFilterChange('sortBy', e.target.value as SortBy)} className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5">
                    <option value="viewCount">조회수</option>
                    <option value="viewsPerHour">시간당 조회수</option>
                    <option value="publishedAt">최신순</option>
                    <option value="engagementRate">참여율</option>
                    <option value="performanceRatio">성과배율</option>
                    <option value="satisfactionScore">만족점수</option>
                    <option value="grade">등급</option>
                    <option value="cll">CLL</option>
                    <option value="cul">CUL</option>
                </select>
            </div>
             <div className="flex items-center gap-1.5">
                <label htmlFor="resultsLimit" className="text-gray-300">결과 수:</label>
                <select id="resultsLimit" value={filters.resultsLimit} onChange={e => handleFilterChange('resultsLimit', parseInt(e.target.value, 10))} className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5">
                     {limitOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-1.5">
                <label htmlFor="period" className="text-gray-300">기간:</label>
                <select id="period" value={filters.period} onChange={e => handleFilterChange('period', e.target.value as Period)} className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5">
                     <option value="any">전체 기간</option>
                     <option value="7">최근 7일</option>
                     <option value="30">최근 30일</option>
                     <option value="90">최근 90일</option>
                </select>
            </div>
            <div className="flex items-center gap-1.5">
                <label className="text-gray-300">종류:</label>
                 <div className="flex items-center rounded-md bg-gray-700/50 p-0.5">
                    {videoFormatOptions.map(opt => (
                        <button type="button" key={opt.value} onClick={() => handleFilterChange('videoFormat', opt.value as VideoFormat)} className={`px-2 py-0.5 text-xs rounded ${filters.videoFormat === opt.value ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                            {opt.label}
                        </button>
                    ))}
                 </div>
            </div>
            <div className="flex items-center gap-1.5">
                 <label className="text-gray-300">조회수:</label>
                 <div className="flex items-center rounded-md bg-gray-700/50 p-0.5">
                    {viewOptions.map(opt => (
                        <button type="button" key={opt.value} onClick={() => handleFilterChange('minViews', opt.value)} className={`px-2 py-0.5 text-xs rounded ${filters.minViews === opt.value ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                            {opt.label}
                        </button>
                    ))}
                 </div>
            </div>
            <div className="flex-grow flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onOpenCompareModal} className="text-xs py-1.5 px-3 relative">
                    채널 비교
                    {selectedChannelCount > 0 && (
                        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{selectedChannelCount}</span>
                    )}
                </Button>
                <Button type="button" variant="secondary" onClick={handleResetFilters} className="text-xs py-1.5 px-3">필터 초기화</Button>
            </div>
        </div>
      </form>
    </div>
  );
};

export default FilterBar;