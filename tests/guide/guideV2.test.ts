import { describe, expect, it } from "vitest";

import courses from "../../data/curated/2026/courses.json";
import deptTopics from "../../data/curated/2026/dept_topics.json";
import majorRules from "../../data/curated/2026/major_rules.json";
import profiles from "../../data/curated/2026/dept_profiles.json";
import depts from "../../data/curated/credits_global.json";
import issues from "../../data/curated/credits_global_issues.json";
import syllabus from "../../data/extracted/2026/syllabus_courses.json";
import { factsFromPlan, interestFacts, termsFromSyllabus } from "../../src/lib/guide/facts";
import type { GuideFacts, ProfileData } from "../../src/lib/guide/types";
import { verifyGuideV2 } from "../../src/lib/guide/verify";
import { buildMessages } from "../../src/lib/llm/prompts/comboGuide.v2";
import type { DeptTopicsData } from "../../src/lib/recommend/rank";
import { buildCoursePlan } from "../../src/lib/rules/courses";
import type { CourseData, CoursePlanOk } from "../../src/lib/rules/courses";
import type { CreditData } from "../../src/lib/rules/credits";
import type { MajorRules } from "../../src/lib/rules/majorRules";

const credits = { depts, issues } as unknown as CreditData;
const data = courses as unknown as CourseData;
const rules = majorRules as unknown as MajorRules;
const prof = profiles as unknown as ProfileData;
const terms = termsFromSyllabus((syllabus as { courses: { subjt_cd: string; term: string }[] }).courses);
const topicData = deptTopics as unknown as DeptTopicsData;

function facts(topics: string[] = ["ai-data"]): GuideFacts {
  const plan = buildCoursePlan({ primary: "컴퓨터공학과", second: "산업경영공학과", kind: "double" }, credits, data, rules) as CoursePlanOk;
  return factsFromPlan(plan, prof, { terms, interests: interestFacts(topics, ["컴퓨터공학과", "산업경영공학과"], topicData) });
}

describe("comboGuide.v2 facts and prompt", () => {
  it("gives both programs' courses in full with 개설 학기, and the 관심 분야, but no credit numbers", () => {
    const f = facts();
    expect(f.primaryCourses!.length).toBeGreaterThan(0);
    expect(f.second.courses.flatMap((c) => c.names).length).toBeGreaterThan(10);
    expect(f.interests).toEqual([expect.objectContaining({ label: "AI·데이터" })]);
    const text = buildMessages(f).map((m) => m.content).join("\n");
    expect(text).toContain("[과목] 컴퓨터공학과(본전공)");
    expect(text).toMatch(/\[[12]학기\]/);
    expect(text).toContain("AI·데이터");
    expect(text).not.toMatch(/\d+\s*학점/);
  });

  it("says when no 관심 분야 was chosen", () => {
    expect(buildMessages(facts([]))[1].content).toContain("(고르지 않음)");
  });
});

describe("verifyGuideV2", () => {
  const f = facts();
  const from = f.primaryCourses![0].names[0];
  const to = f.second.courses[0].names[0];
  const answer = (over: object = {}) =>
    JSON.stringify({
      summary: "만드는 힘에 일하는 방식을 보는 눈을 더하는 조합이에요.",
      bridges: [{ from, to, text: "두 과목이 이어져요." }],
      strengths: [{ text: "문제를 풀어 내는 힘을 길러요.", page: f.primary.page }],
      activities: [`${to}에서 배운 것으로 작은 프로젝트를 해 볼 수 있어요.`],
      paths: [{ text: "데이터를 다루는 일로 이어질 수 있어요.", page: f.second.depts[0].page }],
      fit: "만드는 것을 좋아하는 학생에게 맞아요.",
      consider: "두 전공의 성격이 꽤 달라요.",
      ...over,
    });

  it("accepts an answer whose courses are on the lists", () => {
    const r = verifyGuideV2(answer(), f);
    expect(r.ok && r.guide.bridges?.[0]).toEqual({ from, to, text: "두 과목이 이어져요." });
  });

  it("allows a 학기 tag copied onto a course name", () => {
    expect(verifyGuideV2(answer({ bridges: [{ from: `${from}[1학기]`, to, text: "이어져요." }] }), f).ok).toBe(true);
  });

  it("rejects made-up courses, activities without a listed course, and missing bridges", () => {
    expect(verifyGuideV2(answer({ bridges: [{ from: "양자요리학", to, text: "이어져요." }] }), f).ok).toBe(false);
    expect(verifyGuideV2(answer({ activities: ["동아리 활동을 해 보세요."] }), f).ok).toBe(false);
    expect(verifyGuideV2(answer({ bridges: [] }), f).ok).toBe(false);
  });

  it("keeps v1's rules: no credits, invented numbers or unknown pages", () => {
    expect(verifyGuideV2(answer({ consider: "51학점이 필요해요." }), f).ok).toBe(false);
    expect(verifyGuideV2(answer({ fit: "졸업생 87명이 만족했어요." }), f).ok).toBe(false);
    expect(verifyGuideV2(answer({ paths: [{ text: "이어질 수 있어요.", page: 9999 }] }), f).ok).toBe(false);
  });
});
