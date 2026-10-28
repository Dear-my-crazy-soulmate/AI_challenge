// Credits still to take once the courses a student already took are counted.
// Pure functions over a CoursePlanOk (courses.ts). Rules applied (교육과정 p.115~118):
// - a taken course counts toward the group of the program that lists it, up to the group's credits;
// - 다전공: the same course code counts for both majors;
// - 부전공: a course that is also in the 본전공 does not count for the minor.
import type { CourseGroup, CoursePlanOk, ProgramCourses } from "./courses";

export interface GroupProgress {
  category: CourseGroup["category"];
  need: number | null; // credits the group requires (null = unknown)
  taken: number; // credits of taken courses in the group, capped at `need`
  remaining: number | null;
  courses: string[]; // codes of taken courses counted here
}

export interface ProgramProgress {
  groups: GroupProgress[];
  taken: number;
  remaining: number;
  /** taken courses listed in this program that were not counted (minor overlap with the 본전공) */
  notCounted: string[];
}

export interface TakenProgress {
  primary: ProgramProgress;
  second: ProgramProgress;
  taken: number; // credits that count, both programs together
  remaining: number; // major credits still to take, both programs together
}

function progress(p: ProgramCourses, total: number, taken: ReadonlySet<string>, exclude: ReadonlySet<string>): ProgramProgress {
  const notCounted = new Set<string>();
  const groups = p.groups.map((g): GroupProgress => {
    const hits = g.courses.filter((c) => taken.has(c.code));
    const counted = hits.filter((c) => !exclude.has(c.code));
    hits.filter((c) => exclude.has(c.code)).forEach((c) => notCounted.add(c.code));
    const sum = counted.reduce((s, c) => s + c.credits, 0);
    const got = g.credits === null ? sum : Math.min(sum, g.credits);
    return {
      category: g.category,
      need: g.credits,
      taken: got,
      remaining: g.credits === null ? null : g.credits - got,
      courses: counted.map((c) => c.code),
    };
  });
  const got = groups.reduce((s, g) => s + g.taken, 0);
  // groups without a credit number cannot lower the program total below what the table asks
  return { groups, taken: Math.min(got, total), remaining: Math.max(0, total - got), notCounted: [...notCounted] };
}

export function applyTaken(plan: CoursePlanOk, taken: ReadonlySet<string>): TakenProgress {
  const none = new Set<string>();
  const minorBlocked =
    plan.input.kind === "minor" ? new Set(plan.majorRules.minorOverlap?.courses.map((c) => c.code) ?? []) : none;
  const primary = progress(plan.primary, plan.totals.primaryCredits, taken, none);
  const second = progress(plan.second, plan.totals.secondCredits, taken, minorBlocked);
  return {
    primary,
    second,
    taken: primary.taken + second.taken,
    remaining: primary.remaining + second.remaining,
  };
}
