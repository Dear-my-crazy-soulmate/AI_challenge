"use client";

// The one place that decides which AuthService the app uses.
// Swap createMockAuth for a Supabase-backed service here when Supabase is connected.
import { useMemo, useSyncExternalStore } from "react";

import { createMockAuth } from "./mock";
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
  service ??= createMockAuth(browserStore());
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
