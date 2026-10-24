// Turning what a student typed into a Post or Comment, or a message saying what to fix.
// Every text goes through the content check (phone numbers, 학번, insults) before it can be saved.
import type { Grade } from "../auth/types";
import { checkPostText } from "../safety/content";
import type { Checked } from "../safety/input";
import { LIMITS } from "./types";
import type { Badge, Combo, Comment, Post, PostType, ReviewFields, Stage } from "./types";

export interface Author {
  primary: string;
  grade: Grade;
}

export interface PostDraft {
  type: PostType;
  title: string;
  body: string;
  stage: Stage;
  combo: Combo | null;
  review: Omit<ReviewFields, "pros" | "cons" | "forWhom"> & { pros: string; cons: string; forWhom: string };
}

const text = (raw: string, max: number, label: string, required: boolean): Checked<string> => {
  const r = checkPostText(raw, max, label);
  if (r.ok && required && r.value === "") return { ok: false, message: `${label}을(를) 적어 주세요.` };
  return r;
};

export function buildPost(d: PostDraft, author: Author, id: string, now: Date): Checked<Post> {
  const title = text(d.title, LIMITS.title, "제목", true);
  if (!title.ok) return title;
  const body = text(d.body, LIMITS.body, "내용", d.type !== "review");
  if (!body.ok) return body;
  const badge: Badge = { primary: author.primary, grade: author.grade, stage: d.stage, combo: d.combo };

  if (d.type !== "review") {
    return { ok: true, value: { id, type: d.type, title: title.value, body: body.value, badge, createdAt: now.toISOString(), is_sample: false } };
  }

  // A review is about one specific combination the author has done or is doing.
  if (!d.combo) return { ok: false, message: "어떤 전공 조합의 후기인지 골라 주세요." };
  if (d.stage === "thinking") return { ok: false, message: "후기는 이수 중이거나 이수를 마친 경우에만 쓸 수 있어요." };
  const pros = text(d.review.pros, LIMITS.field, "장점", true);
  if (!pros.ok) return pros;
  const cons = text(d.review.cons, LIMITS.field, "단점", true);
  if (!cons.ok) return cons;
  const forWhom = text(d.review.forWhom, LIMITS.field, "추천 대상", false);
  if (!forWhom.ok) return forWhom;
  return {
    ok: true,
    value: {
      id,
      type: "review",
      title: title.value,
      body: body.value,
      badge,
      review: {
        startedGrade: d.review.startedGrade,
        startedTerm: d.review.startedTerm,
        load: d.review.load,
        pros: pros.value,
        cons: cons.value,
        forWhom: forWhom.value,
      },
      createdAt: now.toISOString(),
      is_sample: false,
    },
  };
}

export function buildComment(postId: string, raw: string, author: Author, combo: Combo | null, id: string, now: Date): Checked<Comment> {
  const body = text(raw, LIMITS.comment, "댓글", true);
  if (!body.ok) return body;
  return {
    ok: true,
    value: { id, postId, body: body.value, badge: { primary: author.primary, grade: author.grade, stage: null, combo }, createdAt: now.toISOString(), is_sample: false },
  };
}
