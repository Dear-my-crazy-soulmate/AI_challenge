// Credits and courses still to take once the courses a student already took are counted.
// Pure functions over a CoursePlanOk (courses.ts). Rules applied (교육과정 p.115~118):
// - a taken course counts toward the group of the program that lists it, up to the group's credits;
// - 다전공: the same course code counts for both majors;
// - 부전공: a course that is also in the 본전공 does not count for the minor.
// Course counts: an "all" group needs every course not taken yet (a 0학점 졸업논문 too); a "choose"
// group needs the fewest untaken courses whose credits cover what is left (largest first).
import type { CatalogCourse, CourseGroup, CoursePlanOk, ProgramCourses } from "./courses";

export interface GroupProgress {
  category: CourseGroup["category"];
  need: number | null; // credits the group requires (null = unknown)
  taken: number; // credits of taken courses in the group, capped at `need`
  remaining: number | null;
  courses: string[]; // codes of taken courses counted here
  todo: string[]; // "all" group: codes still to take; other groups: none (any of the pool will do)
  remainingCourses: number | null; // courses still to take here (null = cannot tell)
}

export interface ProgramProgress {
  groups: GroupProgress[];
  taken: number;
  remaining: number;
  /** taken courses listed in this program that were not counted (minor overlap with the 본전공) */
  notCounted: string[];
  remainingCourses: number; // over the groups whose count is known
  coursesUnknown: boolean; // some group (or credits outside the groups) could not be counted
}

export interface TakenProgress {
  primary: ProgramProgress;
  second: ProgramProgress;
  taken: number; // credits that count, both programs together
  remaining: number; // major credits still to take, both programs together
  /** courses still to take, both programs; a required course listed in both counts once */
  remainingCourses: { total: number; required: number; elective: number; unknown: boolean };
}

/** Fewest courses from `pool` whose credits reach `credits` (all of the pool if it cannot). */
function fewestCourses(pool: CatalogCourse[], credits: number): number {
  if (credits <= 0) return 0;
  let sum = 0;
  let n = 0;
  for (const c of [...pool].sort((a, b) => b.credits - a.credits)) {
    if (sum >= credits) break;
    if (c.credits <= 0) continue;
    sum += c.credits;
    n += 1;
  }
  return n;
}

function progress(p: ProgramCourses, total: number, taken: ReadonlySet<string>, exclude: ReadonlySet<string>): ProgramProgress {
  const notCounted = new Set<string>();
  const groups = p.groups.map((g): GroupProgress => {
    const hits = g.courses.filter((c) => taken.has(c.code));
    const counted = hits.filter((c) => !exclude.has(c.code));
    hits.filter((c) => exclude.has(c.code)).forEach((c) => notCounted.add(c.code));
    const sum = counted.reduce((s, c) => s + c.credits, 0);
    const got = g.credits === null ? sum : Math.min(sum, g.credits);
    const remaining = g.credits === null ? null : g.credits - got;
    const untaken = g.courses.filter((c) => !taken.has(c.code));
    const todo = g.rule === "all" ? untaken.map((c) => c.code) : [];
    const remainingCourses =
      g.rule === "all"
        ? todo.length
        : g.rule === "choose" && remaining !== null
          ? fewestCourses(untaken.filter((c) => !exclude.has(c.code)), remaining)
          : null;
    return { category: g.category, need: g.credits, taken: got, remaining, courses: counted.map((c) => c.code), todo, remainingCourses };
  });
  const got = groups.reduce((s, g) => s + g.taken, 0);
  const remaining = Math.max(0, total - got);
  // credits the table asks for beyond what the groups cover cannot be turned into a course count
  const groupRemaining = groups.reduce((s, g) => s + (g.remaining ?? 0), 0);
  return {
    groups,
    taken: Math.min(got, total), // groups without a credit number cannot lower the total below the table
    remaining,
    notCounted: [...notCounted],
    remainingCourses: groups.reduce((s, g) => s + (g.remainingCourses ?? 0), 0),
    coursesUnknown: groups.some((g) => g.remainingCourses === null) || remaining > groupRemaining,
  };
}

export function applyTaken(plan: CoursePlanOk, taken: ReadonlySet<string>): TakenProgress {
  const none = new Set<string>();
  const minorBlocked =
    plan.input.kind === "minor" ? new Set(plan.majorRules.minorOverlap?.courses.map((c) => c.code) ?? []) : none;
  const primary = progress(plan.primary, plan.totals.primaryCredits, taken, none);
  const second = progress(plan.second, plan.totals.secondCredits, taken, minorBlocked);
  const required = new Set([...primary.groups, ...second.groups].flatMap((g) => g.todo)).size;
  const elective = [...primary.groups, ...second.groups]
    .filter((g) => g.todo.length === 0)
    .reduce((s, g) => s + (g.remainingCourses ?? 0), 0);
  return {
    primary,
    second,
    taken: primary.taken + second.taken,
    remaining: primary.remaining + second.remaining,
    remainingCourses: {
      total: required + elective,
      required,
      elective,
      unknown: primary.coursesUnknown || second.coursesUnknown,
    },
  };
}
