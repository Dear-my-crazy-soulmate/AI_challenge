import { describe, expect, it } from "vitest";

import courses from "../../data/curated/2026/courses.json";
import depts from "../../data/curated/credits_global.json";
import issues from "../../data/curated/credits_global_issues.json";
import majorRules from "../../data/curated/2026/major_rules.json";
import { buildCoursePlan } from "../../src/lib/rules/courses";
import type { CourseData, CoursePlanOk, CoursePlanResult } from "../../src/lib/rules/courses";
import type { CreditData } from "../../src/lib/rules/credits";
import type { MajorRules } from "../../src/lib/rules/majorRules";

const credits = { depts, issues } as unknown as CreditData;
const data = courses as unknown as CourseData;
const rules = majorRules as unknown as MajorRules;

function ok(r: CoursePlanResult): CoursePlanOk {
  if (!r.available) throw new Error(`unavailable: ${r.reason} ${r.message}`);
  return r;
}
const names = (r: CoursePlanOk, side: "primary" | "second", cat: string) =>
  r[side].groups.find((g) => g.category === cat)?.courses.map((c) => c.name) ?? [];

describe("컴퓨터공학과 + 소프트웨어융합학과 다전공", () => {
  const r = ok(buildCoursePlan({ primary: "컴퓨터공학과", second: "소프트웨어융합학과", kind: "double" }, credits, data, rules));

  it("uses the double-major course table of 컴퓨터공학과 ([표2])", () => {
    expect(r.primary.kind).toBe("double");
    expect(r.primary.status).toBe("verified");
    expect(names(r, "primary", "전공기초").sort()).toEqual(["미분적분학", "선형대수", "확률및랜덤변수"]);
    const req = r.primary.groups.find((g) => g.category === "전공필수")!;
    expect([req.credits, req.rule, req.courses.length]).toEqual([27, "all", 10]);
    expect(names(r, "primary", "전공필수")).toContain("졸업논문(컴퓨터공학)");
  });

  it("keeps credits from the overview", () => {
    expect(r.totals).toEqual({ primaryCredits: 51, secondCredits: 51, total: 102, savedCredits: 30 });
  });

  it("electives are a pool to choose from, never all required", () => {
    const el = r.primary.groups.find((g) => g.category === "전공선택")!;
    expect(el.rule).toBe("choose");
    expect(el.credits).toBe(15);
    expect(el.courseCredits).toBeGreaterThan(15);
  });

  it("reports courses that appear in both programs", () => {
    for (const c of r.shared) {
      expect(r.second.groups.some((g) => g.courses.some((x) => x.code === c.code))).toBe(true);
    }
  });

  it("points to book pages and rule text", () => {
    expect(r.primary.pages).toContain(398);
    expect(r.primary.rules.some((x) => x.text.includes("다전공"))).toBe(true);
    expect(r.source.asOf).toBe("2026학년도 교육과정");
  });
});

describe("minor and other departments", () => {
  it("컴퓨터공학과 부전공: 5 required courses (15 credits)", () => {
    const r = ok(buildCoursePlan({ primary: "체육학과", second: "컴퓨터공학과", kind: "minor" }, credits, data, rules));
    expect(r.primary.kind).toBe("single");
    expect(r.second.status).toBe("verified");
    expect(names(r, "second", "전공필수").sort()).toEqual(
      ["객체지향프로그래밍", "알고리즘", "운영체제", "웹/파이선프로그래밍", "자료구조"].sort(),
    );
  });

  it("a choose-rule program says how many credits to pick", () => {
    const r = ok(buildCoursePlan({ primary: "체육학과", second: "응용수학과", kind: "double" }, credits, data, rules));
    const basic = r.second.groups.find((g) => g.category === "전공기초")!;
    expect(basic.rule).toBe("choose");
    expect(basic.credits).toBe(6);
    expect(r.second.status).toBe("choose");
  });

  it("department without course data still gets credits", () => {
    const r = ok(buildCoursePlan({ primary: "체육학과", second: "글로벌문화기술", kind: "double" }, credits, data, rules));
    expect(r.second.status).toBe("no_courses");
    expect(r.second.groups).toEqual([]);
    expect(r.totals.secondCredits).toBe(46);
  });

  it("인공지능학과 has its courses from the book's [별표1] and its credits match the overview", () => {
    const r = ok(buildCoursePlan({ primary: "체육학과", second: "인공지능학과", kind: "double" }, credits, data, rules));
    expect(r.second.status).toBe("verified");
    expect(r.totals.secondCredits).toBe(51);
    expect(r.second.groups.map((g) => g.credits)).toEqual([12, 30, 9]);
  });

  it("passes through credit-level errors", () => {
    const r = buildCoursePlan({ primary: "컴퓨터공학과", second: "융합바이오·신소재공학과", kind: "minor" }, credits, data, rules);
    expect(r.available ? "available" : r.reason).toBe("NOT_VERIFIED");
  });

  it("every course code in a group exists in its catalog", () => {
    for (const [dept, d] of Object.entries(data.depts)) {
      const codes = new Set(d.catalog.map((c) => c.code));
      for (const p of Object.values(d.programs)) {
        for (const g of p!.groups) for (const c of g.courses) expect(codes.has(c), `${dept} ${c}`).toBe(true);
      }
    }
  });
});
