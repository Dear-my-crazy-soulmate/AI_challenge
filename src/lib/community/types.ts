// 커뮤니티: 다전공을 하고 있거나 고민하는 학생들의 이수 후기·질문·정보.
// Posts are anonymous; what readers see about the author is the Badge (본전공, 학년, and which
// 다전공·부전공·마이크로디그리 the author is doing or thinking about), never a name.
import type { Grade } from "../auth/types";
import type { GoalMode } from "../goal";

export type PostType = "review" | "question" | "info";
export const POST_TYPES: readonly PostType[] = ["review", "question", "info"];
export const TYPE_LABEL: Record<PostType, string> = { review: "이수 후기", question: "질문", info: "정보 공유" };

/** 이수 중 / 이수 완료 / 고민 중 */
export type Stage = "doing" | "done" | "thinking";
export const STAGE_LABEL: Record<Stage, string> = { doing: "이수 중", done: "이수 완료", thinking: "고민 중" };

export interface Combo {
  mode: GoalMode;
  second: string; // department name, or micro-degree id
  secondName: string; // shown to readers (for a micro-degree this is its name)
}

export interface Badge {
  primary: string; // 본전공
  grade: Grade;
  stage: Stage | null; // null on comments: the commenter did not say
  combo: Combo | null;
}

/** The fixed fields of a 이수 후기 (used for search, filters and the per-combination summary). */
export interface ReviewFields {
  startedGrade: Grade; // the year the author started it
  startedTerm: 1 | 2;
  load: 1 | 2 | 3 | 4; // 학업 부담: 1 여유로움 ... 4 매우 힘듦
  pros: string;
  cons: string;
  forWhom: string; // 추천 대상
}

export const LOAD_LABEL: Record<ReviewFields["load"], string> = { 1: "여유로움", 2: "보통", 3: "빠듯함", 4: "매우 힘듦" };

export interface Post {
  id: string;
  type: PostType;
  title: string;
  body: string; // free text; may be empty for a review that only uses the fixed fields
  badge: Badge;
  review?: ReviewFields; // only when type is "review"
  createdAt: string; // ISO time
  is_sample: boolean; // CLAUDE.md rule 6: shown as 예시 데이터
  mine?: boolean; // written in this browser, so it can be deleted here
}

export interface Comment {
  id: string;
  postId: string;
  body: string;
  badge: Badge;
  createdAt: string;
  is_sample: boolean;
  mine?: boolean;
}

export const LIMITS = { title: 60, body: 2000, field: 300, comment: 500 } as const;
