import { describe, expect, it } from "vitest";

import courses from "../../data/curated/2026/courses.json";
import majorRules from "../../data/curated/2026/major_rules.json";
import microdegrees from "../../data/curated/2026/microdegrees.json";
import depts from "../../data/curated/credits_global.json";
import issues from "../../data/curated/credits_global_issues.json";
import type { CourseData } from "../../src/lib/rules/courses";
import type { CreditData } from "../../src/lib/rules/credits";
import type { MajorRules } from "../../src/lib/rules/majorRules";
import { buildMicrodegreePlan, listMicrodegrees } from "../../src/lib/rules/microdegrees";
import type { MicrodegreeData, MicrodegreePlanResult } from "../../src/lib/rules/microdegrees";

const credits = { depts, issues } as unknown as CreditData;
const data = courses as unknown as CourseData;
const mds = microdegrees as unknown as MicrodegreeData;
const rules = majorRules as unknown as MajorRules;
const list = listMicrodegrees(mds);
const find = (name: string) => list.find((m) => m.name === name)!;
const plan = (primary: string, id: string): MicrodegreePlanResult =>
  buildMicrodegreePlan({ primary, id }, credits, data, mds, rules);

describe("listMicrodegrees", () => {
  it("merges the same micro-degree printed by several departments", () => {
    const ea = find("동아시아영상문화산업");
    expect(ea.depts.sort()).toEqual(["연극영화학과", "일본어학과", "중국어학과", "한국어학과"].sort());
    expect(ea.pages).toHaveLength(4);
    // 프랑스어학과 prints "글로벌협력" without a space: still the same one
    const gc = list.filter((m) => m.name.replace(/\s/g, "") === "글로벌협력");
    expect(gc).toHaveLength(1);
    expect(gc[0].depts).toContain("프랑스어학과");
  });

  it("has unique ids and fewer entries than pages", () => {
    const ids = list.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(list.length).toBeLessThan(mds.microdegrees.length);
  });

  it("drops the '- 주관' suffix and English part from names", () => {
    expect(list.some((m) => m.name === "중국디지털리터러시")).toBe(true);
  });
});

describe("buildMicrodegreePlan", () => {
  it("본전공 stays single; marks micro-degree courses that are also in the major", () => {
    const md = find("빅데이터 분석");
    const r = plan("컴퓨터공학과", md.id);
    if (!r.available) throw new Error(r.message);
    expect(r.primaryCredits).toBe(81);
    expect(r.primary.kind).toBe("single");
    expect(r.microdegree.required_credits).toBe(9);
    expect(r.alsoInPrimary.map((c) => c.code).sort()).toEqual(["AI3004", "CSE434"].filter((c) =>
      r.primary.groups.some((g) => g.courses.some((x) => x.code === c)),
    ));
    expect(r.rules.map((x) => x.id)).toContain("md-same-code");
  });

  it("refuses bad input without throwing", () => {
    expect(plan("", find("메타버스").id).available).toBe(false);
    expect(plan("컴퓨터공학과", "nope").available).toBe(false);
    const conv = plan("양자정보", find("메타버스").id);
    expect(conv.available ? "ok" : conv.reason).toBe("NOT_OFFERED");
  });
});
