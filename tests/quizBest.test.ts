import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QUIZ_BEST_KEY } from "../src/lib/quizProgress";
import { bestFromRows, createSupabaseBest, mergeBest } from "../src/lib/quizBest/store";

describe("merging stars", () => {
  it("keeps the higher score per major, and the first one on a tie", () => {
    const a = { 컴퓨터공학과: { score: 3, n: 5 }, 체육학과: { score: 4, n: 5 } };
    const b = { 컴퓨터공학과: { score: 5, n: 5 }, 체육학과: { score: 4, n: 4 }, 사학과: { score: 1, n: 5 } };
    expect(mergeBest(a, b)).toEqual({
      컴퓨터공학과: { score: 5, n: 5 },
      체육학과: { score: 4, n: 5 },
      사학과: { score: 1, n: 5 },
    });
  });

  it("drops server rows that do not make sense", () => {
    expect(bestFromRows([{ major: "사학과", score: 6, n: 5 }, { major: "체육학과", score: 2, n: 5 }])).toEqual({
      체육학과: { score: 2, n: 5 },
    });
  });
});

// A tiny stand-in for the Supabase client: one signed-in user and the quiz_best table.
function fakeSupabase(rows: { major: string; score: number; n: number }[], opts: { fail?: boolean } = {}) {
  const upserts: unknown[] = [];
  const error = opts.fail ? { message: "relation does not exist" } : null;
  const sb = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: () => ({
      select: async () => ({ data: opts.fail ? null : rows, error }),
      upsert: async (list: unknown) => {
        upserts.push(list);
        return { error };
      },
    }),
  };
  return { sb: sb as unknown as SupabaseClient, upserts };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("stars saved on the account", () => {
  let mem: Map<string, string>;
  beforeEach(() => {
    mem = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loads the account's stars and moves this device's old stars up once", async () => {
    mem.set(QUIZ_BEST_KEY, JSON.stringify({ 사학과: { score: 4, n: 5 }, 체육학과: { score: 1, n: 5 } }));
    const { sb, upserts } = fakeSupabase([{ major: "체육학과", score: 3, n: 5 }]);
    const store = createSupabaseBest(sb);
    store.getSnapshot();
    await flush();
    await flush();
    expect(JSON.parse(store.getSnapshot())).toEqual({ 체육학과: { score: 3, n: 5 }, 사학과: { score: 4, n: 5 } });
    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject([{ major: "사학과", score: 4, n: 5 }]);
    expect(mem.has(QUIZ_BEST_KEY)).toBe(false);
  });

  it("saves a better result and ignores a worse one", async () => {
    const { sb, upserts } = fakeSupabase([{ major: "체육학과", score: 3, n: 5 }]);
    const store = createSupabaseBest(sb);
    store.getSnapshot();
    await flush();
    await store.record("체육학과", 2, 5);
    expect(upserts).toHaveLength(0);
    await store.record("체육학과", 5, 5);
    expect(upserts[0]).toMatchObject([{ major: "체육학과", score: 5, n: 5 }]);
    expect(JSON.parse(store.getSnapshot()).체육학과.score).toBe(5);
  });

  it("keeps stars on this device when the server cannot save them", async () => {
    const { sb } = fakeSupabase([], { fail: true });
    const store = createSupabaseBest(sb);
    store.getSnapshot();
    await flush();
    await store.record("사학과", 4, 5);
    expect(JSON.parse(store.getSnapshot())).toEqual({ 사학과: { score: 4, n: 5 } });
    expect(JSON.parse(mem.get("quiz-best.v2.u1")!)).toEqual({ 사학과: { score: 4, n: 5 } });
  });
});
