// A fixed-answer LLM for tests, so no test ever spends ChatKHU credits.
import type { ChatMessage, ChatReply, LlmClient } from "./types";

export function createMockLlm(answer: string | ((messages: ChatMessage[]) => string)): LlmClient & {
  calls: ChatMessage[][];
} {
  const calls: ChatMessage[][] = [];
  return {
    provider: "mock",
    model: "mock",
    calls,
    async chat(messages): Promise<ChatReply> {
      calls.push(messages);
      const text = typeof answer === "string" ? answer : answer(messages);
      return { text, model: "mock", ms: 0 };
    },
  };
}
