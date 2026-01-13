

import React, { useState, useCallback, useEffect } from 'react';
import type { FilterState, SortBy, VideoFormat, VideoLength, ChannelRankingData } from '../types';
import { YOUTUBE_CATEGORY_OPTIONS } from '../types';
import Button from './common/Button';
import HelpTooltip from './common/HelpTooltip';
import { translateKeyword, getRelatedKeywords } from '../services/geminiService';

type SearchTab = 'video' | 'channel';

interface FilterBarProps {
  onAnalyze: (searchQuery: string, searchTab: SearchTab) => void;
  isLoading: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  searchTab: SearchTab;
  onSearchTabChange: (t: SearchTab) => void;
  filters: FilterState;
  onFiltersChange: (f: FilterState | ((prevState: FilterState) => FilterState)) => void;
  selectedChannels: Record<string, { name: string }>;
  onCompare: () => void;
}

const limitOptions = [
    { label: "25개", value: 25 },
    { label: "50개", value: 50 },
    { label: "75개", value: 75 },
    { label: "100개", value: 100 },
];

const videoFormatOptions = [
    { label: "무관", value: 'any' },
    { label: "롱폼(3분+)", value: 'longform' },
    { label: "숏폼(3분-)", value: 'shorts' },
];

const countryOptions = [
    { label: "전세계 (Global)", value: "WW" },
    { label: "대한민국 (Korea)", value: "KR" },
    { label: "미국 (USA)", value: "US" },
    { label: "일본 (Japan)", value: "JP" },
    // Simplified for brevity
];

const initialFilterState: FilterState = {
  minViews: 100000,
  videoLength: 'any',
  videoFormat: 'any',
  period: '30',
  sortBy: 'viewCount',
  resultsLimit: 25,
  country: 'KR',
  category: 'all',
};

const minViewsOptions = [
    { label: "1만+", value: 10000 },
    { label: "5만+", value: 50000 },
    { label: "10만+", value: 100000 },
    { label: "50만+", value: 500000 },
    { label: "100만+", value: 1000000 },
];

const videoLengthOptions = [
    { label: "전체 길이", value: 'any' },
    { label: "단편 (4분-)", value: 'short' },
    { label: "중편 (4-20분)", value: 'medium' },
    { label: "장편 (20분+)", value: 'long' },
];

const FilterBar: React.FC<FilterBarProps> = ({ 
    onAnalyze, 
    isLoading, 
    query,
    onQueryChange,
    searchTab,
    onSearchTabChange,
    filters,
    onFiltersChange,
    selectedChannels,
    onCompare,
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
    setTranslatedKeyword(null);
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let searchQuery = query;
    // Translation logic remains useful for keyword searches in foreign countries
    if (searchTab === 'video') {
        const isForeignSearch = filters.country !== 'KR' && filters.country !== 'WW';
        if (isForeignSearch && translatedKeyword && translatedKeyword !== "번역 실패 (Translation Failed)") {
            searchQuery = translatedKeyword;
        }
    }
    onAnalyze(searchQuery, searchTab);
  };
  
  return (
    <div className="bg-gray-900/80 backdrop-blur-sm p-3 border-b border-gray-700/50 flex-shrink-0">
      
      <div className="flex items-center gap-4 mb-3">
        {/* Search Tabs */}
        <div className="flex-shrink-0 flex items-center gap-2">
            <button onClick={() => onSearchTabChange('video')} className={`px-4 py-2 text-sm font-semibold rounded-md ${searchTab === 'video' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                영상 탐색 (Video Search)
            </button>
            <button onClick={() => onSearchTabChange('channel')} className={`px-4 py-2 text-sm font-semibold rounded-md ${searchTab === 'channel' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                채널 탐색 (Channel Search)
            </button>
        </div>
        {/* Search Form */}
        <form onSubmit={handleSubmit} className="flex-grow flex items-center gap-2">
          <div className="flex-grow relative">
            <input id="query" type="text" value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder={searchTab === 'video' ? '영상 키워드 검색' : '채널 키워드, URL 또는 핸들 검색'} className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 placeholder-gray-400" />
          </div>
          <Button type="submit" disabled={isLoading || !query} className="flex-shrink-0 !py-2.5">
            {isLoading ? '검색 중... (Searching...)' : '검색 (Search)'}
          </Button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <h3 className="text-sm font-semibold text-gray-400 mr-2">필터 (Filter):</h3>
          <div className="flex items-center gap-1.5">
              <label htmlFor="country" className="text-gray-300">국가 (Country):</label>
              <select id="country" value={filters.country} onChange={e => handleFilterChange('country', e.target.value)} className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5">
                  {countryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          </div>
          <div className="flex items-center gap-1.5">
              <label htmlFor="category" className="text-gray-300">카테고리 (Category):</label>
              <select 
                  id="category" 
                  value={filters.category} 
                  onChange={e => handleFilterChange('category', e.target.value)} 
                  className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5"
              >
                  {YOUTUBE_CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          </div>
          <div className="flex items-center gap-1.5">
              <label htmlFor="sortBy" className="text-gray-300">정렬 (Sort):</label>
              <select id="sortBy" value={filters.sortBy} onChange={e => handleFilterChange('sortBy', e.target.value as SortBy)} className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5">
                  <option value="relevance">관련성</option>
                  <option value="viewCount">조회수</option>
                  <option value="publishedAt">최신순</option>
                  {searchTab === 'video' && <option value="engagementRate">참여율</option>}
              </select>
          </div>
           <div className="flex items-center gap-1.5">
              <label htmlFor="resultsLimit" className="text-gray-300">결과 수 (Results):</label>
              <select id="resultsLimit" value={filters.resultsLimit} onChange={e => handleFilterChange('resultsLimit', parseInt(e.target.value, 10))} className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5">
                   {limitOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          </div>
          
          {/* Video-only filters */}
          <div className={`flex items-center gap-1.5 ${searchTab === 'video' ? 'flex' : 'hidden'}`}>
              <label htmlFor="minViews" className="text-gray-300">최소 조회수 (Min Views):</label>
              <select id="minViews" value={filters.minViews} onChange={e => handleFilterChange('minViews', parseInt(e.target.value, 10))} className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5">
                  {minViewsOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          </div>
          <div className={`flex items-center gap-1.5 ${searchTab === 'video' ? 'flex' : 'hidden'}`}>
              <label htmlFor="videoLength" className="text-gray-300">영상 길이 (Length):</label>
              <select id="videoLength" value={filters.videoLength} onChange={e => handleFilterChange('videoLength', e.target.value as VideoLength)} className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5">
                  {videoLengthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          </div>
          <div className={`flex items-center gap-1.5 ${searchTab === 'video' ? 'flex' : 'hidden'}`}>
              <label htmlFor="period" className="text-gray-300">업로드 날짜 (Uploaded):</label>
              <select id="period" value={filters.period} onChange={e => handleFilterChange('period', e.target.value as FilterState['period'])} className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs p-1.5">
                   <option value="any">전체 기간</option>
                   <option value="7">최근 7일</option>
                   <option value="30">최근 30일</option>
                   <option value="90">최근 90일</option>
              </select>
          </div>
          <div className={`flex items-center gap-1.5 ${searchTab === 'video' ? 'flex' : 'hidden'}`}>
              <label className="text-gray-300">포맷 (Format):</label>
               <div className="flex items-center rounded-md bg-gray-700/50 p-0.5">
                  {videoFormatOptions.map(opt => (
                      <button type="button" key={opt.value} onClick={() => handleFilterChange('videoFormat', opt.value as VideoFormat)} className={`px-2 py-0.5 text-xs rounded ${filters.videoFormat === opt.value ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                          {opt.label}
                      </button>
                  ))}
               </div>
          </div>

          <div className="flex-grow flex justify-end gap-2">
              <Button 
                  type="button" 
                  onClick={onCompare} 
                  className="text-xs py-1.5 px-3 relative bg-purple-600 hover:bg-purple-700" 
                  disabled={Object.keys(selectedChannels).length < 2}
                  title={Object.keys(selectedChannels).length < 2 ? "2개 이상 채널을 선택하세요" : ""}
              >
                  채널 비교 (Compare) ({Object.keys(selectedChannels).length})
              </Button>
              <Button type="button" variant="secondary" onClick={handleResetFilters} className="text-xs py-1.5 px-3">필터 초기화 (Reset)</Button>
          </div>
      </div>
    </div>
  );
};

export default FilterBar;
