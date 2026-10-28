// GET /api/catalog?dept=...         every course of one department, grouped by 이수구분 (내 이수 과목)
// GET /api/catalog?codes=A,B,...    names and credits for saved course codes
// The curated course data is large, so it stays on the server and only what is asked goes out.
import courses from "../../../../data/curated/2026/courses.json";
import { deptCatalog, lookupCourses } from "@/lib/courseSearch";
import type { CourseData } from "@/lib/rules/courses";

const data = courses as unknown as CourseData;
const MAX_CODES = 300;

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const codes = p.get("codes");
  if (codes !== null) {
    const list = [...new Set(codes.split(",").map((c) => c.trim()).filter(Boolean))].slice(0, MAX_CODES);
    return Response.json({ asOf: data.as_of, ...lookupCourses(data, list) });
  }
  const dept = (p.get("dept") ?? "").trim();
  if (!data.depts[dept]) return Response.json({ error: "과목 정보가 없는 학과예요." }, { status: 404 });
  return Response.json({ asOf: data.as_of, dept, groups: deptCatalog(data, dept) });
}
