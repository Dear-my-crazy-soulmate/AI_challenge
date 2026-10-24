import { describe, expect, it } from "vitest";

import { conflictPairs, conflictsWith, fmtHour, isValidSlot, overlaps, parseTimetable, startOptions, totalCredits } from "../src/lib/timetable";
import type { Slot } from "../src/lib/timetable";

const slot = (over: Partial<Slot> = {}): Slot => ({
  id: "a",
  code: "CSE101",
  name: "프로그래밍",
  credits: 3,
  days: [0, 2],
  start: 10.5,
  len: 1.5,
  tag: "p",
  ...over,
});

describe("fmtHour / startOptions", () => {
  it("formats whole and half hours", () => {
    expect(fmtHour(9)).toBe("9:00");
    expect(fmtHour(10.5)).toBe("10:30");
  });
  it("only offers starts that end by 18:00", () => {
    expect(startOptions(1)[0]).toBe(9);
    expect(startOptions(1).at(-1)).toBe(17);
    expect(startOptions(3).at(-1)).toBe(15);
  });
});

describe("overlaps", () => {
  it("needs a shared day and shared time", () => {
    expect(overlaps(slot(), slot({ days: [2, 4], start: 11 }))).toBe(true);
    expect(overlaps(slot(), slot({ days: [1, 3], start: 10.5 }))).toBe(false); // other days
    expect(overlaps(slot(), slot({ start: 9, len: 1 }))).toBe(false); // 9:00-10:00 vs 10:30-12:00
  });
  it("treats back-to-back classes as not overlapping", () => {
    expect(overlaps(slot({ start: 9, len: 1.5 }), slot({ start: 10.5 }))).toBe(false);
  });
});

describe("conflicts", () => {
  const a = slot({ id: "a" });
  const b = slot({ id: "b", days: [2], start: 11 });
  const c = slot({ id: "c", days: [4], start: 9, len: 1 });
  it("lists each colliding pair once", () => {
    expect(conflictPairs([a, b, c]).map(([x, y]) => x.id + y.id)).toEqual(["ab"]);
  });
  it("finds what a new class would collide with", () => {
    expect(conflictsWith([a, c], { days: [0], start: 10, len: 1 }).map((s) => s.id)).toEqual(["a"]);
    expect(conflictsWith([a, c], { days: [1], start: 10, len: 1 })).toEqual([]);
  });
});

describe("totalCredits", () => {
  it("adds up credits", () => expect(totalCredits([slot(), slot({ credits: 2 })])).toBe(5));
});

describe("parseTimetable", () => {
  it("reads back what was saved", () => {
    const list = [slot(), slot({ id: "b", days: [1] })];
    expect(parseTimetable(JSON.stringify(list))).toEqual(list);
  });
  it("drops broken entries but keeps the good ones", () => {
    const raw = JSON.stringify([slot(), slot({ id: "x", days: [] }), slot({ id: "y", days: [5] }), slot({ id: "z", start: 17.5, len: 1.5 }), { nope: 1 }]);
    expect(parseTimetable(raw).map((s) => s.id)).toEqual(["a"]);
  });
  it.each([null, "", "not json", "{}", "42"])("returns [] for %j", (raw) => {
    expect(parseTimetable(raw)).toEqual([]);
  });
  it("validates tag and duplicate days", () => {
    expect(isValidSlot(slot({ tag: "zzz" as never }))).toBe(false);
    expect(isValidSlot(slot({ days: [1, 1] }))).toBe(false);
  });
});
