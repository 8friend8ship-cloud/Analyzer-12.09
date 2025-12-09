
// This service provides a global way to set and get the Gemini API key.
// It's a workaround to avoid passing the key down through every component and function.
let geminiApiKey: string | null = null;

/**
 * Sets the Gemini API key from a high-level component like App.tsx.
 * This should be called whenever the app settings for the key change.
 * @param key The Gemini API key string.
 */
export function setGeminiApiKey(key: string) {
    if (key) {
        geminiApiKey = key;
    }
}

/**
 * Gets the currently configured Gemini API key for use in service calls.
 * It prioritizes the key set via `setGeminiApiKey` and falls back to the
 * environment variable if no key has been set dynamically.
 * @returns The Gemini API key string.
 */
export function getGeminiApiKey(): string {
    return geminiApiKey || process.env.API_KEY;
}
