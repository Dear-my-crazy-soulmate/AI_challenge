// The weekly timetable the user builds on the home screen, kept in this browser only.
// Course codes, names and credits come from the curriculum book; the days and times are typed in
// by the user (the book has no class schedule). Same storage pattern as goal.ts.
import type { CourseTag } from "./courseSearch";

export const TIMETABLE_KEY = "timetable";
const CHANGE_EVENT = "timetablechange"; // 'storage' does not fire in the tab that wrote

export const SEMESTER = "2026-2";
export const DAYS = ["월", "화", "수", "목", "금"] as const;
export const DAY_START = 9; // first hour shown
export const DAY_END = 18; // classes must end by here
export const LENGTHS: readonly [number, string][] = [
  [1, "1시간"],
  [1.5, "1.5시간"],
  [2, "2시간"],
  [3, "3시간"],
];

export interface Slot {
  id: string;
  code: string;
  name: string;
  credits: number;
  days: number[]; // indexes into DAYS, sorted
  start: number; // hour, in steps of 0.5
  len: number; // hours
  tag: CourseTag;
}

type Span = Pick<Slot, "days" | "start" | "len">;

/** 9 -> "9:00", 10.5 -> "10:30" */
export const fmtHour = (h: number) => `${Math.floor(h)}:${h % 1 ? "30" : "00"}`;

export const totalCredits = (list: Slot[]) => list.reduce((a, s) => a + s.credits, 0);

/** Start times that still finish by DAY_END for a class of this length. */
export function startOptions(len: number): number[] {
  const out: number[] = [];
  for (let h = DAY_START; h + len <= DAY_END; h += 0.5) out.push(h);
  return out;
}

export const overlaps = (a: Span, b: Span) =>
  a.days.some((d) => b.days.includes(d)) && a.start < b.start + b.len && b.start < a.start + a.len;

/** Every pair of classes in the list that share time. */
export function conflictPairs(list: Slot[]): [Slot, Slot][] {
  const out: [Slot, Slot][] = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (overlaps(list[i], list[j])) out.push([list[i], list[j]]);
  return out;
}

/** Classes already in the list that a new one would collide with. */
export const conflictsWith = (list: Slot[], cand: Span): Slot[] => list.filter((s) => overlaps(s, cand));

const TAGS: readonly string[] = ["p", "s", "both", "etc"];

export function isValidSlot(x: unknown): x is Slot {
  const s = x as Partial<Slot> | null;
  if (!s || typeof s !== "object") return false;
  return (
    typeof s.id === "string" &&
    typeof s.code === "string" &&
    typeof s.name === "string" &&
    typeof s.credits === "number" &&
    Array.isArray(s.days) &&
    s.days.length > 0 &&
    s.days.every((d) => Number.isInteger(d) && d >= 0 && d < DAYS.length) &&
    new Set(s.days).size === s.days.length &&
    typeof s.len === "number" &&
    LENGTHS.some(([l]) => l === s.len) &&
    typeof s.start === "number" &&
    startOptions(s.len).includes(s.start) &&
    typeof s.tag === "string" &&
    TAGS.includes(s.tag)
  );
}

export function parseTimetable(raw: string | null): Slot[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter(isValidSlot) : [];
  } catch {
    return [];
  }
}

/** Raw stored string (a stable value for useSyncExternalStore), or null. */
export function readTimetableRaw(): string | null {
  try {
    return localStorage.getItem(TIMETABLE_KEY);
  } catch {
    return null;
  }
}

export function saveTimetable(list: Slot[]): void {
  try {
    localStorage.setItem(TIMETABLE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // private mode or blocked storage: the timetable is only a convenience
  }
}

export function subscribeTimetable(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
