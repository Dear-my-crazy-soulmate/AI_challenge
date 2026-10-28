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

  it("counts the courses still to take: every untaken required one, the fewest electives", () => {
    const none = applyTaken(cs, new Set());
    const basics = group(none.primary, "전공기초");
    const csBasics = cs.primary.groups.find((g) => g.category === "전공기초")!;
    expect(basics.remainingCourses).toBe(csBasics.courses.length); // "all": every course
    const elective = group(none.primary, "전공선택");
    expect(elective.todo).toEqual([]);
    expect(elective.remainingCourses).toBe(Math.ceil(elective.need! / 3)); // 3학점 pool
    const after = applyTaken(cs, new Set(["CSE204"]));
    expect(group(after.primary, "전공필수").remainingCourses).toBe(group(none.primary, "전공필수").remainingCourses! - 1);
    expect(after.remainingCourses.total).toBe(none.remainingCourses.total - 1);
  });

  it("keeps a 0학점 required course (졸업논문) on the list until it is ticked", () => {
    const req = cs.primary.groups.find((g) => g.category === "전공필수")!;
    const thesis = req.courses.find((c) => c.credits === 0)!;
    const allButThesis = new Set(req.courses.filter((c) => c !== thesis).map((c) => c.code));
    const g = group(applyTaken(cs, allButThesis).primary, "전공필수");
    expect(g.remaining).toBe(0);
    expect(g.todo).toEqual([thesis.code]);
    expect(g.remainingCourses).toBe(1);
  });

  it("double major: a required course in both programs is one course to take, not two", () => {
    const p = plan("컴퓨터공학과", "소프트웨어융합학과", "double");
    const r = applyTaken(p, new Set());
    const todo = [...r.primary.groups, ...r.second.groups].flatMap((g) => g.todo);
    expect(r.remainingCourses.required).toBe(new Set(todo).size);
    expect(r.remainingCourses.required).toBeLessThan(todo.length); // 자료구조, 알고리즘 등 shared
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
