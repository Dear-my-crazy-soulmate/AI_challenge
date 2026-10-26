"use client";

import { useSearchParams } from "next/navigation";

import PostForm from "@/components/PostForm";
import { CATEGORY_IDS } from "@/lib/community/types";
import type { Category } from "@/lib/community/types";
import type { DeptOption } from "@/lib/depts";

/** /community/write?dept=...&type=question&category=clubs opens the form already filled in (from a department page). */
export default function PostFormFromUrl({ depts }: { depts: DeptOption[] }) {
  const sp = useSearchParams();
  const category = sp.get("category");
  const dept = sp.get("dept");
  return (
    <PostForm
      depts={depts}
      start={{
        dept: depts.some((d) => d.dept === dept) ? dept : null,
        type: sp.get("type") === "question" ? "question" : "info",
        category: CATEGORY_IDS.includes(category as Category) ? (category as Category) : null,
      }}
    />
  );
}
