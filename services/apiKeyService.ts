import { getActiveGeminiApiKey } from './localApiKeyService';

let transientSystemGeminiKey = '';

export function setSystemGeminiApiKey(key: string | null) {
    transientSystemGeminiKey = String(key || '').trim();
}

export function setUserGeminiApiKey(_key: string | null) {
    // User Gemini keys are persisted only by localApiKeyService for the active login.
}

export function getGeminiApiKey(): string {
    const local = String(getActiveGeminiApiKey() || '').trim();
    const active = local || transientSystemGeminiKey;
    if (!active) {
        throw new Error('Gemini API 키가 없습니다. Content OS 개인 로컬 키 설정에서 Gemini 키를 등록해주세요.');
    }
    return active;
}
