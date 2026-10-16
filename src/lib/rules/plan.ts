// Which courses must a student take for "본전공 + 두 번째 전공"?
// Pure function: credits and courses come from verified curated data only.
// Mirrors scripts/pipeline/plan.py. Never throws for bad input; it returns
// { available: false, reason, message } so the UI can always show something.
import type {
  CuratedData,
  CuratedRequirement,
  CuratedRule,
  CuratedIssue,
  NoticeAdvice,
  PlanDuplicate,
  PlanGroup,
  PlanInput,
  PlanKind,
  PlanNotice,
  PlanOk,
  PlanRequirement,
  PlanResult,
  PlanWarning,
  RequiredCourse,
  RequirementKind,
  Unavailable,
} from "./types";

const KINDS: readonly PlanKind[] = ["double", "minor", "microdegree"];
const TODO = "TODO";

const unavailable = (reason: Unavailable["reason"], message: string): Unavailable => ({
  available: false,
  reason,
  message,
});

type Lookup = { req: CuratedRequirement } | { error: Unavailable };

function lookup(
  data: CuratedData,
  dept: string,
  kind: RequirementKind,
  name: string,
): Lookup {
  const found = data.depts[dept]?.requirements.find((r) => r.kind === kind && r.name === name);
  if (found) return { req: found };

  const st = data.status[dept] ?? {};
  const deptError = st["_dept_error"];
  if (typeof deptError === "string") {
    return {
      error: unavailable("NO_DEPT_DATA", `${dept}: 교육과정 데이터를 만들지 못했습니다 (${deptError}).`),
    };
  }
  const entry = st[`${kind}/${name}`];
  if (entry && typeof entry !== "string" && entry.status === "needs_review") {
    const codes = [...new Set(entry.issues.filter((i) => i.level === "error").map((i) => i.code))].sort();
    return {
      error: unavailable(
        "NOT_VERIFIED",
        `${dept} ${kind} '${name}'은(는) 검증을 통과하지 못해 제공할 수 없습니다 (${codes.join(", ")}). 학과 공식 안내를 확인하세요.`,
      ),
    };
  }
  if (!data.depts[dept] && Object.keys(st).length === 0) {
    return { error: unavailable("NO_DEPT_DATA", `${dept}: 준비된 교육과정 데이터가 없습니다.`) };
  }
  return { error: unavailable("REQUIREMENT_NOT_FOUND", `${dept}에 ${kind} '${name}' 요건 데이터가 없습니다.`) };
}

const labelOf = (g: { category: string; sub: string }) => (g.sub ? `${g.category}/${g.sub}` : g.category);

function slim(req: CuratedRequirement): PlanRequirement {
  return {
    kind: req.kind,
    name: req.name,
    totalCredits: req.total_credits,
    groups: req.groups.map(
      (g): PlanGroup => ({
        label: labelOf(g),
        category: g.category,
        sub: g.sub,
        rule: g.rule,
        requiredCredits: g.required_credits,
        chooseN: g.choose_n,
        courses: g.coded,
        unresolved: g.unresolved,
      }),
    ),
  };
}

const requiredOf = (req: PlanRequirement): RequiredCourse[] =>
  req.groups.filter((g) => g.rule === "all").flatMap((g) => g.courses.map((c) => ({ ...c, group: g.label })));

function adviceOf(rule: CuratedRule, studentCollege: string): NoticeAdvice {
  if (rule.status !== "applies") return "needs_check";
  const college = rule.applies_if?.match(/\S+대학/)?.[0];
  if (college && !studentCollege.includes(college)) return "maybe_not_applicable";
  return "applies";
}

const noticesOf = (req: CuratedRequirement, source: string, college: string): PlanNotice[] =>
  req.extra_rules.map((r) => ({
    source,
    id: r.id,
    text: r.text,
    status: r.status,
    why: r.why,
    appliesIf: r.applies_if,
    advice: adviceOf(r, college),
    page: r.page,
    evidence: r.evidence,
  }));

// Ambiguous rules are already shown as notices, so they are not repeated here.
const warningsOf = (req: CuratedRequirement, source: string): PlanWarning[] =>
  req.issues
    .filter((i: CuratedIssue) => i.level === "warn" && i.code !== "AMBIGUOUS_RULE")
    .map((i) => ({ source, code: i.code, where: i.where, message: i.msg }));

export function buildPlan(input: PlanInput, data: CuratedData): PlanResult {
  const primary = (input.primary ?? "").trim();
  const second = (input.second ?? "").trim();
  const kind = input.kind;
  let name = (input.name ?? "").trim();

  if (!primary || !second) return unavailable("INVALID_INPUT", "본전공과 두 번째 전공을 모두 입력하세요.");
  if (!KINDS.includes(kind)) {
    return unavailable("INVALID_INPUT", `kind는 ${KINDS.join(", ")} 중 하나여야 합니다 (입력: '${String(kind)}').`);
  }
  if (kind === "microdegree" && !name) {
    return unavailable("INVALID_INPUT", "마이크로디그리는 이름을 함께 입력하세요.");
  }
  if (kind !== "microdegree") name = second;
  if (kind !== "microdegree" && primary === second) {
    return unavailable("SAME_DEPT", "본전공과 같은 학과를 다전공·부전공으로 선택할 수 없습니다.");
  }

  const single = lookup(data, primary, "single", primary);
  if ("error" in single) return single.error;
  const converted = kind === "double";
  const base = converted ? lookup(data, primary, "double", primary) : single;
  if ("error" in base) return base.error;
  const other = lookup(data, second, kind, name);
  if ("error" in other) return other.error;

  const college = data.depts[primary].college;
  const p = slim(base.req);
  const s = slim(other.req);
  const pRequired = requiredOf(p);

  let droppedRequired: RequiredCourse[] = [];
  if (converted) {
    const keep = new Set(pRequired.map((c) => c.code));
    droppedRequired = requiredOf(slim(single.req)).filter((c) => !keep.has(c.code));
  }

  const labelsOf = (req: PlanRequirement, code: string) =>
    req.groups.filter((g) => g.courses.some((c) => c.code === code)).map((g) => g.label);
  const namesIn = (req: PlanRequirement) => new Map(req.groups.flatMap((g) => g.courses).map((c) => [c.code, c.name]));
  const pNames = namesIn(p);
  const sNames = namesIn(s);
  const duplicates: PlanDuplicate[] = [...pNames.keys()]
    .filter((code) => sNames.has(code))
    .sort()
    .map((code) => ({
      code,
      name: pNames.get(code) as string,
      inPrimary: labelsOf(p, code),
      inSecond: labelsOf(s, code),
    }));

  const warnings = [...warningsOf(base.req, primary), ...warningsOf(other.req, second)];
  for (const dept of new Set([primary, second])) {
    const d = data.depts[dept];
    for (const [value, field, label] of [
      [d.source_url, "source_url", "출처 URL"],
      [d.as_of, "as_of", "기준일"],
    ] as const) {
      if (value === TODO) {
        warnings.push({
          source: dept,
          code: "SOURCE_UNCONFIRMED",
          where: field,
          message: `${dept}: ${label}이(가) 아직 확인되지 않았습니다(TODO).`,
        });
      }
    }
  }

  const result: PlanOk = {
    available: true,
    input: { primary, second, kind, name },
    primary: {
      dept: primary,
      college,
      converted,
      requirement: p,
      requiredCourses: pRequired,
      singleTotalCredits: single.req.total_credits,
    },
    second: { dept: second, requirement: s, requiredCourses: requiredOf(s) },
    totals: {
      primaryCredits: base.req.total_credits,
      secondCredits: other.req.total_credits,
      total: base.req.total_credits + other.req.total_credits,
      savedCredits: converted ? single.req.total_credits - base.req.total_credits : 0,
    },
    droppedRequired,
    duplicates,
    notices: [...noticesOf(base.req, primary, college), ...noticesOf(other.req, second, college)],
    warnings,
    sources: Object.fromEntries(
      [...new Set([primary, second])].map((d) => [
        d,
        { sourceUrl: data.depts[d].source_url, asOf: data.depts[d].as_of },
      ]),
    ),
  };
  return result;
}
