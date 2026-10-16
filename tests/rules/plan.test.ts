import { describe, expect, it } from "vitest";

import ai from "../../data/curated/requirements/인공지능학과.json";
import phil from "../../data/curated/requirements/철학과.json";
import status from "../../data/curated/status.json";
import { buildPlan } from "../../src/lib/rules/plan";
import type { CuratedData, PlanOk, PlanResult } from "../../src/lib/rules/types";

const real = {
  depts: { 인공지능학과: ai, 철학과: phil },
  status,
} as unknown as CuratedData;

function ok(result: PlanResult): PlanOk {
  if (!result.available) throw new Error(`unavailable: ${result.reason} ${result.message}`);
  return result;
}

const codes = (cs: { code: string }[]) => cs.map((c) => c.code).sort();

describe("AI (본전공) + 철학과 (다전공)", () => {
  const r = ok(buildPlan({ primary: "인공지능학과", second: "철학과", kind: "double" }, real));

  it("converts the primary major from single to double and counts credits", () => {
    expect(r.primary.converted).toBe(true);
    expect(r.primary.singleTotalCredits).toBe(81);
    expect(r.totals).toEqual({ primaryCredits: 51, secondCredits: 39, total: 90, savedCredits: 30 });
  });

  it("lists the 15 required courses of the AI double major", () => {
    expect(r.primary.requiredCourses).toHaveLength(15);
    expect(r.primary.requiredCourses.map((c) => c.credits).reduce((a, b) => a + b, 0)).toBe(12 + 12 + 18);
  });

  it("lists the 5 required courses of 철학과", () => {
    expect(codes(r.second.requiredCourses)).toEqual(["PHIL1035", "PHIL1038", "PHIL2040", "PHIL3036", "PHIL4004"]);
  });

  it("names the courses that stop being required when switching to double", () => {
    expect(codes(r.droppedRequired)).toEqual(["AI1001", "CSE103", "CSE301", "SWCON104"]);
  });

  it("has no course code in both majors", () => {
    expect(r.duplicates).toEqual([]);
  });

  it("flags 인문학과진로탐색 as probably not applicable to a non-문과대학 student", () => {
    const career = r.notices.find((n) => n.id === "phil-career-course");
    expect(career?.advice).toBe("maybe_not_applicable");
  });

  it("gives at least two thesis notices and marks unclear rules as needs_check", () => {
    const thesis = r.notices.filter((n) => n.id.endsWith("thesis-enroll"));
    expect(thesis.map((n) => n.source).sort()).toEqual(["인공지능학과", "철학과"]);
    expect(r.notices.find((n) => n.id === "ai-industry-9")?.advice).toBe("needs_check");
  });

  it("keeps selection groups as candidates, never as required", () => {
    const pools = r.primary.requirement.groups.filter((g) => g.rule !== "all");
    expect(pools.map((g) => g.label)).toEqual(["전공선택/SW선택", "전공선택/AI선택"]);
    const aiPool = pools[1];
    expect(aiPool.unresolved).toEqual(["창업현장실습", "단기현장실습", "장기현장실습"]);
    expect(aiPool.courses).toHaveLength(31);
  });

  it("reports unconfirmed sources instead of hiding them", () => {
    const todo = r.warnings.filter((w) => w.code === "SOURCE_UNCONFIRMED");
    expect(todo).toHaveLength(4); // 2 depts x (source_url, as_of)
    expect(r.sources["철학과"]).toEqual({ sourceUrl: "TODO", asOf: "TODO" });
  });
});

describe("other kinds", () => {
  it("minor: primary stays single, nothing is saved", () => {
    const r = ok(buildPlan({ primary: "인공지능학과", second: "철학과", kind: "minor" }, real));
    expect(r.primary.converted).toBe(false);
    expect(r.totals).toEqual({ primaryCredits: 81, secondCredits: 21, total: 102, savedCredits: 0 });
    expect(r.droppedRequired).toEqual([]);
    expect(codes(r.second.requiredCourses)).toEqual(["PHIL1035", "PHIL3036"]);
  });

  it("microdegree 문명과 철학: 4 courses, 12 credits", () => {
    const r = ok(buildPlan({ primary: "인공지능학과", second: "철학과", kind: "microdegree", name: "문명과 철학" }, real));
    expect(r.totals.secondCredits).toBe(12);
    expect(codes(r.second.requiredCourses)).toEqual(["PHIL1038", "PHIL2001", "PHIL2040", "PHIL4053"]);
  });

  it("microdegree 인지과학: choose 3 of 4", () => {
    const r = ok(buildPlan({ primary: "인공지능학과", second: "철학과", kind: "microdegree", name: "인지과학" }, real));
    const g = r.second.requirement.groups[0];
    expect([g.rule, g.chooseN, g.requiredCredits, g.courses.length]).toEqual(["choose_n", 3, 9, 4]);
    expect(r.second.requiredCourses).toEqual([]);
  });

  it("철학과 as primary: conversion saves 25 credits and nothing is dropped", () => {
    const r = ok(buildPlan({ primary: "철학과", second: "인공지능학과", kind: "double" }, real));
    expect(r.totals).toEqual({ primaryCredits: 39, secondCredits: 51, total: 90, savedCredits: 25 });
    expect(r.droppedRequired).toEqual([]);
    // the student is in 문과대학, so the 문과대학 rule applies
    expect(r.notices.find((n) => n.id === "phil-career-course")?.advice).toBe("applies");
  });
});

describe("unavailable results", () => {
  const reason = (input: Parameters<typeof buildPlan>[0], data = real) => {
    const r = buildPlan(input, data);
    return r.available ? "available" : r.reason;
  };

  it("microdegree that failed verification is not provided", () => {
    const r = buildPlan({ primary: "인공지능학과", second: "철학과", kind: "microdegree", name: "과학과 철학" }, real);
    expect(r.available).toBe(false);
    if (!r.available) {
      expect(r.reason).toBe("NOT_VERIFIED");
      expect(r.message).toContain("CODE_NAME_MISMATCH");
    }
  });

  it("unknown department", () => {
    expect(reason({ primary: "인공지능학과", second: "없는학과", kind: "double" })).toBe("NO_DEPT_DATA");
    expect(reason({ primary: "없는학과", second: "철학과", kind: "double" })).toBe("NO_DEPT_DATA");
  });

  it("existing department but unknown microdegree or kind without data", () => {
    expect(reason({ primary: "인공지능학과", second: "철학과", kind: "microdegree", name: "없는MD" })).toBe(
      "REQUIREMENT_NOT_FOUND",
    );
    // 인공지능학과 has no minor requirement yet
    expect(reason({ primary: "철학과", second: "인공지능학과", kind: "minor" })).toBe("REQUIREMENT_NOT_FOUND");
  });

  it("invalid input never throws", () => {
    expect(reason({ primary: "", second: "철학과", kind: "double" })).toBe("INVALID_INPUT");
    expect(reason({ primary: "  ", second: "철학과", kind: "double" })).toBe("INVALID_INPUT");
    expect(reason({ primary: "인공지능학과", second: "철학과", kind: "triple" as never })).toBe("INVALID_INPUT");
    expect(reason({ primary: "인공지능학과", second: "철학과", kind: "microdegree" })).toBe("INVALID_INPUT");
    expect(reason({ primary: undefined as never, second: "철학과", kind: "double" })).toBe("INVALID_INPUT");
    expect(reason({ primary: "철학과", second: "철학과", kind: "double" })).toBe("SAME_DEPT");
  });

  it("a department whose build failed reports why", () => {
    const data = { ...real, status: { ...real.status, 컴퓨터공학과: { _dept_error: "no course master" } } };
    expect(reason({ primary: "컴퓨터공학과", second: "철학과", kind: "double" }, data as CuratedData)).toBe("NO_DEPT_DATA");
  });

  it("trims whitespace around names", () => {
    expect(buildPlan({ primary: " 인공지능학과 ", second: " 철학과", kind: "double" }, real).available).toBe(true);
  });
});

describe("duplicates and purity", () => {
  it("reports a course that appears in both majors", () => {
    const data = structuredClone(real);
    const shared = data.depts["철학과"].requirements[0].groups[0].coded[0];
    data.depts["인공지능학과"].requirements[1].groups[0].coded.push({ ...shared });
    const r = ok(buildPlan({ primary: "인공지능학과", second: "철학과", kind: "double" }, data));
    expect(r.duplicates.map((d) => d.code)).toEqual([shared.code]);
    expect(r.duplicates[0].inPrimary.length).toBeGreaterThan(0);
    expect(r.duplicates[0].inSecond.length).toBeGreaterThan(0);
  });

  it("does not modify the data it reads", () => {
    const before = JSON.stringify(real);
    buildPlan({ primary: "인공지능학과", second: "철학과", kind: "double" }, real);
    buildPlan({ primary: "인공지능학과", second: "철학과", kind: "microdegree", name: "과학과 철학" }, real);
    expect(JSON.stringify(real)).toBe(before);
  });

  it("credit totals come from data: changing the data changes the result", () => {
    const data = structuredClone(real);
    data.depts["철학과"].requirements.find((r) => r.kind === "double")!.total_credits = 40;
    const r = ok(buildPlan({ primary: "인공지능학과", second: "철학과", kind: "double" }, data));
    expect(r.totals.total).toBe(91);
  });
});
