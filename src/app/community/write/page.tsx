import type { Metadata } from "next";

import depts from "../../../../data/curated/credits_global.json";
import issues from "../../../../data/curated/credits_global_issues.json";
import microdegrees from "../../../../data/curated/2026/microdegrees.json";
import PostForm from "@/components/PostForm";
import { listDepts } from "@/lib/depts";
import type { CreditData } from "@/lib/rules/credits";
import { listMicrodegrees } from "@/lib/rules/microdegrees";
import type { MicrodegreeData } from "@/lib/rules/microdegrees";

export const metadata: Metadata = { title: "글쓰기 · 다전공 길잡이" };

const options = listDepts({ depts, issues } as unknown as CreditData);
const mds = listMicrodegrees(microdegrees as unknown as MicrodegreeData).map((m) => ({ id: m.id, name: m.name, depts: m.depts }));

export default function WritePage() {
  return <PostForm depts={options} mds={mds} />;
}
