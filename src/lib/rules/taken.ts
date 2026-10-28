// Credits and courses still to take once the courses a student already took are counted.
// Pure functions over a CoursePlanOk (courses.ts). Rules applied (교육과정 p.115~118):
// - a taken course counts toward the group of the program that lists it, up to the group's credits;
// - 다전공: the same course code counts for both majors;
// - 부전공: a course that is also in the 본전공 does not count for the minor;
// - the school-wide rules of majorRules.ts, so nothing taken gives the screen's 최소 학점:
//   an exempted 전공기초 (same college and 기초) needs nothing, and a course both majors require
//   is taken once, so its credits count once in the total still to take.
// Course counts: an "all" group needs every course not taken yet (a 0학점 졸업논문 too); a "choose"
// group needs the fewest untaken courses whose credits cover what is left (largest first).
// 마이크로디그리 (applyTakenMd): the 본전공 stays a single major; a micro-degree course that is also
// in the 본전공 counts for both (p.423 ③), so if both require it, it is taken once.
import type { CoursePlanOk, GroupRule } from "./courses";
import type { MicrodegreePlanOk } from "./microdegrees";

interface CourseLike {
  code: string;
  credits: number;
}
/** A course group of a major (courses.ts) or a micro-degree's single list. */
interface GroupInput {
  category: string;
  credits: number | null;
  rule: GroupRule;
  courses: CourseLike[];
}

export interface GroupProgress {
  category: string; // 전공기초 / 전공필수 / 전공선택 / 마이크로디그리
  need: number | null; // credits the group requires (null = unknown)
  taken: number; // credits of taken courses in the group, capped at `need`
  remaining: number | null;
  courses: string[]; // codes of taken courses counted here
  todo: string[]; // "all" group: codes still to take; other groups: none (any of the pool will do)
  remainingCourses: number | null; // courses still to take here (null = cannot tell)
  exempt: boolean; // 전공기초 면제: nothing left to take here
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
  remaining: number; // major credits still to take, both programs together, a shared course once
  /** credits of untaken courses both majors require, counted once in `remaining` instead of twice */
  sharedOnce: number;
  /** 전공기초 credits of the second major that the exemption takes off (0 when none) */
  exempted: number;
  /** courses still to take, both programs; a required course listed in both counts once */
  remainingCourses: { total: number; required: number; elective: number; unknown: boolean };
}

/** Fewest courses from `pool` whose credits reach `credits` (all of the pool if it cannot). */
function fewestCourses(pool: CourseLike[], credits: number): number {
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

function progress(
  p: { groups: GroupInput[] },
  total: number,
  taken: ReadonlySet<string>,
  exclude: ReadonlySet<string>,
  exemptBasic = false,
): ProgramProgress {
  const notCounted = new Set<string>();
  const groups = p.groups.map((g): GroupProgress => {
    const hits = g.courses.filter((c) => taken.has(c.code));
    const counted = hits.filter((c) => !exclude.has(c.code));
    hits.filter((c) => exclude.has(c.code)).forEach((c) => notCounted.add(c.code));
    const sum = counted.reduce((s, c) => s + c.credits, 0);
    const got = g.credits === null ? sum : Math.min(sum, g.credits);
    const exempt = exemptBasic && g.category === "전공기초";
    const base = { category: g.category, need: g.credits, taken: got, courses: counted.map((c) => c.code) };
    if (exempt) return { ...base, remaining: 0, todo: [], remainingCourses: 0, exempt };
    const remaining = g.credits === null ? null : g.credits - got;
    const untaken = g.courses.filter((c) => !taken.has(c.code));
    const todo = g.rule === "all" ? untaken.map((c) => c.code) : [];
    const remainingCourses =
      g.rule === "all"
        ? todo.length
        : g.rule === "choose" && remaining !== null
          ? fewestCourses(untaken.filter((c) => !exclude.has(c.code)), remaining)
          : null;
    return { ...base, remaining, todo, remainingCourses, exempt };
  });
  const got = groups.reduce((s, g) => s + g.taken, 0);
  // an exempted group needs nothing more than what was already taken in it
  const waived = groups.reduce((s, g) => s + (g.exempt ? (g.need ?? 0) - g.taken : 0), 0);
  const remaining = Math.max(0, total - got - waived);
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
  const { basicExemption, overlap } = plan.majorRules;
  const primary = progress(plan.primary, plan.totals.primaryCredits, taken, none);
  const second = progress(plan.second, plan.totals.secondCredits, taken, minorBlocked, basicExemption !== null);
  const exempted = second.groups.reduce((s, g) => s + (g.exempt ? (g.need ?? 0) - g.taken : 0), 0);
  // still in both programs' remaining; taking it once covers both
  const sharedOnce = (overlap?.courses ?? []).filter((c) => !taken.has(c.code)).reduce((s, c) => s + c.credits, 0);
  return combine(primary, second, sharedOnce, exempted);
}

/** 본전공 (single major) + one micro-degree. */
export function applyTakenMd(plan: MicrodegreePlanOk, taken: ReadonlySet<string>): TakenProgress {
  const none = new Set<string>();
  const md = plan.microdegree;
  const primary = progress(plan.primary, plan.primaryCredits, taken, none);
  // credits unknown (a "학과 확인 필요" micro-degree): what its listed courses add up to, flagged as unknown
  const list: GroupInput = { category: "마이크로디그리", credits: md.required_credits, rule: md.rule, courses: md.courses };
  const second = progress({ groups: [list] }, md.required_credits ?? md.course_credits, taken, none);
  // a course both require is in both remainders; it is taken once (p.423 ③: it counts for both)
  const primaryTodo = new Set(primary.groups.flatMap((g) => g.todo));
  const secondTodo = new Set(second.groups.flatMap((g) => g.todo));
  const sharedOnce = md.courses
    .filter((c) => primaryTodo.has(c.code) && secondTodo.has(c.code))
    .reduce((s, c) => s + c.credits, 0);
  return combine(primary, second, sharedOnce, 0);
}

function combine(primary: ProgramProgress, second: ProgramProgress, sharedOnce: number, exempted: number): TakenProgress {
  const required = new Set([...primary.groups, ...second.groups].flatMap((g) => g.todo)).size;
  const elective = [...primary.groups, ...second.groups]
    .filter((g) => g.todo.length === 0)
    .reduce((s, g) => s + (g.remainingCourses ?? 0), 0);
  return {
    primary,
    second,
    taken: primary.taken + second.taken,
    remaining: Math.max(0, primary.remaining + second.remaining - sharedOnce),
    sharedOnce,
    exempted,
    remainingCourses: {
      total: required + elective,
      required,
      elective,
      unknown: primary.coursesUnknown || second.coursesUnknown,
    },
  };
}
