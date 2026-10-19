// GET /api/plan?primary=...&second=...&kind=double|minor
// Credits and courses for a major combination. The curated course data is
// large, so it stays on the server and only the result goes to the browser.
import courses from "../../../../data/curated/2026/courses.json";
import depts from "../../../../data/curated/credits_global.json";
import issues from "../../../../data/curated/credits_global_issues.json";
import { buildCoursePlan } from "@/lib/rules/courses";
import type { CourseData } from "@/lib/rules/courses";
import type { CreditData, CreditKind } from "@/lib/rules/credits";

const credits = { depts, issues } as unknown as CreditData;
const data = courses as unknown as CourseData;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = buildCoursePlan(
    {
      primary: params.get("primary") ?? "",
      second: params.get("second") ?? "",
      kind: (params.get("kind") ?? "") as CreditKind,
    },
    credits,
    data,
  );
  return Response.json(result);
}
