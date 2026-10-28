// 전공 체험 문제: which questions may be shown, and how answers are graded.
// Grading is plain code, never an LLM (CLAUDE.md rule 1).

/** draft -> verified -> approved (CLAUDE.md rule 7). Only approved questions reach users. */
export type QuizStatus = "draft" | "verified" | "approved";

export interface QuizQuestion {
  id: string;
  skill: string; // what the question measures, e.g. "알고리즘"
  question: string;
  code?: string; // optional code block shown under the question
  options: string[];
  answer: number; // index into options
  explanation: string;
  status: QuizStatus;
  is_sample: boolean;
  // Questions made from a syllabus (data/drafts/quiz, scripts/syllabus) also carry where they come from:
  reviewed?: boolean; // false = approved in bulk but no person has read it yet; the screen says so
  flow?: string; // "🎓 …" one sentence on how the course continues
  evidence?: { week: number; topic: string }; // the syllabus week the question was built from, quoted as printed
  source?: { site: string; path: string; as_of: string };
}

export interface QuizMajor {
  major: string;
  college: string;
  questions: QuizQuestion[];
}

/** public/quiz/index.json: one entry per department that has questions to show. */
export interface QuizIndexEntry {
  id: string;
  dept: string;
  college: string;
  count: number;
}

/** One quiz round = this many questions, drawn at random from the department's pool. */
export const QUESTIONS_PER_ROUND = 5;

/** Where the exported question files live. Only approved questions are exported there; drafts are exported for local preview only. */
export const quizBase = (preview: boolean) => (preview ? "/quiz-preview" : "/quiz");

export interface QuizSet {
  is_sample: boolean;
  as_of: string;
  note: string;
  majors: QuizMajor[];
}

/**
 * Approved questions, plus samples (which the screen labels "예시 데이터", CLAUDE.md rule 6).
 * `preview` (a local check of unreviewed drafts, never set in production) also lets drafts through.
 */
export const isShowable = (q: QuizQuestion, preview = false) => q.status === "approved" || q.is_sample === true || preview;

/** `n` different questions from the pool in random order (`rng` returns [0, 1); a seeded one makes this testable). Fewer if the pool is smaller. */
export function pickQuestions(pool: QuizQuestion[], n = QUESTIONS_PER_ROUND, rng: () => number = Math.random): QuizQuestion[] {
  const a = [...new Map(pool.map((q) => [q.id, q])).values()]; // one per id, the pool itself stays untouched
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/** Majors that still have at least one showable question, with only those questions. */
export function showableMajors(set: QuizSet): QuizMajor[] {
  return set.majors
    .map((m) => ({ ...m, questions: m.questions.filter((q) => isShowable(q)) }))
    .filter((m) => m.questions.length > 0);
}

export const isCorrect = (q: QuizQuestion, picked: number | undefined) => picked === q.answer;

export function scoreOf(questions: QuizQuestion[], picks: (number | undefined)[]): number {
  return questions.filter((q, i) => isCorrect(q, picks[i])).length;
}

export function reportTitle(score: number, n: number): string {
  if (n > 0 && score === n) return "모든 문제를 맞혔어요!";
  if (score === 0) return "새로운 분야를 경험했어요";
  return score / n >= 2 / 3 ? "감을 잘 잡고 있어요" : "조금 더 알아볼 가치가 있어요";
}

/** Short template feedback. It describes the result; it does not judge whether the major fits. */
export function feedbackFor(major: string, questions: QuizQuestion[], picks: (number | undefined)[]): string {
  const score = scoreOf(questions, picks);
  const right = questions.filter((q, i) => isCorrect(q, picks[i])).map((q) => q.skill);
  const wrong = questions.filter((q, i) => !isCorrect(q, picks[i])).map((q) => q.skill);
  if (score === questions.length) {
    return `${right.join("·")} 문제에서 개념을 정확히 짚었어요. ${major} 수업에서 쓰는 사고방식과 잘 맞는 편이에요.`;
  }
  if (score >= 1) {
    return `기본 개념은 잡혀 있어요. ${wrong.join("·")} 문제처럼 헷갈린 부분은 ${major}에서 수업으로 차근차근 배우는 내용이니 걱정하지 않아도 돼요.`;
  }
  return "처음 보는 내용이라 어려웠을 수 있어요. 점수보다 ‘더 알고 싶다’는 느낌이 들었는지 떠올려 보세요.";
}
