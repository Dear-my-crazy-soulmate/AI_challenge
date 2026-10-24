"use client";

import { useSearchParams } from "next/navigation";

import MajorPlanner from "@/components/MajorPlanner";
import type { PlannerProps } from "@/components/MajorPlanner";

/** /onboarding?primary=...&mode=double|minor|microdegree&second=... opens the result directly
 * (the home "이어서 보기" shortcut). MajorPlanner ignores anything that does not match real data. */
export default function PlannerFromUrl(props: Omit<PlannerProps, "initial">) {
  const sp = useSearchParams();
  const initial = { primary: sp.get("primary") ?? "", mode: sp.get("mode") ?? "", second: sp.get("second") ?? "" };
  return <MajorPlanner {...props} initial={initial} />;
}
