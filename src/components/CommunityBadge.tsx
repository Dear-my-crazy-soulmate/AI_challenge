import { badgeParts } from "@/lib/community/query";
import type { Badge } from "@/lib/community/types";

export const SampleTag = () => <span className="rounded-md bg-sand-2 px-1.5 py-px text-[11px] font-semibold text-ink-2">예시 데이터</span>;

/** Who wrote it, without a name: 본전공 · 학년, and which 다전공·부전공·마이크로디그리 they are on. */
export default function CommunityBadge({ badge }: { badge: Badge }) {
  const b = badgeParts(badge);
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="font-semibold text-ink-2">익명 · {b.who}</span>
      {b.stage && <span className="rounded-md bg-sand px-1.5 py-px font-semibold text-ink-2">{b.stage}</span>}
      {b.combo && <span className="rounded-md bg-accent-soft px-1.5 py-px font-semibold text-accent-deep">{b.combo}</span>}
    </span>
  );
}
