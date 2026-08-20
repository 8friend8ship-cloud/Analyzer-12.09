const disabled = () => {
  throw new Error('CONTENT_OS_FREE_MODE: external Gemini API is disabled. Use central ChatGPT final-cooking workflow.');
};

export const Type = new Proxy({}, {
  get: (_target, property) => String(property),
}) as Record<string, string>;

export type Chat = {
  sendMessage: (...args: any[]) => Promise<never>;
  sendMessageStream?: (...args: any[]) => AsyncIterable<never>;
};

export class GoogleGenAI {
  models = {
    generateContent: async (..._args: any[]) => disabled(),
    generateContentStream: async (..._args: any[]) => disabled(),
  };

  chats = {
    create: (..._args: any[]): Chat => ({
      sendMessage: async (..._messageArgs: any[]) => disabled(),
    }),
  };

  constructor(_config?: any) {
    // Deliberately no network client, no credentials, no external API.
  }
}
