// The last combination the user looked at, kept in this browser only (no account, no server).
// It holds department names and credit numbers, never anything personal.
export const RECENT_KEY = "recentCalc";

export interface RecentCalc {
  label: string; // "컴퓨터공학과 + 소프트웨어융합학과"
  kind: string; // "다전공"
  total: number;
  primary: string;
  mode: "double" | "minor" | "microdegree";
  second: string; // department name, or micro-degree id
}

export function saveRecent(r: RecentCalc): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(r));
  } catch {
    // private mode or blocked storage: the shortcut is only a convenience
  }
}

/** Raw stored string (a stable value for useSyncExternalStore), or null. */
export function readRecentRaw(): string | null {
  try {
    return localStorage.getItem(RECENT_KEY);
  } catch {
    return null;
  }
}

export function parseRecent(raw: string | null): RecentCalc | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<RecentCalc>;
    const ok =
      typeof r.label === "string" &&
      typeof r.kind === "string" &&
      typeof r.total === "number" &&
      typeof r.primary === "string" &&
      typeof r.second === "string" &&
      (r.mode === "double" || r.mode === "minor" || r.mode === "microdegree");
    return ok ? (r as RecentCalc) : null;
  } catch {
    return null;
  }
}
