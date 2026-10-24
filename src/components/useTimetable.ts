"use client";

import { useMemo, useSyncExternalStore } from "react";

import { parseTimetable, readTimetableRaw, subscribeTimetable } from "@/lib/timetable";
import type { Slot } from "@/lib/timetable";

/** The saved timetable. Empty on the server and during the first render. */
export function useTimetable(): Slot[] {
  const raw = useSyncExternalStore(subscribeTimetable, readTimetableRaw, () => null);
  return useMemo(() => parseTimetable(raw), [raw]);
}
