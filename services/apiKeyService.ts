export class BrowserAiDisabledError extends Error {
  readonly code = 'BROWSER_AI_DISABLED';

  constructor() {
    super('브라우저 AI 호출은 비활성화되어 있습니다. 검증된 중앙 Writer API가 필요합니다.');
    this.name = 'BrowserAiDisabledError';
  }
}

/** Kept as a compatibility no-op while callers migrate to the central Writer contract. */
export function setSystemGeminiApiKey(_key: string | null): void {}

/** User-supplied browser secrets are never accepted. */
export function setUserGeminiApiKey(_key: string | null): void {}

/**
 * Gemini calls from the browser are blocked by design. A future implementation must
 * call the audited central Writer endpoint without returning provider secrets.
 */
export function getGeminiApiKey(): never {
  throw new BrowserAiDisabledError();
}
