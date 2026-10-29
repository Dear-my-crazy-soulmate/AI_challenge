"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import CommunityBadge, { PostTags, SampleTag } from "@/components/CommunityBadge";
import { ErrorNote, secondaryButton } from "@/components/Field";
import ScreenHeader from "@/components/ScreenHeader";
import { commentStoreFor, getCommunityStore, isSamplePost, useCommunity } from "@/components/useCommunity";
import { useAuth } from "@/lib/auth";
import { buildComment } from "@/lib/community/compose";
import { fmtDate } from "@/lib/community/format";
import { newId } from "@/lib/community/local";
import { CATEGORIES, LOAD_LABEL } from "@/lib/community/schema";
import type { FieldDef } from "@/lib/community/schema";
import { LIMITS } from "@/lib/community/types";
import type { Comment, FieldValue } from "@/lib/community/types";

/** a stored field value as the text a reader sees */
function show(def: FieldDef, v: FieldValue | undefined): string {
  if (v === undefined) return "";
  if (def.kind === "scale" && typeof v === "number") return `${LOAD_LABEL[v - 1]} (${v}/4)`;
  return Array.isArray(v) ? v.join(" · ") : String(v);
}

const Row = ({ k, children }: { k: string; children: string }) => (
  <div className="grid grid-cols-[88px_1fr] gap-2 text-[13px] leading-normal">
    <span className="text-mute">{k}</span>
    <span className="text-pretty whitespace-pre-wrap font-medium text-ink-2">{children}</span>
  </div>
);

export default function PostDetail({ id }: { id: string | null }) {
  const router = useRouter();
  const { posts, comments, loading } = useCommunity();
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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
  const ids = new Set(list.map((c) => c.id));
  // a reply whose parent is gone is shown as a top-level comment rather than lost
  const tops = list.filter((c) => !c.parentId || !ids.has(c.parentId));
  const repliesTo = (id: string) => list.filter((c) => c.parentId === id);
  const replying = list.find((c) => c.id === replyTo) ?? null;
  const def = post.category ? CATEGORIES[post.category] : null;
  const rows = post.type === "info" && def ? def.fields.flatMap((f) => (post.fields[f.key] === undefined ? [] : [{ f, text: show(f, post.fields[f.key]) }])) : [];
  const deptHref = `/community/dept?name=${encodeURIComponent(post.dept)}`;

  async function send() {
    if (!profile || !post) return;
    const c = buildComment(post.id, text, { primary: profile.primary, grade: profile.grade }, newId("c"), new Date(), replying?.id);
    if (!c.ok) return setError(c.message);
    setBusy(true);
    const r = await commentStoreFor(post.id).addComment(c.value);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setText("");
    setError("");
    setReplyTo(null);
  }

  async function removePost(postId: string, back: string) {
    const r = await getCommunityStore().deletePost(postId);
    if (!r.ok) return setError(r.message);
    router.push(back);
  }

  function startReply(commentId: string) {
    setReplyTo(commentId);
    const box = document.getElementById("comment-box");
    box?.scrollIntoView({ behavior: "smooth", block: "center" });
    box?.focus({ preventScroll: true });
  }

  const commentItem = (c: Comment, reply: boolean) => (
    <div className={`flex flex-col gap-1.5 py-3.5 ${reply ? "pl-7" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5">
          {reply && <span aria-hidden className="-ml-5 text-mute">ㄴ</span>}
          <CommunityBadge badge={c.badge} dept={post?.dept} />
        </span>
        {c.is_sample && <SampleTag />}
      </div>
      <p className="text-pretty whitespace-pre-wrap text-[15px] leading-[1.6]">{c.body}</p>
      <div className="flex items-center gap-3 text-xs text-mute">
        <span>{fmtDate(c.createdAt)}</span>
        {profile && (
          <button type="button" onClick={() => startReply(reply ? (c.parentId ?? c.id) : c.id)} className="hit font-semibold text-ink-2">
            답글쓰기
          </button>
        )}
        {c.mine && (
          <button type="button" onClick={() => void removeComment(c.id)} className="hit ml-auto font-semibold text-accent-deep">
            삭제
          </button>
        )}
      </div>
    </div>
  );

  async function removeComment(commentId: string) {
    const r = await commentStoreFor(post?.id ?? "").deleteComment(commentId);
    if (!r.ok) setError(r.message);
  }

  return (
    <main className="flex flex-col gap-4 px-[22px] pb-10 pt-[max(6px,env(safe-area-inset-top))]">
      <ScreenHeader
        title="커뮤니티"
        backHref={deptHref}
        right={
          post.mine && (
            <button type="button" onClick={() => setConfirming(true)} className="hit text-sm font-semibold text-accent-deep">
              삭제
            </button>
          )
        }
      />

      <article className="flex flex-col gap-3">
        <span className="flex flex-wrap items-center gap-1.5">
          <Link href={deptHref} className="rounded-md bg-ink px-1.5 py-px text-xs font-bold text-paper">
            {post.dept}
          </Link>
          <PostTags post={post} />
          {post.is_sample && <SampleTag />}
        </span>
        <h2 className="text-pretty text-[22px] font-bold leading-[1.35] tracking-[-0.5px]">{post.title}</h2>
        <div className="flex items-center justify-between gap-3">
          <CommunityBadge badge={post.badge} />
          <span className="flex-none text-xs text-mute">{fmtDate(post.createdAt)}</span>
        </div>

        {rows.length > 0 && (
          <section aria-label="학과 정보" className="flex flex-col gap-1.5 rounded-xl bg-sand px-3.5 py-3">
            {rows.map((r) => (
              <Row key={r.f.key} k={r.f.label}>
                {r.text}
              </Row>
            ))}
          </section>
        )}
        {post.body && <p className="text-pretty whitespace-pre-wrap text-[15px] leading-[1.7]">{post.body}</p>}

      </article>

      <section aria-label="댓글" className="mt-6 flex flex-col gap-3 border-t-8 border-sand pt-6">
        <h3 className="text-[17px] font-bold">댓글 {list.length}</h3>
        {tops.length > 0 && (
          <ul className="-mt-1 flex flex-col divide-y divide-line border-y border-line">
            {tops.map((c) => (
              <li key={c.id}>
                {commentItem(c, false)}
                {repliesTo(c.id).map((r) => (
                  <div key={r.id} className="border-t border-line-2 bg-sand/40">
                    {commentItem(r, true)}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
        {list.length === 0 && <p className="text-sm text-mute">아직 댓글이 없어요. {post.type === "question" ? "아는 만큼 답해 주세요." : "첫 댓글을 남겨 보세요."}</p>}

        {profile ? (
          <div className="flex flex-col gap-2">
            {replying && (
              <div className="flex items-center justify-between gap-2 text-xs text-ink-2">
                <span className="truncate">
                  <b>답글</b> · {replying.body}
                </span>
                <button type="button" onClick={() => setReplyTo(null)} className="hit flex-none font-semibold text-mute">
                  취소
                </button>
              </div>
            )}
            <div className="flex flex-col rounded-2xl border border-edge bg-white focus-within:border-accent">
              <textarea
                id="comment-box"
                aria-label={replying ? "답글 쓰기" : "댓글 쓰기"}
                rows={2}
                value={text}
                maxLength={LIMITS.comment}
                onChange={(e) => setText(e.target.value)}
                placeholder={replying ? "답글을 남겨 주세요" : "경험이나 의견을 나눠 주세요"}
                className="field-sizing-content max-h-40 min-h-[3.5rem] resize-none rounded-t-2xl bg-transparent px-3.5 pt-3 text-base leading-normal outline-none"
              />
              <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-1">
                <span className="text-xs tabular-nums text-mute">
                  {text.length}/{LIMITS.comment}
                </span>
                <button
                  type="button"
                  onClick={send}
                  disabled={busy || text.trim() === ""}
                  className="hit h-8 rounded-full bg-accent px-4 text-[13px] font-bold text-white active:opacity-90 disabled:bg-sand-2 disabled:text-ink-2"
                >
                  {busy ? "올리는 중…" : "올리기"}
                </button>
              </div>
            </div>
            <ErrorNote message={error} />
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

      {confirming && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-8" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
          <button type="button" aria-label="닫기" onClick={() => setConfirming(false)} className="absolute inset-0 bg-ink/40" />
          <div className="relative flex w-full max-w-[320px] flex-col gap-5 rounded-3xl bg-paper px-5 pb-5 pt-6">
            <p id="delete-title" className="text-center text-base font-bold">
              정말 삭제하시겠습니까?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" autoFocus onClick={() => setConfirming(false)} className="h-12 rounded-2xl bg-sand-2 text-[15px] font-semibold text-ink">
                아니요
              </button>
              <button type="button" onClick={() => { setConfirming(false); void removePost(post.id, deptHref); }} className="h-12 rounded-2xl bg-accent text-[15px] font-bold text-white">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
