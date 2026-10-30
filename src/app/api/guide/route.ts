// GET /api/guide?primary=...&kind=double|minor|md&second=...[&topics=ai-data,sports] (second: department, or micro-degree id)
// AI 조합 설명: ChatKHU explains what the chosen combination is good for. Inputs are only names
// picked from our own lists (no free text, nothing personal), so there is nothing to inject.
// topics are 관심 분야 ids from src/lib/recommend/topics.ts; unknown ids are dropped.
// Credits are not part of this: the calculator (/api/plan, /api/microdegree) shows those.
import made from "../../../../data/curated/2026/combo_guides.json";
import { cleanTopics, guideFacts, guideKey } from "@/lib/guide/build";
import { createGuideService } from "@/lib/guide/service";
import type { GuideResult } from "@/lib/guide/types";
import { createChatKhu } from "@/lib/llm/chatkhu";

export const maxDuration = 60; // a v2 answer can take 20s or more the first time

// Answers made ahead of time (scripts/guide/seedGuides.test.ts) are there from the first request,
// even right after a new server instance starts, so the demo combinations never wait or fail.
const service = createGuideService(
  createChatKhu(),
  undefined,
  Date.now,
  (e) => console.log(`[guide] ${e.key} ${e.ok ? "ok" : "fail"}${e.ms ? ` ${e.ms}ms` : ""}${e.problems ? ` ${e.problems.join(" | ")}` : ""}`),
  (made as { guides: Record<string, GuideResult> }).guides,
);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const primary = (params.get("primary") ?? "").trim();
  const kind = (params.get("kind") ?? "").trim();
  const second = (params.get("second") ?? "").trim();
  const topics = cleanTopics(params.get("topics") ?? "");
  const f = guideFacts(primary, kind, second, topics);
  if (typeof f === "string") return Response.json({ error: f }, { status: 400 });

  const visitor = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const result = await service.get(guideKey(kind, primary, second, topics), f, visitor);
  return Response.json(result, {
    headers: {
      // A checked AI answer is the same for everyone: let Vercel's CDN reuse it for a month,
      // so a popular combination costs one ChatKHU call in total. Fallbacks are not cached.
      "Cache-Control": result.source === "ai" ? "public, max-age=3600, s-maxage=2592000, stale-while-revalidate=86400" : "no-store",
    },
  });
}
