import type { AppSettings } from '../types';

const PREFIX = 'contents-os:local-api-keys:v1:';
const ACTIVE_USER_KEY = 'contents-os:active-local-api-user:v1';
export const LOCAL_API_KEY_CHANGED_EVENT = 'contents-os:local-api-key-changed';

// Compatibility sentinel: legacy UI paths that only check for a non-empty YouTube
// key can continue into the transport layer, where requests are rewritten to the
// same-origin server-only proxy. This is not an API credential.
const CENTRAL_YOUTUBE_PROXY_SENTINEL = 'CONTENT_OS_CENTRAL_YOUTUBE_PROXY';

const storageKey = (userId: string) => `${PREFIX}${userId}`;

export const emptyLocalApiKeys = (): AppSettings['apiKeys'] => ({
  youtube: CENTRAL_YOUTUBE_PROXY_SENTINEL,
  analytics: '',
  reporting: '',
  gemini: '',
});

export const setActiveLocalApiUser = (userId: string) => {
  window.localStorage.setItem(ACTIVE_USER_KEY, userId);
  // Purge any legacy per-browser API credential once this runtime becomes active.
  if (userId) window.localStorage.removeItem(storageKey(userId));
};

export const clearActiveLocalApiUser = () => {
  window.localStorage.removeItem(ACTIVE_USER_KEY);
};

export const getActiveLocalApiUser = () => window.localStorage.getItem(ACTIVE_USER_KEY) || '';

export const loadLocalApiKeys = (userId: string): AppSettings['apiKeys'] => {
  if (userId) {
    try { window.localStorage.removeItem(storageKey(userId)); } catch (_) {}
  }
  return emptyLocalApiKeys();
};

export const saveLocalYouTubeApiKey = (userId: string, _youtube: string) => {
  if (!userId) return;
  // Browser API key storage is retired. Remove any legacy value instead.
  try { window.localStorage.removeItem(storageKey(userId)); } catch (_) {}
  window.dispatchEvent(new CustomEvent(LOCAL_API_KEY_CHANGED_EVENT, { detail: { userId } }));
};

export const getActiveYouTubeApiKey = () => CENTRAL_YOUTUBE_PROXY_SENTINEL;
