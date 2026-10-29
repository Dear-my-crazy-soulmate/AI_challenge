// AI 조합 설명: what ChatKHU gets (GuideFacts) and what the screen shows (GuideResult).
// No credit numbers anywhere in here: credits stay with src/lib/rules/ (CLAUDE.md rule 1).

export type GuideKind = "double" | "minor" | "md";
export const KIND_WORD: Record<GuideKind, string> = { double: "다전공", minor: "부전공", md: "마이크로디그리" };

/** One department's own words from the book (data/curated/<year>/dept_profiles.json). */
export interface DeptProfile {
  section: string;
  shared_section: boolean; // one book section for several majors (기계공학부 등)
  page: number;
  intro: string;
  purpose: string;
  goals: string;
  status: "ok" | "TODO";
  source_url: string;
  as_of: string;
}

export interface ProfileData {
  source_pdf: string;
  as_of: string;
  profiles: Record<string, DeptProfile>;
}

export interface DeptText {
  dept: string;
  page: number;
  intro: string;
  purpose: string;
  goals: string;
}

export interface CourseNames {
  category: string; // 전공기초 / 전공필수 / 전공선택 / 마이크로디그리
  names: string[];
  partial: boolean; // only a few of a long list
  terms?: Record<string, "1학기" | "2학기">; // 2026 개설 학기 by name, when the 수강신청 list has it
}

/** One of the student's 관심 분야, with what the book says about it for the departments here. */
export interface InterestFact {
  label: string;
  reasons: { dept: string; text: string; page: number }[];
}

export interface GuideFacts {
  kind: GuideKind;
  primary: DeptText;
  second: {
    name: string; // department, or the micro-degree's name
    depts: DeptText[]; // for a micro-degree: the departments that run it
    courses: CourseNames[];
  };
  shared: string[]; // courses in both programs
  mdDefinition: { text: string; page: number } | null;
  // comboGuide.v2 only: the 본전공's own courses, and the student's 관심 분야 (no personal data)
  primaryCourses?: CourseNames[];
  interests?: InterestFact[];
}

export interface GuideItem {
  text: string;
  page: number;
}

export interface Guide {
  summary: string;
  strengths: GuideItem[];
  paths: GuideItem[];
  fit: string;
  // comboGuide.v2
  bridges?: { from: string; to: string; text: string }[]; // a 본전공 course and a second-program course that connect
  activities?: string[]; // things to try with this combination, each naming a listed course
  consider?: string; // one thing to think about before choosing
}

export type FallbackReason = "NO_KEY" | "LLM_ERROR" | "CHECK_FAILED" | "BUSY";

export type GuideResult =
  | { source: "ai"; guide: Guide; model: string; promptVersion: string; ms: number; sources: GuideSource[] }
  | { source: "fallback"; guide: Guide; reason: FallbackReason; promptVersion: string; sources: GuideSource[] };

export interface GuideSource {
  dept: string;
  page: number;
}
