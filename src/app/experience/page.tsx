import { Suspense } from "react";

import depts from "../../../data/curated/credits_global.json";
import sample from "../../../data/seed/quiz_sample.json";
import DeptMap from "@/components/DeptMap";
import QuizApp from "@/components/QuizApp";
import QuizFromUrl from "@/components/QuizFromUrl";
import { buildEdges, layout, strongest } from "@/lib/deptMap";
import { catalogs, mapAsOf, mapDepts, mapMicrodegrees } from "@/lib/deptMapData";
import { showableMajors } from "@/lib/quiz";
import type { QuizSet } from "@/lib/quiz";

// Only questions that may be shown (approved, or labelled samples) ever reach the screen.
const majors = showableMajors(sample as unknown as QuizSet);
const deptNames = (depts as { dept: string }[]).map((d) => d.dept);

// The 학과 지도 is worked out once, while the page is built: closeness from the 2026 curriculum book, then positions.
const allEdges = buildEdges(mapDepts, catalogs, mapMicrodegrees);
const map = <DeptMap nodes={layout(mapDepts, allEdges)} edges={strongest(allEdges, 5)} asOf={mapAsOf} />;

export default function ExperiencePage() {
  // The page stays static; the ?major= query is read in the browser.
  return (
    <Suspense fallback={<QuizApp majors={majors} deptNames={deptNames} map={map} />}>
      <QuizFromUrl majors={majors} deptNames={deptNames} map={map} />
    </Suspense>
  );
}
