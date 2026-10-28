// Courses the signed-in user has already taken (course codes).
// Server: public.taken_courses (RLS: own rows only). Stand-in: this browser, per account.
import type { SupabaseClient } from "@supabase/supabase-js";

export type TakenResult = { ok: true } | { ok: false; message: string };

export interface TakenStore {
  readonly kind: "server" | "device";
  /** "" while loading; otherwise a JSON list of codes for the current user ("[]" when signed out). */
  getSnapshot(): string;
  subscribe(onChange: () => void): () => void;
  setTaken(code: string, taken: boolean): Promise<TakenResult>;
}

export const parseTaken = (s: string): string[] => {
  try {
    const v = JSON.parse(s || "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const FAIL = "저장하지 못했어요. 로그인 상태와 인터넷 연결을 확인해 주세요.";

export function createSupabaseTaken(sb: SupabaseClient): TakenStore {
  const listeners = new Set<() => void>();
  let snapshot = "";
  let codes: string[] = [];
  let userId: string | null = null;

  const publish = () => {
    const next = JSON.stringify([...codes].sort());
    if (next !== snapshot) {
      snapshot = next;
      listeners.forEach((l) => l());
    }
  };

  async function load() {
    const { data } = await sb.auth.getSession();
    userId = data.session?.user.id ?? null;
    if (!userId) {
      codes = [];
      return publish();
    }
    const res = await sb.from("taken_courses").select("code");
    if (!res.error) codes = (res.data ?? []).map((r: { code: string }) => r.code);
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
    async setTaken(code, on) {
      if (!userId) return { ok: false, message: "로그인이 필요해요." };
      const before = codes;
      // show the change at once, undo it if the server refuses
      codes = on ? [...new Set([...codes, code])] : codes.filter((c) => c !== code);
      publish();
      const { error } = on
        ? await sb.from("taken_courses").upsert({ code }, { onConflict: "user_id,code", ignoreDuplicates: true })
        : await sb.from("taken_courses").delete().eq("code", code);
      if (error) {
        codes = before;
        publish();
        return { ok: false, message: FAIL };
      }
      return { ok: true };
    },
  };
}

/** In-browser stand-in, one list per account (the account key comes from the mock login). */
export function createLocalTaken(accountKey: () => string | null): TakenStore {
  const EVENT = "takenchange";
  const keyOf = (acc: string) => `taken.v1.${acc}`;
  const read = () => {
    const acc = accountKey();
    if (!acc) return "[]";
    try {
      return JSON.stringify(parseTaken(localStorage.getItem(keyOf(acc)) ?? "[]").sort());
    } catch {
      return "[]";
    }
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
    async setTaken(code, on) {
      const acc = accountKey();
      if (!acc) return { ok: false, message: "로그인이 필요해요." };
      const cur = parseTaken(read());
      const next = on ? [...new Set([...cur, code])] : cur.filter((c) => c !== code);
      try {
        localStorage.setItem(keyOf(acc), JSON.stringify(next));
        window.dispatchEvent(new Event(EVENT));
        return { ok: true };
      } catch {
        return { ok: false, message: "이 브라우저에서는 저장할 수 없어요." };
      }
    },
  };
}
