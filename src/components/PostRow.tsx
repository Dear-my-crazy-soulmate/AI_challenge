import Link from "next/link";

import CommunityBadge, { PostTags, SampleTag } from "@/components/CommunityBadge";
import { fmtDate } from "@/lib/community/format";
import type { Post } from "@/lib/community/types";

/** One post in a list: what it is, which department, who wrote it. */
export default function PostRow({ post, comments, showDept = false }: { post: Post; comments: number; showDept?: boolean }) {
  return (
    <Link href={`/community/post?id=${encodeURIComponent(post.id)}`} className="flex flex-col gap-2 rounded-3xl border border-edge bg-white p-4 active:scale-[.99]">
      <span className="flex flex-wrap items-center gap-1.5">
        {showDept && <span className="rounded-md bg-ink px-1.5 py-px text-xs font-bold text-paper">{post.dept}</span>}
        <PostTags post={post} />
        {post.is_sample && <SampleTag />}
        {post.mine && <span className="rounded-md bg-ok-soft px-1.5 py-px text-xs font-semibold text-ok">내 글</span>}
      </span>
      <span className="text-pretty text-base font-bold leading-[1.4]">{post.title}</span>
      <CommunityBadge badge={post.badge} />
      <span className="flex gap-2 text-xs text-mute">
        <span>{fmtDate(post.createdAt)}</span>
        {post.type === "question" && <span>댓글 {comments}</span>}
      </span>
    </Link>
  );
}
