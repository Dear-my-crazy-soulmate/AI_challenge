"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";
import { createLocalTaken, createSupabaseTaken, parseTaken } from "@/lib/taken/store";
import type { TakenResult, TakenStore } from "@/lib/taken/store";

let store: TakenStore | null = null;
function getTakenStore(): TakenStore {
  if (!store) {
    const sb = getSupabase();
    // the stand-in login keeps its session id under this key (src/lib/auth/mock.ts)
    store = sb ? createSupabaseTaken(sb) : createLocalTaken(() => localStorage.getItem("mock.auth.session"));
  }
  return store;
}

const subscribe = (onChange: () => void) => getTakenStore().subscribe(onChange);
const snapshot = () => getTakenStore().getSnapshot();

/** Courses the signed-in user marked as taken. `enabled` is false when nobody is signed in. */
export function useTaken(): {
  enabled: boolean;
  ready: boolean;
  codes: ReadonlySet<string>;
  setTaken: (code: string, taken: boolean) => Promise<TakenResult>;
} {
  const { ready: authReady, signedIn } = useAuth();
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const codes = useMemo(() => new Set(signedIn ? parseTaken(raw) : []), [raw, signedIn]);
  const setTaken = useCallback((code: string, on: boolean) => getTakenStore().setTaken(code, on), []);
  return { enabled: authReady && signedIn, ready: raw !== "", codes, setTaken };
}
