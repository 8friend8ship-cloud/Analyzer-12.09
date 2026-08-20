// Content OS canonical free-mode policy:
// - No browser Gemini API key.
// - No user-provided API key.
// - AI final-cooking belongs to the central ChatGPT/workflow layer, outside Content OS runtime search.

export function setSystemGeminiApiKey(_key: string | null) {
    // Intentionally ignored. Content OS runtime is API-free.
}

export function setUserGeminiApiKey(_key: string | null) {
    // Intentionally ignored. User-side API keys are forbidden in Content OS.
}

export function getGeminiApiKey(): string {
    throw new Error('CONTENT_OS_FREE_MODE: Gemini API is disabled. Use central Seed/T1/T2/ChatGPT final-cooking workflow instead.');
}
