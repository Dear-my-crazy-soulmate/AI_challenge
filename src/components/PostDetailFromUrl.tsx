"use client";

import { useSearchParams } from "next/navigation";

import PostDetail from "@/components/PostDetail";

/** /community/post?id=... (the page stays static, so the id is read in the browser). */
export default function PostDetailFromUrl() {
  return <PostDetail id={useSearchParams().get("id")} />;
}
