"use client";

import { useMemo } from "react";

import { avatarUri } from "@/lib/avatar/compose";
import type { GoalLike, Variant } from "@/lib/avatar/compose";

/**
 * Profile picture: 쿠옹이 dressed for the department, drawn on the spot (no image files).
 * With a saved goal the look follows it (다전공 mixed, 부전공, 마이크로디그리/융합 new look).
 * "head" is the round picture; "full" is the whole character (`size` is its height).
 */
export default function Avatar({
  dept,
  goal = null,
  size = 40,
  variant = "head",
  onDark = false,
  plainWhenEmpty = false,
}: {
  dept: string | null;
  goal?: GoalLike | null;
  size?: number;
  variant?: Variant;
  onDark?: boolean; // the empty placeholder is drawn light on an ink-colored card
  plainWhenEmpty?: boolean; // without a department, the undressed 쿠옹이 instead of "?"
}) {
  const key = goal ? `${goal.mode}|${goal.second}|${goal.secondName}` : "";
  const src = useMemo(
    () => (dept || plainWhenEmpty ? avatarUri(dept, dept ? goal : null, variant) : null),
    [dept, key, variant, plainWhenEmpty], // eslint-disable-line react-hooks/exhaustive-deps -- goal is covered by key
  );

  if (!src) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        className={`flex flex-none items-center justify-center rounded-full border-2 font-bold ${onDark ? "border-paper/40 text-paper/60" : "border-chip text-mute"}`}
      >
        ?
      </span>
    );
  }
  const full = variant === "full";
  const style = full ? { height: size, width: (size * 742) / 1120 } : { width: size, height: size };
  const alt = !dept ? "쿠옹이" : goal ? `${dept} 캐릭터 (${goal.secondName} 목표)` : `${dept} 캐릭터`;
  // eslint-disable-next-line @next/next/no-img-element -- an inline SVG data URI, nothing for the image optimizer to do
  return <img src={src} alt={alt} style={style} className={full ? "flex-none" : "flex-none rounded-full bg-sand object-cover"} />;
}
