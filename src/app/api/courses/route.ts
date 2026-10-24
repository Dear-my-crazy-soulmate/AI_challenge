// GET /api/courses?primary=...&second=...&mode=double|minor|microdegree&q=...
// Course lists for the timetable's "add a course" sheet. The curated course data is large, so it
// stays on the server and only the matching rows go to the browser.
import courses from "../../../../data/curated/2026/courses.json";
import { searchCourses } from "@/lib/courseSearch";
import type { CourseData } from "@/lib/rules/courses";

const data = courses as unknown as CourseData;

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const mode = p.get("mode");
  const sections = searchCourses(data, {
    primary: p.get("primary") ?? "",
    // a micro-degree has no department course list, so it is not used for labels
    second: mode === "double" || mode === "minor" ? (p.get("second") ?? "") : "",
    secondWord: mode === "minor" ? "부전공" : "다전공",
    query: (p.get("q") ?? "").slice(0, 40),
  });
  return Response.json({ asOf: data.as_of, sections });
}
