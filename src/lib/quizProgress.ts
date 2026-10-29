// 체험 문제의 재미 요소: 전공별 최고 기록(별)과 쿠옹이의 반응 문구. Pure functions; saving is in src/lib/quizBest/store.ts.
// Where stars were kept before they were tied to an account (one set per browser).
export const QUIZ_BEST_KEY = "quiz-best-v1";

export type Best = Record<string, { score: number; n: number }>;

/** Keep the better of the old and new result (higher score wins; a later tie keeps the old one). */
export function recordBest(best: Best, major: string, score: number, n: number): Best {
  const old = best[major];
  return old && old.score >= score ? best : { ...best, [major]: { score, n } };
}

export function parseBest(raw: string | null): Best {
  try {
    const v: unknown = JSON.parse(raw ?? "{}");
    if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
    return Object.fromEntries(
      Object.entries(v).filter(([, r]) => {
        const x = r as { score?: unknown; n?: unknown };
        return typeof x?.score === "number" && typeof x?.n === "number" && x.n > 0 && x.score >= 0 && x.score <= x.n;
      }),
    ) as Best;
  } catch {
    return {};
  }
}

/** 쿠옹이's line while solving. `streak` counts right answers in a row, including this one. */
export function reaction(right: boolean, streak: number): string {
  if (!right) return "괜찮아요! 틀려 보는 것도 체험이에요";
  if (streak >= 3) return "3연속 정답! 대단해요";
  if (streak === 2) return "2연속! 감이 오네요";
  return "정답! 잘했어요";
}
