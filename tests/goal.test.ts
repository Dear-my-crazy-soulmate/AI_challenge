import { describe, expect, it } from "vitest";

import { goalTotal, isSameGoal, parseGoal } from "../src/lib/goal";
import type { Goal } from "../src/lib/goal";

const goal: Goal = {
  primary: "컴퓨터공학과",
  mode: "double",
  second: "철학과",
  secondName: "철학과",
  primaryCredits: 51,
  secondCredits: 51,
};

describe("parseGoal", () => {
  it("reads back what was saved", () => {
    expect(parseGoal(JSON.stringify(goal))).toEqual(goal);
  });
  it("accepts a micro-degree whose credits are unknown", () => {
    const md = { ...goal, mode: "microdegree", second: "md-1", secondName: "AI 기초", secondCredits: null };
    expect(parseGoal(JSON.stringify(md))).toEqual(md);
  });
  it.each([null, "", "not json", "{}", JSON.stringify({ ...goal, mode: "triple" }), JSON.stringify({ ...goal, primaryCredits: "51" })])(
    "returns null for %j",
    (raw) => {
      expect(parseGoal(raw)).toBeNull();
    },
  );
});

describe("goalTotal", () => {
  it("adds both programs", () => expect(goalTotal(goal)).toBe(102));
  it("counts unknown credits as 0", () => expect(goalTotal({ ...goal, secondCredits: null })).toBe(51));
});

describe("isSameGoal", () => {
  it("matches on primary, mode and second", () => {
    expect(isSameGoal(goal, { primary: "컴퓨터공학과", mode: "double", second: "철학과" })).toBe(true);
    expect(isSameGoal(goal, { primary: "컴퓨터공학과", mode: "minor", second: "철학과" })).toBe(false);
    expect(isSameGoal(null, goal)).toBe(false);
  });
});
