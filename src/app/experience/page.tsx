import { Suspense } from "react";

import depts from "../../../data/curated/credits_global.json";
import courses from "../../../data/curated/2026/courses.json";
import microdegrees from "../../../data/curated/2026/microdegrees.json";
import sample from "../../../data/seed/quiz_sample.json";
import generalSet from "../../../data/curated/quiz_general.json";
import DeptMap from "@/components/DeptMap";
import QuizApp from "@/components/QuizApp";
import QuizFromUrl from "@/components/QuizFromUrl";
import { buildEdges, layout, strongest } from "@/lib/deptMap";
import { isShowable, showableMajors } from "@/lib/quiz";
import type { QuizQuestion, QuizSet } from "@/lib/quiz";

// Only questions that may be shown (approved, or labelled samples) ever reach the screen.
const majors = showableMajors(sample as unknown as QuizSet);
const general = Object.fromEntries(
  Object.entries((generalSet as unknown as { depts: Record<string, QuizQuestion[]> }).depts).map(([d, qs]) => [d, qs.filter((q) => isShowable(q))]),
);
const deptNames = (depts as { dept: string }[]).map((d) => d.dept);

// The 학과 지도 is worked out once, while the page is built: closeness from the 2026 curriculum book, then positions.
const mapDepts = (depts as { dept: string; college: string }[]).map(({ dept, college }) => ({ dept, college }));
const catalogs = Object.fromEntries(
  Object.entries((courses as { depts: Record<string, { catalog: { name: string }[] }> }).depts).map(([d, v]) => [d, v.catalog.map((c) => c.name)]),
);
const mds = (microdegrees as { microdegrees: { name: string; dept: string; courses: { offered_by: string | null }[] }[] }).microdegrees.map((m) => ({
  name: m.name,
  host: m.dept,
  from: m.courses.map((c) => c.offered_by).filter((x): x is string => !!x),
}));
const allEdges = buildEdges(mapDepts, catalogs, mds);
const map = <DeptMap nodes={layout(mapDepts, allEdges)} edges={strongest(allEdges, 5)} asOf={(courses as { as_of: string }).as_of} />;

export default function ExperiencePage() {
  // The page stays static; the ?major= query is read in the browser.
  return (
    <Suspense fallback={<QuizApp majors={majors} deptNames={deptNames} map={map} general={general} />}>
      <QuizFromUrl majors={majors} deptNames={deptNames} map={map} general={general} />
    </Suspense>
  );
}
