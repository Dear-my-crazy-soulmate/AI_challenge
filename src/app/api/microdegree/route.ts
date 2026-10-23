// GET /api/microdegree?primary=...&id=...
// The primary major (single) plus one micro-degree's courses and rules.
import courses from "../../../../data/curated/2026/courses.json";
import majorRules from "../../../../data/curated/2026/major_rules.json";
import microdegrees from "../../../../data/curated/2026/microdegrees.json";
import depts from "../../../../data/curated/credits_global.json";
import issues from "../../../../data/curated/credits_global_issues.json";
import type { CourseData } from "@/lib/rules/courses";
import type { CreditData } from "@/lib/rules/credits";
import type { MajorRules } from "@/lib/rules/majorRules";
import { buildMicrodegreePlan } from "@/lib/rules/microdegrees";
import type { MicrodegreeData } from "@/lib/rules/microdegrees";

const credits = { depts, issues } as unknown as CreditData;
const data = courses as unknown as CourseData;
const mds = microdegrees as unknown as MicrodegreeData;
const rules = majorRules as unknown as MajorRules;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = buildMicrodegreePlan(
    { primary: params.get("primary") ?? "", id: params.get("id") ?? "" },
    credits,
    data,
    mds,
    rules,
  );
  return Response.json(result);
}
