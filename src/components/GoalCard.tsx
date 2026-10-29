"use client";

import Link from "next/link";

import { useGoal } from "@/components/useGoal";
import { MODE_NAME, goalTotal } from "@/lib/goal";

const linkBtn = "flex-none rounded-2xl bg-paper/10 px-3 py-[7px] text-[13px] font-semibold";

/** Home: the combination saved as 내 목표 (dark card), or a prompt to pick one in the calculator. */
export default function GoalCard() {
  const goal = useGoal();

  if (!goal) {
    return (
      <section className="flex flex-col gap-4 rounded-3xl bg-ink p-[18px] pt-5 text-paper">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs opacity-65">내 목표</span>
          <span className="text-[17px] font-bold leading-[1.35]">다전공 목표가 아직 없어요</span>
        </div>
        <p className="text-pretty text-[13px] leading-[1.55] opacity-75">
          계산기에서 조합을 계산한 뒤 &lsquo;내 목표로 저장&rsquo;을 누르면 여기에 필요한 학점이 보여요.
        </p>
        <Link
          href="/onboarding"
          className="box-border flex h-[46px] items-center justify-center rounded-xl bg-accent text-[15px] font-bold text-white active:opacity-90"
        >
          계산기로 목표 정하기
        </Link>
      </section>
    );
  }

  const total = goalTotal(goal);
  const q = new URLSearchParams({ primary: goal.primary, mode: goal.mode, second: goal.second });
  const rows = [
    { label: `본전공 · ${goal.primary}`, credits: goal.primaryCredits, dot: "bg-paper" },
    { label: `${MODE_NAME[goal.mode]} · ${goal.secondName}`, credits: goal.secondCredits, dot: "bg-accent-bright" },
  ];
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-ink p-[18px] pt-5 text-paper">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-[5px]">
          <span className="text-xs opacity-65">내 목표 · {MODE_NAME[goal.mode]}</span>
          <span className="text-pretty text-[17px] font-bold leading-[1.35]">
            {goal.primary} + {goal.secondName}
          </span>
        </div>
        <Link href={`/onboarding?${q}`} className={linkBtn}>
          자세히
        </Link>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[44px] font-bold leading-none tracking-[-1.5px] tabular-nums">{total}</span>
        <span className="text-base font-semibold opacity-60">학점</span>
        <span className="ml-auto text-[13px] opacity-65">전공 학점 합계</span>
      </div>
      <div className="flex h-2 gap-[3px] overflow-hidden rounded" aria-hidden>
        <div className="rounded-[3px] bg-paper" style={{ flexGrow: goal.primaryCredits }} />
        <div className="rounded-[3px] bg-accent-bright" style={{ flexGrow: goal.secondCredits ?? 0 }} />
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-2.5 text-[13px]">
            <span className="flex min-w-0 items-center gap-[7px]">
              <span className={`h-[9px] w-[9px] flex-none rounded-full ${r.dot}`} />
              <span className="text-pretty opacity-80">{r.label}</span>
            </span>
            <span className="whitespace-nowrap font-bold tabular-nums">{r.credits === null ? "확인 필요" : `${r.credits}학점`}</span>
          </div>
        ))}
      </div>
      {goal.secondCredits === null && (
        <p className="text-xs leading-normal opacity-65">마이크로디그리 필요 학점이 확인되지 않아 합계에 넣지 않았어요.</p>
      )}
    </section>
  );
}
