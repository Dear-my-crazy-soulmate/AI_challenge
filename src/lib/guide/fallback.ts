// What the card shows when ChatKHU is not available or its answer fails the check:
// the book's own 교육목적 sentences, unchanged, with their pages. Pure.
import { KIND_WORD } from "./types";
import type { DeptText, Guide, GuideFacts } from "./types";

const MAX = 160;

function firstSentence(text: string): string {
  const t = text.replace(/^[①-⑳]\s*/, "").trim();
  const end = t.search(/(?:다|함|음)\.\s|(?:다|함|음)\.$/);
  const s = end >= 0 ? t.slice(0, end + 2) : t;
  return s.length > MAX ? `${s.slice(0, MAX).trimEnd()}…` : s;
}

function line(d: DeptText): { text: string; page: number } | null {
  const src = d.purpose || d.goals || d.intro;
  return src && d.page > 0 ? { text: `${d.dept}: ${firstSentence(src)}`, page: d.page } : null;
}

export function fallbackGuide(f: GuideFacts): Guide {
  const word = KIND_WORD[f.kind];
  const seen = new Set<string>();
  const depts = [f.primary, ...f.second.depts].filter((d) => !seen.has(d.dept) && seen.add(d.dept));
  return {
    summary: `${f.primary.dept} 본전공에 ${f.second.name} ${word}을(를) 더하는 조합이에요.`,
    strengths: depts.map(line).filter((x): x is { text: string; page: number } => x !== null),
    paths: [],
    fit: "",
  };
}
