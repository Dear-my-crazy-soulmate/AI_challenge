// On-demand evaluation of the AI 조합 설명 (calls the real ChatKHU, so it is skipped in `npm test`).
//   node --env-file=.env.local node_modules/vitest/vitest.mjs run scripts/eval --testTimeout=0   with EVAL=models or EVAL=versions
// EVAL=models   : comboGuide.v2 on 5 combinations with claude-haiku-5-5 and claude-sonnet-5-5
// EVAL=versions : comboGuide.v1 and v2 (haiku) on 40 combinations (double, minor, micro-degree)
// Results (every answer and the check result) go to docs/experiments/; a summary is printed.
import { writeFileSync } from "node:fs";

import { describe, it } from "vitest";

import courses from "../../data/curated/2026/courses.json";
import deptTopics from "../../data/curated/2026/dept_topics.json";
import majorRules from "../../data/curated/2026/major_rules.json";
import microdegrees from "../../data/curated/2026/microdegrees.json";
import profiles from "../../data/curated/2026/dept_profiles.json";
import depts from "../../data/curated/credits_global.json";
import issues from "../../data/curated/credits_global_issues.json";
import syllabus from "../../data/extracted/2026/syllabus_courses.json";
import { factsFromMicrodegree, factsFromPlan, interestFacts, termsFromSyllabus } from "../../src/lib/guide/facts";
import type { GuideFacts, ProfileData } from "../../src/lib/guide/types";
import { verifyGuide, verifyGuideV2 } from "../../src/lib/guide/verify";
import { createChatKhu } from "../../src/lib/llm/chatkhu";
import * as v1 from "../../src/lib/llm/prompts/comboGuide.v1";
import * as v2 from "../../src/lib/llm/prompts/comboGuide.v2";
import type { DeptTopicsData } from "../../src/lib/recommend/rank";
import { buildCoursePlan } from "../../src/lib/rules/courses";
import type { CourseData, CoursePlanOk } from "../../src/lib/rules/courses";
import { listCreditOptions } from "../../src/lib/rules/credits";
import type { CreditData } from "../../src/lib/rules/credits";
import type { MajorRules } from "../../src/lib/rules/majorRules";
import { prohibitedReason } from "../../src/lib/rules/majorRules";
import { buildMicrodegreePlan, listMicrodegrees } from "../../src/lib/rules/microdegrees";
import type { MicrodegreeData, MicrodegreePlanOk } from "../../src/lib/rules/microdegrees";

const MODE = process.env.EVAL ?? "";
const credits = { depts, issues } as unknown as CreditData;
const data = courses as unknown as CourseData;
const rules = majorRules as unknown as MajorRules;
const mds = microdegrees as unknown as MicrodegreeData;
const prof = profiles as unknown as ProfileData;
const terms = termsFromSyllabus((syllabus as { courses: { subjt_cd: string; term: string }[] }).courses);
const topicData = deptTopics as unknown as DeptTopicsData;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Combo {
  kind: "double" | "minor" | "md";
  primary: string;
  second: string; // department or micro-degree id
  topics: string[];
}

/** Deterministic spread over the data: 28 double, 7 minor, 5 micro-degree; every third one with 관심 분야. */
function combos(): Combo[] {
  const singles = (depts as { dept: string; programs: { single: { available: unknown } } }[])
    .filter((d) => d.programs.single.available === true)
    .map((d) => d.dept);
  const topicSets = [["ai-data"], ["business", "global"], ["energy-env"], ["media-design"], ["bio-health", "sports"]];
  const out: Combo[] = [];
  let seed = 7;
  const next = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
  const want = { double: 28, minor: 7 } as const;
  for (const kind of ["double", "minor"] as const) {
    let made = 0;
    while (made < want[kind]) {
      const primary = singles[next(singles.length)];
      const options = listCreditOptions(primary, credits).filter((o) => o.kind === kind && !prohibitedReason(primary, o.dept, rules));
      if (options.length === 0) continue;
      const second = options[next(options.length)].dept;
      if (out.some((c) => c.kind === kind && c.primary === primary && c.second === second)) continue;
      out.push({ kind, primary, second, topics: out.length % 3 === 0 ? topicSets[next(topicSets.length)] : [] });
      made++;
    }
  }
  const mdList = listMicrodegrees(mds);
  for (let i = 0; i < 5; i++) {
    out.push({ kind: "md", primary: singles[next(singles.length)], second: mdList[next(mdList.length)].id, topics: i % 2 ? ["ai-data"] : [] });
  }
  // a combination where the second major's 전공기초 is exempted (same college, same 기초)
  out[1] = { kind: "double", primary: "스마트팜과학과", second: "원예생명공학과", topics: [] };
  return out;
}

function facts(c: Combo, rich: boolean): GuideFacts | null {
  const r = rich ? { terms, interests: interestFacts(c.topics, [c.primary, c.second], topicData) } : undefined;
  if (c.kind === "md") {
    const plan = buildMicrodegreePlan({ primary: c.primary, id: c.second }, credits, data, mds, rules);
    if (!plan.available) return null;
    const md = (plan as MicrodegreePlanOk).microdegree;
    const rr = r && { ...r, interests: interestFacts(c.topics, [c.primary, ...md.depts], topicData) };
    return factsFromMicrodegree(plan as MicrodegreePlanOk, prof, { text: rules.microdegree.definition, page: rules.microdegree.page }, rr);
  }
  const plan = buildCoursePlan({ primary: c.primary, second: c.second, kind: c.kind }, credits, data, rules);
  return plan.available ? factsFromPlan(plan as CoursePlanOk, prof, r) : null;
}

/** How many listed course names the answer mentions: a rough measure of "concrete, not formal". */
function concreteness(text: string, f: GuideFacts): number {
  const names = new Set([...(f.primaryCourses ?? []).flatMap((c) => c.names), ...f.second.courses.flatMap((c) => c.names)]);
  return [...names].filter((n) => n.length >= 2 && text.includes(n)).length;
}

async function run(model: string, version: "v1" | "v2", f: GuideFacts) {
  const llm = createChatKhu({ ...process.env, CHATKHU_MODEL: model })!;
  const prompt = version === "v1" ? v1 : v2;
  try {
    const reply = await llm.chat(prompt.buildMessages(f), { maxTokens: 4000, temperature: 0.3, timeoutMs: 60_000 });
    const checked = version === "v1" ? verifyGuide(reply.text, f) : verifyGuideV2(reply.text, f);
    const shown = checked.ok ? JSON.stringify(checked.guide) : "";
    return {
      ok: checked.ok,
      problems: checked.ok ? [] : checked.problems,
      ms: reply.ms,
      tokens: reply.tokens,
      chars: shown.length,
      courseNames: checked.ok ? concreteness(shown, f) : 0,
      answer: checked.ok ? checked.guide : reply.text.slice(0, 1500),
    };
  } catch (e) {
    return { ok: false, problems: [`call failed: ${e instanceof Error ? e.message : String(e)}`], ms: 0, tokens: undefined, chars: 0, courseNames: 0, answer: null };
  }
}

type Row = Awaited<ReturnType<typeof run>> & { combo: Combo; model: string; version: string };

function summary(rows: Row[], label: (r: Row) => string) {
  const groups = new Map<string, Row[]>();
  for (const r of rows) groups.set(label(r), [...(groups.get(label(r)) ?? []), r]);
  return [...groups].map(([name, rs]) => {
    const ok = rs.filter((r) => r.ok);
    const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
    return {
      name,
      passed: `${ok.length}/${rs.length}`,
      avgMs: avg(rs.filter((r) => r.ms).map((r) => r.ms)),
      avgInputTokens: avg(rs.flatMap((r) => (r.tokens ? [r.tokens.input] : []))),
      avgOutputTokens: avg(rs.flatMap((r) => (r.tokens ? [r.tokens.output] : []))),
      avgChars: avg(ok.map((r) => r.chars)),
      avgCourseNames: Math.round(avg(ok.map((r) => r.courseNames * 10)) / 10) / 1,
      problems: rs.filter((r) => !r.ok).map((r) => `${r.combo.primary}+${r.combo.second}: ${r.problems.slice(0, 2).join("; ")}`),
    };
  });
}

describe.skipIf(MODE !== "models")("model comparison (v2)", () => {
  it("haiku vs sonnet on 5 combinations", async () => {
    const list = combos().filter((_, i) => [0, 1, 29, 30, 36].includes(i));
    const rows: Row[] = [];
    for (const c of list) {
      const f = facts(c, true);
      if (!f) continue;
      for (const model of ["claude-haiku-5-5", "claude-sonnet-5-5"]) {
        rows.push({ ...(await run(model, "v2", f)), combo: c, model, version: "v2" });
        console.log(`${model} ${c.kind} ${c.primary}+${c.second}: ${rows.at(-1)!.ok ? "OK" : rows.at(-1)!.problems.join("; ")}`);
        await pause(1500);
      }
    }
    const result = { date: "2026-10-29", prompt: v2.VERSION, summary: summary(rows, (r) => r.model), rows };
    writeFileSync("docs/experiments/2026-10-29-combo-guide-v2-models.json", JSON.stringify(result, null, 1) + "\n");
    console.log(JSON.stringify(result.summary, null, 1));
  });
});

describe.skipIf(MODE !== "versions")("v1 vs v2 (40 combinations)", () => {
  it("runs both prompts on the same combinations", async () => {
    const model = process.env.EVAL_MODEL ?? "claude-haiku-5-5";
    const rows: Row[] = [];
    for (const c of combos()) {
      for (const version of ["v1", "v2"] as const) {
        const f = facts(c, version === "v2");
        if (!f) continue;
        rows.push({ ...(await run(model, version, f)), combo: c, model, version });
        console.log(`${version} ${c.kind} ${c.primary}+${c.second}: ${rows.at(-1)!.ok ? "OK" : rows.at(-1)!.problems.join("; ")}`);
        await pause(1500);
      }
    }
    const result = { date: "2026-10-29", model, summary: summary(rows, (r) => r.version), rows };
    writeFileSync("docs/experiments/2026-10-29-combo-guide-v1-v2.json", JSON.stringify(result, null, 1) + "\n");
    console.log(JSON.stringify(result.summary, null, 1));
  });
});
