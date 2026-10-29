// Builds what ChatKHU may look at for one combination: the book's own department texts
// and course names from the calculator's result. Pure; never includes credit numbers.
import type { CoursePlanOk, ProgramCourses } from "../rules/courses";
import type { MicrodegreePlanOk } from "../rules/microdegrees";
import type { DeptTopicsData } from "../recommend/rank";
import { topicLabel } from "../recommend/topics";
import type { CourseNames, DeptText, GuideFacts, GuideSource, InterestFact, ProfileData } from "./types";

const MAX_NAMES = 10; // v1: a long 전공선택 pool only needs a taste
const MAX_NAMES_FULL = 40; // v2: the whole list, capped so a huge 전공선택 pool stays affordable

/** Extra inputs for comboGuide.v2. */
export interface RichInputs {
  terms: Map<string, "1학기" | "2학기">; // course code -> 2026 개설 학기 (data/extracted/2026/syllabus_courses.json)
  interests: InterestFact[];
}

/** course code -> 2026 개설 학기 from the 수강신청 list ("10" = 1학기, "20" = 2학기; one row per code, 1학기 first). */
export function termsFromSyllabus(rows: { subjt_cd: string; term: string }[]): Map<string, "1학기" | "2학기"> {
  const out = new Map<string, "1학기" | "2학기">();
  for (const r of rows) if (r.term === "10" || r.term === "20") out.set(r.subjt_cd, r.term === "10" ? "1학기" : "2학기");
  return out;
}

/** The student's 관심 분야 with what dept_topics.json says about them for these departments. */
export function interestFacts(topicIds: string[], depts: string[], data: DeptTopicsData): InterestFact[] {
  return topicIds.map((id) => ({
    label: topicLabel(id),
    reasons: depts.flatMap((dept) => {
      const e = data.depts[dept];
      const t = e?.status === "verified" ? e.topics.find((x) => x.id === id) : undefined;
      return t ? [{ dept, text: t.reason, page: t.page }] : [];
    }),
  }));
}

export function deptText(dept: string, data: ProfileData): DeptText {
  const p = data.profiles[dept];
  return p
    ? { dept, page: p.page, intro: p.intro, purpose: p.purpose, goals: p.goals }
    : { dept, page: 0, intro: "", purpose: "", goals: "" };
}

function courseNames(p: ProgramCourses, rich?: RichInputs): CourseNames[] {
  const max = rich ? MAX_NAMES_FULL : MAX_NAMES;
  return p.groups
    .filter((g) => g.courses.length > 0)
    .map((g) => {
      const shown = g.courses.slice(0, max);
      const terms = rich
        ? Object.fromEntries(shown.flatMap((c) => (rich.terms.has(c.code) ? [[c.name, rich.terms.get(c.code)!]] : [])))
        : undefined;
      return { category: g.category, names: shown.map((c) => c.name), partial: g.courses.length > max, ...(terms ? { terms } : {}) };
    });
}

/** 다전공 / 부전공. With `rich` (comboGuide.v2) both course lists are given in full, with 개설 학기 and 관심 분야. */
export function factsFromPlan(plan: CoursePlanOk, data: ProfileData, rich?: RichInputs): GuideFacts {
  return {
    kind: plan.input.kind,
    primary: deptText(plan.primary.dept, data),
    second: { name: plan.second.dept, depts: [deptText(plan.second.dept, data)], courses: courseNames(plan.second, rich) },
    shared: plan.shared.map((c) => c.name),
    mdDefinition: null,
    ...(rich ? { primaryCourses: courseNames(plan.primary, rich), interests: rich.interests } : {}),
  };
}

/** 마이크로디그리 */
export function factsFromMicrodegree(
  plan: MicrodegreePlanOk,
  data: ProfileData,
  definition: { text: string; page: number },
  rich?: RichInputs,
): GuideFacts {
  const md = plan.microdegree;
  return {
    kind: "md",
    primary: deptText(plan.primary.dept, data),
    second: {
      name: md.name,
      depts: md.depts.map((d) => deptText(d, data)),
      courses: [{ category: "마이크로디그리", names: md.courses.map((c) => c.name), partial: false }],
    },
    shared: plan.alsoInPrimary.map((c) => c.name),
    mdDefinition: definition,
    ...(rich ? { primaryCourses: courseNames(plan.primary, rich), interests: rich.interests } : {}),
  };
}

/** Department texts the explanation may cite, without duplicates or missing pages. */
export function guideSources(f: GuideFacts): GuideSource[] {
  const seen = new Set<string>();
  return [f.primary, ...f.second.depts]
    .filter((d) => d.page > 0 && !seen.has(d.dept) && seen.add(d.dept))
    .map((d) => ({ dept: d.dept, page: d.page }));
}
