"use client";

// 커뮤니티 목록: 다전공을 하고 있거나 고민하는 학생들의 이수 후기·질문·정보.
// Everything here is filtered by 이수 형태 and 전공 first, because that is how a student looks for it.
import Link from "next/link";
import { useMemo, useState } from "react";

import BrandMark from "@/components/BrandMark";
import CommunityBadge, { SampleTag } from "@/components/CommunityBadge";
import { useCommunity } from "@/components/useCommunity";
import { useAuth } from "@/lib/auth";
import { NO_FILTERS, filterPosts, summarizeReviews } from "@/lib/community/query";
import type { Filters } from "@/lib/community/query";
import { POST_TYPES, TYPE_LABEL } from "@/lib/community/types";
import type { Post } from "@/lib/community/types";
import { MODE_NAME } from "@/lib/goal";
import type { GoalMode } from "@/lib/goal";

const FORMS: GoalMode[] = ["double", "minor", "microdegree"];
export const fmtDate = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`;

const chip = (on: boolean) =>
  `flex-none whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold ${
    on ? "border-accent bg-accent text-white" : "border-edge bg-card text-ink-2"
  }`;

function snippet(p: Post): string {
  if (p.type === "review" && p.review) return `👍 ${p.review.pros}`;
  return p.body.replace(/\s+/g, " ");
}

export default function CommunityHome() {
  const { posts, comments } = useCommunity();
  const { profile } = useAuth();
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const set = (patch: Partial<Filters>) => setF((cur) => ({ ...cur, ...patch }));

  const shown = useMemo(() => filterPosts(posts, f), [posts, f]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of comments) m.set(c.postId, (m.get(c.postId) ?? 0) + 1);
    return m;
  }, [comments]);

  const narrowed = f.form !== "all" || f.text.trim() !== "" || f.interests !== null;
  const summary = narrowed ? summarizeReviews(shown) : null;
  const interests = profile?.interests ?? [];

  return (
    <main className="flex flex-col gap-3.5 px-[18px] pb-8 pt-[max(14px,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between px-1">
        <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-[-0.5px]">
          <BrandMark />
          커뮤니티
        </h1>
        <Link href="/community/write" className="flex h-9 items-center rounded-[18px] bg-accent px-3.5 text-[13px] font-bold text-white active:opacity-90">
          글쓰기
        </Link>
      </header>
      <p className="px-1 text-[13px] leading-normal text-mute">다전공을 하고 있거나 고민하는 학생들의 이야기예요. 모두 익명이고, 본전공과 어떤 전공을 하는지만 보여요.</p>

      <label className="flex h-12 items-center gap-2.5 rounded-[14px] border border-edge bg-card px-3.5">
        <span aria-hidden className="box-border h-3.5 w-3.5 flex-none rounded-full border-2 border-faint" />
        <input
          type="search"
          value={f.text}
          onChange={(e) => set({ text: e.target.value })}
          placeholder="전공 이름이나 키워드로 검색"
          aria-label="커뮤니티 검색"
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
        />
      </label>

      <div className="no-scrollbar -mx-[18px] flex gap-1.5 overflow-x-auto px-[18px]" role="group" aria-label="글 종류">
        {(["all", ...POST_TYPES] as const).map((t) => (
          <button key={t} type="button" aria-pressed={f.type === t} onClick={() => set({ type: t })} className={chip(f.type === t)}>
            {t === "all" ? "전체" : TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="no-scrollbar -mx-[18px] flex gap-1.5 overflow-x-auto px-[18px]" role="group" aria-label="이수 형태">
        {(["all", ...FORMS] as const).map((m) => (
          <button key={m} type="button" aria-pressed={f.form === m} onClick={() => set({ form: m })} className={chip(f.form === m)}>
            {m === "all" ? "모든 형태" : MODE_NAME[m]}
          </button>
        ))}
        {interests.length > 0 && (
          <button
            type="button"
            aria-pressed={f.interests !== null}
            onClick={() => set({ interests: f.interests ? null : interests })}
            className={chip(f.interests !== null)}
          >
            내 관심 전공
          </button>
        )}
        {profile && (
          <button type="button" aria-pressed={f.mineOnly} onClick={() => set({ mineOnly: !f.mineOnly })} className={chip(f.mineOnly)}>
            내 글
          </button>
        )}
      </div>

      {summary && (
        <section aria-label="후기 요약" className="flex flex-col gap-2 rounded-[20px] bg-accent px-[18px] py-4 text-white">
          <span className="text-xs opacity-65">이 조건의 이수 후기 요약</span>
          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-bold leading-none tabular-nums">{summary.count}</span>
            <span className="text-sm opacity-75">개의 후기</span>
          </div>
          <p className="text-[13px] leading-normal opacity-85">
            학업 부담 평균 <b className="tabular-nums">{summary.avgLoad}</b>/4 ({summary.loadLabel}) · 이수 중 {summary.doing}명 · 이수 완료 {summary.done}명
          </p>
          <p className="text-[11px] opacity-60">후기 수와 평균은 코드로 계산한 값이에요. 개인의 경험이라 사람마다 달라요.</p>
        </section>
      )}

      <ul className="flex flex-col gap-2.5">
        {shown.map((p) => (
          <li key={p.id}>
            <Link href={`/community/post?id=${encodeURIComponent(p.id)}`} className="flex flex-col gap-2 rounded-[20px] border border-edge bg-card p-4 active:scale-[.99]">
              <span className="flex items-center gap-1.5">
                <span className={`rounded-md px-1.5 py-px text-[11px] font-bold ${p.type === "review" ? "bg-accent-soft text-accent-deep" : "bg-sand text-ink-2"}`}>
                  {TYPE_LABEL[p.type]}
                </span>
                {p.is_sample && <SampleTag />}
                {p.mine && <span className="rounded-md bg-ok-soft px-1.5 py-px text-[11px] font-semibold text-ok">내 글</span>}
              </span>
              <span className="text-pretty text-base font-bold leading-[1.4]">{p.title}</span>
              {snippet(p) && <span className="line-clamp-2 text-pretty text-[13px] leading-normal text-ink-2">{snippet(p)}</span>}
              <CommunityBadge badge={p.badge} />
              <span className="flex gap-2 text-xs text-mute">
                <span>{fmtDate(p.createdAt)}</span>
                <span>댓글 {counts.get(p.id) ?? 0}</span>
                {p.review && <span>학업 부담 {p.review.load}/4</span>}
              </span>
            </Link>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="flex flex-col gap-2 rounded-[20px] border border-edge bg-card px-[18px] py-6 text-center">
            <span className="text-[15px] font-semibold">조건에 맞는 글이 없어요</span>
            <span className="text-[13px] text-mute">검색어를 바꾸거나, 이 조합의 첫 글을 남겨 보세요.</span>
          </li>
        )}
      </ul>
    </main>
  );
}
