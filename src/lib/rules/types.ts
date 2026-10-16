// Shapes of data/curated/*.json (snake_case, as written by the pipeline) and
// of the plan result (camelCase, for the app).

export type PlanKind = "double" | "minor" | "microdegree";
export type RequirementKind = "single" | PlanKind;
export type GroupRule = "all" | "choose_credits" | "choose_n";
export type RuleStatus = "applies" | "ambiguous" | "pending";

export interface CodedCourse {
  code: string;
  name: string;
  credits: number;
}

export interface CuratedGroup {
  category: string;
  sub: string;
  rule: GroupRule;
  required_credits: number;
  choose_n: number | null;
  coded: CodedCourse[];
  unresolved: string[];
}

export interface CuratedIssue {
  level: "error" | "warn";
  code: string;
  where: string;
  msg: string;
}

export interface CuratedRule {
  id: string;
  text: string;
  page: number;
  evidence: string;
  applies_if: string | null;
  status: RuleStatus;
  why: string;
}

export interface CuratedRequirement {
  kind: RequirementKind;
  name: string;
  total_credits: number;
  groups: CuratedGroup[];
  extra_rules: CuratedRule[];
  issues: CuratedIssue[];
}

export interface CuratedDept {
  dept: string;
  college: string;
  source_url: string;
  as_of: string;
  requirements: CuratedRequirement[];
}

/** status.json: dept -> "kind/name" -> status, or "_dept_error" -> message. */
export type StatusFile = Record<
  string,
  Record<string, { status: string; issues: CuratedIssue[] } | string>
>;

export interface CuratedData {
  depts: Record<string, CuratedDept>;
  status: StatusFile;
}

// ---- plan input / output

export interface PlanInput {
  primary: string; // 본전공 학과
  second: string; // 두 번째 전공 학과
  kind: PlanKind;
  name?: string; // required for microdegree
}

export type UnavailableReason =
  | "INVALID_INPUT"
  | "SAME_DEPT"
  | "NO_DEPT_DATA"
  | "NOT_VERIFIED"
  | "REQUIREMENT_NOT_FOUND";

export interface Unavailable {
  available: false;
  reason: UnavailableReason;
  message: string;
}

export interface PlanGroup {
  label: string;
  category: string;
  sub: string;
  rule: GroupRule;
  requiredCredits: number;
  chooseN: number | null;
  courses: CodedCourse[];
  unresolved: string[];
}

export interface PlanRequirement {
  kind: RequirementKind;
  name: string;
  totalCredits: number;
  groups: PlanGroup[];
}

export type RequiredCourse = CodedCourse & { group: string };
export type NoticeAdvice = "applies" | "maybe_not_applicable" | "needs_check";

export interface PlanNotice {
  source: string;
  id: string;
  text: string;
  status: RuleStatus;
  why: string;
  appliesIf: string | null;
  advice: NoticeAdvice;
  page: number;
  evidence: string;
}

export interface PlanWarning {
  source: string;
  code: string;
  where: string;
  message: string;
}

export interface PlanDuplicate {
  code: string;
  name: string;
  inPrimary: string[];
  inSecond: string[];
}

export interface PlanOk {
  available: true;
  input: { primary: string; second: string; kind: PlanKind; name: string };
  primary: {
    dept: string;
    college: string;
    converted: boolean; // single -> double conversion applied
    requirement: PlanRequirement;
    requiredCourses: RequiredCourse[];
    singleTotalCredits: number;
  };
  second: { dept: string; requirement: PlanRequirement; requiredCourses: RequiredCourse[] };
  totals: { primaryCredits: number; secondCredits: number; total: number; savedCredits: number };
  droppedRequired: RequiredCourse[];
  duplicates: PlanDuplicate[];
  notices: PlanNotice[];
  warnings: PlanWarning[];
  sources: Record<string, { sourceUrl: string; asOf: string }>;
}

export type PlanResult = PlanOk | Unavailable;
