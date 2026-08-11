import React, { useMemo, useState } from 'react';
import Dashboard from './Dashboard';
import type { User, AppSettings, VideoData, ChannelRankingData, FilterState } from '../types';
import {
  fetchContentOsVideos,
  fetchContentOsChannels,
  isContentOsBackendConfigured,
} from '../services/contentOsDataService';

interface Props {
  user: User;
  appSettings: AppSettings;
  onLogout: () => void;
  onNavigate: (view: 'account') => void;
  onUpdateUser: (updatedUser: Partial<User>) => void;
  onUpdateAppSettings: (updatedSettings: Partial<AppSettings>) => void;
}

type SourceMode = 'backend' | 'legacy';
type SearchMode = 'video' | 'channel';

const defaultFilters: FilterState = {
  minViews: 0,
  videoLength: 'any',
  videoFormat: 'any',
  period: 'any',
  sortBy: 'viewCount',
  resultsLimit: 50,
  country: 'KR',
  category: 'all',
};

const UnifiedDashboard: React.FC<Props> = (props) => {
  const [sourceMode, setSourceMode] = useState<SourceMode>('backend');
  const [searchMode, setSearchMode] = useState<SearchMode>('video');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [channels, setChannels] = useState<ChannelRankingData[]>([]);

  const backendReady = useMemo(() => isContentOsBackendConfigured(), []);

  const runBackendSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setVideos([]);
    setChannels([]);
    try {
      if (searchMode === 'video') {
        setVideos(await fetchContentOsVideos('keyword', query.trim(), defaultFilters));
      } else {
        setChannels(await fetchContentOsChannels(query.trim(), defaultFilters));
      }
    } catch (e: any) {
      setError(e?.message || '백데이터 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (sourceMode === 'legacy') {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <div className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-gray-800 bg-gray-950/95 px-4 py-2 backdrop-blur">
          <div>
            <div className="font-semibold">Content OS · Unified Front v1</div>
            <div className="text-xs text-amber-400">Legacy Lab · 기존 기능 비교/이관용</div>
          </div>
          <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold" onClick={() => setSourceMode('backend')}>
            백데이터 허브로 전환
          </button>
        </div>
        <Dashboard {...props} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900 px-5 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Content OS · Unified Front v1</h1>
            <p className="text-sm text-gray-400">YouTube 직접 API가 아니라 Content OS 조사 백데이터를 먼저 검색하는 대표 프런트</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${backendReady ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}`}>
              Backend {backendReady ? 'READY' : 'URL REQUIRED'}
            </span>
            <button className="rounded-lg border border-gray-700 px-3 py-2 text-sm" onClick={() => setSourceMode('legacy')}>
              기존 기능 보기
            </button>
            <button className="rounded-lg border border-gray-700 px-3 py-2 text-sm" onClick={props.onLogout}>로그아웃</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-5">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={() => setSearchMode('video')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${searchMode === 'video' ? 'bg-indigo-600' : 'bg-gray-800'}`}>영상/키워드</button>
            <button onClick={() => setSearchMode('channel')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${searchMode === 'channel' ? 'bg-indigo-600' : 'bg-gray-800'}`}>채널</button>
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runBackendSearch()}
              placeholder="조사 키워드를 입력하세요"
              className="min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-indigo-500"
            />
            <button disabled={loading || !backendReady} onClick={runBackendSearch} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40">
              {loading ? '검색 중…' : '백데이터 검색'}
            </button>
          </div>
          <div className="mt-3 text-xs text-gray-500">기본 호출 순서: Keyword_Rank → Video_Index/Channel Index → Queens 분석값 → Seed 후보. 외부 API는 이 대표 프런트의 기본 검색 경로가 아닙니다.</div>
          {error && <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
        </section>

        <section className="mt-5 grid gap-4">
          {searchMode === 'video' && videos.map((video: any) => (
            <article key={video.id || video.videoId || video.url} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{video.title || '(제목 없음)'}</h2>
                  <p className="mt-1 text-sm text-gray-400">{video.channelTitle || video.channelName || ''}</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <div>조회 {Number(video.viewCount || 0).toLocaleString()}</div>
                  <div>좋아요 {Number(video.likeCount || 0).toLocaleString()}</div>
                </div>
              </div>
              {(video.summary || video.qtag || video.keywordScore) && (
                <div className="mt-3 rounded-lg bg-gray-950 p-3 text-sm text-gray-300">
                  {video.summary && <p>{video.summary}</p>}
                  {video.qtag && <p className="mt-2 text-xs text-indigo-300">QTAG: {video.qtag}</p>}
                  {video.keywordScore !== undefined && <p className="mt-1 text-xs text-emerald-300">Content OS 조사점수: {video.keywordScore}</p>}
                </div>
              )}
            </article>
          ))}

          {searchMode === 'channel' && channels.map((channel: any) => (
            <article key={channel.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h2 className="font-semibold">{channel.name || channel.title}</h2>
              <div className="mt-2 flex gap-4 text-xs text-gray-400">
                <span>구독자 {Number(channel.subscriberCount || 0).toLocaleString()}</span>
                <span>영상 {Number(channel.videoCount || channel.totalVideos || 0).toLocaleString()}</span>
                <span>조회 {Number(channel.viewCount || 0).toLocaleString()}</span>
              </div>
            </article>
          ))}

          {!loading && !error && videos.length === 0 && channels.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-800 p-10 text-center text-sm text-gray-500">
              키워드를 입력하면 중앙 조사 백데이터에서 결과를 불러옵니다.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default UnifiedDashboard;
