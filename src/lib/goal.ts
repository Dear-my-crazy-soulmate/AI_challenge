// The combination the user saved as "내 목표" (shown on the home screen), kept in this browser only.
// It holds department names and credit numbers, nothing personal. Same idea as recent.ts.
export const GOAL_KEY = "goal";
const CHANGE_EVENT = "goalchange"; // 'storage' does not fire in the tab that wrote, so we announce it ourselves

export type GoalMode = "double" | "minor" | "microdegree";

export interface Goal {
  primary: string; // 본전공
  mode: GoalMode;
  second: string; // department name, or micro-degree id (what /onboarding?second= expects)
  secondName: string; // shown to the user (for a micro-degree this is its name)
  primaryCredits: number; // 본전공 credits under this combination (다전공 체계 for a double major)
  secondCredits: number | null; // null when the micro-degree's credits are not confirmed
}

export const MODE_NAME: Record<GoalMode, string> = { double: "다전공", minor: "부전공", microdegree: "마이크로디그리" };

/** Total required major credits; null credits count as 0 (the card says when a number is unconfirmed). */
export const goalTotal = (g: Goal) => g.primaryCredits + (g.secondCredits ?? 0);

export const isSameGoal = (a: Goal | null, b: Pick<Goal, "primary" | "mode" | "second">) =>
  a !== null && a.primary === b.primary && a.mode === b.mode && a.second === b.second;

export function saveGoal(g: Goal): void {
  try {
    localStorage.setItem(GOAL_KEY, JSON.stringify(g));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // private mode or blocked storage: the goal is only a convenience
  }
}

export function clearGoal(): void {
  try {
    localStorage.removeItem(GOAL_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // see saveGoal
  }
}

/** Raw stored string (a stable value for useSyncExternalStore), or null. */
export function readGoalRaw(): string | null {
  try {
    return localStorage.getItem(GOAL_KEY);
  } catch {
    return null;
  }
}

export function subscribeGoal(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function parseGoal(raw: string | null): Goal | null {
  if (!raw) return null;
  try {
    const g = JSON.parse(raw) as Partial<Goal>;
    const ok =
      typeof g.primary === "string" &&
      typeof g.second === "string" &&
      typeof g.secondName === "string" &&
      typeof g.primaryCredits === "number" &&
      (g.secondCredits === null || typeof g.secondCredits === "number") &&
      (g.mode === "double" || g.mode === "minor" || g.mode === "microdegree");
    return ok ? (g as Goal) : null;
  } catch {
    return null;
  }
}
