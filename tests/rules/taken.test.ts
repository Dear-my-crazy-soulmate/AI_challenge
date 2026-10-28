import { describe, expect, it } from "vitest";

import courses from "../../data/curated/2026/courses.json";
import majorRules from "../../data/curated/2026/major_rules.json";
import depts from "../../data/curated/credits_global.json";
import issues from "../../data/curated/credits_global_issues.json";
import { buildCoursePlan } from "../../src/lib/rules/courses";
import type { CourseData, CoursePlanOk } from "../../src/lib/rules/courses";
import type { CreditData } from "../../src/lib/rules/credits";
import type { MajorRules } from "../../src/lib/rules/majorRules";
import { applyTaken } from "../../src/lib/rules/taken";

const credits = { depts, issues } as unknown as CreditData;
const data = courses as unknown as CourseData;
const rules = majorRules as unknown as MajorRules;

function plan(primary: string, second: string, kind: "double" | "minor"): CoursePlanOk {
  const r = buildCoursePlan({ primary, second, kind }, credits, data, rules);
  if (!r.available) throw new Error(r.message);
  return r;
}
const group = (p: ReturnType<typeof applyTaken>["primary"], cat: string) => p.groups.find((g) => g.category === cat)!;

describe("applyTaken", () => {
  const cs = plan("컴퓨터공학과", "체육학과", "double");

  it("nothing taken: remaining is the full plan", () => {
    const r = applyTaken(cs, new Set());
    expect(r.taken).toBe(0);
    expect(r.remaining).toBe(cs.totals.total);
  });

  it("subtracts a taken required course from its group and the total", () => {
    // 자료구조 CSE204 (3학점) is a 전공필수 of the 컴퓨터공학과 double major
    const r = applyTaken(cs, new Set(["CSE204"]));
    expect(group(r.primary, "전공필수")).toMatchObject({ taken: 3, remaining: 24, courses: ["CSE204"] });
    expect(r.primary.remaining).toBe(cs.totals.primaryCredits - 3);
    expect(r.remaining).toBe(cs.totals.total - 3);
  });

  it("never takes off more than a group needs", () => {
    const basics = cs.primary.groups.find((g) => g.category === "전공기초")!;
    const all = new Set(basics.courses.map((c) => c.code));
    const r = applyTaken(cs, new Set([...all, "NOPE999"]));
    expect(group(r.primary, "전공기초").remaining).toBe(0);
    expect(group(r.primary, "전공기초").taken).toBe(basics.credits);
  });

  it("ignores codes that are not in either program", () => {
    expect(applyTaken(cs, new Set(["XYZ1234"])).taken).toBe(0);
  });

  it("double major: a course in both programs counts for both", () => {
    const p = plan("컴퓨터공학과", "소프트웨어융합학과", "double");
    const shared = p.majorRules.overlap!.courses[0];
    const r = applyTaken(p, new Set([shared.code]));
    expect(r.primary.taken).toBe(shared.credits);
    expect(r.second.taken).toBe(shared.credits);
  });

  it("minor: a course that is also in the 본전공 does not count for the minor", () => {
    const p = plan("컴퓨터공학과", "소프트웨어융합학과", "minor");
    const overlap = p.majorRules.minorOverlap!.courses[0];
    const r = applyTaken(p, new Set([overlap.code]));
    expect(r.second.taken).toBe(0);
    expect(r.second.notCounted).toContain(overlap.code);
    expect(r.primary.taken).toBeGreaterThan(0);
  });
});
