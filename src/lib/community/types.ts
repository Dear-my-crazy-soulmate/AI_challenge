// 커뮤니티: 학과별로 학생들이 직접 나누는 정보. 같은 학과라도 배우는 것, 분위기, 동아리가 다르니
// 그 학과 학생의 경험을 정해진 칸(schema.ts)에 모아 서로의 학과를 더 자세히 알 수 있게 한다.
// 글은 익명이고, 읽는 사람에게는 "그 학과와 어떤 관계인 학생인지"(Badge.relation)만 보인다.
import type { Grade } from "../auth/types";

export type PostType = "info" | "question";
export const POST_TYPES: readonly PostType[] = ["info", "question"];
export const TYPE_LABEL: Record<PostType, string> = { info: "학과 정보", question: "질문" };

/** what a 학과 정보 글 is about; each has its own fixed fields (see schema.ts) */
export type Category = "curriculum" | "culture" | "clubs" | "career" | "multimajor";
export const CATEGORY_IDS: readonly Category[] = ["curriculum", "culture", "clubs", "career", "multimajor"];

/** the writer's relation to the department the post is about */
export type Relation = "major" | "double" | "minor" | "alumni" | "curious";
export const RELATION_LABEL: Record<Relation, string> = {
  major: "이 학과 재학 중",
  double: "다전공 중",
  minor: "부전공 중",
  alumni: "졸업생",
  curious: "관심 있는 학생",
};
/** who can write 학과 정보: someone who actually studied it (a question can come from anyone) */
export const INFO_RELATIONS: readonly Relation[] = ["major", "double", "minor", "alumni"];

export type FieldValue = string | string[] | number;

export interface Badge {
  primary: string; // the writer's own 본전공
  grade: Grade;
  relation: Relation;
}
export interface CommentBadge {
  primary: string;
  grade: Grade;
}

export interface Post {
  id: string;
  type: PostType;
  dept: string; // the department it is about (a name in credits_global.json)
  category: Category | null; // always set for 학과 정보; optional for a question
  title: string;
  body: string;
  fields: Record<string, FieldValue>; // keyed by schema.ts field keys
  badge: Badge;
  createdAt: string; // ISO time
  is_sample: boolean; // CLAUDE.md rule 6: shown as 예시 데이터
  mine?: boolean; // written in this browser, so it can be deleted here
}

export interface Comment {
  id: string;
  postId: string;
  body: string;
  badge: CommentBadge;
  createdAt: string;
  is_sample: boolean;
  mine?: boolean;
}

export const LIMITS = { title: 60, body: 2000, text: 120, long: 400, comment: 500 } as const;
