import { sendBackendEvent } from './backendService';

const ARCHIVE_PREFIX = 'contents-os:learning-archive:v1:';
const MAX_LOCAL_SESSIONS = 200;

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
    if (lower.includes('apikey') || lower === 'key' || lower.includes('credential') || lower.includes('token')) {
      return acc;
    }
    acc[key] = sanitize(item);
    return acc;
  }, {} as Record<string, unknown>);
};

export const getLearningArchive = (userId: string): LearningArchiveSession[] => {
  if (!userId) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
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

    void sendBackendEvent('learning.archive.upsert', {
      schema: 'CONTENT_OS_LEARNING_ARCHIVE_V1',
      session: safeSession,
    }).catch(error => {
      console.warn('[LearningArchive] central mirror pending:', error);
    });
  } catch (error) {
    console.error('[LearningArchive] save failed:', error);
  }
};

export const exportLearningArchiveJson = (userId: string) => JSON.stringify({
  schema: 'CONTENT_OS_LEARNING_ARCHIVE_EXPORT_V1',
  exportedAt: new Date().toISOString(),
  userId,
  sessions: getLearningArchive(userId),
}, null, 2);
