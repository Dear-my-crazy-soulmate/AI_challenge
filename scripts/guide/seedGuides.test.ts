// Makes the AI 조합 설명 ahead of time for chosen combinations, so a demo of them never waits or fails
// (calls the real ChatKHU, so it is skipped in `npm test`).
//   SEED=count node --env-file=.env.local node_modules/vitest/vitest.mjs run scripts/guide        # how many, no calls
//   SEED=run   node --env-file=.env.local node_modules/vitest/vitest.mjs run scripts/guide --testTimeout=0
// Same facts and cache key as /api/guide (src/lib/guide/build.ts). Only answers that pass
// verifyGuideV2 are written to data/curated/2026/combo_guides.json; answers already there are kept.
import { readFileSync, writeFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { cleanTopics, credits, guideFacts, guideKey, mds, rules } from "../../src/lib/guide/build";
import { createGuideService } from "../../src/lib/guide/service";
import type { GuideResult } from "../../src/lib/guide/types";
import { createChatKhu } from "../../src/lib/llm/chatkhu";
import { listCreditOptions } from "../../src/lib/rules/credits";
import { prohibitedReason } from "../../src/lib/rules/majorRules";
import { listMicrodegrees } from "../../src/lib/rules/microdegrees";

const MODE = process.env.SEED ?? "";
const FILE = "data/curated/2026/combo_guides.json";
// one 본전공 with 관심 분야 AI·데이터, 경영·경제; change these to pre-make other combinations
const PRIMARY = "컴퓨터공학과";
const TOPICS = cleanTopics("ai-data,business");

function combos() {
  const out: { kind: string; second: string }[] = [];
  for (const o of listCreditOptions(PRIMARY, credits)) {
    if ((o.kind === "double" || o.kind === "minor") && !prohibitedReason(PRIMARY, o.dept, rules)) out.push({ kind: o.kind, second: o.dept });
  }
  for (const m of listMicrodegrees(mds)) out.push({ kind: "md", second: m.id });
  return out.filter((c) => typeof guideFacts(PRIMARY, c.kind, c.second, TOPICS) !== "string");
}

describe.skipIf(MODE === "")("pre-made AI 조합 설명", () => {
  it("covers the chosen combinations", async () => {
    const list = combos();
    const saved = JSON.parse(readFileSync(FILE, "utf8")) as { about: string; guides: Record<string, GuideResult> };
    const todo = list.filter((c) => !saved.guides[guideKey(c.kind, PRIMARY, c.second, TOPICS)]);
    console.log(`${list.length} combinations, ${todo.length} still to make`);
    if (MODE !== "run") return;

    const llm = createChatKhu();
    expect(llm).not.toBeNull();
    const failed: string[] = [];
    for (const [i, c] of todo.entries()) {
      const key = guideKey(c.kind, PRIMARY, c.second, TOPICS);
      const f = guideFacts(PRIMARY, c.kind, c.second, TOPICS);
      if (typeof f === "string") continue;
      // one fresh service per combination: no daily cap here, one retry when the check fails
      let result: GuideResult | null = null;
      for (let attempt = 0; attempt < 2 && result?.source !== "ai"; attempt++) {
        result = await createGuideService(llm, { perDay: 10, perVisitorHour: 10, cacheSize: 10 }).get(key, f, "seed");
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (result?.source === "ai") {
        saved.guides[key] = result;
        writeFileSync(FILE, JSON.stringify(saved, null, 1) + "\n"); // keep progress if stopped
      } else failed.push(`${c.kind} ${c.second}`);
      console.log(`${i + 1}/${todo.length} ${c.kind} ${c.second}: ${result?.source === "ai" ? "OK" : "FAIL"}`);
    }
    console.log(`made ${todo.length - failed.length}, failed ${failed.length}: ${failed.join(", ")}`);
  });
});
