"use client";

// 학과 상세: 그 학과 학생들이 남긴 정보를 항목별로 요약해서 보여 주고, 글과 질문을 이어서 볼 수 있다.
// 요약 숫자(학업 부담 평균, 분위기 키워드, 동아리 목록 등)는 글에서 코드로 센 값이다.
import Link from "next/link";
import { useState } from "react";

import PostRow from "@/components/PostRow";
import ScreenHeader from "@/components/ScreenHeader";
import { useCommunity } from "@/components/useCommunity";
import { highlights, newestFirst, statsByDept } from "@/lib/community/query";
import { CATEGORIES } from "@/lib/community/schema";
import { CATEGORY_IDS } from "@/lib/community/types";
import type { Category } from "@/lib/community/types";
import type { DeptOption } from "@/lib/depts";

type View = "all" | "question" | Category;
const chip = (on: boolean) =>
  `hit flex-none whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold ${on ? "border-accent bg-accent text-white" : "border-edge bg-card text-ink-2"}`;
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
        <Link href="/community" className="box-border flex h-[50px] items-center justify-center rounded-2xl border border-edge bg-card text-[15px] font-semibold">
          학과 목록으로
        </Link>
      </main>
    );
  }

  const mine = posts.filter((p) => p.dept === dept.dept);
  const stat = statsByDept(mine).get(dept.dept);
  const commentCount = (id: string) => comments.filter((c) => c.postId === id).length;
  const shown = newestFirst(
    view === "all" ? mine : view === "question" ? mine.filter((p) => p.type === "question") : mine.filter((p) => p.type === "info" && p.category === view),
  );

  return (
    <main className="flex flex-col gap-3.5 px-[22px] pb-10 pt-[max(6px,env(safe-area-inset-top))]">
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

      <div className="no-scrollbar -mx-[22px] flex gap-1.5 overflow-x-auto px-[22px] -my-[3px] py-[3px]" role="group" aria-label="보기">
        <button type="button" aria-pressed={view === "all"} onClick={() => setView("all")} className={chip(view === "all")}>
          전체
        </button>
        {CATEGORY_IDS.map((c) => (
          <button key={c} type="button" aria-pressed={view === c} onClick={() => setView(c)} className={chip(view === c)}>
            {CATEGORIES[c].label}
            {stat?.byCategory[c] ? ` ${stat.byCategory[c]}` : ""}
          </button>
        ))}
        <button type="button" aria-pressed={view === "question"} onClick={() => setView("question")} className={chip(view === "question")}>
          질문{stat?.questions ? ` ${stat.questions}` : ""}
        </button>
      </div>

      {view === "all" && (
        <section aria-label="항목별 요약" className="flex flex-col gap-2.5">
          {CATEGORY_IDS.map((c) => {
            const lines = highlights(c, mine);
            const def = CATEGORIES[c];
            return (
              <div key={c} className="flex flex-col gap-2.5 rounded-3xl border border-edge bg-card p-[18px]">
                <button type="button" onClick={() => setView(c)} className="flex items-start justify-between gap-3 text-left">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{def.label}</span>
                    <span className="text-xs text-mute">{def.desc}</span>
                  </span>
                  <span className={`whitespace-nowrap text-xs font-semibold ${lines.length ? "text-accent-deep" : "text-mute"}`}>
                    {stat?.byCategory[c] ? `글 ${stat.byCategory[c]}개 ›` : "아직 없어요"}
                  </span>
                </button>
                {lines.length > 0 ? (
                  <dl className="flex flex-col gap-1.5 border-t border-line-2 pt-2.5">
                    {lines.slice(0, 3).map((l) => (
                      <div key={l.label} className="grid grid-cols-[84px_1fr] gap-2 text-[13px] leading-normal">
                        <dt className="text-mute">{l.label}</dt>
                        <dd className="text-pretty font-semibold">{l.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <Link href={writeHref(dept.dept, `&category=${c}`)} className="text-[13px] font-semibold text-accent-deep">
                    첫 번째로 알려 주세요 ›
                  </Link>
                )}
              </div>
            );
          })}
        </section>
      )}

      {view !== "all" && view !== "question" && (
        <section aria-label={`${CATEGORIES[view].label} 요약`} className="flex flex-col gap-2 rounded-3xl border border-edge bg-card p-[18px]">
          <h3 className="text-[15px] font-bold">{CATEGORIES[view].label}</h3>
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
          <div className="flex flex-col gap-2 rounded-3xl border border-edge bg-card px-[18px] py-6 text-center">
            <span className="text-[15px] font-semibold">아직 글이 없어요</span>
            <Link href={writeHref(dept.dept, view !== "all" && view !== "question" ? `&category=${view}` : view === "question" ? "&type=question" : "")} className="text-[13px] font-semibold text-accent-deep">
              첫 번째로 남겨 보세요 ›
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
