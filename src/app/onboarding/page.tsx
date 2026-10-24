import { Suspense } from "react";

import depts from "../../../data/curated/credits_global.json";
import issues from "../../../data/curated/credits_global_issues.json";
import majorRules from "../../../data/curated/2026/major_rules.json";
import microdegrees from "../../../data/curated/2026/microdegrees.json";
import MajorPlanner from "@/components/MajorPlanner";
import PlannerFromUrl from "@/components/PlannerFromUrl";
import type { CreditData } from "@/lib/rules/credits";
import type { MajorRules } from "@/lib/rules/majorRules";
import { listMicrodegrees } from "@/lib/rules/microdegrees";
import type { MicrodegreeData } from "@/lib/rules/microdegrees";

const data = { depts, issues } as unknown as CreditData;
const rules = majorRules as unknown as MajorRules;
const mds = listMicrodegrees(microdegrees as unknown as MicrodegreeData);

export default function OnboardingPage() {
  // The page stays static (so the service worker can cache it); the query string is read in the browser.
  return (
    <Suspense fallback={<MajorPlanner data={data} rules={rules} microdegrees={mds} />}>
      <PlannerFromUrl data={data} rules={rules} microdegrees={mds} />
    </Suspense>
  );
}
