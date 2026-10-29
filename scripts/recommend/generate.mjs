// Step: 관심 분야 per department, written once with ChatKHU and checked by code.
// Reads data/curated/<year>/dept_profiles.json (book text with pages), asks ChatKHU which
// 관심 분야 each department fits (prompt deptTopics.v1), keeps only answers that pass
// src/lib/recommend/verify.ts, and writes data/curated/<year>/dept_topics.json.
// Majors that share one book section (기계공학부 tracks, 환경학및환경공학과) share one call.
//
// Run (Node 24 loads the .ts files directly; the key stays in .env.local):
//   node --env-file=.env.local scripts/recommend/generate.mjs --only 컴퓨터공학과,체육학과   # try, print only
//   node --env-file=.env.local scripts/recommend/generate.mjs                              # all, write file
//   node --env-file=.env.local scripts/recommend/generate.mjs --todo                       # retry only TODO ones in the file
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createChatKhu } from "../../src/lib/llm/chatkhu.ts";
import { buildMessages, VERSION } from "../../src/lib/llm/prompts/deptTopics.v1.ts";
import { TOPICS } from "../../src/lib/recommend/topics.ts";
import { verifyDeptTopics } from "../../src/lib/recommend/verify.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const YEAR = "2026";
const PROFILES = join(ROOT, "data", "curated", YEAR, "dept_profiles.json");
const OUT = join(ROOT, "data", "curated", YEAR, "dept_topics.json");

const onlyArg = process.argv.find((a, i) => process.argv[i - 1] === "--only");
const only = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim())) : null;
const todoOnly = process.argv.includes("--todo");
const previous = todoOnly ? JSON.parse(readFileSync(OUT, "utf8")) : null;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const llm = createChatKhu();
if (!llm) {
  console.error("CHATKHU_API_KEY / CHATKHU_BASE_URL are missing (.env.local).");
  process.exit(1);
}

const book = JSON.parse(readFileSync(PROFILES, "utf8"));

// one group per distinct book text
const groups = new Map();
for (const [dept, p] of Object.entries(book.profiles)) {
  if (only && !only.has(dept)) continue;
  if (previous && previous.depts[dept]?.status === "verified") continue;
  const key = `${p.section}|${p.page}`;
  if (!groups.has(key)) groups.set(key, { depts: [], profile: p });
  groups.get(key).depts.push(dept);
}

const ids = TOPICS.map((t) => t.id);
const result = {};
let calls = 0;
for (const { depts, profile: p } of groups.values()) {
  const input = { dept: depts.join(", "), page: p.page, intro: p.intro ?? "", purpose: p.purpose ?? "", goals: p.goals ?? "" };
  const source = [input.dept, input.intro, input.purpose, input.goals].join(" ");
  let entry = { page: p.page, status: "TODO", topics: [], problems: ["학과 소개 없음"] };
  if (p.page > 0) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (calls > 0) await pause(1500); // back-to-back calls sometimes came back empty
      calls++;
      try {
        const reply = await llm.chat(buildMessages(input, TOPICS), { maxTokens: 1500, temperature: 0.2, timeoutMs: 40_000 });
        const checked = verifyDeptTopics(reply.text, ids, p.page, source);
        console.log(`${input.dept} #${attempt} ${reply.ms}ms ${checked.ok ? "OK" : "FAIL " + checked.problems.join("; ")}`);
        if (!checked.ok) console.log(`  reply starts: ${JSON.stringify(reply.text.slice(0, 160))}`);
        if (checked.ok) {
          entry = { page: p.page, status: "verified", topics: checked.topics };
          break;
        }
        entry = { page: p.page, status: "TODO", topics: [], problems: checked.problems };
      } catch (e) {
        console.log(`${input.dept} #${attempt} ERROR ${e instanceof Error ? e.message : e}`);
        entry = { page: p.page, status: "TODO", topics: [], problems: ["호출 실패"] };
      }
    }
  }
  for (const d of depts) result[d] = entry;
}

console.log(`calls: ${calls}, verified this run: ${Object.values(result).filter((e) => e.status === "verified").length}/${Object.keys(result).length}`);
if (only) {
  console.log(JSON.stringify(result, null, 1));
} else {
  const out = {
    year: Number(YEAR),
    as_of: book.as_of,
    source_pdf: book.source_pdf,
    prompt: VERSION,
    model: llm.model,
    generated_at: new Date().toISOString().slice(0, 10),
    review: "ChatKHU가 학과 소개를 읽고 고른 분야. 코드 검사(분야 id·쪽 번호·금지 표현)를 통과한 것만 verified, 나머지는 TODO",
    depts: previous ? { ...previous.depts, ...result } : result,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n", "utf8");
  console.log(`wrote ${OUT}`);
}
