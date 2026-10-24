import type { Metadata } from "next";

import depts from "../../../data/curated/credits_global.json";
import issues from "../../../data/curated/credits_global_issues.json";
import SignupForm from "@/components/SignupForm";
import { listDepts } from "@/lib/depts";
import type { CreditData } from "@/lib/rules/credits";

export const metadata: Metadata = { title: "가입하기 · 다전공 길잡이" };

const options = listDepts({ depts, issues } as unknown as CreditData);

export default function SignupPage() {
  return <SignupForm depts={options} />;
}
