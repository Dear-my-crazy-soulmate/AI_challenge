import depts from "../../../data/curated/credits_global.json";
import issues from "../../../data/curated/credits_global_issues.json";
import MajorPlanner from "@/components/MajorPlanner";
import type { CreditData } from "@/lib/rules/credits";

const data = { depts, issues } as unknown as CreditData;

export default function OnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">내 전공 조합 계획하기</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        국제캠퍼스 2026학년도 교육과정 기준입니다. 본전공과 희망 전공을 고르면 각각 몇 학점을, 어떤 과목으로 들어야
        하는지 보여 줍니다.
      </p>
      <MajorPlanner data={data} />
    </main>
  );
}
