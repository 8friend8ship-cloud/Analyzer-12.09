import type { AppSettings } from '../types';

const PREFIX = 'contents-os:local-api-keys:v1:';
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
    const parsed = JSON.parse(raw);
    return {
      youtube: typeof parsed?.youtube === 'string' ? parsed.youtube : '',
      analytics: '',
      reporting: '',
      gemini: '',
    };
  } catch {
    return emptyLocalApiKeys();
  }
};

export const saveLocalYouTubeApiKey = (userId: string, youtube: string) => {
  if (!userId) return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify({ youtube: String(youtube || '').trim() }));
  window.dispatchEvent(new CustomEvent(LOCAL_API_KEY_CHANGED_EVENT, { detail: { userId } }));
};

export const getActiveYouTubeApiKey = () => {
  const userId = getActiveLocalApiUser();
  return loadLocalApiKeys(userId).youtube || '';
};
