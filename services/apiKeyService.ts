
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
 * Gets the currently active Gemini API key, prioritizing user key > system key > runtime env > build env.
 * @returns The Gemini API key string.
 * @throws {Error} if no key is configured anywhere.
 */
export function getGeminiApiKey(): string {
    // 1. User Setting
    if (userGeminiKey) return userGeminiKey;
    
    // 2. System Setting (Admin Dashboard)
    if (systemGeminiKey) return systemGeminiKey;

    // 3. Runtime Environment (Cloud Run Injection) - Priority with Safe Access
    const runtimeEnv = (window as any).env;
    if (runtimeEnv) {
        if (runtimeEnv.API_KEY) return runtimeEnv.API_KEY;
        if (runtimeEnv.VITE_GEMINI_API_KEY) return runtimeEnv.VITE_GEMINI_API_KEY;
    }

    // 4. Build-time Environment fallback (Vite)
    // @ts-ignore
    if (import.meta && import.meta.env) {
        // @ts-ignore
        if (import.meta.env.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY;
        // @ts-ignore
        if (import.meta.env.API_KEY) return import.meta.env.API_KEY;
    }
    
    // 5. Process Env (Vite define replacement)
    // Use string literal to ensure replacement happens
    if (process.env.API_KEY) return process.env.API_KEY;

    console.error("Gemini API Key is not configured. Please set it in admin settings or user account settings.");
    throw new Error("Gemini API Key is not configured.");
}
