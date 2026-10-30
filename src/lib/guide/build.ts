// The inputs for one AI 조합 설명, shared by /api/guide and scripts/guide/seedGuides.test.ts,
// so a pre-made answer and a live one are built from exactly the same facts and cache key.
import courses from "../../../data/curated/2026/courses.json";
import deptTopics from "../../../data/curated/2026/dept_topics.json";
import majorRules from "../../../data/curated/2026/major_rules.json";
import microdegrees from "../../../data/curated/2026/microdegrees.json";
import profiles from "../../../data/curated/2026/dept_profiles.json";
import depts from "../../../data/curated/credits_global.json";
import issues from "../../../data/curated/credits_global_issues.json";
import syllabus from "../../../data/extracted/2026/syllabus_courses.json";
import type { DeptTopicsData } from "../recommend/rank";
import { MAX_TOPICS, TOPICS } from "../recommend/topics";
import { buildCoursePlan } from "../rules/courses";
import type { CourseData } from "../rules/courses";
import type { CreditData } from "../rules/credits";
import type { MajorRules } from "../rules/majorRules";
import { buildMicrodegreePlan } from "../rules/microdegrees";
import type { MicrodegreeData } from "../rules/microdegrees";
import { factsFromMicrodegree, factsFromPlan, interestFacts, termsFromSyllabus } from "./facts";
import { PROMPT_VERSION } from "./service";
import type { GuideFacts, ProfileData } from "./types";

export const credits = { depts, issues } as unknown as CreditData;
export const courseData = courses as unknown as CourseData;
export const mds = microdegrees as unknown as MicrodegreeData;
export const rules = majorRules as unknown as MajorRules;
const prof = profiles as unknown as ProfileData;
const terms = termsFromSyllabus((syllabus as { courses: { subjt_cd: string; term: string }[] }).courses);
const topicData = deptTopics as unknown as DeptTopicsData;

/** Known 관심 분야 ids only, in list order, so the same choice always gives the same cache key. */
export function cleanTopics(raw: string): string[] {
  const asked = new Set(raw.split(","));
  return TOPICS.map((t) => t.id).filter((id) => asked.has(id)).slice(0, MAX_TOPICS);
}

export const guideKey = (kind: string, primary: string, second: string, topics: string[]): string =>
  `${PROMPT_VERSION}|${kind}|${primary}|${second}|${topics.join(",")}`;

/** The facts ChatKHU gets for this combination, or a message when it cannot be computed. */
export function guideFacts(primary: string, kind: string, second: string, topics: string[]): GuideFacts | string {
  if (kind === "md") {
    const plan = buildMicrodegreePlan({ primary, id: second }, credits, courseData, mds, rules);
    if (!plan.available) return plan.message;
    const rich = { terms, interests: interestFacts(topics, [primary, ...plan.microdegree.depts], topicData) };
    return factsFromMicrodegree(plan, prof, { text: rules.microdegree.definition, page: rules.microdegree.page }, rich);
  }
  if (kind !== "double" && kind !== "minor") return "kind는 double, minor, md 중 하나여야 합니다.";
  const plan = buildCoursePlan({ primary, second, kind }, credits, courseData, rules);
  return plan.available ? factsFromPlan(plan, prof, { terms, interests: interestFacts(topics, [primary, second], topicData) }) : plan.message;
}
