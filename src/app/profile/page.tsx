import type { Metadata } from "next";

import depts from "../../../data/curated/credits_global.json";
import issues from "../../../data/curated/credits_global_issues.json";
import ProfileView from "@/components/ProfileView";
import { listDepts } from "@/lib/depts";
import type { CreditData } from "@/lib/rules/credits";

export const metadata: Metadata = { title: "MY · 다전공 길잡이" };

const options = listDepts({ depts, issues } as unknown as CreditData);

export default function ProfilePage() {
  return <ProfileView depts={options} />;
}
