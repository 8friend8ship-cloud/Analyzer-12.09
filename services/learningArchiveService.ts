import { sendIntelligenceEvent } from './backendService';

const ARCHIVE_PREFIX = 'contents-os:learning-archive:v2:';
const MAX_LOCAL_SESSIONS = 200;
const RAW_API_RETENTION_MS = 28 * 24 * 60 * 60 * 1000;

export interface LearningArchiveSession {
  sessionId: string;
  userId: string;
  createdAt: string;
  query: string;
  mode: 'video' | 'channel';
  filters: unknown;
  storedBaseline?: unknown;
  youtube?: unknown;
  gemini?: unknown;
  qualityDelta?: unknown;
  seedCandidate?: unknown;
  lineage: string[];
  apiUsage?: {
    youtubeCallsObserved?: number;
    geminiCallsObserved?: number;
  };
}

const storageKey = (userId: string) => `${ARCHIVE_PREFIX}${userId}`;

const sanitize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  return Object.entries(value as Record<string, unknown>).reduce((acc, [key, item]) => {
    const lower = key.toLowerCase();
    if (lower.includes('apikey') || lower === 'key' || lower.includes('credential') || lower.includes('token')) return acc;
    acc[key] = sanitize(item);
    return acc;
  }, {} as Record<string, unknown>);
};

const pruneRawApiPayload = (session: LearningArchiveSession, now = Date.now()): LearningArchiveSession => {
  const created = Date.parse(session.createdAt || '');
  if (!Number.isFinite(created) || now - created <= RAW_API_RETENTION_MS) return session;
  const { youtube: _youtube, storedBaseline: _storedBaseline, ...durable } = session;
  return {
    ...durable,
    lineage: Array.from(new Set([...(session.lineage || []), 'RAW_API_PAYLOAD_PRUNED_DERIVED_LEARNING_RETAINED'])),
  };
};

export const getLearningArchive = (userId: string): LearningArchiveSession[] => {
  if (!userId) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: LearningArchiveSession[] = JSON.parse(raw);
    const pruned = parsed.map(item => pruneRawApiPayload(item));
    if (JSON.stringify(pruned) !== JSON.stringify(parsed)) window.localStorage.setItem(storageKey(userId), JSON.stringify(pruned));
    return pruned;
  } catch (error) {
    console.warn('[LearningArchive] failed to load:', error);
    return [];
  }
};

export const saveLearningArchiveSession = (session: LearningArchiveSession) => {
  if (!session.userId) return;
  try {
    const safeSession = sanitize(session) as LearningArchiveSession;
    const current = getLearningArchive(session.userId);
    const deduped = current.filter(item => item.sessionId !== safeSession.sessionId);
    const updated = [safeSession, ...deduped].slice(0, MAX_LOCAL_SESSIONS);
    window.localStorage.setItem(storageKey(session.userId), JSON.stringify(updated));

    const { youtube: _youtube, storedBaseline: _storedBaseline, ...durableLearning } = safeSession;
    void sendIntelligenceEvent({
      event_id: `EVT_CONTENTOS_LEARNING_${safeSession.sessionId}`,
      event_at: safeSession.createdAt,
      producer_app_id: 'APP_CONTENT_OS',
      data_stage: safeSession.seedCandidate ? 'SEED_CANDIDATE' : 'LEARNING',
      entity_type: 'CONTENT_OS_LEARNING_ARCHIVE',
      entity_id: safeSession.sessionId,
      keyword: safeSession.query,
      locale: 'ko-KR',
      summary: `Content OS live/stored A-B learning session for ${safeSession.query}`,
      keywords: Array.isArray((safeSession.gemini as any)?.keywordFamilies) ? (safeSession.gemini as any).keywordFamilies : [safeSession.query],
      tags: ['CONTENT_OS','YOUTUBE','GEMINI','LEARNING_ARCHIVE','QUEENS_SEED_WRITEBACK'],
      metrics: { qualityDelta: safeSession.qualityDelta, apiUsage: safeSession.apiUsage },
      lineage_ids: safeSession.lineage,
      confidence: 0.8,
      status: 'LEARNING_READY',
      consumer_scope: 'APP_CONTENT_OS|APP_ANALYZER|QUEENS|SEED|T1|T2',
      memo: JSON.stringify({ schema: 'CONTENT_OS_LEARNING_ARCHIVE_V2', rawRetentionDays: 28, session: durableLearning }),
    }).catch(error => console.warn('[LearningArchive] intelligence mirror pending:', error));
  } catch (error) {
    console.error('[LearningArchive] save failed:', error);
  }
};

export const exportLearningArchiveJson = (userId: string) => JSON.stringify({
  schema: 'CONTENT_OS_LEARNING_ARCHIVE_EXPORT_V2',
  exportedAt: new Date().toISOString(),
  rawRetentionDays: 28,
  userId,
  sessions: getLearningArchive(userId),
}, null, 2);
