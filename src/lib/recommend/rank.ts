// Which 다전공·부전공 학과 to suggest first for a student's 관심 분야. Pure.
// The candidates come from the calculator (already allowed and computable for the 본전공),
// so a suggestion is always a combination the app can calculate; credits stay with the calculator.
import { topicLabel } from "./topics";
import type { DeptTopic } from "./verify";

export interface DeptTopicsData {
  year: number;
  as_of: string;
  prompt: string;
  model: string;
  depts: Record<string, { page: number; status: "verified" | "TODO"; topics: DeptTopic[] }>;
}

export interface Suggestion<C> {
  candidate: C;
  matches: (DeptTopic & { label: string })[]; // the student's 관심 분야 this 학과 fits, strongest first
}

export const SUGGEST_LIMIT = 5;

/**
 * More matching 관심 분야 first; then the 학과 whose text puts a match higher;
 * then the list order the caller gave.
 */
export function suggestDepts<C extends { dept: string }>(
  topics: readonly string[],
  candidates: readonly C[],
  data: DeptTopicsData,
  limit = SUGGEST_LIMIT,
): Suggestion<C>[] {
  if (topics.length === 0) return [];
  const wanted = new Set(topics);
  return candidates
    .map((candidate, order) => {
      const entry = data.depts[candidate.dept];
      const own = entry?.status === "verified" ? entry.topics : [];
      const matches = own.filter((t) => wanted.has(t.id)).map((t) => ({ ...t, label: topicLabel(t.id) }));
      const best = own.findIndex((t) => wanted.has(t.id));
      return { candidate, matches, best, order };
    })
    .filter((s) => s.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length || a.best - b.best || a.order - b.order)
    .slice(0, limit)
    .map(({ candidate, matches }) => ({ candidate, matches }));
}
