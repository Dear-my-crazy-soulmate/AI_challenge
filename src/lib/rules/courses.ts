// Courses + credits for "본전공 + 다전공/부전공" from the yearly curriculum book
// (data/curated/<year>/courses.json, written by scripts/pipeline/programs.py)
// and the credit overview (credits.ts). Pure functions, never throw.
import { buildCreditPlan } from "./credits";
import type { CreditData, CreditKind, CreditUnavailable, CreditWarning, ProgramKind } from "./credits";
import { applyMajorRules, prohibitedReason } from "./majorRules";
import type { AppliedMajorRules, MajorRules } from "./majorRules";

// "전공기초·전공필수": one group when the credit table merges both (전자공학과·반도체공학과 다전공).
export type CourseCategory = "전공기초" | "전공필수" | "전공선택" | "전공기초·전공필수";
export type GroupRule = "all" | "choose" | "unknown";
export type ProgramStatus = "verified" | "choose" | "check";

export interface CatalogCourse {
  code: string;
  name: string;
  credits: number;
  category: CourseCategory;
  page: number;
}

export interface CuratedGroup {
  category: CourseCategory;
  credits: number | null;
  rule: GroupRule;
  courses: string[]; // course codes
  course_credits: number;
}

export interface CuratedProgram {
  status: ProgramStatus;
  source: "catalog" | "program_table";
  page: number | null;
  groups: CuratedGroup[];
  rules: { page: number; text: string }[];
  problems: string[];
}

export interface CuratedCourseDept {
  section: string;
  college: string | null;
  catalog_pages: number[];
  catalog: CatalogCourse[];
  programs: Partial<Record<ProgramKind, CuratedProgram>>;
}

export interface CourseData {
  year: number;
  source_pdf: string;
  as_of: string;
  depts: Record<string, CuratedCourseDept>;
}

export interface CourseGroup {
  category: CourseCategory;
  credits: number | null;
  rule: GroupRule;
  courses: CatalogCourse[];
  courseCredits: number;
}

export interface ProgramCourses {
  dept: string;
  kind: ProgramKind;
  status: ProgramStatus | "no_courses";
  groups: CourseGroup[];
  rules: { page: number; text: string }[];
  problems: string[];
  pages: number[]; // book pages to check: course table + rule pages
}

export interface CoursePlanOk {
  available: true;
  input: { primary: string; second: string; kind: CreditKind };
  totals: { primaryCredits: number; secondCredits: number; total: number; savedCredits: number };
  singleCredits: number;
  primary: ProgramCourses;
  second: ProgramCourses;
  shared: { code: string; name: string }[]; // 기초/필수 courses listed in both programs
  majorRules: AppliedMajorRules; // school-wide double/minor rules applied to this combination
  warnings: CreditWarning[];
  source: { pdf: string; asOf: string };
}

export type CoursePlanResult = CoursePlanOk | CreditUnavailable;

export function programCourses(dept: string, kind: ProgramKind, data: CourseData): ProgramCourses {
  const d = data.depts[dept];
  const p = d?.programs[kind];
  if (!d || !p) {
    return {
      dept,
      kind,
      status: "no_courses",
      groups: [],
      rules: [],
      problems: [`${dept}: ${data.year}학년도 교육과정에서 과목 정보를 만들지 못했습니다.`],
      pages: [],
    };
  }
  const byCode = new Map(d.catalog.map((c) => [c.code, c]));
  const groups = p.groups.map((g) => ({
    category: g.category,
    credits: g.credits,
    rule: g.rule,
    // codes come from the same catalog; a missing one is a data bug, so it is dropped loudly below
    courses: g.courses.map((code) => byCode.get(code)).filter((c): c is CatalogCourse => c !== undefined),
    courseCredits: g.course_credits,
  }));
  const lost = p.groups.flatMap((g) => g.courses).filter((code) => !byCode.has(code));
  const pages = [...new Set([...(p.page ? [p.page] : []), ...d.catalog_pages, ...p.rules.map((r) => r.page)])].sort(
    (a, b) => a - b,
  );
  return {
    dept,
    kind,
    status: p.status,
    groups,
    rules: p.rules,
    problems: lost.length ? [...p.problems, `missing catalog rows: ${lost.join(", ")}`] : p.problems,
    pages,
  };
}

export function buildCoursePlan(
  input: { primary: string; second: string; kind: CreditKind },
  credits: CreditData,
  courses: CourseData,
  rules: MajorRules,
): CoursePlanResult {
  const plan = buildCreditPlan(input, credits);
  if (!plan.available) return plan;
  const banned = prohibitedReason(plan.input.primary, plan.input.second, rules);
  if (banned) return { available: false, reason: "PROHIBITED", message: banned };

  const collegeOf = (dept: string) => credits.depts.find((d) => d.dept === dept)?.college ?? "";
  const primary = programCourses(plan.primary.dept, plan.primary.kind, courses);
  const second = programCourses(plan.second.dept, plan.second.kind, courses);
  // Only 기초/필수 courses: elective pools of related majors overlap by design.
  const core = (p: ProgramCourses) => p.groups.filter((g) => g.category !== "전공선택").flatMap((g) => g.courses);
  const secondCodes = new Set(core(second).map((c) => c.code));
  const seen = new Set<string>();
  const shared = core(primary)
    .filter((c) => secondCodes.has(c.code) && !seen.has(c.code) && seen.add(c.code))
    .map((c) => ({ code: c.code, name: c.name }));

  return {
    available: true,
    input: plan.input,
    totals: plan.totals,
    singleCredits: plan.singleCredits,
    primary,
    second,
    shared,
    majorRules: applyMajorRules(
      {
        kind: plan.input.kind,
        primaryCollege: collegeOf(plan.primary.dept),
        secondCollege: collegeOf(plan.second.dept),
        total: plan.totals.total,
        depts: [plan.primary.dept, plan.second.dept],
      },
      primary,
      second,
      rules,
    ),
    warnings: plan.warnings,
    source: { pdf: courses.source_pdf.split("/").pop() ?? courses.source_pdf, asOf: courses.as_of },
  };
}
