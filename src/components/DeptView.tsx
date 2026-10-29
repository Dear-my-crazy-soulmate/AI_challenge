"use client";

// 학과 상세: 그 학과 학생들이 남긴 정보를 항목별로 요약해서 보여 주고, 글과 질문을 이어서 볼 수 있다.
// 요약 숫자(학업 부담 평균, 분위기 키워드, 동아리 목록 등)는 글에서 코드로 센 값이다.
import Link from "next/link";
import { useState } from "react";

import { TONE } from "@/components/CommunityBadge";
import { CategoryIcon, WriteIcon } from "@/components/Icons";
import PostRow from "@/components/PostRow";
import ScreenHeader from "@/components/ScreenHeader";
import { useCommunity } from "@/components/useCommunity";
import { highlights, newestFirst, statsByDept } from "@/lib/community/query";
import { CATEGORIES } from "@/lib/community/schema";
import { CATEGORY_IDS } from "@/lib/community/types";
import type { Category } from "@/lib/community/types";
import type { DeptOption } from "@/lib/depts";

type View = "all" | "question" | Category;
const writeHref = (dept: string, extra = "") => `/community/write?dept=${encodeURIComponent(dept)}${extra}`;

export default function DeptView({ depts, name }: { depts: DeptOption[]; name: string | null }) {
  const { posts, comments } = useCommunity();
  const [view, setView] = useState<View>("all");

  const dept = depts.find((d) => d.dept === name);
  if (!dept) {
    return (
      <main className="flex flex-col gap-4 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
        <ScreenHeader title="학과" backHref="/community" />
        <h2 className="text-xl font-bold">학과를 찾을 수 없어요</h2>
        <Link href="/community" className="box-border flex h-[50px] items-center justify-center rounded-2xl border border-edge bg-white text-[15px] font-semibold">
          학과 목록으로
        </Link>
      </main>
    );
  }

  const mine = posts.filter((p) => p.dept === dept.dept);
  const stat = statsByDept(mine).get(dept.dept);
  const commentCount = (id: string) => comments.filter((c) => c.postId === id).length;
  const tabs: { id: View; label: string }[] = [
    { id: "all", label: "전체" },
    ...CATEGORY_IDS.map((c) => ({ id: c as View, label: CATEGORIES[c].label })),
    { id: "question", label: "질문" },
  ];
  // the write link opens the form already set to the tab being looked at
  const viewHref = writeHref(dept.dept, view !== "all" && view !== "question" ? `&category=${view}` : view === "question" ? "&type=question" : "");
  const shown = newestFirst(
    view === "all" ? mine : view === "question" ? mine.filter((p) => p.type === "question") : mine.filter((p) => p.type === "info" && p.category === view),
  );

  return (
    <main className="flex flex-col gap-3.5 px-[22px] pb-24 pt-[max(6px,env(safe-area-inset-top))]">
      <ScreenHeader title="학과" backHref="/community" />

      <section className="flex flex-col gap-3 rounded-3xl bg-ink px-5 py-5 text-paper">
        <div className="flex flex-col gap-1">
          <span className="text-xs opacity-65">{dept.college}</span>
          <h2 className="text-pretty text-[24px] font-bold leading-[1.25] tracking-[-0.5px]">{dept.dept}</h2>
        </div>
        <p className="text-[13px] opacity-80">
          정보 {stat?.info ?? 0}개 · 질문 {stat?.questions ?? 0}개{stat && stat.fromStudents > 0 ? ` · 이 학과를 다닌 학생의 글 ${stat.fromStudents}개` : ""}
        </p>
        <Link href={writeHref(dept.dept)} className="box-border flex h-11 items-center justify-center rounded-xl bg-accent text-[15px] font-bold text-white active:opacity-90">
          이 학과 이야기 남기기
        </Link>
      </section>

      <div className="no-scrollbar -mx-[22px] flex gap-1 overflow-x-auto px-[22px]" role="group" aria-label="보기">
        {tabs.map((t) => {
          const on = view === t.id;
          const n = t.id === "all" ? 0 : t.id === "question" ? (stat?.questions ?? 0) : (stat?.byCategory[t.id] ?? 0);
          return (
            <button key={t.id} type="button" aria-pressed={on} onClick={() => setView(t.id)} className="flex w-[76px] flex-none flex-col items-center gap-1.5 pb-1 pt-1 active:opacity-70">
              <span
                className="relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors"
                style={{ background: on ? TONE[t.id].fg : TONE[t.id].bg, color: on ? "#ffffff" : TONE[t.id].fg }}
              >
                <CategoryIcon id={t.id} className="h-6 w-6" />
                {n > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-ink px-1 text-[11px] font-bold leading-none text-white tabular-nums">
                    {n}
                  </span>
                )}
              </span>
              <span className={`text-pretty text-center text-xs leading-tight ${on ? "font-bold text-ink" : "font-medium text-ink-2"}`}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {view !== "all" && view !== "question" && (
        <section aria-label={`${CATEGORIES[view].label} 요약`} className="flex flex-col gap-2 rounded-3xl border border-edge bg-white p-[18px]">
          <h3 className="flex items-center gap-1.5 text-[15px] font-bold">
            <CategoryIcon id={view} className="h-[18px] w-[18px] flex-none text-accent-deep" />
            {CATEGORIES[view].label}
          </h3>
          {highlights(view, mine).length > 0 ? (
            <dl className="flex flex-col gap-1.5">
              {highlights(view, mine).map((l) => (
                <div key={l.label} className="grid grid-cols-[84px_1fr] gap-2 text-[13px] leading-normal">
                  <dt className="text-mute">{l.label}</dt>
                  <dd className="text-pretty font-semibold">{l.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-[13px] text-mute">아직 이 항목의 정보가 없어요.</p>
          )}
          <p className="text-xs text-mute">학생들이 쓴 글에서 코드로 센 값이에요. 사람마다 경험이 달라요.</p>
        </section>
      )}

      <section aria-label="글 목록" className="flex flex-col gap-2.5">
        <h3 className="px-1 text-sm font-bold">{view === "all" ? "최근 글" : view === "question" ? "질문" : `${CATEGORIES[view].label} 글`}</h3>
        {shown.map((p) => (
          <PostRow key={p.id} post={p} comments={commentCount(p.id)} />
        ))}
        {shown.length === 0 && (
          <div className="flex flex-col gap-2 rounded-3xl border border-edge bg-white px-[18px] py-6 text-center">
            <span className="text-[15px] font-semibold">아직 글이 없어요</span>
            <Link href={viewHref} className="text-[13px] font-semibold text-accent-deep">
              첫 번째로 남겨 보세요 ›
            </Link>
          </div>
        )}
      </section>

      {/* floats above the tab bar (62px) on the right edge of the 430px app column */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(78px+env(safe-area-inset-bottom))] z-20 mx-auto flex w-full max-w-[430px] justify-end px-5">
        <Link href={viewHref} aria-label="글쓰기" className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-lg active:opacity-85">
          <WriteIcon className="h-7 w-7" />
        </Link>
      </div>
    </main>
  );
}
