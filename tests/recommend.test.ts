import { describe, expect, it } from "vitest";

import { suggestDepts } from "../src/lib/recommend/rank";
import type { DeptTopicsData } from "../src/lib/recommend/rank";
import { TOPICS } from "../src/lib/recommend/topics";
import { verifyDeptTopics } from "../src/lib/recommend/verify";

const ids = TOPICS.map((t) => t.id);
const source = "컴퓨터공학과 빅데이터분석 분야, 모바일 및 보안 분야, IoT 분야 4차 산업혁명";

describe("checking ChatKHU's 관심 분야 for one 학과", () => {
  const good = JSON.stringify({
    topics: [
      { id: "software", reason: "프로그래밍을 이론과 실습으로 배워요.", page: 395 },
      { id: "ai-data", reason: "빅데이터분석 분야를 다뤄요.", page: 395 },
    ],
  });

  it("accepts known fields with the department's page", () => {
    const r = verifyDeptTopics("```json\n" + good + "\n```", ids, 395, source);
    expect(r.ok && r.topics.map((t) => t.id)).toEqual(["software", "ai-data"]);
  });

  it("rejects a field that is not on the list, a wrong page, banned words and invented numbers", () => {
    const bad = (t: object) => verifyDeptTopics(JSON.stringify({ topics: [t] }), ids, 395, source);
    expect(bad({ id: "space", reason: "우주를 배워요.", page: 395 }).ok).toBe(false);
    expect(bad({ id: "software", reason: "프로그래밍을 배워요.", page: 12 }).ok).toBe(false);
    expect(bad({ id: "software", reason: "취업률이 높아요.", page: 395 }).ok).toBe(false);
    expect(bad({ id: "software", reason: "졸업생 90명이 개발자예요.", page: 395 }).ok).toBe(false);
    expect(bad({ id: "software", reason: "4차 산업혁명을 이끌어요.", page: 395 }).ok).toBe(true);
  });

  it("rejects broken JSON, duplicates and too many fields", () => {
    expect(verifyDeptTopics("모르겠어요", ids, 395, source).ok).toBe(false);
    const dup = { id: "software", reason: "배워요.", page: 395 };
    expect(verifyDeptTopics(JSON.stringify({ topics: [dup, dup] }), ids, 395, source).ok).toBe(false);
    const four = ["software", "ai-data", "electronics", "business"].map((id) => ({ id, reason: "배워요.", page: 395 }));
    expect(verifyDeptTopics(JSON.stringify({ topics: four }), ids, 395, source).ok).toBe(false);
    expect(verifyDeptTopics(JSON.stringify({ topics: [] }), ids, 395, source).ok).toBe(false);
  });
});

describe("suggesting 학과 for 관심 분야", () => {
  const t = (id: string) => ({ id, reason: `${id} 이유`, page: 1 });
  const data: DeptTopicsData = {
    year: 2026,
    as_of: "2026학년도 교육과정",
    prompt: "deptTopics.v1",
    model: "test",
    depts: {
      A: { page: 1, status: "verified", topics: [t("software"), t("ai-data")] },
      B: { page: 1, status: "verified", topics: [t("business"), t("ai-data")] },
      C: { page: 1, status: "verified", topics: [t("ai-data")] },
      D: { page: 1, status: "TODO", topics: [] },
      E: { page: 1, status: "verified", topics: [t("sports")] },
    },
  };
  const cands = ["A", "B", "C", "D", "E", "F"].map((dept) => ({ dept }));

  it("puts 학과 matching more fields first, then the one whose text leads with the field", () => {
    const r = suggestDepts(["ai-data", "software"], cands, data);
    expect(r.map((s) => s.candidate.dept)).toEqual(["A", "C", "B"]);
    expect(r[0].matches.map((m) => m.label)).toEqual(["소프트웨어·IT", "AI·데이터"]);
  });

  it("only suggests calculator candidates with verified fields, and nothing without 관심 분야", () => {
    expect(suggestDepts(["ai-data"], [{ dept: "B" }], data).map((s) => s.candidate.dept)).toEqual(["B"]);
    expect(suggestDepts(["ai-data"], cands, data).some((s) => s.candidate.dept === "D")).toBe(false);
    expect(suggestDepts([], cands, data)).toEqual([]);
  });

  it("keeps the caller's order on a tie and stops at the limit", () => {
    expect(suggestDepts(["ai-data"], cands, data, 2).map((s) => s.candidate.dept)).toEqual(["C", "A"]);
  });
});
