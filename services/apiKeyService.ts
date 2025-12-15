
// This service provides a global way to set and get the Gemini API key.
// It manages a system-wide key and a user-specific key, prioritizing the user's key.

let systemGeminiKey: string | null = null;
let userGeminiKey: string | null = null;

/**
 * Sets the system-wide (admin) Gemini API key.
 * @param key The Gemini API key string. Can be null to clear.
 */
export function setSystemGeminiApiKey(key: string | null) {
    systemGeminiKey = key || null;
}

/**
 * Sets the user-specific Gemini API key.
 * @param key The Gemini API key string. Can be null to clear.
 */
export function setUserGeminiApiKey(key: string | null) {
    userGeminiKey = key || null;
}

/**
 * Gets the currently active Gemini API key, prioritizing user key > system key > environment variable.
 * @returns The Gemini API key string.
 * @throws {Error} if no key is configured anywhere.
 */
export function getGeminiApiKey(): string {
    // vite.config.ts의 define에 의해 process.env.API_KEY는 실제 값으로 치환됩니다.
    // 만약 치환되지 않았다면(빌드 오류 등), 빈 문자열이 반환될 수 있으므로 체크합니다.
    const envKey = process.env.API_KEY || "";
    
    const key = userGeminiKey || systemGeminiKey || envKey;
    if (!key) {
        console.error("Gemini API Key is not configured. Please set it in admin settings or user account settings.");
        throw new Error("Gemini API Key is not configured.");
    }
    return key;
}
