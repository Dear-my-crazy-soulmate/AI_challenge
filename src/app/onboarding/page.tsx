import depts from "../../../data/curated/credits_global.json";
import issues from "../../../data/curated/credits_global_issues.json";
import CreditPlanner from "@/components/CreditPlanner";
import type { CreditData } from "@/lib/rules/credits";

const data = { depts, issues } as unknown as CreditData;

export default function OnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">본전공으로 가능한 조합 보기</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        국제캠퍼스 기준입니다. 본전공을 고르면 다전공·부전공 조합별로 필요한 전공 학점을 보여 줍니다.
      </p>
      <CreditPlanner data={data} />
    </main>
  );
}
