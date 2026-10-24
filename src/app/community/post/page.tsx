import type { Metadata } from "next";
import { Suspense } from "react";

import PostDetail from "@/components/PostDetail";
import PostDetailFromUrl from "@/components/PostDetailFromUrl";

export const metadata: Metadata = { title: "글 보기 · 다전공 길잡이" };

export default function PostPage() {
  return (
    <Suspense fallback={<PostDetail id={null} />}>
      <PostDetailFromUrl />
    </Suspense>
  );
}
