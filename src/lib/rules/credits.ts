// Credit totals for "본전공 + 다전공/부전공" from the department overview
// (data/curated/credits_global.json, written by scripts/pipeline/overview.py).
// Pure functions. Never throws for bad input; returns { available: false, ... }.

export type CreditKind = "double" | "minor";
export type ProgramKind = "single" | CreditKind;

export interface CreditIssue {
  level: "error" | "warn";
  code: string;
  where: string;
  msg: string;
}

export type CreditProgram =
  | { available: true; status: "ok"; 기초: number; 필수: number; 선택: number; 계: number; combined?: boolean }
  | { available: false; status: "ok" }
  | { available: null; status: "needs_review" };

export interface CreditDept {
  college: string;
  dept: string;
  campus: string;
  source_url: string;
  as_of: string;
  checked_on: string;
  programs: Record<ProgramKind, CreditProgram>;
}

export interface CreditData {
  depts: CreditDept[];
  issues: Record<string, CreditIssue[]>;
}

export interface CreditBreakdown {
  dept: string;
  kind: ProgramKind;
  기초: number;
  필수: number;
  선택: number;
  계: number;
  combined?: boolean; // 기초 holds 전공기초 and 전공필수 together (merged cell in the book's credit table)
}

export type CreditUnavailableReason =
  | "INVALID_INPUT"
  | "SAME_DEPT"
  | "NO_DEPT_DATA"
  | "NOT_OFFERED"
  | "NOT_VERIFIED"
  | "PROHIBITED"; // set by majorRules (courses.ts)

export interface CreditUnavailable {
  available: false;
  reason: CreditUnavailableReason;
  message: string;
}

export interface CreditWarning {
  source: string;
  code: string;
  where: string;
  message: string;
}

export interface CreditOk {
  available: true;
  input: { primary: string; second: string; kind: CreditKind };
  primary: CreditBreakdown; // single for a minor, double for a double major
  second: CreditBreakdown;
  singleCredits: number; // primary as a single major, for comparison
  totals: { primaryCredits: number; secondCredits: number; total: number; savedCredits: number };
  warnings: CreditWarning[];
  sources: Record<string, { sourceUrl: string; asOf: string }>;
}

export type CreditResult = CreditOk | CreditUnavailable;

const KINDS: readonly CreditKind[] = ["double", "minor"];
const KIND_LABEL: Record<ProgramKind, string> = { single: "단일전공", double: "다전공", minor: "부전공" };
const TODO = "TODO";

const unavailable = (reason: CreditUnavailableReason, message: string): CreditUnavailable => ({
  available: false,
  reason,
  message,
});

type Lookup = { dept: CreditDept; breakdown: CreditBreakdown } | { error: CreditUnavailable };

function lookup(data: CreditData, name: string, kind: ProgramKind): Lookup {
  const dept = data.depts.find((d) => d.dept === name);
  if (!dept) return { error: unavailable("NO_DEPT_DATA", `${name}: 준비된 학점 데이터가 없습니다.`) };
  const p = dept.programs[kind];
  if (p.status === "needs_review") {
    const codes = [
      ...new Set(
        (data.issues[name] ?? [])
          .filter((i) => i.level === "error" && i.where === `${name}/${kind}`)
          .map((i) => i.code),
      ),
    ].sort();
    return {
      error: unavailable(
        "NOT_VERIFIED",
        `${name} ${KIND_LABEL[kind]} 학점은 검증을 통과하지 못해 제공할 수 없습니다 (${codes.join(", ")}). 학과 공식 안내를 확인하세요.`,
      ),
    };
  }
  if (!p.available) return { error: unavailable("NOT_OFFERED", `${name}에는 ${KIND_LABEL[kind]} 과정이 없습니다.`) };
  return { dept, breakdown: { dept: name, kind, 기초: p.기초, 필수: p.필수, 선택: p.선택, 계: p.계, ...(p.combined ? { combined: true } : {}) } };
}

function warningsOf(data: CreditData, dept: CreditDept, kinds: ProgramKind[]): CreditWarning[] {
  const name = dept.dept;
  const out = (data.issues[name] ?? [])
    .filter((i) => i.level === "warn" && (i.where === name || kinds.some((k) => i.where === `${name}/${k}`)))
    .map((i) => ({ source: name, code: i.code, where: i.where, message: i.msg }));
  for (const [value, field, label] of [
    [dept.source_url, "source_url", "출처 URL"],
    [dept.as_of, "as_of", "기준일"],
  ] as const) {
    if (value === TODO) {
      out.push({
        source: name,
        code: "SOURCE_UNCONFIRMED",
        where: field,
        message: `${name}: ${label}이(가) 아직 확인되지 않았습니다(TODO).`,
      });
    }
  }
  return out;
}

export function buildCreditPlan(
  input: { primary: string; second: string; kind: CreditKind },
  data: CreditData,
): CreditResult {
  const primary = (input.primary ?? "").trim();
  const second = (input.second ?? "").trim();
  const kind = input.kind;

  if (!primary || !second) return unavailable("INVALID_INPUT", "본전공과 두 번째 전공을 모두 입력하세요.");
  if (!KINDS.includes(kind)) {
    return unavailable("INVALID_INPUT", `kind는 ${KINDS.join(", ")} 중 하나여야 합니다 (입력: '${String(kind)}').`);
  }
  if (primary === second) return unavailable("SAME_DEPT", "본전공과 같은 학과를 다전공·부전공으로 선택할 수 없습니다.");

  // A department can only be a 본전공 if it runs a single major.
  const single = lookup(data, primary, "single");
  if ("error" in single) return single.error;
  const converted = kind === "double";
  const base = converted ? lookup(data, primary, "double") : single;
  if ("error" in base) return base.error;
  const other = lookup(data, second, kind);
  if ("error" in other) return other.error;

  const p = base.breakdown;
  const s = other.breakdown;
  return {
    available: true,
    input: { primary, second, kind },
    primary: p,
    second: s,
    singleCredits: single.breakdown.계,
    totals: {
      primaryCredits: p.계,
      secondCredits: s.계,
      total: p.계 + s.계,
      savedCredits: converted ? single.breakdown.계 - p.계 : 0,
    },
    warnings: [
      ...warningsOf(data, base.dept, converted ? ["single", "double"] : ["single"]),
      ...warningsOf(data, other.dept, [kind]),
    ],
    sources: {
      [primary]: { sourceUrl: base.dept.source_url, asOf: base.dept.as_of },
      [second]: { sourceUrl: other.dept.source_url, asOf: other.dept.as_of },
    },
  };
}

export interface CreditOption {
  dept: string;
  college: string;
  kind: CreditKind;
  total: number;
}

/** Every second major/minor that can be computed for this primary, fewest total credits first. */
export function listCreditOptions(primary: string, data: CreditData): CreditOption[] {
  const out: CreditOption[] = [];
  for (const d of data.depts) {
    for (const kind of KINDS) {
      const r = buildCreditPlan({ primary, second: d.dept, kind }, data);
      if (r.available) out.push({ dept: d.dept, college: d.college, kind, total: r.totals.total });
    }
  }
  return out.sort((a, b) => a.total - b.total || a.dept.localeCompare(b.dept, "ko"));
}
