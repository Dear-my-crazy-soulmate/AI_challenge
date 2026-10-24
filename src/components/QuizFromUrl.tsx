"use client";

import { useSearchParams } from "next/navigation";

import QuizApp from "@/components/QuizApp";
import type { QuizMajor } from "@/lib/quiz";

/** /experience?major=철학과 starts that major's questions directly (from the calculator result). */
export default function QuizFromUrl({ majors, deptNames }: { majors: QuizMajor[]; deptNames: string[] }) {
  return <QuizApp majors={majors} deptNames={deptNames} initialMajor={useSearchParams().get("major")} />;
}
