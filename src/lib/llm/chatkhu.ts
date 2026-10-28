// ChatKHU through the BAZE API Gateway (OpenAI-compatible, https://docs.mindlogic.ai).
// Server only: the key comes from CHATKHU_API_KEY, never a NEXT_PUBLIC_ variable.
import type { ChatMessage, ChatOptions, ChatReply, LlmClient } from "./types";

export const DEFAULT_MODEL = "claude-haiku-5-5"; // best accuracy for its price in the 10/28 comparison

// CHATKHU_API_KEY, CHATKHU_BASE_URL, optional CHATKHU_MODEL
type Env = Record<string, string | undefined>;

interface CompletionBody {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** null when the key or base URL is missing, so callers can show the fallback. */
export function createChatKhu(env: Env = process.env, fetchImpl: typeof fetch = fetch): LlmClient | null {
  const key = env.CHATKHU_API_KEY?.trim();
  const base = env.CHATKHU_BASE_URL?.trim().replace(/\/+$/, "");
  if (!key || !base) return null;
  const model = env.CHATKHU_MODEL?.trim() || DEFAULT_MODEL;

  return {
    provider: "ChatKHU",
    model,
    async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatReply> {
      const started = Date.now();
      const res = await fetchImpl(`${base}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: options.maxTokens ?? 1200,
          temperature: options.temperature ?? 0.3,
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`ChatKHU HTTP ${res.status}`);
      const body = (await res.json()) as CompletionBody;
      const text = body.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) throw new Error("ChatKHU returned no text");
      const u = body.usage;
      return {
        text,
        model,
        ms: Date.now() - started,
        tokens: u ? { input: u.prompt_tokens ?? 0, output: u.completion_tokens ?? 0 } : undefined,
      };
    },
  };
}
