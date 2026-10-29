// Result screens of the calculator (step 4), top to bottom: the dark total card, what is left after the
// courses the student already took, the AI explanation, ONE table that sets the two programs side by
// side, and a single folded "자세히 보기" list that holds the rules and the course lists.
// Surfaces are white with a hairline; colour is kept for the 상태 tags (검증/확인 필요) and the numbers that matter.
// Pure presentation: every number comes from src/lib/rules/ through /api/plan and /api/microdegree.
// Signed-in users can tick the courses they already took; the remaining credits come from rules/taken.ts.
"use client";

import Link from "next/link";
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

import { ComboGuide } from "@/components/ComboGuide";
import { useTaken } from "@/components/useTaken";
import { applyTaken, applyTakenMd } from "@/lib/rules/taken";
import type { ProgramProgress, TakenProgress } from "@/lib/rules/taken";

import type { CourseGroup, CoursePlanOk, ProgramCourses } from "@/lib/rules/courses";
import type { MajorRules } from "@/lib/rules/majorRules";
import type { MicrodegreePlanResult } from "@/lib/rules/microdegrees";

export interface Breakdown {
  기초: number;
  필수: number;
  선택: number;
  계: number;
  combined?: boolean; // 기초 is 전공기초 and 전공필수 together
}

type Status = ProgramCourses["status"];
const STATUS: Record<Status, { label: string; tone: string }> = {
  verified: { label: "학점 검증 완료", tone: "bg-ok-soft text-ok" },
  choose: { label: "일부 선택 이수", tone: "bg-warn-soft text-warn" },
  check: { label: "학과 확인 필요", tone: "bg-warn-soft text-warn" },
  no_courses: { label: "과목 정보 없음", tone: "bg-sand-2 text-ink-2" },
};
const KIND_LABEL = { single: "단일전공", double: "다전공", minor: "부전공" } as const;

function groupRule(rule: CourseGroup["rule"]): string {
  if (rule === "all") return "모두 이수";
  if (rule === "choose") return "아래 과목 중 선택";
  return "과목 목록과 학점이 맞지 않아 확인 필요";
}

function Callout({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-warn/30 bg-warn-soft px-[18px] py-4 text-sm leading-normal text-ink">{children}</p>;
}

export function Unavailable({ message }: { message: string }) {
  return <Callout>{message}</Callout>;
}

/** Every block of the result sits on this: white, one hairline, one radius. */
const surface = "rounded-3xl border border-edge bg-white";

function Dot({ tone }: { tone: "ink" | "accent" }) {
  return <span aria-hidden className={`h-2.5 w-2.5 flex-none rounded-full ${tone === "ink" ? "bg-ink" : "bg-accent"}`} />;
}

function StatusTag({ status }: { status: Status }) {
  const s = STATUS[status];
  return <span className={`inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>;
}

function Hero(p: {
  headline: string;
  total: number;
  aLabel: string;
  a: number;
  bLabel: string;
  b: number | null; // null: the number is not confirmed
}) {
  return (
    <section className="flex flex-col gap-[18px] rounded-3xl bg-ink px-5 pb-5 pt-[22px] text-paper">
      <div className="flex flex-col gap-1.5">
        <span className="text-pretty text-[13px] opacity-70">{p.headline}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-[60px] font-bold leading-none tracking-[-2px] tabular-nums">{p.total}</span>
          <span className="text-lg font-semibold">학점</span>
        </div>
        <span className="text-[13px] opacity-70">전공 학점 합계</span>
      </div>
      <div className="flex h-3 gap-[3px] overflow-hidden rounded-md">
        <div className="rounded-[3px] bg-paper transition-[flex] duration-500" style={{ flexGrow: p.a }} />
        <div className="rounded-[3px] bg-accent-bright transition-[flex] duration-500" style={{ flexGrow: p.b ?? 0 }} />
      </div>
      <div className="flex justify-between gap-3 text-[13px]">
        <span className="flex min-w-0 items-center gap-[7px]">
          <span className="h-[9px] w-[9px] flex-none rounded-full bg-paper" />
          <span className="opacity-85">{p.aLabel}</span>
          <span className="font-bold tabular-nums">{p.a}</span>
        </span>
        <span className="flex min-w-0 items-center gap-[7px]">
          <span className="h-[9px] w-[9px] flex-none rounded-full bg-accent-bright" />
          <span className="opacity-85">{p.bLabel}</span>
          <span className="font-bold tabular-nums">{p.b ?? "?"}</span>
        </span>
      </div>
    </section>
  );
}

// ---- the table that sets the programs side by side ----

interface Col {
  role: string; // "본전공" / "다전공"
  name: string;
  status: Status;
  b: Breakdown;
  tone: "ink" | "accent";
  progress?: ProgramProgress | null;
}

function CreditTable({ cols, foot }: { cols: Col[]; foot?: ReactNode }) {
  const grid = cols.length === 1 ? "grid-cols-[1fr_96px]" : "grid-cols-[1fr_96px_96px]";
  const combined = cols.some((c) => c.b.combined);
  const line = `grid ${grid} items-center gap-x-2 border-t border-line py-3`;
  const num = "text-right text-base font-semibold tabular-nums";
  const rows: [string, (c: Col) => ReactNode][] = [
    ["전공기초", (c) => (c.b.combined ? <>{c.b.기초}<sup className="text-xs text-mute">*</sup></> : c.b.기초)],
    ["전공필수", (c) => (c.b.combined ? <span className="text-mute">·</span> : c.b.필수)],
    ["전공선택", (c) => c.b.선택],
  ];
  return (
    <section className={`${surface} px-5 pb-5 pt-5`}>
      <h3 className="mb-4 text-[15px] font-bold">학점 구성</h3>
      <div className={`grid ${grid} gap-x-2 pb-3`}>
        <span />
        {cols.map((c) => (
          <span key={c.role} className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-mute">
              <Dot tone={c.tone} />
              {c.role}
            </span>
            <span className="text-pretty text-[13px] font-bold leading-snug">{c.name}</span>
          </span>
        ))}
      </div>
      {rows.map(([k, get]) => (
        <div key={k} className={line}>
          <span className="text-sm text-ink-2">{k}</span>
          {cols.map((c) => (
            <span key={c.role} className={num}>
              {get(c)}
            </span>
          ))}
        </div>
      ))}
      <div className={line}>
        <span className="text-sm font-bold">합계</span>
        {cols.map((c) => (
          <span key={c.role} className="text-right text-xl font-bold tabular-nums">
            {c.b.계}
            <span className="text-xs font-semibold text-mute">학점</span>
          </span>
        ))}
      </div>
      <div className={line}>
        <span className="text-sm text-ink-2">상태</span>
        {cols.map((c) => (
          <span key={c.role} className="flex justify-end">
            <StatusTag status={c.status} />
          </span>
        ))}
      </div>
      {cols.some((c) => c.progress) && (
        <div className={line}>
          <span className="text-sm text-ink-2">남은 학점</span>
          {cols.map((c) => (
            <span key={c.role} className="flex flex-col items-end">
              {c.progress ? (
                <>
                  <span className="text-base font-bold tabular-nums text-accent-deep">{c.progress.remaining}학점</span>
                  <span className="text-xs text-mute">
                    {c.progress.coursesUnknown ? "최소 " : ""}
                    {c.progress.remainingCourses}과목
                  </span>
                </>
              ) : (
                <span className="text-mute">–</span>
              )}
            </span>
          ))}
        </div>
      )}
      {combined && <p className="border-t border-line pt-3 text-xs leading-normal text-mute">* 이 학과는 전공기초와 전공필수를 합쳐서 학점을 정해 두었어요.</p>}
      {foot}
    </section>
  );
}

/** A plain line under the table: a big number and what it means. */
function Insight({ number, children }: { number: string; children: ReactNode }) {
  return (
    <div className="mt-1 flex items-center gap-4 border-t border-line pt-4">
      <span className="whitespace-nowrap text-[28px] font-bold leading-none tabular-nums text-accent-deep">{number}</span>
      <span className="text-pretty text-sm leading-normal text-ink-2">{children}</span>
    </div>
  );
}

// ---- the folded list: rules and course lists ----

function More({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <details className="group border-t border-line first:border-t-0">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3">
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold">{title}</span>
          {hint && <span className="truncate text-xs text-mute">{hint}</span>}
        </span>
        <span aria-hidden className="flex-none text-mute transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="flex flex-col gap-3 pb-4">{children}</div>
    </details>
  );
}

function Foldable({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group border-t border-line pt-3 text-sm">
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-[13px] font-semibold text-ink-2">
        {summary}
        <span aria-hidden className="inline-block text-mute transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </details>
  );
}

function Details({ children }: { children: ReactNode }) {
  return (
    <section className={`${surface} px-5 pt-5`}>
      <h3 className="text-[15px] font-bold">자세히 보기</h3>
      <div className="mt-1">{children}</div>
    </section>
  );
}

interface TakenUi {
  codes: ReadonlySet<string>;
  toggle: (code: string, on: boolean) => void;
  notCounted: ReadonlySet<string>; // ticked but not counted here (minor overlap with the 본전공)
}
/** Present only for a signed-in user: course rows then show a "들었어요" checkbox. */
const TakenCtx = createContext<TakenUi | null>(null);

function CourseList({
  courses,
  badge,
}: {
  courses: { code: string; name: string; credits: number }[];
  badge?: (code: string) => ReactNode; // e.g. "본전공에도 있음" on a micro-degree course
}) {
  const t = useContext(TakenCtx);
  return (
    <ul className="flex flex-col">
      {courses.map((c) => {
        const on = t?.codes.has(c.code) ?? false;
        const label = (
          <>
            <span className="flex min-w-0 items-center gap-2.5">
              {t && (
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => t.toggle(c.code, e.target.checked)}
                  aria-label={`${c.name} 들었어요`}
                  className="h-5 w-5 flex-none accent-[var(--color-accent)]"
                />
              )}
              <span className={on ? "text-mute line-through" : ""}>
                {c.name} <span className="text-xs text-mute">{c.code}</span>
                {badge?.(c.code)}
                {on && t?.notCounted.has(c.code) && <span className="ml-1 text-xs text-warn no-underline">부전공 미인정</span>}
              </span>
            </span>
            <span className="whitespace-nowrap tabular-nums text-ink-2">{c.credits}학점</span>
          </>
        );
        return (
          <li key={c.code} className="border-t border-line text-[13px] first:border-t-0">
            {t ? (
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-2 py-1.5">{label}</label>
            ) : (
              <div className="flex min-h-11 items-center justify-between gap-2 py-1.5">{label}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The book lists a 학부's courses once per track (기계공학부), so the same code can come twice: show it once. */
const unique = <T extends { code: string }>(xs: T[]) => xs.filter((c, i) => xs.findIndex((x) => x.code === c.code) === i);

function Group({ g: group }: { g: CourseGroup }) {
  const g = { ...group, courses: unique(group.courses) };
  const head = (
    <span className="font-semibold">
      {g.category}{" "}
      <span className="font-normal text-mute">
        {g.credits === null ? "필요 학점 확인 필요" : `${g.credits}학점 · ${groupRule(g.rule)}`}
      </span>
    </span>
  );
  // Elective pools are long: keep them folded.
  if (g.category === "전공선택") {
    return (
      <details className="text-[13px]">
        <summary className="cursor-pointer">
          {head} <span className="text-xs text-mute">({g.courses.length}과목 보기)</span>
        </summary>
        <div className="mt-2">
          <CourseList courses={g.courses} />
        </div>
      </details>
    );
  }
  return (
    <div className="text-[13px]">
      {head}
      <div className="mt-2">
        {g.courses.length > 0 ? <CourseList courses={g.courses} /> : <p className="text-mute">편성표에 해당 과목이 없습니다.</p>}
      </div>
    </div>
  );
}

function Problems({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="list-disc pl-5 text-xs text-warn">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

function CourseDetailsBody({ p }: { p: ProgramCourses }) {
  return (
    <>
      {p.groups.map((g) => (
        <Group key={g.category} g={g} />
      ))}
      <Problems items={p.problems} />
      {p.rules.length > 0 && (
        <details className="text-[13px]">
          <summary className="cursor-pointer text-ink-2">학과 규정 원문 {p.rules.length}개</summary>
          <ul className="mt-2 flex flex-col gap-2 text-mute">
            {p.rules.map((r, i) => (
              <li key={i}>
                <span className="text-xs">p.{r.page}</span> {r.text}
              </li>
            ))}
          </ul>
        </details>
      )}
      {p.pages.length > 0 && <p className="text-xs text-mute">교육과정 책 확인 쪽: {p.pages.join(", ")}</p>}
    </>
  );
}

function RuleLine({ text, page }: { text: string; page: number }) {
  return (
    <div className="flex gap-2.5 border-t border-line py-2.5 first:border-t-0">
      <span className="flex-1 text-pretty text-[13.5px] leading-[1.55] text-ink-3">{text}</span>
      <span className="flex-none pt-0.5 text-xs text-mute">p.{page}</span>
    </div>
  );
}

function RulesBody({ r }: { r: CoursePlanOk }) {
  const m = r.majorRules;
  const items: { key: string; text: string; page: number }[] = [];
  if (m.basicExemption) {
    items.push({
      key: "basic",
      page: m.basicExemption.page,
      text: `같은 단과대학이고 전공기초 과목이 같아서, ${r.second.dept}의 전공기초 ${m.basicExemption.credits}학점은 다시 이수하지 않아도 돼요.`,
    });
  }
  if (m.overlap) {
    items.push({
      key: "overlap",
      page: m.overlap.page,
      text: `두 전공이 함께 요구하는 과목(${m.overlap.courses.map((c) => c.name).join(", ")}, ${m.overlap.credits}학점)은 양쪽 전공 학점으로 모두 인정되지만 졸업학점에는 한 번만 들어가요. 같은 학수번호일 때만 인정되며, 단과대학 시행세칙으로 인정 학점이 제한될 수 있어요.`,
    });
  }
  if (m.minorOverlap) {
    items.push({
      key: "minor",
      page: m.minorOverlap.page,
      text: `${m.minorOverlap.courses.map((c) => c.name).join(", ")}(${m.minorOverlap.credits}학점)은 본전공에도 있는 과목이라 부전공 학점으로 인정되지 않아요. 부전공 학점은 다른 부전공 과목으로 채워야 해요(대체 과목은 학과 규정 확인).`,
    });
  }
  return (
    <>
      <div>
        {items.length > 0 ? (
          items.map((i) => <RuleLine key={i.key} text={i.text} page={i.page} />)
        ) : (
          <p className="text-[13.5px] text-mute">이 조합에 학점이 달라지는 공통 규칙은 없어요.</p>
        )}
      </div>
      <Foldable summary={`신청·이수 안내 ${m.notices.length}개`}>
        <div className="-mt-2">
          {m.notices.map((n) => (
            <RuleLine key={n.id} text={n.text} page={n.page} />
          ))}
        </div>
      </Foldable>
    </>
  );
}

/** What the result screen offers next: save this combination as 내 목표, or try the major's quiz. */
export interface ResultActions {
  goalSaved: boolean;
  onSaveGoal: () => void;
  quizHref: string;
  quizLabel: string;
}

function SaveGoalButton({ a }: { a: ResultActions }) {
  return (
    <button
      type="button"
      onClick={a.goalSaved ? undefined : a.onSaveGoal}
      aria-pressed={a.goalSaved}
      className={`box-border flex h-[54px] items-center justify-center rounded-2xl text-base font-bold ${
        a.goalSaved ? "cursor-default bg-ok-soft text-ok" : "bg-accent text-white active:opacity-90"
      }`}
    >
      {a.goalSaved ? "✓ 내 목표로 저장됨" : "이 조합을 내 목표로 저장"}
    </button>
  );
}

function ResetButton({ onReset, quiz }: { onReset: () => void; quiz: ResultActions }) {
  return (
    <>
      <Link
        href={quiz.quizHref}
        className="box-border flex h-[52px] items-center justify-center rounded-2xl border border-edge bg-white text-[15px] font-bold"
      >
        {quiz.quizLabel}
      </Link>
      <button type="button" onClick={onReset} className="flex h-12 items-center justify-center text-sm font-semibold text-mute">
        다른 조합 계산하기
      </button>
    </>
  );
}

function Source({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs leading-normal text-mute">{children}</p>;
}

/** Taken courses of the signed-in user and what is left, for one result screen. */
function useTakenProgress(calc: (codes: ReadonlySet<string>) => TakenProgress) {
  const taken = useTaken();
  const [error, setError] = useState("");
  const progress = taken.enabled ? calc(taken.codes) : null;
  const ui: TakenUi | null = taken.enabled
    ? {
        codes: taken.codes,
        toggle: (code, on) => {
          setError("");
          void taken.setTaken(code, on).then((r) => {
            if (!r.ok) setError(r.message);
          });
        },
        notCounted: new Set(progress?.second.notCounted ?? []),
      }
    : null;
  return { enabled: taken.enabled, progress, ui, error };
}

/** "내 이수 과목 반영": what is left after the courses the student already took. Nothing is drawn for a signed-out reader. */
function TakenBox(p: {
  t: ReturnType<typeof useTakenProgress>;
  fullTotal: number; // the combination's credits before anything taken is left out
  secondLabel: string;
  secondName: string;
  sharedWhat: string; // "두 전공에" / "본전공과 마이크로디그리에"
  countsNote: string;
}) {
  const progress = p.t.progress;
  if (!progress) {
    return p.t.enabled === false ? (
      <Link href="/login" className={`${surface} px-5 py-4 text-sm leading-normal`}>
        로그인하고 <b>내 이수 과목</b>을 저장하면, 들은 과목을 빼고 남은 학점과 과목 수를 계산해 드려요 ›
      </Link>
    ) : null;
  }
  const c = progress.remainingCourses;
  const saved = p.t.ui?.codes.size ?? 0;
  return (
    <section className={`${surface} flex flex-col gap-3 p-5`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold">내 이수 과목 {saved}개 반영</h3>
        <Link href="/profile/courses" className="whitespace-nowrap text-[13px] font-semibold text-accent-deep underline">
          관리 ›
        </Link>
      </div>
      <div className="flex items-baseline gap-2.5">
        <span className="text-xs text-mute">남은 학점</span>
        <span className="text-[40px] font-bold leading-none tracking-[-1px] tabular-nums text-accent-deep">{progress.remaining}</span>
        <span className="text-base font-semibold text-ink-2">학점</span>
        <span className="ml-auto text-sm text-mute line-through decoration-1">{p.fullTotal}학점</span>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-line pt-3 text-sm leading-normal">
        <span>
          앞으로 들을 과목 최소 <b className="tabular-nums">{c.total}</b>과목
          <span className="text-mute">
            {" "}
            (필수 {c.required} + 선택 최소 {c.elective})
          </span>
        </span>
        <span className="text-ink-2">
          이 조합에 인정된 들은 과목: 본전공 −<b className="tabular-nums">{progress.primary.taken}</b> · {p.secondLabel} −
          <b className="tabular-nums">{progress.second.taken}</b>학점
        </span>
        {(progress.sharedOnce > 0 || progress.exempted > 0) && (
          <span className="text-xs leading-normal text-ink-2">
            공통 규칙 적용:
            {progress.exempted > 0 && ` ${p.secondName} 전공기초 ${progress.exempted}학점 면제`}
            {progress.exempted > 0 && progress.sharedOnce > 0 && " ·"}
            {progress.sharedOnce > 0 && ` ${p.sharedWhat} 함께 있는 과목 ${progress.sharedOnce}학점은 한 번만 셌어요`}
          </span>
        )}
        {c.unknown && (
          <span className="text-xs leading-normal text-warn">
            학점과 과목 목록이 맞지 않는 부분이 있어 과목 수는 최소치예요. 학과 공식 안내로 확인하세요.
          </span>
        )}
        <span className="text-xs leading-normal text-mute">
          {saved === 0
            ? "아직 저장한 이수 과목이 없어요. ‘관리’에서 들은 과목을 저장하면 여기서 바로 빠져요."
            : progress.taken === 0
              ? `저장한 이수 과목 ${saved}개 중 이 조합에 해당하는 과목이 없어요.`
              : `저장한 과목은 내 계정에 남아요. ${p.countsNote}`}
        </span>
        {p.t.error && <span className="text-xs text-warn">{p.t.error}</span>}
      </div>
    </section>
  );
}

/** 다전공 / 부전공 result. */
export function PlanView({
  plan,
  primaryCredits,
  secondCredits,
  actions,
  onReset,
}: {
  plan: CoursePlanOk;
  primaryCredits: Breakdown;
  secondCredits: Breakdown;
  actions: ResultActions;
  onReset: () => void;
}) {
  const kind = plan.input.kind;
  const label = KIND_LABEL[kind];
  const min = plan.majorRules.minimumCredits;
  const t = useTakenProgress((codes) => applyTaken(plan, codes));
  const progress = t.progress;
  const foot =
    (plan.totals.savedCredits > 0 || (!progress && min < plan.totals.total)) && (
      <div className="flex flex-col gap-3">
        {plan.totals.savedCredits > 0 && (
          <Insight number={`−${plan.totals.savedCredits}`}>
            다전공을 하면 본전공이 단일전공 {plan.singleCredits}학점에서 {plan.totals.primaryCredits}학점으로 줄어요.
          </Insight>
        )}
        {/* signed in, the progress block above already applies these rules to what is left */}
        {!progress && min < plan.totals.total && (
          <Insight number={String(min)}>공통 규칙을 적용하면 실제로 들어야 할 전공 학점은 최소 이만큼이에요.</Insight>
        )}
      </div>
    );
  return (
    <TakenCtx.Provider value={t.ui}>
      <div className="flex flex-col gap-4">
        <Hero
          headline={`${plan.primary.dept} + ${plan.second.dept}`}
          total={plan.totals.total}
          aLabel="본전공"
          a={plan.totals.primaryCredits}
          bLabel={label}
          b={plan.totals.secondCredits}
        />
        <SaveGoalButton a={actions} />
        <TakenBox
          t={t}
          fullTotal={plan.totals.total}
          secondLabel={label}
          secondName={plan.second.dept}
          sharedWhat="두 전공에"
          countsNote="두 전공에 함께 있는 과목은 양쪽에 인정돼요(부전공은 본전공과 겹치면 미인정)."
        />
        <ComboGuide primary={plan.primary.dept} kind={kind} second={plan.second.dept} />
        <CreditTable
          cols={[
            { role: "본전공", name: plan.primary.dept, status: plan.primary.status, b: primaryCredits, tone: "ink", progress: progress?.primary },
            { role: label, name: plan.second.dept, status: plan.second.status, b: secondCredits, tone: "accent", progress: progress?.second },
          ]}
          foot={foot || undefined}
        />
        <Details>
          <More title="본전공 과목·규정" hint={plan.primary.dept}>
            <CourseDetailsBody p={plan.primary} />
          </More>
          <More title={`${label} 과목·규정`} hint={plan.second.dept}>
            <CourseDetailsBody p={plan.second} />
          </More>
          <More title="이 조합에 적용되는 규칙">
            <RulesBody r={plan} />
          </More>
          {plan.warnings.length > 0 && (
            <More title={`학점 데이터 확인 항목 ${plan.warnings.length}개`}>
              <ul className="list-disc pl-5 text-[13px] text-mute">
                {plan.warnings.map((w, i) => (
                  <li key={i}>
                    {w.source} · {w.code}: {w.message}
                  </li>
                ))}
              </ul>
            </More>
          )}
        </Details>
        <div className="mt-1 flex flex-col gap-2">
          <ResetButton onReset={onReset} quiz={actions} />
        </div>
        <Source>
          출처: {plan.source.pdf} ({plan.source.asOf}). 과목 목록은 교육과정 편성표에서, 학점은 학과별 이수학점 표에서 가져왔어요. 졸업요건은 학과
          공식 안내로 최종 확인하세요.
        </Source>
      </div>
    </TakenCtx.Provider>
  );
}

/** 마이크로디그리 result. */
export function MicrodegreeView({
  plan,
  primaryCredits,
  rules,
  actions,
  onReset,
}: {
  plan: Extract<MicrodegreePlanResult, { available: true }>;
  primaryCredits: Breakdown;
  rules: MajorRules;
  actions: ResultActions;
  onReset: () => void;
}) {
  const md = plan.microdegree;
  const known = md.required_credits;
  const also = new Set(plan.alsoInPrimary.map((c) => c.code));
  const t = useTakenProgress((codes) => applyTakenMd(plan, codes));
  return (
    <TakenCtx.Provider value={t.ui}>
      <div className="flex flex-col gap-4">
        <Hero
          headline={`${plan.primary.dept} + ${md.name}`}
          total={plan.primaryCredits + (known ?? 0)}
          aLabel="본전공"
          a={plan.primaryCredits}
          bLabel="마이크로디그리"
          b={known}
        />
        <SaveGoalButton a={actions} />
        {known === null && <Callout>마이크로디그리 필요 학점을 확인하지 못해 합계에 포함하지 않았어요. 학과 공식 안내를 확인하세요.</Callout>}
        <TakenBox
          t={t}
          fullTotal={plan.primaryCredits + (known ?? md.course_credits)}
          secondLabel="마이크로디그리"
          secondName={md.name}
          sharedWhat="본전공과 마이크로디그리에"
          countsNote="본전공에도 있는 마이크로디그리 과목은 양쪽에 인정돼요."
        />
        <ComboGuide primary={plan.primary.dept} kind="md" second={plan.input.id} />
        <CreditTable
          cols={[{ role: "본전공", name: plan.primary.dept, status: plan.primary.status, b: primaryCredits, tone: "ink", progress: t.progress?.primary }]}
        />
        <section className={`${surface} flex flex-col gap-3 p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-mute">
                <Dot tone="accent" />
                마이크로디그리 · {md.depts.join("·")}
              </span>
              <span className="text-pretty text-[17px] font-bold">{md.name}</span>
            </div>
            <StatusTag status={md.status} />
          </div>
          {md.choice_note && <p className="text-xs leading-normal text-mute">{md.choice_note}</p>}
          <ul className="flex flex-col">
            {md.courses.map((c) => (
              <li key={c.code} className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-sm">
                <span className="min-w-0 text-pretty">{c.name}</span>
                <span className="whitespace-nowrap tabular-nums text-ink-2">{c.credits}학점</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
            <span className="text-sm text-ink-2">{groupRule(md.rule)}</span>
            <span className="text-xl font-bold tabular-nums">
              {known ?? "?"}
              <span className="text-xs font-semibold text-mute">학점</span>
            </span>
          </div>
          {t.progress?.second && (
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink-2">남은 학점</span>
              <span className="font-bold tabular-nums text-accent-deep">
                {t.progress.second.remaining}학점 · {t.progress.second.coursesUnknown ? "최소 " : ""}
                {t.progress.second.remainingCourses}과목
              </span>
            </div>
          )}
          <Problems items={md.problems} />
        </section>
        <Details>
          <More title="본전공 과목·규정" hint={plan.primary.dept}>
            <CourseDetailsBody p={plan.primary} />
          </More>
          <More title={t.ui ? "마이크로디그리 과목 · 들은 과목 체크" : "마이크로디그리 과목 코드"} hint={md.name}>
            <CourseList
              courses={md.courses}
              badge={(code) =>
                also.has(code) && <span className="ml-1 rounded bg-ok-soft px-1 text-xs text-ok no-underline">본전공에도 있음</span>
              }
            />
            <p className="text-xs text-mute">교육과정 책 확인 쪽: {md.pages.join(", ")}</p>
          </More>
          <More title="이 조합에 적용되는 규칙">
            <div>
              <p className="pb-2.5 text-[13px] leading-[1.55] text-mute">
                {rules.microdegree.definition} <span className="text-xs">p.{rules.microdegree.page}</span>
              </p>
              {plan.rules.map((n) => (
                <RuleLine key={n.id} text={n.text} page={n.page} />
              ))}
            </div>
          </More>
        </Details>
        <div className="mt-1 flex flex-col gap-2">
          <ResetButton onReset={onReset} quiz={actions} />
        </div>
        <Source>
          출처: {plan.source.pdf} ({plan.source.asOf}). 졸업요건은 학과 공식 안내로 최종 확인하세요.
        </Source>
      </div>
    </TakenCtx.Provider>
  );
}
