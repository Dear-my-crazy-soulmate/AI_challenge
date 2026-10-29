// Counting and summarizing community posts by department. Pure functions: every number and every
// summary line shown to students is computed here from what students wrote, never by an LLM.
import { LOAD_LABEL } from "./schema";
import type { Category, FieldValue, Post } from "./types";
import { CATEGORY_IDS } from "./types";

export interface DeptStat {
  dept: string;
  info: number;
  questions: number;
  total: number;
  byCategory: Record<Category, number>;
  fromStudents: number; // 학과 정보 글 written by someone who studies this department (본전공·다전공·부전공)
}

const emptyCategories = (): Record<Category, number> => ({ curriculum: 0, culture: 0, clubs: 0, career: 0, multimajor: 0 });

export function statsByDept(posts: Post[]): Map<string, DeptStat> {
  const m = new Map<string, DeptStat>();
  for (const p of posts) {
    const s = m.get(p.dept) ?? { dept: p.dept, info: 0, questions: 0, total: 0, byCategory: emptyCategories(), fromStudents: 0 };
    s.total++;
    if (p.type === "info") {
      s.info++;
      if (p.category) s.byCategory[p.category]++;
      if (["major", "double", "minor", "microdegree"].includes(p.badge.relation)) s.fromStudents++;
    } else s.questions++;
    m.set(p.dept, s);
  }
  return m;
}

/** Newest first. */
export const newestFirst = (posts: Post[]) => [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export interface Line {
  label: string;
  value: string;
}

const str = (v: FieldValue | undefined) => (typeof v === "string" ? v : "");
const list = (v: FieldValue | undefined) => (Array.isArray(v) ? v : []);

/** [value, count], most common first, ties by name */
export function tally(values: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
const top = (values: string[], n: number) => tally(values).slice(0, n).map(([v, c]) => (c > 1 ? `${v} ${c}` : v)).join(" · ");

const avgLoad = (posts: Post[]): Line | null => {
  const nums = posts.map((p) => p.fields.load).filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const near = Math.min(4, Math.max(1, Math.round(avg)));
  return { label: "학업 부담", value: `평균 ${avg.toFixed(1)}/4 (${LOAD_LABEL[near - 1]}) · ${nums.length}명` };
};

/** The summary lines of one category, from the info posts of one department. Empty when nobody wrote yet. */
export function highlights(category: Category, posts: Post[]): Line[] {
  const ps = posts.filter((p) => p.type === "info" && p.category === category);
  if (ps.length === 0) return [];
  const lines: (Line | null)[] = [];
  const all = (key: string) => ps.flatMap((p) => list(p.fields[key]));
  const texts = (key: string) => ps.map((p) => str(p.fields[key]).trim()).filter(Boolean);
  switch (category) {
    case "curriculum": {
      const courses = texts("courses").flatMap((t) => t.split(/[,，·/]/).map((c) => c.trim()).filter(Boolean));
      lines.push({ label: "대표 과목", value: tally(courses).slice(0, 6).map(([c]) => c).join(", ") });
      lines.push(avgLoad(ps));
      if (all("style").length) lines.push({ label: "수업 방식", value: top(all("style"), 3) });
      break;
    }
    case "culture": {
      lines.push({ label: "분위기", value: top(all("vibe"), 5) });
      const events = [...new Set(texts("events"))].slice(0, 3);
      if (events.length) lines.push({ label: "행사·모임", value: events.join(" / ") });
      break;
    }
    case "clubs": {
      const seen = new Map<string, string>();
      for (const p of ps) seen.set(str(p.fields.name), str(p.fields.kind));
      lines.push({ label: "동아리·학회", value: [...seen].slice(0, 6).map(([n, k]) => (k ? `${n}(${k})` : n)).join(", ") });
      break;
    }
    case "career": {
      lines.push({ label: "졸업 후 진로", value: [...new Set(texts("paths"))].slice(0, 3).join(" / ") });
      if (all("fields").length) lines.push({ label: "취업 분야", value: top(all("fields"), 4) });
      const grad = ps.map((p) => str(p.fields.grad));
      if (grad.some(Boolean)) lines.push({ label: "대학원", value: top(grad, 1) });
      break;
    }
    case "multimajor": {
      lines.push({ label: "함께 한 전공", value: top(ps.map((p) => str(p.fields.partner)), 4) });
      lines.push({ label: "이수 형태", value: top(ps.map((p) => str(p.fields.form)), 3) });
      lines.push(avgLoad(ps));
      break;
    }
  }
  return lines.filter((l): l is Line => l !== null && l.value !== "");
}

/** Categories that already have at least one post for this department, in the usual order. */
export const filledCategories = (posts: Post[]): Category[] =>
  CATEGORY_IDS.filter((c) => posts.some((p) => p.type === "info" && p.category === c));
