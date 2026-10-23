// Micro-degrees from the yearly curriculum book (data/curated/<year>/microdegrees.json,
// written by scripts/pipeline/microdegrees.py). Pure functions, never throw.
import { programCourses } from "./courses";
import type { CourseData, ProgramCourses } from "./courses";
import type { CreditData, CreditUnavailable } from "./credits";
import type { MajorRules } from "./majorRules";

export type MicrodegreeStatus = "verified" | "choose" | "check";

export interface MicrodegreeCourse {
  code: string;
  name: string;
  credits: number;
  offered_by: string | null; // first department catalog that lists the code (not always the owner); null = other school / 교양
}

export interface CuratedMicrodegree {
  name: string;
  english: string;
  dept: string;
  page: number;
  required_credits: number | null;
  rule: "all" | "choose" | "unknown";
  courses: MicrodegreeCourse[];
  course_credits: number;
  choice_note: string | null;
  status: MicrodegreeStatus;
  problems: string[];
  notes: string[];
}

export interface MicrodegreeData {
  year: number;
  source_pdf: string;
  as_of: string;
  microdegrees: CuratedMicrodegree[];
}

/** One micro-degree, merged across the departments that print the same one. */
export interface Microdegree extends Omit<CuratedMicrodegree, "dept" | "page"> {
  id: string;
  depts: string[];
  pages: number[];
}

const RANK: Record<MicrodegreeStatus, number> = { verified: 0, choose: 1, check: 2 };

// "중국디지털리터러시(…) - 중국어학과 주관" -> "중국디지털리터러시"
const baseName = (name: string) => name.split(" - ")[0].replace(/\s*\(.*$/, "").trim();
const key = (m: CuratedMicrodegree) =>
  `${baseName(m.name).replace(/\s+/g, "")}|${m.courses
    .map((c) => c.code)
    .sort()
    .join(",")}`;

export function listMicrodegrees(data: MicrodegreeData): Microdegree[] {
  const groups = new Map<string, CuratedMicrodegree[]>();
  for (const m of data.microdegrees) groups.set(key(m), [...(groups.get(key(m)) ?? []), m]);
  return [...groups.values()]
    .map((list) => {
      // Keep the best-checked copy; the others only add departments and pages.
      const best = [...list].sort((a, b) => RANK[a.status] - RANK[b.status] || a.page - b.page)[0];
      return {
        english: best.english,
        required_credits: best.required_credits,
        rule: best.rule,
        courses: best.courses,
        course_credits: best.course_credits,
        choice_note: best.choice_note,
        status: best.status,
        problems: best.problems,
        notes: best.notes,
        name: baseName(best.name),
        id: String(best.page),
        depts: [...new Set(list.map((m) => m.dept))],
        pages: list.map((m) => m.page).sort((a, b) => a - b),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export interface MicrodegreePlanOk {
  available: true;
  input: { primary: string; id: string };
  primary: ProgramCourses; // the primary major stays a single major
  primaryCredits: number;
  microdegree: Microdegree;
  /** Micro-degree courses that are also in the primary major: they count for both (p.423 ③). */
  alsoInPrimary: { code: string; name: string }[];
  rules: { id: string; page: number; text: string }[];
  source: { pdf: string; asOf: string };
}

export type MicrodegreePlanResult = MicrodegreePlanOk | CreditUnavailable;

export function buildMicrodegreePlan(
  input: { primary: string; id: string },
  credits: CreditData,
  courses: CourseData,
  mds: MicrodegreeData,
  rules: MajorRules,
): MicrodegreePlanResult {
  const primary = (input.primary ?? "").trim();
  const id = (input.id ?? "").trim();
  if (!primary || !id) return { available: false, reason: "INVALID_INPUT", message: "본전공과 마이크로디그리를 모두 고르세요." };
  const dept = credits.depts.find((d) => d.dept === primary);
  if (!dept) return { available: false, reason: "NO_DEPT_DATA", message: `${primary}: 준비된 학점 데이터가 없습니다.` };
  const single = dept.programs.single;
  if (!single.available) {
    return { available: false, reason: "NOT_OFFERED", message: `${primary}은(는) 본전공(단일전공)으로 선택할 수 없습니다.` };
  }
  const md = listMicrodegrees(mds).find((m) => m.id === id);
  if (!md) return { available: false, reason: "NO_DEPT_DATA", message: "선택한 마이크로디그리 정보를 찾을 수 없습니다." };

  const program = programCourses(primary, "single", courses);
  const inPrimary = new Set(program.groups.flatMap((g) => g.courses.map((c) => c.code)));
  return {
    available: true,
    input: { primary, id },
    primary: program,
    primaryCredits: single.계,
    microdegree: md,
    alsoInPrimary: md.courses.filter((c) => inPrimary.has(c.code)).map(({ code, name }) => ({ code, name })),
    rules: rules.microdegree.rules,
    source: { pdf: mds.source_pdf.split("/").pop() ?? mds.source_pdf, asOf: mds.as_of },
  };
}
