// Filtering and summarizing community posts. Pure functions: the numbers shown to students
// (counts, average 학업 부담) are computed here, never by an LLM (CLAUDE.md rule 1).
import { MODE_NAME } from "../goal";
import type { GoalMode } from "../goal";
import { LOAD_LABEL, STAGE_LABEL } from "./types";
import type { Badge, Post, PostType } from "./types";

export interface Filters {
  type: PostType | "all";
  form: GoalMode | "all"; // 다전공 / 부전공 / 마이크로디그리 of the post's combination
  text: string;
  interests: string[] | null; // when set: only posts about one of these 희망 전공
  mineOnly: boolean;
}

export const NO_FILTERS: Filters = { type: "all", form: "all", text: "", interests: null, mineOnly: false };

const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();

function haystack(p: Post): string {
  const r = p.review;
  return norm([p.title, p.body, p.badge.primary, p.badge.combo?.secondName ?? "", r?.pros ?? "", r?.cons ?? "", r?.forWhom ?? ""].join(" "));
}

/** Newest first. */
export function filterPosts(posts: Post[], f: Filters): Post[] {
  const text = norm(f.text);
  return posts
    .filter((p) => f.type === "all" || p.type === f.type)
    .filter((p) => f.form === "all" || p.badge.combo?.mode === f.form)
    .filter((p) => !f.interests || (p.badge.combo !== null && f.interests.includes(p.badge.combo.second)))
    .filter((p) => !f.mineOnly || p.mine === true)
    .filter((p) => !text || haystack(p).includes(text))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface ReviewSummary {
  count: number;
  avgLoad: number; // 1..4, one decimal
  loadLabel: string; // the closest LOAD_LABEL
  doing: number;
  done: number;
}

/** Summary of the 이수 후기 among these posts, or null when there are none. */
export function summarizeReviews(posts: Post[]): ReviewSummary | null {
  const reviews = posts.filter((p) => p.type === "review" && p.review);
  if (reviews.length === 0) return null;
  const avg = reviews.reduce((a, p) => a + (p.review?.load ?? 0), 0) / reviews.length;
  const near = Math.min(4, Math.max(1, Math.round(avg))) as 1 | 2 | 3 | 4;
  return {
    count: reviews.length,
    avgLoad: Math.round(avg * 10) / 10,
    loadLabel: LOAD_LABEL[near],
    doing: reviews.filter((p) => p.badge.stage === "doing").length,
    done: reviews.filter((p) => p.badge.stage === "done").length,
  };
}

/** What readers see about an author: "컴퓨터공학과 2학년", "이수 중", "다전공 · 인공지능학과". */
export function badgeParts(b: Badge): { who: string; stage: string | null; combo: string | null } {
  return {
    who: `${b.primary} ${b.grade}학년`,
    stage: b.stage ? STAGE_LABEL[b.stage] : null,
    // a commenter has no stage, so their combination is the one they are aiming for, not one they are doing
    combo: b.combo ? `${b.stage ? "" : "목표 · "}${MODE_NAME[b.combo.mode]} · ${b.combo.secondName}` : null,
  };
}

export function matchesCombo(p: Post, mode: GoalMode, second: string): boolean {
  return p.badge.combo?.mode === mode && p.badge.combo.second === second;
}
