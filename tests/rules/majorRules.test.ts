import { describe, expect, it } from "vitest";

import courses from "../../data/curated/2026/courses.json";
import majorRules from "../../data/curated/2026/major_rules.json";
import depts from "../../data/curated/credits_global.json";
import issues from "../../data/curated/credits_global_issues.json";
import { buildCoursePlan } from "../../src/lib/rules/courses";
import type { CourseData, CoursePlanOk, CoursePlanResult } from "../../src/lib/rules/courses";
import type { CreditData } from "../../src/lib/rules/credits";
import { applyMajorRules, prohibitedReason, trackNotices, trackOf } from "../../src/lib/rules/majorRules";
import type { MajorRules, ProgramLike } from "../../src/lib/rules/majorRules";

const credits = { depts, issues } as unknown as CreditData;
const data = courses as unknown as CourseData;
const rules = majorRules as unknown as MajorRules;

function ok(r: CoursePlanResult): CoursePlanOk {
  if (!r.available) throw new Error(`unavailable: ${r.reason} ${r.message}`);
  return r;
}
const plan = (primary: string, second: string, kind: "double" | "minor") =>
  buildCoursePlan({ primary, second, kind }, credits, data, rules);

describe("prohibited combinations (p.116-117)", () => {
  it("환경학 and 환경공학 are one 모집단위: only one of them", () => {
    const r = plan("환경학및환경공학과 (환경학)", "환경학및환경공학과 (환경공학)", "double");
    expect(r.available ? "available" : r.reason).toBe("PROHIBITED");
    if (!r.available) expect(r.message).toContain("p.117");
  });

  it("the same ban applies to a minor", () => {
    const r = plan("환경학및환경공학과 (환경공학)", "환경학및환경공학과 (환경학)", "minor");
    expect(r.available ? "available" : r.reason).toBe("PROHIBITED");
  });

  it("Global campus banned majors", () => {
    expect(prohibitedReason("컴퓨터공학과", "동서의과학과", rules)).toContain("p.116");
    expect(prohibitedReason("컴퓨터공학과", "자유전공학부", rules)).not.toBeNull();
    expect(prohibitedReason("컴퓨터공학과", "체육학과", rules)).toBeNull();
  });
});

describe("tracks of one 학부 (기계공학부 p.132, 환경학및환경공학과 p.258)", () => {
  it("trackOf finds the 학부 of a track and nothing for an ordinary 학과", () => {
    expect(trackOf("지능로봇공학", rules)?.school).toBe("기계공학부");
    expect(trackOf("환경학및환경공학과 (환경공학)", rules)?.school).toBe("환경학및환경공학과");
    expect(trackOf("컴퓨터공학과", rules)).toBeNull();
    expect(trackNotices(["환경학및환경공학과 (환경학)"], rules)[0].text).toContain("2개 트랙(환경학·환경공학)");
  });

  it("two tracks of 기계공학부 cannot be a double major or a minor", () => {
    const d = plan("기계공학", "지능로봇공학", "double");
    expect(d.available ? "available" : d.reason).toBe("PROHIBITED");
    if (!d.available) expect(d.message).toContain("기계공학부의 트랙");
    const m = plan("항공우주모빌리티", "기계공학", "minor");
    expect(m.available ? "available" : m.reason).toBe("PROHIBITED");
  });

  it("a student of another 학과 picks one track as a double major and sees how tracks work", () => {
    const r = ok(plan("컴퓨터공학과", "지능로봇공학", "double"));
    const n = r.majorRules.notices.find((x) => x.id === "mech-tracks");
    expect(n?.page).toBe(132);
    expect(n?.text).toContain("1학년");
    expect(r.majorRules.notices.filter((x) => x.id === "env-tracks")).toHaveLength(0);
  });

  it("every track name is a real department in the credit data", () => {
    const names = new Set((depts as { dept: string }[]).map((d) => d.dept));
    for (const t of rules.tracks) for (const d of t.depts) expect(names.has(d), d).toBe(true);
  });
});

describe("same college, same 전공기초 (p.116)", () => {
  it("스마트팜과학과 + 원예생명공학과: the second major's 기초 is not taken again", () => {
    const r = ok(plan("스마트팜과학과", "원예생명공학과", "double"));
    const second기초 = r.second.groups.find((g) => g.category === "전공기초")!.credits!;
    expect(r.majorRules.basicExemption?.credits).toBe(second기초);
    expect(r.majorRules.minimumCredits).toBeLessThanOrEqual(r.totals.total - second기초);
  });

  it("different colleges get no exemption", () => {
    const r = ok(plan("컴퓨터공학과", "체육학과", "double"));
    expect(r.majorRules.basicExemption).toBeNull();
  });

  it("no exemption for a minor", () => {
    const r = ok(plan("스마트팜과학과", "원예생명공학과", "minor"));
    expect(r.majorRules.basicExemption).toBeNull();
  });
});

describe("course overlap", () => {
  it("double: courses required by both count once toward graduation (p.116)", () => {
    const r = ok(plan("컴퓨터공학과", "소프트웨어융합학과", "double"));
    const o = r.majorRules.overlap!;
    expect(o.courses.length).toBeGreaterThan(0);
    expect(r.majorRules.minimumCredits).toBe(r.totals.total - o.credits);
    for (const c of o.courses) {
      expect(r.second.groups.some((g) => g.courses.some((x) => x.code === c.code))).toBe(true);
    }
  });

  it("minor: courses also in the primary do not count for the minor (p.118)", () => {
    const r = ok(plan("컴퓨터공학과", "소프트웨어융합학과", "minor"));
    expect(r.majorRules.overlap).toBeNull();
    expect(r.majorRules.minorOverlap?.page).toBe(118);
    expect(r.majorRules.minimumCredits).toBe(r.totals.total);
  });

  it("only same course codes overlap, never same names", () => {
    const prog = (code: string): ProgramLike => ({
      groups: [{ category: "전공필수", credits: 3, rule: "all", courses: [{ code, name: "자료구조", credits: 3 }] }],
    });
    const m = applyMajorRules({ kind: "double", primaryCollege: "A", secondCollege: "B", total: 6 }, prog("X1"), prog("Y1"), rules);
    expect(m.overlap).toBeNull();
    expect(m.minimumCredits).toBe(6);
  });
});

describe("notices and micro-degree rules", () => {
  it("double and minor get their own notices with pages", () => {
    const d = ok(plan("컴퓨터공학과", "체육학과", "double")).majorRules.notices.map((n) => n.id);
    const m = ok(plan("컴퓨터공학과", "체육학과", "minor")).majorRules.notices.map((n) => n.id);
    expect(d).toContain("max-two");
    expect(d).not.toContain("minor-apply");
    expect(m).toContain("minor-only-if-double");
    expect(m).toContain("must-choose-one");
  });

  it("micro-degree rules are present with pages", () => {
    const ids = rules.microdegree.rules.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["md-eligibility", "md-max-three", "md-quit", "md-double-count"]));
    for (const r of rules.microdegree.rules) expect(r.page).toBeGreaterThan(0);
  });
});
