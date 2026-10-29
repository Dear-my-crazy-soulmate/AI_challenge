import { describe, expect, it } from "vitest";

import { LENGTHS, STARTS, conflictPairs, conflictsWith, defaultsFor, fmtHour, fmtMinutes, isValidSlot, overlaps, parseTimetable, startOptions, totalCredits } from "../src/lib/timetable";
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
  it("formats times that are not on the half hour", () => {
    expect(fmtHour(10.5 + 75 / 60)).toBe("11:45");
    expect(fmtHour(9 + 230 / 60)).toBe("12:50");
  });
  it("only offers starts that end by 20:00", () => {
    expect(startOptions(1)[0]).toBe(9);
    expect(startOptions(1).at(-1)).toBe(19);
    expect(startOptions(3).at(-1)).toBe(17);
  });
});

describe("경희대 class times", () => {
  it("offers the six usual start times", () => {
    expect(STARTS).toEqual([9, 10.5, 12, 13.5, 15, 16.5]);
  });
  it("offers the four usual lengths, shortest first", () => {
    expect(LENGTHS.map(([, label]) => label)).toEqual(["75분", "1시간 50분", "2시간 45분", "3시간 50분"]);
    expect(LENGTHS[0][0]).toBe(1.25);
  });
  it("words minutes the way people say them", () => {
    expect([fmtMinutes(75), fmtMinutes(110), fmtMinutes(165), fmtMinutes(230), fmtMinutes(60), fmtMinutes(45)]).toEqual(["75분", "1시간 50분", "2시간 45분", "3시간 50분", "1시간", "45분"]);
  });
  it("starts a 3학점 course with 75분, a 2학점 one with a long block", () => {
    expect(defaultsFor(3)).toEqual({ len: 1.25, start: 10.5 });
    expect(defaultsFor(2).len).toBe(230 / 60);
    expect(defaultsFor(1).len).toBe(110 / 60);
  });
  it("every default fits inside the day", () => {
    for (const c of [1, 2, 3]) {
      const d = defaultsFor(c);
      expect(startOptions(d.len)).toContain(d.start);
    }
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
    const raw = JSON.stringify([slot(), slot({ id: "x", days: [] }), slot({ id: "y", days: [5] }), slot({ id: "z", start: 19, len: 1.5 }), { nope: 1 }]);
    expect(parseTimetable(raw).map((s) => s.id)).toEqual(["a"]);
  });
  it.each([null, "", "not json", "{}", "42"])("returns [] for %j", (raw) => {
    expect(parseTimetable(raw)).toEqual([]);
  });
  it("validates tag and duplicate days", () => {
    expect(isValidSlot(slot({ tag: "zzz" as never }))).toBe(false);
    expect(isValidSlot(slot({ days: [1, 1] }))).toBe(false);
  });
  it("accepts the lengths 경희대 uses and the ones saved before them, nothing else", () => {
    expect(isValidSlot(slot({ len: 75 / 60 }))).toBe(true);
    expect(isValidSlot(slot({ start: 9, len: 230 / 60 }))).toBe(true);
    expect(isValidSlot(slot({ len: 1.5 }))).toBe(true); // an older save
    expect(isValidSlot(slot({ len: 1.3 }))).toBe(false);
    expect(isValidSlot(slot({ start: 16.5, len: 230 / 60 }))).toBe(false); // would end after 20:00
  });
});
