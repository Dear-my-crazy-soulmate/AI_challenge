// The only shape the rest of the app knows about an LLM. Swapping ChatKHU for another
// provider means writing one more file like chatkhu.ts; nothing else changes (CLAUDE.md).

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface ChatReply {
  text: string;
  model: string;
  ms: number; // how long the call took
  tokens?: { input: number; output: number };
}

export interface LlmClient {
  readonly provider: string;
  readonly model: string;
  /** Throws on network errors, timeouts and non-2xx answers; callers fall back. */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatReply>;
}
