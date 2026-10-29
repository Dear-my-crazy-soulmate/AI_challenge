"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { parseBest } from "@/lib/quizProgress";
import type { Best } from "@/lib/quizProgress";
import { createLocalBest, createSupabaseBest } from "@/lib/quizBest/store";
import type { BestStore } from "@/lib/quizBest/store";
import { getSupabase } from "@/lib/supabase/client";

let store: BestStore | null = null;
function getBestStore(): BestStore {
  if (!store) {
    const sb = getSupabase();
    // the stand-in login keeps its session id under this key (src/lib/auth/mock.ts)
    store = sb ? createSupabaseBest(sb) : createLocalBest(() => localStorage.getItem("mock.auth.session"));
  }
  return store;
}

const subscribe = (onChange: () => void) => getBestStore().subscribe(onChange);
const snapshot = () => getBestStore().getSnapshot();

/** Best 체험 문제 result per major for the signed-in account (stars). */
export function useQuizBest(): { best: Best; record: (major: string, score: number, n: number) => void } {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}");
  const best = useMemo(() => parseBest(raw), [raw]);
  const record = useCallback((major: string, score: number, n: number) => void getBestStore().record(major, score, n), []);
  return { best, record };
}
