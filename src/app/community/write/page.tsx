import type { Metadata } from "next";
import { Suspense } from "react";

import depts from "../../../../data/curated/credits_global.json";
import issues from "../../../../data/curated/credits_global_issues.json";
import PostForm from "@/components/PostForm";
import PostFormFromUrl from "@/components/PostFormFromUrl";
import { listDepts } from "@/lib/depts";
import type { CreditData } from "@/lib/rules/credits";

export const metadata: Metadata = { title: "글쓰기 · 다전공 길잡이" };

const options = listDepts({ depts, issues } as unknown as CreditData);

export default function WritePage() {
  return (
    <Suspense fallback={<PostForm depts={options} start={{ dept: null, type: "info", category: null }} />}>
      <PostFormFromUrl depts={options} />
    </Suspense>
  );
}
