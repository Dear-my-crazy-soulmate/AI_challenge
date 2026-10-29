// The weekly timetable the user builds on the home screen, kept in this browser only.
// Course codes, names and credits come from the curriculum book; the days and times are typed in
// by the user (the book has no class schedule). Same storage pattern as goal.ts.
import classTimes from "../../data/curated/2026/class_times.json";
import type { CourseTag } from "./courseSearch";

export const TIMETABLE_KEY = "timetable";
const CHANGE_EVENT = "timetablechange"; // 'storage' does not fire in the tab that wrote

export const SEMESTER = "2026-2";
export const DAYS = ["월", "화", "수", "목", "금"] as const;
export const DAY_START = 9; // first hour shown
export const DAY_END = 20; // classes must end by here (evening classes up to 20:00)

const toHours = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h + m / 60;
};

/** "75분", "1시간 50분", "2시간 45분" */
export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m}분` : m === 0 ? `${h}시간` : min < 90 ? `${min}분` : `${h}시간 ${m}분`;
}

// What 경희대 국제캠퍼스 classes really use (data/curated/2026/class_times.json, from the public 종합시간표):
// six start times and the lengths that carry at least 5% of all meetings.
export const STARTS: readonly number[] = classTimes.starts.map((s) => toHours(s.start));
export const LENGTHS: readonly [number, string][] = classTimes.lengths
  .filter((l) => l.share >= 0.05)
  .map((l) => l.minutes)
  .sort((a, b) => a - b)
  .map((min): [number, string] => [min / 60, fmtMinutes(min)]);
// Timetables saved before the lengths followed 경희대 still hold these, so they stay valid.
const LEGACY_LENGTHS: readonly number[] = [1, 1.5, 2, 3];

/** The usual length and start for a course of this many credits (3학점 is mostly 75분, 2학점 a long block). */
export function defaultsFor(credits: number): { len: number; start: number } {
  if (credits >= 3) return { len: 75 / 60, start: 10.5 };
  if (credits >= 2) return { len: 230 / 60, start: 13.5 };
  return { len: 110 / 60, start: 9 };
}

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

/** 9 -> "9:00", 10.5 -> "10:30", 11.75 -> "11:45" */
export function fmtHour(h: number): string {
  const t = Math.round(h * 60);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

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
    (LENGTHS.some(([l]) => l === s.len) || LEGACY_LENGTHS.includes(s.len)) &&
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
