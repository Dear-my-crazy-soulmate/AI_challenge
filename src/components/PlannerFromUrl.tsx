"use client";

import { useSearchParams } from "next/navigation";

import MajorPlanner from "@/components/MajorPlanner";
import type { PlannerProps } from "@/components/MajorPlanner";

/** /onboarding?primary=...&mode=double|minor|microdegree&second=... opens the result directly
 * (the home "이어서 보기" shortcut). MajorPlanner ignores anything that does not match real data. */
export default function PlannerFromUrl(props: Omit<PlannerProps, "initial">) {
  const sp = useSearchParams();
  const initial = { primary: sp.get("primary") ?? "", mode: sp.get("mode") ?? "", second: sp.get("second") ?? "" };
  // MajorPlanner reads the link only when it mounts, and the router keeps a visited page alive
  // (cacheComponents), so a new link must start a new planner instead of showing the old one.
  return <MajorPlanner key={`${initial.primary}|${initial.mode}|${initial.second}`} {...props} initial={initial} />;
}
