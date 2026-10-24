"use client";

import { useMemo, useSyncExternalStore } from "react";

import { parseGoal, readGoalRaw, subscribeGoal } from "@/lib/goal";
import type { Goal } from "@/lib/goal";

/** The saved 내 목표, or null. Also null on the server and during the first render. */
export function useGoal(): Goal | null {
  const raw = useSyncExternalStore(subscribeGoal, readGoalRaw, () => null);
  return useMemo(() => parseGoal(raw), [raw]);
}
