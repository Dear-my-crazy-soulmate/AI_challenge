import type { Metadata } from "next";

import depts from "../../../data/curated/credits_global.json";
import issues from "../../../data/curated/credits_global_issues.json";
import majorRules from "../../../data/curated/2026/major_rules.json";
import CommunityHome from "@/components/CommunityHome";
import { listDepts } from "@/lib/depts";
import type { CreditData } from "@/lib/rules/credits";
import type { MajorRules } from "@/lib/rules/majorRules";

export const metadata: Metadata = { title: "커뮤니티 · 다전공 길잡이" };

const options = listDepts({ depts, issues } as unknown as CreditData, majorRules as unknown as MajorRules);

export default function CommunityPage() {
  return <CommunityHome depts={options} />;
}
