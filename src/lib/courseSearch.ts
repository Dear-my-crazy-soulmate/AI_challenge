// Course lookup for the timetable: from the curated curriculum book (data/curated/<year>/courses.json).
// Pure functions. Which courses exist and their credits come from the book; nothing is made up here.
import type { CourseData } from "./rules/courses";

/** p = 본전공 only, s = 희망 전공 only, both = counted in both majors, etc = anything else. */
export type CourseTag = "p" | "s" | "both" | "etc";

export interface CourseRow {
  code: string;
  name: string;
  credits: number;
  tag: CourseTag;
  label: string; // e.g. "본전공 전공필수"
}

export interface CourseSection {
  label: string;
  rows: CourseRow[];
}

export interface CourseQuery {
  primary: string; // may be "" when nobody is signed in
  second: string; // 희망 전공 of the saved goal, "" for none or a micro-degree
  secondWord: string; // how the second one is called in labels: "다전공" or "부전공"
  query: string;
}

const SECTION_LIMIT = 30;
const HIT_LIMIT = 40;
const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();

/** Code -> category for one department (the book lists some codes more than once). */
function categories(data: CourseData, dept: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of data.depts[dept]?.catalog ?? []) if (!m.has(c.code)) m.set(c.code, c.category);
  return m;
}

export function searchCourses(data: CourseData, q: CourseQuery): CourseSection[] {
  const p = categories(data, q.primary);
  const s = categories(data, q.second);
  const double = q.secondWord === "다전공";

  const rowOf = (c: { code: string; name: string; credits: number }): CourseRow => {
    const inP = p.has(c.code);
    const inS = s.has(c.code);
    // Same code in both: a double major counts it twice; a minor does not count it again (p.118).
    const tag: CourseTag = inP && inS && double ? "both" : inP ? "p" : inS ? "s" : "etc";
    const label =
      tag === "both" || tag === "p"
        ? `본전공 ${p.get(c.code)}`
        : tag === "s"
          ? `${q.secondWord} ${s.get(c.code)}`
          : "기타";
    return { code: c.code, name: c.name, credits: c.credits, tag, label };
  };

  const listOf = (dept: string) => {
    const seen = new Set<string>();
    return (data.depts[dept]?.catalog ?? []).filter((c) => !seen.has(c.code) && !!seen.add(c.code)).map(rowOf);
  };

  const text = norm(q.query);
  if (text) {
    const seen = new Set<string>();
    const hits: CourseRow[] = [];
    for (const dept of Object.values(data.depts)) {
      for (const c of dept.catalog) {
        if (seen.has(c.code) || !(norm(c.name).includes(text) || norm(c.code).includes(text))) continue;
        seen.add(c.code);
        hits.push(rowOf(c));
      }
    }
    return [{ label: `검색 결과 ${Math.min(hits.length, HIT_LIMIT)}`, rows: hits.slice(0, HIT_LIMIT) }].filter((x) => x.rows.length);
  }

  const out: CourseSection[] = [];
  if (q.primary) out.push({ label: `내 본전공 · ${q.primary}`, rows: listOf(q.primary).slice(0, SECTION_LIMIT) });
  if (q.second) out.push({ label: `${q.secondWord} · ${q.second}`, rows: listOf(q.second).slice(0, SECTION_LIMIT) });
  return out.filter((x) => x.rows.length);
}
