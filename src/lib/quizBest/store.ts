// Best 체험 문제 result per major for the signed-in user.
// Server: public.quiz_best (RLS: own rows only). Stand-in: this browser, per account.
// Stars saved before accounts (key "quiz-best-v1", not tied to anyone) move once to the first account signed in here.
import type { SupabaseClient } from "@supabase/supabase-js";

import { parseBest, QUIZ_BEST_KEY } from "../quizProgress";
import type { Best } from "../quizProgress";

export interface BestStore {
  readonly kind: "server" | "device";
  /** JSON of the current user's Best ("{}" when signed out). */
  getSnapshot(): string;
  subscribe(onChange: () => void): () => void;
  /** Save one major's result; a lower score than the saved one is ignored. */
  record(major: string, score: number, n: number): Promise<void>;
}

/** Higher score wins per major; on a tie the first one stays. */
export function mergeBest(a: Best, b: Best): Best {
  const out = { ...a };
  for (const [major, r] of Object.entries(b)) {
    if (!out[major] || r.score > out[major].score) out[major] = r;
  }
  return out;
}

export function bestFromRows(rows: { major: string; score: number; n: number }[]): Best {
  return parseBest(JSON.stringify(Object.fromEntries(rows.map((r) => [r.major, { score: r.score, n: r.n }]))));
}

const sameJson = (a: Best, b: Best) => JSON.stringify(a) === JSON.stringify(b);

function readJson(key: string): Best {
  try {
    return parseBest(localStorage.getItem(key));
  } catch {
    return {};
  }
}

function writeJson(key: string, best: Best): void {
  try {
    localStorage.setItem(key, JSON.stringify(best));
  } catch {
    /* private mode: stars are just not remembered */
  }
}

/** Takes the old unowned stars off this device, once. */
function takeLegacy(): Best {
  const legacy = readJson(QUIZ_BEST_KEY);
  try {
    localStorage.removeItem(QUIZ_BEST_KEY);
  } catch {
    /* nothing to move */
  }
  return legacy;
}

const deviceKey = (userId: string) => `quiz-best.v2.${userId}`;

export function createSupabaseBest(sb: SupabaseClient): BestStore {
  const listeners = new Set<() => void>();
  let best: Best = {};
  let snapshot = "{}";
  let userId: string | null = null;
  let serverOk = true; // false when the table is missing or the network fails: keep stars on this device instead

  const publish = () => {
    const next = JSON.stringify(best);
    if (next !== snapshot) {
      snapshot = next;
      listeners.forEach((l) => l());
    }
  };

  async function upsert(rows: Best): Promise<boolean> {
    const list = Object.entries(rows).map(([major, r]) => ({ major, score: r.score, n: r.n, updated_at: new Date().toISOString() }));
    if (list.length === 0) return true;
    const { error } = await sb.from("quiz_best").upsert(list, { onConflict: "user_id,major" });
    return !error;
  }

  async function load() {
    const { data } = await sb.auth.getSession();
    userId = data.session?.user.id ?? null;
    if (!userId) {
      best = {};
      return publish();
    }
    const local = mergeBest(readJson(deviceKey(userId)), takeLegacy());
    const res = await sb.from("quiz_best").select("major, score, n");
    serverOk = !res.error;
    if (!serverOk) {
      best = local;
      writeJson(deviceKey(userId), best);
      return publish();
    }
    const server = bestFromRows(res.data ?? []);
    best = mergeBest(server, local);
    // stars this device has but the account does not yet: send them up, then stop keeping a device copy
    const missing = Object.fromEntries(Object.entries(best).filter(([m, r]) => server[m]?.score !== r.score));
    if (await upsert(missing)) writeJson(deviceKey(userId), {});
    else writeJson(deviceKey(userId), local);
    publish();
  }

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    void load();
    sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setTimeout(() => void load(), 0);
    });
  };

  return {
    kind: "server",
    getSnapshot() {
      start();
      return snapshot;
    },
    subscribe(onChange) {
      start();
      listeners.add(onChange);
      return () => void listeners.delete(onChange);
    },
    async record(major, score, n) {
      if (!userId) return;
      const next = mergeBest(best, { [major]: { score, n } });
      if (sameJson(next, best)) return;
      best = next;
      publish();
      const row = { [major]: next[major] };
      if (!serverOk || !(await upsert(row))) writeJson(deviceKey(userId), mergeBest(readJson(deviceKey(userId)), row));
    },
  };
}

/** In-browser stand-in, one Best per account (the account key comes from the mock login). */
export function createLocalBest(accountKey: () => string | null): BestStore {
  const EVENT = "quizbestchange";
  const read = () => {
    const acc = accountKey();
    if (!acc) return "{}";
    const legacy = readJson(QUIZ_BEST_KEY);
    if (Object.keys(legacy).length) writeJson(deviceKey(acc), mergeBest(readJson(deviceKey(acc)), takeLegacy()));
    return JSON.stringify(readJson(deviceKey(acc)));
  };
  return {
    kind: "device",
    getSnapshot: read,
    subscribe(onChange) {
      window.addEventListener(EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    async record(major, score, n) {
      const acc = accountKey();
      if (!acc) return;
      const cur = readJson(deviceKey(acc));
      const next = mergeBest(cur, { [major]: { score, n } });
      if (sameJson(next, cur)) return;
      writeJson(deviceKey(acc), next);
      window.dispatchEvent(new Event(EVENT));
    },
  };
}
