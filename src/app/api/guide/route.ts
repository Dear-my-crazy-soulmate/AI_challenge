// GET /api/guide?primary=...&kind=double|minor|md&second=... (second: department, or micro-degree id)
// AI 조합 설명: ChatKHU explains what the chosen combination is good for. Inputs are only names
// picked from our own lists (no free text, nothing personal), so there is nothing to inject.
// Credits are not part of this: the calculator (/api/plan, /api/microdegree) shows those.
import courses from "../../../../data/curated/2026/courses.json";
import majorRules from "../../../../data/curated/2026/major_rules.json";
import microdegrees from "../../../../data/curated/2026/microdegrees.json";
import profiles from "../../../../data/curated/2026/dept_profiles.json";
import depts from "../../../../data/curated/credits_global.json";
import issues from "../../../../data/curated/credits_global_issues.json";
import { factsFromMicrodegree, factsFromPlan } from "@/lib/guide/facts";
import { createGuideService, PROMPT_VERSION } from "@/lib/guide/service";
import type { GuideFacts, ProfileData } from "@/lib/guide/types";
import { createChatKhu } from "@/lib/llm/chatkhu";
import { buildCoursePlan } from "@/lib/rules/courses";
import type { CourseData } from "@/lib/rules/courses";
import type { CreditData } from "@/lib/rules/credits";
import type { MajorRules } from "@/lib/rules/majorRules";
import { buildMicrodegreePlan } from "@/lib/rules/microdegrees";
import type { MicrodegreeData } from "@/lib/rules/microdegrees";

export const maxDuration = 30;

const credits = { depts, issues } as unknown as CreditData;
const data = courses as unknown as CourseData;
const mds = microdegrees as unknown as MicrodegreeData;
const rules = majorRules as unknown as MajorRules;
const prof = profiles as unknown as ProfileData;

const service = createGuideService(createChatKhu(), undefined, Date.now, (e) =>
  console.log(`[guide] ${e.key} ${e.ok ? "ok" : "fail"}${e.ms ? ` ${e.ms}ms` : ""}${e.problems ? ` ${e.problems.join(" | ")}` : ""}`),
);

function facts(primary: string, kind: string, second: string): GuideFacts | string {
  if (kind === "md") {
    const plan = buildMicrodegreePlan({ primary, id: second }, credits, data, mds, rules);
    if (!plan.available) return plan.message;
    return factsFromMicrodegree(plan, prof, { text: rules.microdegree.definition, page: rules.microdegree.page });
  }
  if (kind !== "double" && kind !== "minor") return "kind는 double, minor, md 중 하나여야 합니다.";
  const plan = buildCoursePlan({ primary, second, kind }, credits, data, rules);
  return plan.available ? factsFromPlan(plan, prof) : plan.message;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const primary = (params.get("primary") ?? "").trim();
  const kind = (params.get("kind") ?? "").trim();
  const second = (params.get("second") ?? "").trim();
  const f = facts(primary, kind, second);
  if (typeof f === "string") return Response.json({ error: f }, { status: 400 });

  const visitor = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const result = await service.get(`${PROMPT_VERSION}|${kind}|${primary}|${second}`, f, visitor);
  return Response.json(result, {
    headers: {
      // A checked AI answer is the same for everyone: let Vercel's CDN reuse it for a month,
      // so a popular combination costs one ChatKHU call in total. Fallbacks are not cached.
      "Cache-Control": result.source === "ai" ? "public, max-age=3600, s-maxage=2592000, stale-while-revalidate=86400" : "no-store",
    },
  });
}
