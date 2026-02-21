// This service provides a global way to set and get the Gemini API key.
// It manages a system-wide key and a user-specific key, prioritizing the user's key.

let systemGeminiKey: string | null = null;

/**
 * Sets the system-wide (admin) Gemini API key.
 * @param key The Gemini API key string. Can be null to clear.
 */
export function setSystemGeminiApiKey(key: string | null) {
    systemGeminiKey = key || null;
}

/**
 * This function is now a no-op to prevent user-specific keys from being set.
 * @param key The Gemini API key string. (Ignored)
 */
export function setUserGeminiApiKey(key: string | null) {
    // This function is intentionally left empty for compliance.
}

/**
 * Gets the currently active Gemini API key. It now only considers the system key or environment variables.
 * @returns The Gemini API key string.
 * @throws {Error} if no key is configured.
 */
export function getGeminiApiKey(): string {
    const key = systemGeminiKey || (import.meta.env.VITE_GEMINI_API_KEY as string); 
    if (!key) {
        console.error("Gemini API Key is not configured. Please set it in admin settings or environment variables.");
        throw new Error("Gemini API Key is not configured.");
    }
    return key;
}