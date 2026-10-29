"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import CommunityBadge, { SampleTag } from "@/components/CommunityBadge";
import { Area, ErrorNote, primaryButton, secondaryButton } from "@/components/Field";
import ScreenHeader from "@/components/ScreenHeader";
import { commentStoreFor, getCommunityStore, isSamplePost, useCommunity } from "@/components/useCommunity";
import { useAuth } from "@/lib/auth";
import { buildComment } from "@/lib/community/compose";
import { fmtDate } from "@/lib/community/format";
import { newId } from "@/lib/community/local";
import { CATEGORIES, LOAD_LABEL } from "@/lib/community/schema";
import type { FieldDef } from "@/lib/community/schema";
import { LIMITS, TYPE_LABEL } from "@/lib/community/types";
import type { FieldValue } from "@/lib/community/types";

/** a stored field value as the text a reader sees */
function show(def: FieldDef, v: FieldValue | undefined): string {
  if (v === undefined) return "";
  if (def.kind === "scale" && typeof v === "number") return `${LOAD_LABEL[v - 1]} (${v}/4)`;
  return Array.isArray(v) ? v.join(" · ") : String(v);
}

const Row = ({ k, children }: { k: string; children: string }) => (
  <div className="flex flex-col gap-1 border-t border-line-2 py-3 first:border-t-0 first:pt-0 last:pb-0">
    <span className="text-xs font-semibold text-mute">{k}</span>
    <span className="text-pretty whitespace-pre-wrap text-[15px] leading-[1.55]">{children}</span>
  </div>
);

export default function PostDetail({ id }: { id: string | null }) {
  const router = useRouter();
  const { posts, comments, loading } = useCommunity();
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const post = posts.find((p) => p.id === id);
  if (!post && loading) {
    return (
      <main className="flex flex-col gap-4 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
        <ScreenHeader title="커뮤니티" backHref="/community" />
        <p className="text-sm text-mute">글을 불러오는 중…</p>
      </main>
    );
  }
  if (!post) {
    return (
      <main className="flex flex-col gap-4 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
        <ScreenHeader title="커뮤니티" backHref="/community" />
        <h2 className="text-xl font-bold">글을 찾을 수 없어요</h2>
        <p className="text-sm text-mute">삭제되었거나 없는 글이에요.</p>
        <Link href="/community" className={secondaryButton}>
          커뮤니티로
        </Link>
      </main>
    );
  }

  const list = comments.filter((c) => c.postId === post.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const def = post.category ? CATEGORIES[post.category] : null;
  const rows = post.type === "info" && def ? def.fields.flatMap((f) => (post.fields[f.key] === undefined ? [] : [{ f, text: show(f, post.fields[f.key]) }])) : [];
  const deptHref = `/community/dept?name=${encodeURIComponent(post.dept)}`;

  async function send() {
    if (!profile || !post) return;
    const c = buildComment(post.id, text, { primary: profile.primary, grade: profile.grade }, newId("c"), new Date());
    if (!c.ok) return setError(c.message);
    setBusy(true);
    const r = await commentStoreFor(post.id).addComment(c.value);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setText("");
    setError("");
  }

  async function removePost(postId: string, back: string) {
    const r = await getCommunityStore().deletePost(postId);
    if (!r.ok) return setError(r.message);
    router.push(back);
  }

  async function removeComment(commentId: string) {
    const r = await commentStoreFor(post?.id ?? "").deleteComment(commentId);
    if (!r.ok) setError(r.message);
  }

  return (
    <main className="flex flex-col gap-4 px-[22px] pb-10 pt-[max(6px,env(safe-area-inset-top))]">
      <ScreenHeader title="커뮤니티" backHref={deptHref} />

      <article className="flex flex-col gap-3">
        <span className="flex flex-wrap items-center gap-1.5">
          <Link href={deptHref} className="rounded-md bg-ink px-1.5 py-px text-xs font-bold text-paper">
            {post.dept}
          </Link>
          <span className={`rounded-md px-1.5 py-px text-xs font-bold ${post.type === "question" ? "bg-sand text-ink-2" : "bg-accent-soft text-accent-deep"}`}>
            {post.type === "question" ? TYPE_LABEL.question : def?.label}
          </span>
          {post.type === "question" && def && <span className="rounded-md bg-sand px-1.5 py-px text-xs font-semibold text-ink-2">{def.label}</span>}
          {post.is_sample && <SampleTag />}
        </span>
        <h2 className="text-pretty text-[22px] font-bold leading-[1.35] tracking-[-0.5px]">{post.title}</h2>
        <div className="flex flex-col gap-1.5">
          <CommunityBadge badge={post.badge} />
          <span className="text-xs text-mute">{fmtDate(post.createdAt)}</span>
        </div>

        {rows.length > 0 && (
          <section aria-label="학과 정보" className="flex flex-col gap-3 rounded-3xl border border-edge bg-card p-[18px]">
            {rows.map((r) => (
              <Row key={r.f.key} k={r.f.label}>
                {r.text}
              </Row>
            ))}
          </section>
        )}
        {post.body && <p className="text-pretty whitespace-pre-wrap text-[15px] leading-[1.7]">{post.body}</p>}

        <Link href={deptHref} className={secondaryButton}>
          {post.dept}의 다른 이야기 보기
        </Link>
        {post.mine && (
          <button
            type="button"
            onClick={() => void removePost(post.id, deptHref)}
            className="h-11 text-sm font-semibold text-accent-deep"
          >
            내 글 삭제
          </button>
        )}
      </article>

      <section aria-label="댓글" className="flex flex-col gap-3">
        <h3 className="text-[15px] font-bold">댓글 {list.length}</h3>
        {list.map((c) => (
          <div key={c.id} className="flex flex-col gap-1.5 rounded-2xl border border-edge bg-card px-4 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <CommunityBadge badge={c.badge} dept={post.dept} />
              {c.is_sample && <SampleTag />}
            </div>
            <p className="text-pretty whitespace-pre-wrap text-sm leading-[1.6]">{c.body}</p>
            <div className="flex items-center justify-between text-xs text-mute">
              <span>{fmtDate(c.createdAt)}</span>
              {c.mine && (
                <button type="button" onClick={() => void removeComment(c.id)} className="font-semibold text-accent-deep">
                  삭제
                </button>
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-mute">아직 댓글이 없어요. {post.type === "question" ? "아는 만큼 답해 주세요." : "첫 댓글을 남겨 보세요."}</p>}

        {profile ? (
          <div className="flex flex-col gap-2">
            <Area label="댓글 쓰기" value={text} maxLength={LIMITS.comment} onChange={(e) => setText(e.target.value)} placeholder="경험이나 의견을 나눠 주세요" />
            <ErrorNote message={error} />
            <button type="button" onClick={send} disabled={busy || text.trim() === ""} className={primaryButton}>
              {busy ? "올리는 중…" : "댓글 올리기"}
            </button>
            {isSamplePost(post.id) && getCommunityStore().kind === "server" && (
              <p className="text-xs leading-normal text-mute">예시 글에 단 댓글은 이 기기에만 저장돼요. 직접 쓴 글의 댓글은 모두에게 보여요.</p>
            )}
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
