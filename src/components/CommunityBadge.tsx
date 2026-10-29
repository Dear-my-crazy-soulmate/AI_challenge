import { RELATION_LABEL } from "@/lib/community/types";
import type { Badge, CommentBadge } from "@/lib/community/types";

export const SampleTag = () => <span className="rounded-md bg-sand-2 px-1.5 py-px text-xs font-semibold text-ink-2">예시 데이터</span>;

/**
 * Who wrote it, without a name: their own 본전공 and 학년, and how they relate to the department the
 * post is about. A comment has no stated relation, so "이 학과 재학 중" is shown when its writer's 본전공 is that department.
 */
export default function CommunityBadge({ badge, dept }: { badge: Badge | CommentBadge; dept?: string }) {
  const relation = "relation" in badge ? RELATION_LABEL[badge.relation] : dept && badge.primary === dept ? "이 학과 재학 중" : null;
  const studies = "relation" in badge ? ["major", "double", "minor", "alumni"].includes(badge.relation) : relation !== null;
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
