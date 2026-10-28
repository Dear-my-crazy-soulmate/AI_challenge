import { describe, expect, it, vi } from "vitest";

import courses from "../../data/curated/2026/courses.json";
import majorRules from "../../data/curated/2026/major_rules.json";
import microdegrees from "../../data/curated/2026/microdegrees.json";
import profiles from "../../data/curated/2026/dept_profiles.json";
import depts from "../../data/curated/credits_global.json";
import issues from "../../data/curated/credits_global_issues.json";
import { fallbackGuide } from "../../src/lib/guide/fallback";
import { factsFromMicrodegree, factsFromPlan, guideSources } from "../../src/lib/guide/facts";
import { createGuideService } from "../../src/lib/guide/service";
import type { GuideFacts, ProfileData } from "../../src/lib/guide/types";
import { verifyGuide } from "../../src/lib/guide/verify";
import { createChatKhu } from "../../src/lib/llm/chatkhu";
import { createMockLlm } from "../../src/lib/llm/mock";
import { buildMessages } from "../../src/lib/llm/prompts/comboGuide.v1";
import { buildCoursePlan } from "../../src/lib/rules/courses";
import type { CourseData, CoursePlanOk } from "../../src/lib/rules/courses";
import type { CreditData } from "../../src/lib/rules/credits";
import type { MajorRules } from "../../src/lib/rules/majorRules";
import { buildMicrodegreePlan, listMicrodegrees } from "../../src/lib/rules/microdegrees";
import type { MicrodegreeData, MicrodegreePlanOk } from "../../src/lib/rules/microdegrees";

const credits = { depts, issues } as unknown as CreditData;
const data = courses as unknown as CourseData;
const rules = majorRules as unknown as MajorRules;
const mds = microdegrees as unknown as MicrodegreeData;
const prof = profiles as unknown as ProfileData;

function cseSwcon(): GuideFacts {
  const plan = buildCoursePlan({ primary: "컴퓨터공학과", second: "소프트웨어융합학과", kind: "double" }, credits, data, rules);
  return factsFromPlan(plan as CoursePlanOk, prof);
}

const good = (f: GuideFacts) =>
  JSON.stringify({
    summary: "프로그래밍 기본기에 융합 소프트웨어 개발을 더하는 조합이에요.",
    strengths: [
      { text: "자료구조와 알고리즘을 두 전공에서 함께 다져요.", page: f.primary.page },
      { text: "로봇·비전, 데이터사이언스 같은 융합 분야로 넓힐 수 있어요.", page: f.second.depts[0].page },
    ],
    paths: [{ text: "정보통신이나 게임 관련 분야로 이어질 수 있어요.", page: f.primary.page }],
    fit: "이런 학생에게 잘 맞아요: 만드는 것을 좋아하는 학생",
  });

describe("dept_profiles.json", () => {
  it("has the book's own text and page for every 국제캠퍼스 department", () => {
    const names = (depts as { dept: string }[]).map((d) => d.dept);
    for (const n of names) {
      const p = prof.profiles[n];
      expect(p, n).toBeDefined();
      expect(p.page, n).toBeGreaterThan(0);
      expect(p.purpose || p.goals, n).not.toBe("");
      expect(p.as_of).toBe("2026학년도 교육과정");
    }
    expect(prof.profiles["컴퓨터공학과"].purpose).toContain("IT강국을 선도할 수 있는");
    expect(prof.profiles["컴퓨터공학과"].page).toBe(395);
  });
});

describe("facts and prompt", () => {
  it("gives ChatKHU department texts and course names but no credit numbers", () => {
    const f = cseSwcon();
    expect(f.kind).toBe("double");
    expect(f.second.courses.map((c) => c.category)).toContain("전공필수");
    expect(f.shared).toContain("자료구조");
    const user = buildMessages(f)[1].content;
    expect(user).toContain("<컴퓨터공학과 원문 p.395>");
    expect(user).toContain("<소프트웨어융합학과 원문 p.");
    expect(user).toContain("자료구조");
    expect(user).not.toMatch(/\d+\s*학점/);
    expect(JSON.stringify(f)).not.toMatch(/"credits"/);
  });

  it("uses the running departments and the 마이크로디그리 definition for a micro-degree", () => {
    const md = listMicrodegrees(mds).find((m) => m.name === "빅데이터 분석") ?? listMicrodegrees(mds)[0];
    const plan = buildMicrodegreePlan({ primary: "컴퓨터공학과", id: md.id }, credits, data, mds, rules) as MicrodegreePlanOk;
    const f = factsFromMicrodegree(plan, prof, { text: rules.microdegree.definition, page: rules.microdegree.page });
    expect(f.kind).toBe("md");
    expect(f.second.depts.map((d) => d.dept)).toEqual(md.depts);
    expect(buildMessages(f)[1].content).toContain(`마이크로디그리 "${md.name}"`);
    expect(guideSources(f).length).toBeGreaterThan(0);
  });
});

describe("verifyGuide", () => {
  const f = cseSwcon();

  it("accepts a grounded answer, even inside a code fence", () => {
    const r = verifyGuide("```json\n" + good(f) + "\n```", f);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.guide.strengths).toHaveLength(2);
      expect(r.guide.fit).toBe("만드는 것을 좋아하는 학생"); // the card shows its own label
    }
  });

  it("rejects credits, made-up numbers, banned claims and unknown pages", () => {
    const bad = JSON.parse(good(f));
    bad.summary = "두 전공을 합쳐 102학점이에요.";
    bad.paths[0].text = "취업률이 높은 분야로 이어져요.";
    bad.strengths[1].page = 999;
    const r = verifyGuide(JSON.stringify(bad), f);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const all = r.problems.join(" ");
      expect(all).toContain("'학점'");
      expect(all).toContain("근거 없는 숫자 102");
      expect(all).toContain("'취업률'");
      expect(all).toContain("쪽 번호 999");
    }
  });

  it("allows a number that is in the source text and rejects broken JSON", () => {
    const ok = JSON.parse(good(f));
    ok.strengths[0].text = "4차 산업혁명을 이끌 융합 분야를 배워요."; // 소프트웨어융합학과 소개에 있는 표현
    expect(verifyGuide(JSON.stringify(ok), f).ok).toBe(true);
    expect(verifyGuide("설명할 수 없어요", f).ok).toBe(false);
    expect(verifyGuide('{"summary": "a"}', f).ok).toBe(false);
  });
});

describe("fallbackGuide", () => {
  it("shows each department's own 교육목적 with its page", () => {
    const g = fallbackGuide(cseSwcon());
    expect(g.summary).toBe("컴퓨터공학과 본전공에 소프트웨어융합학과 다전공을(를) 더하는 조합이에요.");
    expect(g.strengths[0]).toEqual({ text: "컴퓨터공학과: IT강국을 선도할 수 있는 창의력과 전문성을 갖춘 글로벌 컴퓨터공학 인재 양성", page: 395 });
    expect(g.strengths).toHaveLength(2);
  });
});

describe("createGuideService", () => {
  const f = cseSwcon();

  it("calls ChatKHU once per combination and serves the cache after that", async () => {
    const llm = createMockLlm(good(f));
    const s = createGuideService(llm);
    const [a, b] = await Promise.all([s.get("k", f, "ip"), s.get("k", f, "ip")]);
    const c = await s.get("k", f, "other");
    expect(a.source).toBe("ai");
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(llm.calls).toHaveLength(1);
  });

  it("falls back without a key, on errors, on failed checks and over the limits", async () => {
    expect((await createGuideService(null).get("k", f, "ip")).source).toBe("fallback");
    const broken = createGuideService({ ...createMockLlm(""), chat: () => Promise.reject(new Error("x")) });
    expect(await broken.get("k", f, "ip")).toMatchObject({ source: "fallback", reason: "LLM_ERROR" });
    const wrong = createGuideService(createMockLlm('{"summary":"102학점","strengths":[],"paths":[]}'));
    expect(await wrong.get("k", f, "ip")).toMatchObject({ source: "fallback", reason: "CHECK_FAILED" });
    const tight = createGuideService(createMockLlm(good(f)), { perDay: 1, perVisitorHour: 5, cacheSize: 10 });
    await tight.get("a", f, "ip");
    expect(await tight.get("b", f, "ip")).toMatchObject({ source: "fallback", reason: "BUSY" });
    const visitor = createGuideService(createMockLlm(good(f)), { perDay: 10, perVisitorHour: 1, cacheSize: 10 });
    await visitor.get("a", f, "ip");
    expect(await visitor.get("b", f, "ip")).toMatchObject({ reason: "BUSY" });
    expect((await visitor.get("b", f, "someone else")).source).toBe("ai");
  });
});

describe("createChatKhu", () => {
  it("is null without a key, so the app falls back instead of failing", () => {
    expect(createChatKhu({})).toBeNull();
    expect(createChatKhu({ CHATKHU_API_KEY: "k" })).toBeNull();
  });

  it("posts an OpenAI-style request with the key in the header only", async () => {
    const f = vi.fn(async () =>
      Response.json({ choices: [{ message: { content: "안녕" } }], usage: { prompt_tokens: 5, completion_tokens: 2 } }),
    );
    const llm = createChatKhu({ CHATKHU_API_KEY: "secret", CHATKHU_BASE_URL: "https://gw.test/v1/gateway/" }, f as unknown as typeof fetch)!;
    const r = await llm.chat([{ role: "user", content: "hi" }]);
    expect(r).toMatchObject({ text: "안녕", model: "claude-haiku-5-5", tokens: { input: 5, output: 2 } });
    const [url, init] = (f.mock.calls[0] as unknown as [string, RequestInit]);
    expect(url).toBe("https://gw.test/v1/gateway/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret");
    expect(String(init.body)).not.toContain("secret");
  });

  it("throws on an error status so the service can fall back", async () => {
    const f = vi.fn(async () => new Response("no", { status: 401 }));
    const llm = createChatKhu({ CHATKHU_API_KEY: "k", CHATKHU_BASE_URL: "https://gw.test" }, f as unknown as typeof fetch)!;
    await expect(llm.chat([{ role: "user", content: "hi" }])).rejects.toThrow("401");
  });
});
