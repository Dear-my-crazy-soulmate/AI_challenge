import { Suspense } from "react";

import deptTopics from "../../../data/curated/2026/dept_topics.json";
import depts from "../../../data/curated/credits_global.json";
import issues from "../../../data/curated/credits_global_issues.json";
import majorRules from "../../../data/curated/2026/major_rules.json";
import microdegrees from "../../../data/curated/2026/microdegrees.json";
import sample from "../../../data/seed/quiz_sample.json";
import MajorPlanner from "@/components/MajorPlanner";
import PlannerFromUrl from "@/components/PlannerFromUrl";
import { showableMajors } from "@/lib/quiz";
import type { DeptTopicsData } from "@/lib/recommend/rank";
import type { QuizSet } from "@/lib/quiz";
import type { CreditData } from "@/lib/rules/credits";
import type { MajorRules } from "@/lib/rules/majorRules";
import { listMicrodegrees } from "@/lib/rules/microdegrees";
import type { MicrodegreeData } from "@/lib/rules/microdegrees";

const data = { depts, issues } as unknown as CreditData;
const rules = majorRules as unknown as MajorRules;
const mds = listMicrodegrees(microdegrees as unknown as MicrodegreeData);
const quizMajors = showableMajors(sample as unknown as QuizSet).map((m) => m.major);
const topics = deptTopics as unknown as DeptTopicsData;

export default function OnboardingPage() {
  // The page stays static (so the service worker can cache it); the query string is read in the browser.
  return (
    <Suspense fallback={<MajorPlanner data={data} rules={rules} microdegrees={mds} quizMajors={quizMajors} deptTopics={topics} />}>
      <PlannerFromUrl data={data} rules={rules} microdegrees={mds} quizMajors={quizMajors} deptTopics={topics} />
    </Suspense>
  );
}
