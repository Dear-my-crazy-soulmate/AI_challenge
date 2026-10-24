"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { parseRecent, readRecentRaw } from "@/lib/recent";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/** Home shortcut to the last combination looked at in the calculator. Renders nothing if there is none. */
export default function RecentCalc() {
  const raw = useSyncExternalStore(subscribe, readRecentRaw, () => null);
  const recent = useMemo(() => parseRecent(raw), [raw]);
  if (!recent) return null;
  const q = new URLSearchParams({ primary: recent.primary, mode: recent.mode, second: recent.second });
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-sm font-bold">이어서 보기</h2>
      <Link
        href={`/onboarding?${q}`}
        className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-[18px] py-4 active:scale-[.99]"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-mute">최근 계산 · {recent.kind}</span>
          <span className="text-pretty text-[15px] font-semibold">{recent.label}</span>
        </span>
        <span className="whitespace-nowrap text-[22px] font-bold tabular-nums">
          {recent.total}
          <span className="ml-0.5 text-[13px] font-medium text-mute">학점</span>
        </span>
      </Link>
    </section>
  );
}
