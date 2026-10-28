// Builds what ChatKHU may look at for one combination: the book's own department texts
// and course names from the calculator's result. Pure; never includes credit numbers.
import type { CoursePlanOk, ProgramCourses } from "../rules/courses";
import type { MicrodegreePlanOk } from "../rules/microdegrees";
import type { CourseNames, DeptText, GuideFacts, GuideSource, ProfileData } from "./types";

const MAX_NAMES = 10; // a long 전공선택 pool only needs a taste

export function deptText(dept: string, data: ProfileData): DeptText {
  const p = data.profiles[dept];
  return p
    ? { dept, page: p.page, intro: p.intro, purpose: p.purpose, goals: p.goals }
    : { dept, page: 0, intro: "", purpose: "", goals: "" };
}

function courseNames(p: ProgramCourses): CourseNames[] {
  return p.groups
    .filter((g) => g.courses.length > 0)
    .map((g) => ({
      category: g.category,
      names: g.courses.slice(0, MAX_NAMES).map((c) => c.name),
      partial: g.courses.length > MAX_NAMES,
    }));
}

/** 다전공 / 부전공 */
export function factsFromPlan(plan: CoursePlanOk, data: ProfileData): GuideFacts {
  return {
    kind: plan.input.kind,
    primary: deptText(plan.primary.dept, data),
    second: { name: plan.second.dept, depts: [deptText(plan.second.dept, data)], courses: courseNames(plan.second) },
    shared: plan.shared.map((c) => c.name),
    mdDefinition: null,
  };
}

/** 마이크로디그리 */
export function factsFromMicrodegree(
  plan: MicrodegreePlanOk,
  data: ProfileData,
  definition: { text: string; page: number },
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
  };
}

/** Department texts the explanation may cite, without duplicates or missing pages. */
export function guideSources(f: GuideFacts): GuideSource[] {
  const seen = new Set<string>();
  return [f.primary, ...f.second.depts]
    .filter((d) => d.page > 0 && !seen.has(d.dept) && seen.add(d.dept))
    .map((d) => ({ dept: d.dept, page: d.page }));
}
