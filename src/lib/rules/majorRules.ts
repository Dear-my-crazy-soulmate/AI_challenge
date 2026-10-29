// School-wide rules for double majors and minors (book p.115-118), stored in
// data/curated/<year>/major_rules.json with page and evidence. Pure functions.
import type { CreditKind } from "./credits";

export interface RuleSource {
  id: string;
  page: number;
  evidence: string;
}

export interface MajorRules {
  year: number;
  as_of: string;
  prohibited_double: (RuleSource & { depts: string[]; note?: string })[];
  same_unit_one_major: (RuleSource & { depts: string[] })[];
  tracks: TrackGroup[];
  basic_exemption: RuleSource;
  double_overlap: RuleSource & { same_code_only: { page: number; evidence: string }; limit_note: string };
  minor_overlap: RuleSource;
  notices: { id: string; kinds: CreditKind[]; page: number; text: string }[];
  microdegree: { page: number; definition: string; rules: { id: string; page: number; text: string }[] };
}

/** A 학부/학과 whose majors are tracks of one unit (기계공학부, 환경학및환경공학과). */
export interface TrackGroup extends RuleSource {
  school: string;
  depts: string[];
  choose: string; // when and how a track is chosen
  choose_source: string;
}

export function trackOf(dept: string, rules: MajorRules): TrackGroup | null {
  return rules.tracks.find((t) => t.depts.includes(dept)) ?? null;
}

// "환경학및환경공학과 (환경학)" -> "환경학"
const trackName = (dept: string) => dept.match(/\(([^)]+)\)$/)?.[1] ?? dept;

/** How the tracks work, once for each 학부 with a track in the combination. */
export function trackNotices(depts: string[], rules: MajorRules): { id: string; page: number; text: string }[] {
  const seen = new Set<string>();
  return depts.flatMap((dept) => {
    const t = trackOf(dept, rules);
    if (!t || seen.has(t.id)) return [];
    seen.add(t.id);
    return [{ id: t.id, page: t.page, text: `${t.school}는 ${t.depts.length}개 트랙(${t.depts.map(trackName).join("·")})으로 운영해요. ${t.choose}` }];
  });
}

/** Why this combination is not allowed, or null. A minor is only possible
 * where a double major is (p.118), so the same bans apply to both. */
export function prohibitedReason(primary: string, second: string, rules: MajorRules): string | null {
  for (const r of rules.prohibited_double) {
    if (r.depts.includes(second)) {
      return `${second}은(는) 국제캠퍼스 학생이 다전공·부전공할 수 없는 전공입니다 (교육과정 p.${r.page}).`;
    }
  }
  for (const r of rules.same_unit_one_major) {
    if (r.depts.includes(primary) && r.depts.includes(second)) {
      return `${primary}와(과) ${second}은(는) 같은 모집단위 안의 전공이라 1개만 선택할 수 있습니다 (교육과정 p.${r.page}).`;
    }
  }
  const t = trackOf(primary, rules);
  if (t && t.depts.includes(second)) {
    return `${primary}와(과) ${second}은(는) 같은 ${t.school}의 트랙이라 다전공·부전공으로 함께 고를 수 없습니다 (교육과정 p.${t.page}).`;
  }
  return null;
}

interface CourseRef {
  code: string;
  name: string;
  credits: number;
}

interface GroupLike {
  category: string;
  credits: number | null;
  rule: string;
  courses: CourseRef[];
}

export interface ProgramLike {
  groups: GroupLike[];
}

export interface AppliedMajorRules {
  /** Same college and the same set of 전공기초 courses: the second major's 기초 is not taken again. */
  basicExemption: { credits: number; page: number; evidence: string } | null;
  /** Double major: courses both majors require (same course code). They count for both majors but only once toward graduation. */
  overlap: { courses: CourseRef[]; credits: number; page: number; evidence: string; note: string } | null;
  /** Minor: courses that are also in the primary major do not count for the minor. */
  minorOverlap: { courses: CourseRef[]; credits: number; page: number; evidence: string } | null;
  /** Fewest major credits to take, after the exemption and overlap above. */
  minimumCredits: number;
  notices: { id: string; page: number; text: string }[];
}

const core = (p: ProgramLike) => p.groups.filter((g) => g.category !== "전공선택");
const required = (p: ProgramLike) => core(p).filter((g) => g.rule === "all").flatMap((g) => g.courses);
const basicCodes = (p: ProgramLike) =>
  new Set(p.groups.filter((g) => g.category === "전공기초").flatMap((g) => g.courses.map((c) => c.code)));

function sameSet(a: Set<string>, b: Set<string>): boolean {
  return a.size > 0 && a.size === b.size && [...a].every((x) => b.has(x));
}

function uniqueByCode(courses: CourseRef[]): CourseRef[] {
  const seen = new Set<string>();
  return courses.filter((c) => !seen.has(c.code) && seen.add(c.code));
}

export function applyMajorRules(
  input: { kind: CreditKind; primaryCollege: string; secondCollege: string; total: number; depts?: string[] },
  primary: ProgramLike,
  second: ProgramLike,
  rules: MajorRules,
): AppliedMajorRules {
  const notices = [
    ...trackNotices(input.depts ?? [], rules),
    ...rules.notices.filter((n) => n.kinds.includes(input.kind)).map(({ id, page, text }) => ({ id, page, text })),
  ];
  let basicExemption: AppliedMajorRules["basicExemption"] = null;
  let overlap: AppliedMajorRules["overlap"] = null;
  let minorOverlap: AppliedMajorRules["minorOverlap"] = null;
  let minimum = input.total;

  if (input.kind === "double") {
    const secondBasic = second.groups.find((g) => g.category === "전공기초");
    if (
      input.primaryCollege === input.secondCollege &&
      secondBasic?.credits &&
      sameSet(basicCodes(primary), basicCodes(second))
    ) {
      basicExemption = {
        credits: secondBasic.credits,
        page: rules.basic_exemption.page,
        evidence: rules.basic_exemption.evidence,
      };
      minimum -= secondBasic.credits;
    }
    // Only courses both majors require for sure; with an exemption the 기초 overlap is already counted.
    const secondRequired = new Set(required(second).map((c) => c.code));
    const exempted = basicExemption ? basicCodes(second) : new Set<string>();
    const shared = uniqueByCode(required(primary)).filter((c) => secondRequired.has(c.code) && !exempted.has(c.code));
    if (shared.length) {
      const credits = shared.reduce((s, c) => s + c.credits, 0);
      overlap = {
        courses: shared,
        credits,
        page: rules.double_overlap.page,
        evidence: rules.double_overlap.evidence,
        note: rules.double_overlap.limit_note,
      };
      minimum -= credits;
    }
  } else {
    const primaryCodes = new Set(core(primary).flatMap((g) => g.courses.map((c) => c.code)));
    const shared = uniqueByCode(core(second).flatMap((g) => g.courses)).filter((c) => primaryCodes.has(c.code));
    if (shared.length) {
      minorOverlap = {
        courses: shared,
        credits: shared.reduce((s, c) => s + c.credits, 0),
        page: rules.minor_overlap.page,
        evidence: rules.minor_overlap.evidence,
      };
    }
  }
  return { basicExemption, overlap, minorOverlap, minimumCredits: minimum, notices };
}
