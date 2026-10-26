import type { Metadata } from "next";
import { Suspense } from "react";

import depts from "../../../../data/curated/credits_global.json";
import issues from "../../../../data/curated/credits_global_issues.json";
import DeptView from "@/components/DeptView";
import DeptViewFromUrl from "@/components/DeptViewFromUrl";
import { listDepts } from "@/lib/depts";
import type { CreditData } from "@/lib/rules/credits";

export const metadata: Metadata = { title: "학과 이야기 · 다전공 길잡이" };

const options = listDepts({ depts, issues } as unknown as CreditData);

export default function DeptPage() {
  // static page: the ?name= query is read in the browser
  return (
    <Suspense fallback={<DeptView depts={options} name={null} />}>
      <DeptViewFromUrl depts={options} />
    </Suspense>
  );
}
