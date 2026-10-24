import { Suspense } from "react";

import depts from "../../../data/curated/credits_global.json";
import sample from "../../../data/seed/quiz_sample.json";
import QuizApp from "@/components/QuizApp";
import QuizFromUrl from "@/components/QuizFromUrl";
import { showableMajors } from "@/lib/quiz";
import type { QuizSet } from "@/lib/quiz";

// Only questions that may be shown (approved, or labelled samples) ever reach the screen.
const majors = showableMajors(sample as unknown as QuizSet);
const deptNames = (depts as { dept: string }[]).map((d) => d.dept);

export default function ExperiencePage() {
  // The page stays static; the ?major= query is read in the browser.
  return (
    <Suspense fallback={<QuizApp majors={majors} deptNames={deptNames} />}>
      <QuizFromUrl majors={majors} deptNames={deptNames} />
    </Suspense>
  );
}
