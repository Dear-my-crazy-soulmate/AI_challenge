import { CATEGORIES } from "@/lib/community/schema";
import { INFO_RELATIONS, RELATION_LABEL, TYPE_LABEL } from "@/lib/community/types";
import type { Badge, CommentBadge, Post } from "@/lib/community/types";

/** each category (and 질문) keeps one colour: the department tabs, the write screen and post tags all use it */
export const TONE: Record<string, { fg: string; bg: string }> = {
  all: { fg: "#475569", bg: "#f1f5f9" },
  curriculum: { fg: "#2563eb", bg: "#dbeafe" },
  culture: { fg: "#db2777", bg: "#fce7f3" },
  clubs: { fg: "#ea580c", bg: "#ffedd5" },
  career: { fg: "#15803d", bg: "#dcfce7" },
  multimajor: { fg: "#7c3aed", bg: "#ede9fe" },
  question: { fg: "#b45309", bg: "#fef3c7" },
};

const Tag = ({ tone, children }: { tone: string; children: string }) => (
  <span className="rounded-md px-1.5 py-px text-xs font-bold" style={{ background: TONE[tone].bg, color: TONE[tone].fg }}>
    {children}
  </span>
);

/** What a post is: its category, or 질문 plus the category it asks about. */
export const PostTags = ({ post }: { post: Pick<Post, "type" | "category"> }) => (
  <>
    {post.type === "question" ? <Tag tone="question">{TYPE_LABEL.question}</Tag> : <Tag tone={post.category ?? "curriculum"}>{CATEGORIES[post.category ?? "curriculum"].label}</Tag>}
    {post.type === "question" && post.category && <Tag tone={post.category}>{CATEGORIES[post.category].label}</Tag>}
  </>
);

export const SampleTag = () => <span className="rounded-md bg-sand-2 px-1.5 py-px text-xs font-semibold text-ink-2">예시 데이터</span>;

/**
 * Who wrote it, without a name: their own 본전공 and 학년, and how they relate to the department the
 * post is about. A comment has no stated relation, so "이 학과 재학 중" is shown when its writer's 본전공 is that department.
 */
export default function CommunityBadge({ badge, dept }: { badge: Badge | CommentBadge; dept?: string }) {
  const relation = "relation" in badge ? RELATION_LABEL[badge.relation] : dept && badge.primary === dept ? "이 학과 재학 중" : null;
  const studies = "relation" in badge ? INFO_RELATIONS.includes(badge.relation) : relation !== null;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="font-semibold text-ink-2">
        익명 · {badge.primary} {badge.grade}학년
      </span>
      {relation && (
        <span className={`rounded-md px-1.5 py-px font-semibold ${studies ? "bg-accent-soft text-accent-deep" : "bg-sand text-ink-2"}`}>{relation}</span>
      )}
    </span>
  );
}
