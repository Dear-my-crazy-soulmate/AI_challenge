"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import QuizApp from "@/components/QuizApp";
import type { QuizMajor } from "@/lib/quiz";

/** /experience?major=철학과 starts that major's questions directly (from the calculator result). */
export default function QuizFromUrl({ majors, deptNames, map }: { majors: QuizMajor[]; deptNames: string[]; map?: ReactNode }) {
  return <QuizApp majors={majors} deptNames={deptNames} initialMajor={useSearchParams().get("major")} map={map} />;
}
