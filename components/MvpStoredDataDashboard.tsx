import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChannelRankingData, FilterState, User, VideoData } from '../types';
import {
  healthCheckStoredData,
  searchStoredChannels,
  searchStoredVideos,
} from '../services/contentOsDataService';

interface Props {
  user: User;
  onLogout: () => void;
}

type SearchTab = 'video' | 'channel';

const defaultFilters: FilterState = {
  minViews: 0,
  videoLength: 'any',
  videoFormat: 'any',
  period: 'any',
  sortBy: 'publishedAt',
  resultsLimit: 50,
  country: 'KR',
  category: 'all',
};

const formatNumber = (value: number) => new Intl.NumberFormat('ko-KR').format(value || 0);

const MvpStoredDataDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const [query, setQuery] = useState('시니어');
  const [tab, setTab] = useState<SearchTab>('video');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [channels, setChannels] = useState<ChannelRankingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<'checking' | 'ready' | 'blocked'>('checking');
  const [sourceLabel, setSourceLabel] = useState('연결 확인 중');

  useEffect(() => {
    let active = true;
    healthCheckStoredData()
      .then((source) => {
        if (!active) return;
        setHealth('ready');
        setSourceLabel(`${source.sheetName} · ${source.version}`);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setHealth('blocked');
        setSourceLabel('저장 데이터 웹앱 연결 필요');
        setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      active = false;
    };
  }, []);

  const runSearch = useCallback(async () => {
    const normalized = query.trim();
    if (!normalized) {
      setError('검색어를 입력하세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setVideos([]);
    setChannels([]);

    try {
      if (tab === 'channel') {
        setChannels(await searchStoredChannels(normalized, filters));
      } else {
        setVideos(await searchStoredVideos(normalized, filters));
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, [filters, query, tab]);

  const resultCount = tab === 'video' ? videos.length : channels.length;
  const healthClass = useMemo(() => {
    if (health === 'ready') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (health === 'blocked') return 'bg-red-500/15 text-red-300 border-red-500/30';
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  }, [health]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <div className="text-xl font-bold">콘텐츠 OS · 저장 데이터 MVP</div>
            <div className="text-sm text-slate-400">YouTube·Gemini API를 브라우저에서 직접 호출하지 않습니다.</div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-lg border px-3 py-2 text-sm ${healthClass}`}>{sourceLabel}</span>
            <span className="text-sm text-slate-400">{user.email}</span>
            <button onClick={onLogout} className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTab('video')}
              className={`rounded-lg px-4 py-2 ${tab === 'video' ? 'bg-blue-600' : 'bg-slate-800'}`}
            >
              영상
            </button>
            <button
              onClick={() => setTab('channel')}
              className={`rounded-lg px-4 py-2 ${tab === 'channel' ? 'bg-blue-600' : 'bg-slate-800'}`}
            >
              채널
            </button>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && runSearch()}
              className="min-w-[260px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="저장 데이터에서 검색"
            />
            <button
              onClick={runSearch}
              disabled={loading || health !== 'ready'}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '조회 중' : '검색'}
            </button>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              국가
              <select
                value={filters.country}
                onChange={(event) => setFilters((prev) => ({ ...prev, country: event.target.value }))}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-2"
              >
                <option value="KR">대한민국</option>
                <option value="WW">전체</option>
                <option value="US">미국</option>
                <option value="JP">일본</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              정렬
              <select
                value={filters.sortBy}
                onChange={(event) => setFilters((prev) => ({ ...prev, sortBy: event.target.value as FilterState['sortBy'] }))}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-2"
              >
                <option value="publishedAt">최신순</option>
                <option value="viewCount">조회수</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              결과 수
              <select
                value={filters.resultsLimit}
                onChange={(event) => setFilters((prev) => ({ ...prev, resultsLimit: Number(event.target.value) }))}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-2"
              >
                <option value={10}>10</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </label>
            <span className="ml-auto rounded bg-slate-800 px-3 py-2">결과 {resultCount}건</span>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-xl border border-red-700/50 bg-red-950/60 p-4 text-red-200">
            {error}
          </div>
        )}

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          {tab === 'video' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">영상</th>
                    <th className="px-4 py-3">채널</th>
                    <th className="px-4 py-3">국가</th>
                    <th className="px-4 py-3">조회수</th>
                    <th className="px-4 py-3">게시일</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video) => (
                    <tr key={video.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="flex min-w-[360px] items-center gap-3">
                          <img src={video.thumbnailUrl} alt="" className="h-16 w-28 rounded object-cover" loading="lazy" />
                          <a
                            href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-blue-300 hover:underline"
                          >
                            {video.title}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3">{video.channelTitle}</td>
                      <td className="px-4 py-3">{video.channelCountry || '-'}</td>
                      <td className="px-4 py-3">{formatNumber(video.viewCount)}</td>
                      <td className="px-4 py-3">{video.publishedAt ? video.publishedAt.slice(0, 10) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">순위</th>
                    <th className="px-4 py-3">채널</th>
                    <th className="px-4 py-3">국가</th>
                    <th className="px-4 py-3">저장 영상 수</th>
                    <th className="px-4 py-3">저장 조회수 합계</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((channel) => (
                    <tr key={channel.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                      <td className="px-4 py-3">{channel.rank}</td>
                      <td className="px-4 py-3 font-medium">{channel.name}</td>
                      <td className="px-4 py-3">{channel.channelCountry || '-'}</td>
                      <td className="px-4 py-3">{formatNumber(channel.videoCount)}</td>
                      <td className="px-4 py-3">{formatNumber(channel.viewCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && resultCount === 0 && !error && (
            <div className="p-12 text-center text-slate-500">검색을 실행하면 저장된 데이터 결과가 표시됩니다.</div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MvpStoredDataDashboard;
