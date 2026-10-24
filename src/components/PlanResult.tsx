// Result screens of the calculator (step 4): a dark total card, one card per program with
// credit bars, the school-wide rules that apply, and the course lists folded inside each card.
// Pure presentation: every number comes from src/lib/rules/ through /api/plan and /api/microdegree.
import Link from "next/link";
import type { ReactNode } from "react";

import type { CourseGroup, CoursePlanOk, ProgramCourses } from "@/lib/rules/courses";
import type { MajorRules } from "@/lib/rules/majorRules";
import type { MicrodegreePlanResult } from "@/lib/rules/microdegrees";

export interface Breakdown {
  기초: number;
  필수: number;
  선택: number;
  계: number;
}

type Status = ProgramCourses["status"];
const STATUS: Record<Status, { label: string; tone: string }> = {
  verified: { label: "학점 검증 완료", tone: "bg-ok-soft text-ok" },
  choose: { label: "일부 선택 이수", tone: "bg-warn-soft text-warn" },
  check: { label: "학과 확인 필요", tone: "bg-warn-soft text-warn" },
  no_courses: { label: "과목 정보 없음", tone: "bg-sand-2 text-ink-2" },
};
const KIND_LABEL = { single: "단일전공", double: "다전공", minor: "부전공" } as const;

interface Row {
  k: string;
  v: number;
  ratio: number; // 0..1 share of the bar
}

function creditRows(b: Breakdown): Row[] {
  return (
    [
      ["전공기초", b.기초],
      ["전공필수", b.필수],
      ["전공선택", b.선택],
    ] as const
  ).map(([k, v]) => ({ k, v, ratio: b.계 ? v / b.계 : 0 }));
}

function groupRule(rule: CourseGroup["rule"]): string {
  if (rule === "all") return "모두 이수";
  if (rule === "choose") return "아래 과목 중 선택";
  return "과목 목록과 학점이 맞지 않아 확인 필요";
}

function Callout({ children }: { children: ReactNode }) {
  return <p className="rounded-[18px] border border-warn/30 bg-warn-soft px-[18px] py-4 text-sm leading-normal text-ink">{children}</p>;
}

export function Unavailable({ message }: { message: string }) {
  return <Callout>{message}</Callout>;
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

function Bars({ rows, tone, labelWidth = 64 }: { rows: Row[]; tone: "ink" | "accent"; labelWidth?: number }) {
  return (
    <div className="flex flex-col gap-3.5">
      {rows.map((r) => (
        <div
          key={r.k}
          className="grid items-center gap-2.5"
          style={{ gridTemplateColumns: `${labelWidth}px 1fr 44px` }}
        >
          <span className="text-pretty text-[13px] text-ink-2">{r.k}</span>
          <div className="h-2 overflow-hidden rounded bg-line-2">
            <div
              className={`h-full rounded ${tone === "ink" ? "bg-ink" : "bg-accent"}`}
              style={{ width: `${Math.min(100, r.ratio * 100)}%` }}
            />
          </div>
          <span className="text-right text-sm font-semibold tabular-nums">{r.v}</span>
        </div>
      ))}
    </div>
  );
}

function ProgramCard(p: {
  role: string;
  name: string;
  status: Status;
  rows: Row[];
  tone: "ink" | "accent";
  labelWidth?: number;
  foot: string;
  sum: number | string;
  children?: ReactNode;
}) {
  const s = STATUS[p.status];
  return (
    <section className="flex flex-col gap-3.5 rounded-[20px] border border-edge bg-card p-[18px]">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <span className="text-xs text-mute">{p.role}</span>
          <span className="text-pretty text-[17px] font-bold">{p.name}</span>
        </div>
        <span className={`flex-none whitespace-nowrap rounded-[10px] px-2 py-1 text-[11px] font-semibold ${s.tone}`}>
          {s.label}
        </span>
      </div>
      <Bars rows={p.rows} tone={p.tone} labelWidth={p.labelWidth} />
      <div className="flex justify-between gap-3 border-t border-line-2 pt-3 text-sm">
        <span className="text-mute">{p.foot}</span>
        <span className="font-bold tabular-nums">{p.sum}학점</span>
      </div>
      {p.children}
    </section>
  );
}

function Foldable({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group border-t border-line-2 pt-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold text-ink-2">
        {summary}
        <span aria-hidden className="inline-block text-faint transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </details>
  );
}

function CourseList({ courses }: { courses: CourseGroup["courses"] }) {
  return (
    <ul className="flex flex-col gap-1">
      {courses.map((c) => (
        <li key={c.code} className="flex justify-between gap-2 rounded-lg bg-sand px-2.5 py-1.5 text-[13px]">
          <span>
            {c.name} <span className="text-xs text-mute">{c.code}</span>
          </span>
          <span className="whitespace-nowrap tabular-nums text-ink-2">{c.credits}학점</span>
        </li>
      ))}
    </ul>
  );
}

function Group({ g }: { g: CourseGroup }) {
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

function CourseDetails({ p }: { p: ProgramCourses }) {
  return (
    <Foldable summary="과목·학과 규정 보기">
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
    </Foldable>
  );
}

function RuleLine({ text, page }: { text: string; page: number }) {
  return (
    <div className="flex gap-2.5 border-t border-line-2 py-2.5">
      <span className="flex-1 text-pretty text-[13.5px] leading-[1.55] text-ink-3">{text}</span>
      <span className="flex-none pt-0.5 text-[11px] text-mute">p.{page}</span>
    </div>
  );
}

function RulesApplied({ r }: { r: CoursePlanOk }) {
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
    <section className="flex flex-col gap-1 rounded-[20px] border border-edge bg-card p-[18px]">
      <h3 className="mb-1.5 text-[15px] font-bold">이 조합에 적용되는 규칙</h3>
      {items.length > 0 ? (
        items.map((i) => <RuleLine key={i.key} text={i.text} page={i.page} />)
      ) : (
        <p className="border-t border-line-2 pt-2.5 text-[13.5px] text-mute">이 조합에 학점이 달라지는 공통 규칙은 없어요.</p>
      )}
      <Foldable summary={`신청·이수 안내 ${m.notices.length}개`}>
        <div className="-mt-2">
          {m.notices.map((n) => (
            <RuleLine key={n.id} text={n.text} page={n.page} />
          ))}
        </div>
      </Foldable>
    </section>
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
        className="box-border flex h-[52px] items-center justify-center rounded-2xl border border-edge bg-card text-[15px] font-bold"
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
  return (
    <div className="flex flex-col gap-3.5">
      <Hero
        headline={`${plan.primary.dept} + ${plan.second.dept}`}
        total={plan.totals.total}
        aLabel="본전공"
        a={plan.totals.primaryCredits}
        bLabel={label}
        b={plan.totals.secondCredits}
      />
      <SaveGoalButton a={actions} />
      {plan.totals.savedCredits > 0 && (
        <div className="flex items-center gap-3.5 rounded-[18px] bg-accent-soft px-[18px] py-4">
          <span className="whitespace-nowrap text-[22px] font-bold tabular-nums text-accent-deep">−{plan.totals.savedCredits}</span>
          <span className="text-pretty text-sm leading-normal">
            다전공을 하면 본전공이 단일전공 {plan.singleCredits}학점에서 {plan.totals.primaryCredits}학점으로 줄어요.
          </span>
        </div>
      )}
      {min < plan.totals.total && (
        <div className="rounded-[18px] bg-sand-2 px-[18px] py-4 text-sm leading-normal">
          공통 규칙을 적용하면 실제로 들어야 할 전공 학점은 최소 <b className="tabular-nums">{min}</b>학점이에요.
        </div>
      )}
      <ProgramCard
        role={`본전공 · ${kind === "double" ? "다전공 체계" : "단일전공"}`}
        name={plan.primary.dept}
        status={plan.primary.status}
        rows={creditRows(primaryCredits)}
        tone="ink"
        foot={`${kind === "double" ? "다전공" : "단일전공"} 기준`}
        sum={plan.totals.primaryCredits}
      >
        <CourseDetails p={plan.primary} />
      </ProgramCard>
      <ProgramCard
        role={`희망 ${label}`}
        name={plan.second.dept}
        status={plan.second.status}
        rows={creditRows(secondCredits)}
        tone="accent"
        foot={`${label} 기준`}
        sum={plan.totals.secondCredits}
      >
        <CourseDetails p={plan.second} />
      </ProgramCard>
      <RulesApplied r={plan} />
      {plan.warnings.length > 0 && (
        <details className="rounded-[18px] border border-edge bg-card px-[18px] py-3.5 text-[13px]">
          <summary className="cursor-pointer font-semibold text-warn">학점 데이터 확인 항목 {plan.warnings.length}개</summary>
          <ul className="mt-2 list-disc pl-5 text-mute">
            {plan.warnings.map((w, i) => (
              <li key={i}>
                {w.source} · {w.code}: {w.message}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="mt-1 flex flex-col gap-2">
        <ResetButton onReset={onReset} quiz={actions} />
      </div>
      <Source>
        출처: {plan.source.pdf} ({plan.source.asOf}). 과목 목록은 교육과정 편성표에서, 학점은 학과별 이수학점 표에서
        가져왔어요. 졸업요건은 학과 공식 안내로 최종 확인하세요.
      </Source>
    </div>
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
  const scale = known || md.course_credits || 1;
  return (
    <div className="flex flex-col gap-3.5">
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
      <ProgramCard
        role="본전공 · 단일전공"
        name={plan.primary.dept}
        status={plan.primary.status}
        rows={creditRows(primaryCredits)}
        tone="ink"
        foot="단일전공 기준"
        sum={plan.primaryCredits}
      >
        <CourseDetails p={plan.primary} />
      </ProgramCard>
      <ProgramCard
        role={`마이크로디그리 · ${md.depts.join("·")}`}
        name={md.name}
        status={md.status}
        rows={md.courses.map((c) => ({ k: c.name, v: c.credits, ratio: c.credits / scale }))}
        tone="accent"
        labelWidth={104}
        foot={groupRule(md.rule)}
        sum={known ?? "?"}
      >
        {md.choice_note && <p className="text-xs leading-normal text-mute">{md.choice_note}</p>}
        <Problems items={md.problems} />
        <Foldable summary="과목 코드 보기">
          <ul className="flex flex-col gap-1">
            {md.courses.map((c) => (
              <li key={c.code} className="flex justify-between gap-2 rounded-lg bg-sand px-2.5 py-1.5 text-[13px]">
                <span>
                  {c.name} <span className="text-xs text-mute">{c.code}</span>
                  {also.has(c.code) && (
                    <span className="ml-1 rounded bg-ok-soft px-1 text-xs text-ok">본전공에도 있음</span>
                  )}
                </span>
                <span className="whitespace-nowrap tabular-nums text-ink-2">{c.credits}학점</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-mute">교육과정 책 확인 쪽: {md.pages.join(", ")}</p>
        </Foldable>
      </ProgramCard>
      <section className="flex flex-col gap-1 rounded-[20px] border border-edge bg-card p-[18px]">
        <h3 className="mb-1.5 text-[15px] font-bold">이 조합에 적용되는 규칙</h3>
        <p className="border-t border-line-2 pb-1 pt-2.5 text-[13px] leading-[1.55] text-mute">
          {rules.microdegree.definition} <span className="text-[11px]">p.{rules.microdegree.page}</span>
        </p>
        {plan.rules.map((n) => (
          <RuleLine key={n.id} text={n.text} page={n.page} />
        ))}
      </section>
      <div className="mt-1 flex flex-col gap-2">
        <ResetButton onReset={onReset} quiz={actions} />
      </div>
      <Source>
        출처: {plan.source.pdf} ({plan.source.asOf}). 졸업요건은 학과 공식 안내로 최종 확인하세요.
      </Source>
    </div>
  );
}
