"use client";

// The one place that decides which AuthService the app uses:
// Supabase (real accounts) when NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY are set,
// otherwise the in-browser stand-in, so the demo still works without a server.
import { useMemo, useSyncExternalStore } from "react";

import { getSupabase } from "../supabase/client";
import { createMockAuth } from "./mock";
import { createSupabaseAuth } from "./supabase";
import type { AuthService, AuthState } from "./types";

// Storage can be blocked (private mode): fall back to memory so screens still work for this visit.
function browserStore() {
  try {
    const k = "mock.auth.probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (key: string) => mem.get(key) ?? null,
      setItem: (key: string, value: string) => void mem.set(key, value),
      removeItem: (key: string) => void mem.delete(key),
    };
  }
}

let service: AuthService | null = null;
export function getAuth(): AuthService {
  if (!service) {
    const sb = getSupabase();
    service = sb ? createSupabaseAuth(sb) : createMockAuth(browserStore());
  }
  return service;
}

const subscribe = (onChange: () => void) => getAuth().subscribe(onChange);
const snapshot = () => getAuth().getSnapshot();

/** Current login state. `ready` is false on the server and during the first render. */
export function useAuth(): AuthState & { ready: boolean; auth: AuthService } {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  return useMemo(() => {
    const auth = getAuth();
    return { ready: raw !== "", auth, ...auth.parse(raw) };
  }, [raw]);
}
