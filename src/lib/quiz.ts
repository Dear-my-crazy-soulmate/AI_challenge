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
}

export interface QuizMajor {
  major: string;
  college: string;
  questions: QuizQuestion[];
}

export interface QuizSet {
  is_sample: boolean;
  as_of: string;
  note: string;
  majors: QuizMajor[];
}

/** Approved questions, plus samples (which the screen labels "예시 데이터", CLAUDE.md rule 6). */
export const isShowable = (q: QuizQuestion) => q.status === "approved" || q.is_sample === true;

/** Majors that still have at least one showable question, with only those questions. */
export function showableMajors(set: QuizSet): QuizMajor[] {
  return set.majors
    .map((m) => ({ ...m, questions: m.questions.filter(isShowable) }))
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
    return `${right.join("·")} 문제에서 개념을 정확히 짚었어요. ${major}의 입문 과목이 요구하는 사고방식과 잘 맞는 편이에요.`;
  }
  if (score >= 1) {
    return `기본 개념은 잡혀 있어요. ${wrong.join("·")} 문제처럼 헷갈린 부분은 ${major} 1학년 과목에서 처음부터 다루니 걱정하지 않아도 돼요.`;
  }
  return "처음 보는 내용이라 어려웠을 수 있어요. 점수보다 ‘더 알고 싶다’는 느낌이 들었는지 떠올려 보세요.";
}
