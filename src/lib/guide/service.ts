// Runs one combination through ChatKHU with the guards a public demo needs:
// a cache (same combination → no second call), one call at a time per combination,
// a daily cap and a per-visitor cap (credits are limited), and a fallback for every failure.
import { buildMessages, VERSION } from "../llm/prompts/comboGuide.v1";
import type { LlmClient } from "../llm/types";
import { fallbackGuide } from "./fallback";
import { guideSources } from "./facts";
import type { FallbackReason, GuideFacts, GuideResult } from "./types";
import { verifyGuide } from "./verify";

export const PROMPT_VERSION = VERSION;

export interface GuideLimits {
  perDay: number; // ChatKHU calls per server instance per day
  perVisitorHour: number; // new (uncached) combinations one visitor may ask for per hour
  cacheSize: number;
}
export const DEFAULT_LIMITS: GuideLimits = { perDay: 400, perVisitorHour: 20, cacheSize: 2000 };

export interface GuideLog {
  key: string;
  ok: boolean;
  ms?: number;
  problems?: string[];
}

export function createGuideService(
  llm: LlmClient | null,
  limits: GuideLimits = DEFAULT_LIMITS,
  now: () => number = Date.now,
  log: (entry: GuideLog) => void = () => {},
) {
  const cache = new Map<string, GuideResult>();
  const pending = new Map<string, Promise<GuideResult>>();
  let day = "";
  let calls = 0;
  const visitors = new Map<string, number[]>();

  const fallback = (f: GuideFacts, reason: FallbackReason): GuideResult => ({
    source: "fallback",
    guide: fallbackGuide(f),
    reason,
    promptVersion: VERSION,
    sources: guideSources(f),
  });

  function allowed(visitor: string): boolean {
    const t = now();
    const today = new Date(t).toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      calls = 0;
    }
    const recent = (visitors.get(visitor) ?? []).filter((x) => t - x < 3_600_000);
    if (calls >= limits.perDay || recent.length >= limits.perVisitorHour) return false;
    calls += 1;
    visitors.set(visitor, [...recent, t]);
    return true;
  }

  async function run(key: string, f: GuideFacts): Promise<GuideResult> {
    if (!llm) return fallback(f, "NO_KEY");
    let reply;
    try {
      // Korean answers run long in tokens; 2000 still cut some answers mid-JSON (10/29)
      reply = await llm.chat(buildMessages(f), { maxTokens: 4000, temperature: 0.3, timeoutMs: 25_000 });
    } catch (e) {
      log({ key, ok: false, problems: [`call failed: ${e instanceof Error ? e.message : String(e)}`] });
      return fallback(f, "LLM_ERROR");
    }
    const checked = verifyGuide(reply.text, f);
    log({
      key,
      ok: checked.ok,
      ms: reply.ms,
      problems: checked.ok ? undefined : [...checked.problems, `reply tail: ${reply.text.slice(-120)}`],
    });
    if (!checked.ok) return fallback(f, "CHECK_FAILED");
    const result: GuideResult = {
      source: "ai",
      guide: checked.guide,
      model: reply.model,
      promptVersion: VERSION,
      ms: reply.ms,
      sources: guideSources(f),
    };
    if (cache.size >= limits.cacheSize) cache.delete(cache.keys().next().value as string);
    cache.set(key, result);
    return result;
  }

  return {
    /** key identifies the combination; visitor is a rough per-person id (e.g. IP). */
    async get(key: string, f: GuideFacts, visitor: string): Promise<GuideResult> {
      const hit = cache.get(key);
      if (hit) return hit;
      const running = pending.get(key);
      if (running) return running;
      if (llm && !allowed(visitor)) return fallback(f, "BUSY");
      const p = run(key, f).finally(() => pending.delete(key));
      pending.set(key, p);
      return p;
    },
    stats: () => ({ day, calls, cached: cache.size }),
  };
}
