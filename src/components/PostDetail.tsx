"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import CommunityBadge, { SampleTag } from "@/components/CommunityBadge";
import { fmtDate } from "@/components/CommunityHome";
import { Area, ErrorNote, primaryButton, secondaryButton } from "@/components/Field";
import ScreenHeader from "@/components/ScreenHeader";
import { useCommunity } from "@/components/useCommunity";
import { useGoal } from "@/components/useGoal";
import { useAuth } from "@/lib/auth";
import { buildComment } from "@/lib/community/compose";
import { newId, update, withComment, withoutComment, withoutPost } from "@/lib/community/local";
import { LIMITS, LOAD_LABEL, TYPE_LABEL } from "@/lib/community/types";

const Row = ({ k, children }: { k: string; children: string }) => (
  <div className="flex flex-col gap-1 border-t border-line-2 py-3 first:border-t-0 first:pt-0 last:pb-0">
    <span className="text-xs font-semibold text-mute">{k}</span>
    <span className="text-pretty whitespace-pre-wrap text-[15px] leading-[1.55]">{children}</span>
  </div>
);

export default function PostDetail({ id }: { id: string | null }) {
  const router = useRouter();
  const { posts, comments } = useCommunity();
  const { profile } = useAuth();
  const goal = useGoal();
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const post = posts.find((p) => p.id === id);
  if (!post) {
    return (
      <main className="flex flex-col gap-4 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
        <ScreenHeader title="커뮤니티" backHref="/community" />
        <h2 className="text-xl font-bold">글을 찾을 수 없어요</h2>
        <p className="text-sm text-mute">삭제되었거나 이 기기에 없는 글이에요.</p>
        <Link href="/community" className={secondaryButton}>
          목록으로
        </Link>
      </main>
    );
  }

  const list = comments.filter((c) => c.postId === post.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const r = post.review;
  const combo = post.badge.combo;
  const calcHref = combo ? `/onboarding?${new URLSearchParams({ primary: post.badge.primary, mode: combo.mode, second: combo.second })}` : null;

  function send() {
    if (!profile || !post) return;
    const mine = goal ? { mode: goal.mode, second: goal.second, secondName: goal.secondName } : null;
    const c = buildComment(post.id, text, { primary: profile.primary, grade: profile.grade }, mine, newId("c"), new Date());
    if (!c.ok) return setError(c.message);
    if (!update((s) => withComment(s, c.value))) return setError("이 브라우저에서는 저장할 수 없어요.");
    setText("");
    setError("");
  }

  return (
    <main className="flex flex-col gap-4 px-[22px] pb-10 pt-[max(6px,env(safe-area-inset-top))]">
      <ScreenHeader title="커뮤니티" backHref="/community" />

      <article className="flex flex-col gap-3">
        <span className="flex items-center gap-1.5">
          <span className="rounded-md bg-sand px-1.5 py-px text-[11px] font-bold text-ink-2">{TYPE_LABEL[post.type]}</span>
          {post.is_sample && <SampleTag />}
        </span>
        <h2 className="text-pretty text-[22px] font-bold leading-[1.35] tracking-[-0.5px]">{post.title}</h2>
        <div className="flex flex-col gap-1.5">
          <CommunityBadge badge={post.badge} />
          <span className="text-xs text-mute">{fmtDate(post.createdAt)}</span>
        </div>

        {r && (
          <section aria-label="후기 정보" className="flex flex-col gap-3 rounded-[20px] bg-card p-[18px]">
            <Row k="시작 시기">{`${r.startedGrade}학년 ${r.startedTerm}학기`}</Row>
            <Row k="학업 부담">{`${LOAD_LABEL[r.load]} (${r.load}/4)`}</Row>
            <Row k="장점">{r.pros}</Row>
            <Row k="단점">{r.cons}</Row>
            {r.forWhom && <Row k="이런 사람에게 추천">{r.forWhom}</Row>}
          </section>
        )}
        {post.body && <p className="text-pretty whitespace-pre-wrap text-[15px] leading-[1.7]">{post.body}</p>}

        {calcHref && (
          <Link href={calcHref} className={secondaryButton}>
            이 조합 학점 계산해 보기
          </Link>
        )}
        {post.mine && (
          <button
            type="button"
            onClick={() => {
              update((s) => withoutPost(s, post.id));
              router.push("/community");
            }}
            className="h-11 text-sm font-semibold text-accent-deep"
          >
            내 글 삭제
          </button>
        )}
      </article>

      <section aria-label="댓글" className="flex flex-col gap-3">
        <h3 className="text-[15px] font-bold">댓글 {list.length}</h3>
        {list.map((c) => (
          <div key={c.id} className="flex flex-col gap-1.5 rounded-2xl bg-card px-4 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <CommunityBadge badge={c.badge} />
              {c.is_sample && <SampleTag />}
            </div>
            <p className="text-pretty whitespace-pre-wrap text-sm leading-[1.6]">{c.body}</p>
            <div className="flex items-center justify-between text-xs text-mute">
              <span>{fmtDate(c.createdAt)}</span>
              {c.mine && (
                <button type="button" onClick={() => update((s) => withoutComment(s, c.id))} className="font-semibold text-accent-deep">
                  삭제
                </button>
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-mute">아직 댓글이 없어요. 첫 댓글을 남겨 보세요.</p>}

        {profile ? (
          <div className="flex flex-col gap-2">
            <Area label="댓글 쓰기" value={text} maxLength={LIMITS.comment} onChange={(e) => setText(e.target.value)} placeholder="경험이나 의견을 나눠 주세요" />
            <ErrorNote message={error} />
            <button type="button" onClick={send} disabled={text.trim() === ""} className={primaryButton}>
              댓글 올리기
            </button>
          </div>
        ) : (
          <Link href="/login" className={secondaryButton}>
            로그인하고 댓글 쓰기
          </Link>
        )}
      </section>
    </main>
  );
}
