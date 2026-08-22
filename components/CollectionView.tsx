import React, { useState, useEffect } from 'react';
import { getCollection, removeFromCollection, clearCollection } from '../services/collectionService';
import { exportLearningArchiveJson, getLearningArchive, type LearningArchiveSession } from '../services/learningArchiveService';
import { getActiveLocalApiUser } from '../services/localApiKeyService';
import type { CollectionItem } from '../types';
import Button from './common/Button';

interface CollectionViewProps { onBack: () => void; }

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-40 text-gray-500">
    <p className="text-lg font-medium">저장된 항목이 없습니다.</p>
    <p className="text-sm mt-1">검색·채널·영상 분석을 진행하면 자동으로 여기에 저장됩니다.</p>
  </div>
);

const CollectionView: React.FC<CollectionViewProps> = ({ onBack }) => {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [learning, setLearning] = useState<LearningArchiveSession[]>([]);

  const refresh = () => {
    setItems(getCollection());
    setLearning(getLearningArchive(getActiveLocalApiUser()));
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = (id: string) => {
    removeFromCollection(id);
    refresh();
  };

  const handleClearAll = () => {
    if (window.confirm('영상·채널 컬렉션을 모두 삭제하시겠습니까? 학습 아카이브는 유지됩니다.')) {
      clearCollection();
      refresh();
    }
  };

  const exportLearning = () => {
    const userId = getActiveLocalApiUser();
    const blob = new Blob([exportLearningArchiveJson(userId)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-os-learning-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const channels = items.filter(i => i.type === 'channel');
  const videos = items.filter(i => i.type === 'video');

  const ItemRow: React.FC<{ item: CollectionItem }> = ({ item }) => (
    <div className="flex items-center gap-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
      <img src={item.thumbnailUrl} alt={item.title} className={`flex-shrink-0 object-cover ${item.type === 'channel' ? 'w-12 h-12 rounded-full' : 'w-20 h-12 rounded-md'}`} />
      <div className="flex-grow min-w-0">
        <h4 className="font-bold text-white truncate">{item.title}</h4>
        <div className="text-xs text-gray-400 flex flex-wrap gap-3 mt-1">
          <span>{item.type === 'channel' ? '구독자' : '조회수'}: {item.metric1}</span>
          <span>{item.type === 'channel' ? '영상수' : '좋아요'}: {item.metric2}</span>
          <span>저장: {new Date(item.date).toLocaleString()}</span>
        </div>
      </div>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-400 hover:bg-gray-700 rounded-md">열기</a>
      <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:bg-gray-700 rounded-md">삭제</button>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <button onClick={onBack} className="mb-2 text-sm text-gray-400 hover:text-white">← 워크플로우로 돌아가기</button>
            <h1 className="text-3xl font-bold text-white">컬렉션 + Learning Archive</h1>
            <p className="text-gray-400 mt-1 text-sm">영상·채널 즐겨찾기와 YouTube/Gemini 전체 학습 세션을 함께 관리합니다.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportLearning} variant="secondary" disabled={learning.length === 0}>학습 JSON 내보내기</Button>
            <Button onClick={handleClearAll} variant="secondary" disabled={items.length === 0}>컬렉션 삭제</Button>
          </div>
        </div>

        <div className="mb-8 text-xs text-yellow-300 bg-yellow-900/30 p-3 rounded-md border border-yellow-500/30">
          YouTube 원자료와 저장 기준값은 28일 관리하고, Gemini 분석·품질차이·Seed 후보 같은 파생 학습값은 장기 학습자료로 유지합니다. API 키·credential은 Learning Archive에 저장하지 않습니다.
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-4">Learning Archive <span className="text-sm font-normal text-gray-400">{learning.length} sessions</span></h2>
          {learning.length === 0 ? <EmptyState /> : (
            <div className="space-y-3">
              {learning.slice(0, 50).map(session => {
                const gemini: any = session.gemini || {};
                const quality: any = session.qualityDelta || {};
                const api = session.apiUsage || {};
                return (
                  <details key={session.sessionId} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <summary className="cursor-pointer flex flex-wrap items-center gap-3 text-white">
                      <strong>{session.query}</strong>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded">{session.mode}</span>
                      <span className="text-xs text-gray-400">{new Date(session.createdAt).toLocaleString()}</span>
                      <span className="text-xs text-blue-300">YT {api.youtubeCallsObserved ?? 0} · Gemini {api.geminiCallsObserved ?? 0}</span>
                    </summary>
                    <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-900/60 rounded p-3">
                        <h4 className="font-bold text-white mb-2">A/B 품질</h4>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">{JSON.stringify(quality, null, 2)}</pre>
                      </div>
                      <div className="bg-gray-900/60 rounded p-3">
                        <h4 className="font-bold text-white mb-2">Gemini 학습</h4>
                        <p className="text-gray-300">{gemini.summary || 'Gemini 분석 없음'}</p>
                        {Array.isArray(gemini.titlePatterns) && gemini.titlePatterns.length > 0 && <p className="mt-2 text-xs text-gray-400">제목 패턴: {gemini.titlePatterns.join(' · ')}</p>}
                        {Array.isArray(gemini.keywordFamilies) && gemini.keywordFamilies.length > 0 && <p className="mt-2 text-xs text-gray-400">확장 키워드: {gemini.keywordFamilies.join(' · ')}</p>}
                      </div>
                      <div className="md:col-span-2 bg-gray-900/60 rounded p-3">
                        <h4 className="font-bold text-white mb-2">Seed 후보 / Lineage</h4>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">{JSON.stringify(session.seedCandidate || null, null, 2)}</pre>
                        <p className="mt-2 text-xs text-gray-500">{(session.lineage || []).join(' → ')}</p>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Daily Collection</h2>
          {items.length === 0 ? <EmptyState /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">저장된 채널 ({channels.length})</h3>
                <div className="space-y-3">{channels.length ? channels.map(item => <ItemRow key={item.id} item={item} />) : <p className="text-center text-gray-500 py-8">저장된 채널이 없습니다.</p>}</div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">저장된 영상 ({videos.length})</h3>
                <div className="space-y-3">{videos.length ? videos.map(item => <ItemRow key={item.id} item={item} />) : <p className="text-center text-gray-500 py-8">저장된 영상이 없습니다.</p>}</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CollectionView;
