import type { AppSettings } from '../types';

const PREFIX = 'contents-os:local-api-keys:v2:';
const ACTIVE_USER_KEY = 'contents-os:active-local-api-user:v1';
export const LOCAL_API_KEY_CHANGED_EVENT = 'contents-os:local-api-key-changed';

const storageKey = (userId: string) => `${PREFIX}${userId}`;

export const emptyLocalApiKeys = (): AppSettings['apiKeys'] => ({
  youtube: '',
  analytics: '',
  reporting: '',
  gemini: '',
});

export const setActiveLocalApiUser = (userId: string) => {
  if (!userId) return;
  window.localStorage.setItem(ACTIVE_USER_KEY, userId);
};

export const clearActiveLocalApiUser = () => {
  window.localStorage.removeItem(ACTIVE_USER_KEY);
};

export const getActiveLocalApiUser = () => window.localStorage.getItem(ACTIVE_USER_KEY) || '';

export const loadLocalApiKeys = (userId: string): AppSettings['apiKeys'] => {
  if (!userId) return emptyLocalApiKeys();
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return emptyLocalApiKeys();
    const parsed = JSON.parse(raw || '{}');
    return {
      ...emptyLocalApiKeys(),
      youtube: String(parsed.youtube || ''),
      gemini: String(parsed.gemini || ''),
      analytics: String(parsed.analytics || ''),
      reporting: String(parsed.reporting || ''),
    };
  } catch (error) {
    console.warn('[LocalApiKey] failed to load local key pack:', error);
    return emptyLocalApiKeys();
  }
};

export const saveLocalApiKeys = (userId: string, keys: Partial<AppSettings['apiKeys']>) => {
  if (!userId) return;
  const current = loadLocalApiKeys(userId);
  const next = { ...current, ...keys };
  window.localStorage.setItem(storageKey(userId), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(LOCAL_API_KEY_CHANGED_EVENT, { detail: { userId } }));
};

export const saveLocalYouTubeApiKey = (userId: string, youtube: string) => {
  saveLocalApiKeys(userId, { youtube: String(youtube || '').trim() });
};

export const saveLocalGeminiApiKey = (userId: string, gemini: string) => {
  saveLocalApiKeys(userId, { gemini: String(gemini || '').trim() });
};

export const clearLocalApiKeys = (userId: string) => {
  if (!userId) return;
  window.localStorage.removeItem(storageKey(userId));
  window.dispatchEvent(new CustomEvent(LOCAL_API_KEY_CHANGED_EVENT, { detail: { userId } }));
};

export const getActiveYouTubeApiKey = () => {
  const userId = getActiveLocalApiUser();
  return userId ? loadLocalApiKeys(userId).youtube : '';
};

export const getActiveGeminiApiKey = () => {
  const userId = getActiveLocalApiUser();
  return userId ? loadLocalApiKeys(userId).gemini : '';
};
