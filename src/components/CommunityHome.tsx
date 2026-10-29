"use client";

// 커뮤니티 첫 화면: 학과 중심. 같은 학과라도 배우는 것, 분위기, 동아리가 다르니
// 학과를 골라 그 학과 학생들이 직접 남긴 정보를 항목별로 모아 본다.
import Link from "next/link";
import { useMemo, useState } from "react";

import { SearchIcon } from "@/components/Icons";
import Avatar from "@/components/Avatar";
import BrandMark from "@/components/BrandMark";
import PostRow from "@/components/PostRow";
import { useCommunity } from "@/components/useCommunity";
import { useAuth } from "@/lib/auth";
import { newestFirst, statsByDept } from "@/lib/community/query";
import type { DeptOption } from "@/lib/depts";

const chip = (on: boolean) =>
  `hit flex-none whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold ${on ? "border-accent bg-accent text-white" : "border-edge bg-white text-ink-2"}`;
const deptHref = (dept: string) => `/community/dept?name=${encodeURIComponent(dept)}`;

export default function CommunityHome({ depts }: { depts: DeptOption[] }) {
  const { posts, comments } = useCommunity();
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [college, setCollege] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => statsByDept(posts), [posts]);
  const commentCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of comments) m.set(c.postId, (m.get(c.postId) ?? 0) + 1);
    return m;
  }, [comments]);
  const colleges = useMemo(() => [...new Set(depts.map((d) => d.college))], [depts]);

  const q = text.replace(/\s/g, "");
  const rows = depts
    .filter((d) => (!q || d.dept.replace(/\s/g, "").includes(q)) && (q || !college || d.college === college))
    .sort((a, b) => (stats.get(b.dept)?.total ?? 0) - (stats.get(a.dept)?.total ?? 0) || a.dept.localeCompare(b.dept));
  const filtering = q !== "" || college !== null;
  const visible = filtering || showAll ? rows : rows.slice(0, 8);
  const mine = profile ? depts.find((d) => d.dept === profile.primary) : undefined;
  const recent = newestFirst(posts).slice(0, 4);

  const countText = (dept: string) => {
    const s = stats.get(dept);
    return s ? `정보 ${s.info} · 질문 ${s.questions}` : "아직 글이 없어요";
  };

  return (
    <main className="flex flex-col gap-3.5 px-[22px] pb-8 pt-[max(14px,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between px-1">
        <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-[-0.5px]">
          <BrandMark />
          커뮤니티
        </h1>
        <Link href="/community/write" className="hit flex h-9 items-center rounded-full bg-accent px-3.5 text-[13px] font-bold text-white active:opacity-90">
          글쓰기
        </Link>
      </header>
      <p className="px-1 text-[13px] leading-normal text-mute">
        같은 학과라도 배우는 것, 분위기, 동아리는 달라요. 경희대 학생들이 학과별로 직접 남긴 정보를 항목별로 모아 봐요.
      </p>

      {mine && (
        <Link href={deptHref(mine.dept)} className="flex items-center justify-between gap-3 rounded-3xl bg-ink px-[18px] py-4 text-paper active:opacity-90">
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-xs opacity-65">내 학과</span>
            <span className="text-pretty text-lg font-bold">{mine.dept}</span>
            <span className="text-xs opacity-75">{countText(mine.dept)}</span>
          </span>
          <span aria-hidden className="text-2xl opacity-60">
            ›
          </span>
        </Link>
      )}
      {profile && profile.interests.length > 0 && (
        <section aria-label="관심 학과" className="flex flex-col gap-2.5">
          <h2 className="px-1 text-sm font-bold">관심 학과</h2>
          <div className="no-scrollbar -mx-[22px] flex gap-1.5 overflow-x-auto px-[22px] -my-[3px] py-[3px]">
            {profile.interests.map((d) => (
              <Link key={d} href={deptHref(d)} className={chip(false)}>
                {d}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-label="학과 찾기" className="flex flex-col gap-2.5">
        <h2 className="px-1 text-sm font-bold">학과별 이야기</h2>
        <label className="flex h-12 items-center gap-2.5 rounded-xl border border-edge bg-white px-3.5">
          <SearchIcon className="h-[18px] w-[18px] flex-none text-mute" />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="학과 이름으로 검색"
            aria-label="학과 검색"
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
          />
        </label>
        <div className="no-scrollbar -mx-[22px] flex gap-1.5 overflow-x-auto px-[22px] -my-[3px] py-[3px]" role="group" aria-label="단과대학">
          {[null, ...colleges].map((c) => (
            <button key={c ?? "all"} type="button" aria-pressed={college === c} onClick={() => setCollege(c)} className={chip(college === c)}>
              {c ?? "전체"}
            </button>
          ))}
        </div>
        <ul className="flex flex-col gap-2">
          {visible.map((d) => {
            const has = stats.has(d.dept);
            return (
              <li key={d.dept}>
                <Link
                  href={deptHref(d.dept)}
                  title={d.college}
                  className="box-border flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-white py-2 pl-2.5 pr-3.5 shadow-[0_1px_3px_rgba(28,27,24,.06)] transition-transform active:scale-[.985]"
                >
                  <Avatar dept={d.dept} size={34} />
                  <span className="min-w-0 flex-1 text-pretty text-[15px] font-semibold leading-snug">{d.dept}</span>
                  {has ? (
                    <span className="whitespace-nowrap rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-deep">{countText(d.dept)}</span>
                  ) : (
                    <span className="whitespace-nowrap text-xs text-mute">첫 글 기다리는 중</span>
                  )}
                </Link>
              </li>
            );
          })}
          {rows.length === 0 && <li className="rounded-2xl border border-line bg-white px-4 py-5 text-sm text-mute">찾는 학과가 없어요.</li>}
        </ul>
        {!filtering && rows.length > 8 && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="box-border flex h-12 items-center justify-center rounded-2xl border border-edge bg-white text-sm font-semibold">
            {showAll ? "접기" : `전체 ${rows.length}개 학과 보기`}
          </button>
        )}
      </section>

      {recent.length > 0 && (
        <section aria-label="최근 올라온 글" className="flex flex-col gap-2.5">
          <h2 className="px-1 text-sm font-bold">최근 올라온 글</h2>
          {recent.map((p) => (
            <PostRow key={p.id} post={p} comments={commentCount.get(p.id) ?? 0} showDept />
          ))}
        </section>
      )}
    </main>
  );
}
