import Link from "next/link";

import majorRules from "../../data/curated/2026/major_rules.json";
import AccountButton from "@/components/AccountButton";
import RecentCalc from "@/components/RecentCalc";
import type { MajorRules } from "@/lib/rules/majorRules";

const rules = majorRules as unknown as MajorRules;
// The four notices a new student should see first, in this order.
const HOME_NOTICE_IDS = ["must-choose-one", "max-two", "minor-not-major", "minor-apply"];
const notices = HOME_NOTICE_IDS.flatMap((id) => rules.notices.find((n) => n.id === id) ?? []);
const headlinePage = rules.notices.find((n) => n.id === "must-choose-one")?.page;

export default function Home() {
  return (
    <main className="flex flex-col gap-[26px] px-[22px] pb-8 pt-[max(14px,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span aria-hidden className="relative h-4 w-[26px]">
            <span className="absolute left-0 top-0 h-4 w-4 rounded-full bg-ink" />
            <span className="absolute left-2.5 top-0 h-4 w-4 rounded-full bg-accent mix-blend-multiply" />
          </span>
          <span className="text-base font-bold tracking-[-0.3px]">다전공 길잡이</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-chip px-2.5 py-[5px] text-xs font-medium text-mute">
            국제캠퍼스 · 2026
          </span>
          <AccountButton />
        </div>
      </header>

      <section className="flex flex-col gap-2.5">
        <h1 className="text-pretty text-[27px] font-bold leading-[1.32] tracking-[-0.8px]">
          26학번은 다전공·부전공·
          <br />
          마이크로디그리 중 하나를
          <br />꼭 이수해야 해요
        </h1>
        <p className="text-[13px] text-mute">2026학년도 교육과정 p.{headlinePage}</p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/onboarding"
          className="box-border flex h-[228px] flex-col justify-between rounded-3xl bg-ink px-[18px] pb-[18px] pt-5 text-paper transition-transform active:scale-[.98]"
        >
          <span className="flex items-start justify-between">
            <span className="text-xs font-semibold opacity-60">01</span>
            <span aria-hidden className="relative h-[30px] w-[46px]">
              <span className="absolute left-0 top-0 box-border h-[30px] w-[30px] rounded-full border-2 border-paper" />
              <span className="absolute left-4 top-0 h-[30px] w-[30px] rounded-full bg-accent opacity-95" />
            </span>
          </span>
          <span className="flex flex-col gap-2">
            <span className="text-xl font-bold tracking-[-0.5px]">
              다전공
              <br />
              계산기
            </span>
            <span className="text-[13px] leading-[1.45] opacity-70">본전공과 희망 전공을 고르면 필요한 학점을 계산해요</span>
          </span>
        </Link>

        {/* 전공 체험 문제 is not built yet: same card, marked 준비 중 and not clickable. */}
        <div
          aria-disabled="true"
          className="box-border flex h-[228px] flex-col justify-between rounded-3xl bg-accent px-[18px] pb-[18px] pt-5 text-white opacity-60"
        >
          <span className="flex items-start justify-between">
            <span className="text-xs font-semibold opacity-70">02</span>
            <span aria-hidden className="grid grid-cols-[13px_13px] gap-1">
              <span className="h-[13px] w-[13px] rounded-[3px] bg-white" />
              <span className="box-border h-[13px] w-[13px] rounded-[3px] border-2 border-white" />
              <span className="box-border h-[13px] w-[13px] rounded-[3px] border-2 border-white" />
              <span className="h-[13px] w-[13px] rounded-[3px] bg-white" />
            </span>
          </span>
          <span className="flex flex-col gap-2">
            <span className="text-xl font-bold tracking-[-0.5px]">
              전공 체험
              <br />
              문제
            </span>
            <span className="text-[13px] leading-[1.45] opacity-90">입문 문제를 풀며 나와 맞는지 가늠해 봐요</span>
            <span className="self-start rounded-md bg-white/25 px-2 py-0.5 text-[11px] font-semibold">준비 중</span>
          </span>
        </div>
      </div>

      <RecentCalc />

      <section className="flex flex-col gap-0.5">
        <h2 className="mb-2 text-sm font-bold">알아두면 좋은 규칙</h2>
        {notices.map((n, i) => (
          <div key={n.id} className="flex gap-3 border-t border-line py-[13px]">
            <span className="w-[18px] flex-none pt-0.5 text-xs font-bold tabular-nums text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 text-pretty text-sm leading-normal">{n.text}</span>
            <span className="flex-none pt-[3px] text-[11px] text-mute">p.{n.page}</span>
          </div>
        ))}
      </section>

      <p className="text-xs leading-normal text-mute">
        출처: 2026 경희대 교육과정. 졸업요건은 학과 공식 안내로 최종 확인하세요. 휴대폰 브라우저 메뉴의 &ldquo;홈 화면에
        추가&rdquo;로 앱처럼 설치할 수 있어요.
      </p>
    </main>
  );
}
