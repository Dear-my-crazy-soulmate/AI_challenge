"use client";

// The calculator: 본전공 -> 이수 형태 -> 희망 전공 -> 결과, one question per screen.
// All numbers come from src/lib/rules/ (credits through /api/plan and /api/microdegree for the result).
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import Avatar from "@/components/Avatar";
import { MicrodegreeView, PlanView, Unavailable } from "@/components/PlanResult";
import type { Breakdown, ResultActions } from "@/components/PlanResult";
import { useGoal } from "@/components/useGoal";
import type { CoursePlanOk, CoursePlanResult } from "@/lib/rules/courses";
import { listCreditOptions } from "@/lib/rules/credits";
import type { CreditData, ProgramKind } from "@/lib/rules/credits";
import { prohibitedReason } from "@/lib/rules/majorRules";
import type { MajorRules } from "@/lib/rules/majorRules";
import type { Microdegree, MicrodegreePlanOk, MicrodegreePlanResult } from "@/lib/rules/microdegrees";
import { useAuth } from "@/lib/auth";
import { isSameGoal, saveGoal } from "@/lib/goal";
import type { Goal } from "@/lib/goal";
import { saveRecent } from "@/lib/recent";

type Mode = "double" | "minor" | "microdegree";
type Step = 1 | 2 | 3 | 4;
const MODES: readonly Mode[] = ["double", "minor", "microdegree"];
const MODE_LABEL: Record<Mode, string> = { double: "다전공", minor: "부전공", microdegree: "마이크로디그리" };

export interface PlannerInitial {
  primary: string;
  mode: string;
  second: string;
}

type Fetched =
  | { key: string; kind: "plan"; plan: CoursePlanResult }
  | { key: string; kind: "md"; plan: MicrodegreePlanResult }
  | { key: string; error: string };

interface PickRow {
  key: string;
  title: string;
  sub: string;
  right: string;
  onPick: () => void;
}

function creditsOf(data: CreditData, dept: string, kind: ProgramKind): Breakdown | null {
  const p = data.depts.find((d) => d.dept === dept)?.programs[kind];
  return p && p.available === true ? { 기초: p.기초, 필수: p.필수, 선택: p.선택, 계: p.계 } : null;
}

const isMode = (m: string): m is Mode => (MODES as readonly string[]).includes(m);

/** Departments that can be the 본전공 (they run a single major). */
function singleDepts(data: CreditData) {
  return data.depts.flatMap((d) => {
    const b = creditsOf(data, d.dept, "single");
    return b ? [{ dept: d.dept, college: d.college, credits: b.계 }] : [];
  });
}

/** Second majors / minors that can be computed and are allowed for this primary. */
function secondDepts(primary: string, mode: "double" | "minor", data: CreditData, rules: MajorRules) {
  const ok = new Set(
    listCreditOptions(primary, data)
      .filter((o) => o.kind === mode && !prohibitedReason(primary, o.dept, rules))
      .map((o) => o.dept),
  );
  return data.depts.flatMap((d) => {
    const b = ok.has(d.dept) ? creditsOf(data, d.dept, mode) : null;
    return b ? [{ dept: d.dept, college: d.college, credits: b.계 }] : [];
  });
}

/** A saved/shared link only counts if it still points at a real combination. */
function validInitial(
  initial: PlannerInitial | undefined,
  data: CreditData,
  rules: MajorRules,
  mds: Microdegree[],
): { primary: string; mode: Mode; second: string } | null {
  if (!initial || !isMode(initial.mode)) return null;
  const { primary, mode, second } = initial;
  if (!singleDepts(data).some((d) => d.dept === primary)) return null;
  const found =
    mode === "microdegree"
      ? mds.some((m) => m.id === second)
      : secondDepts(primary, mode, data, rules).some((d) => d.dept === second);
  return found ? { primary, mode, second } : null;
}

const range = (xs: number[]) => {
  if (xs.length === 0) return "";
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  return lo === hi ? `+${lo}학점` : `+${lo}~${hi}학점`;
};

export interface PlannerProps {
  data: CreditData;
  rules: MajorRules;
  microdegrees: Microdegree[];
  initial?: PlannerInitial;
  quizMajors?: string[]; // majors that have 체험 문제, so a result can link to the right quiz
}

export default function MajorPlanner({ data, rules, microdegrees, initial, quizMajors = [] }: PlannerProps) {
  const [start] = useState(() => validInitial(initial, data, rules, microdegrees));
  const [step, setStep] = useState<Step>(start ? 4 : 1);
  const [primary, setPrimary] = useState(start?.primary ?? "");
  const [mode, setMode] = useState<Mode | null>(start?.mode ?? null);
  const [second, setSecond] = useState(start?.second ?? "");
  const [query, setQuery] = useState("");
  const [college, setCollege] = useState<string | null>(null);
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { profile } = useAuth();

  const goto = (s: Step) => {
    setStep(s);
    setQuery("");
    setCollege(null);
    window.scrollTo({ top: 0 });
  };
  const reset = () => {
    setPrimary("");
    setMode(null);
    setSecond("");
    goto(1);
  };

  const firsts = useMemo(() => singleDepts(data), [data]);
  const seconds = useMemo(
    () => (primary && (mode === "double" || mode === "minor") ? secondDepts(primary, mode, data, rules) : []),
    [primary, mode, data, rules],
  );

  // ---- result ----
  const key = `${mode}|${primary}|${second}`;
  useEffect(() => {
    if (step !== 4 || !mode || !primary || !second) return;
    const controller = new AbortController();
    const isMd = mode === "microdegree";
    const q = new URLSearchParams(isMd ? { primary, id: second } : { primary, second, kind: mode });
    fetch(`/api/${isMd ? "microdegree" : "plan"}?${q}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CoursePlanResult | MicrodegreePlanResult>;
      })
      .then((plan) =>
        setFetched(
          isMd
            ? { key: `${mode}|${primary}|${second}`, kind: "md", plan: plan as MicrodegreePlanResult }
            : { key: `${mode}|${primary}|${second}`, kind: "plan", plan: plan as CoursePlanResult },
        ),
      )
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setFetched({
          key: `${mode}|${primary}|${second}`,
          error: `결과를 불러오지 못했어요 (${e instanceof Error ? e.message : String(e)}).`,
        });
      });
    return () => controller.abort();
  }, [step, mode, primary, second, attempt]);
  const current = step === 4 && fetched?.key === key ? fetched : null;

  // Remember the last successful combination for the home shortcut.
  useEffect(() => {
    if (!current || "error" in current || !mode || !current.plan.available) return;
    if (current.kind === "md") {
      const md = current.plan.microdegree;
      saveRecent({
        label: `${primary} + ${md.name}`,
        kind: MODE_LABEL.microdegree,
        total: current.plan.primaryCredits + (md.required_credits ?? 0),
        primary,
        mode,
        second,
      });
    } else {
      saveRecent({
        label: `${primary} + ${second}`,
        kind: MODE_LABEL[mode],
        total: current.plan.totals.total,
        primary,
        mode,
        second,
      });
    }
  }, [current, mode, primary, second]);

  // ---- pickers (steps 1 and 3) ----
  const picking = step === 1 || step === 3;
  const mine = firsts.find((d) => d.dept === profile?.primary);

  // A signed-in user's 본전공 is already known, so start at 이수 형태 (once; the 본전공 chip still goes back).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || start || !mine || step !== 1) return;
    autoStarted.current = true;
    setPrimary(mine.dept);
    setStep(2);
  }, [mine, start, step]);

  const isMdPick = step === 3 && mode === "microdegree";
  const q = query.trim().replace(/\s/g, "");
  const match = (s: string) => !q || s.replace(/\s/g, "").includes(q);

  let rows: PickRow[] = [];
  let chips: string[] = [];
  if (step === 1 || (step === 3 && !isMdPick)) {
    const list = step === 1 ? firsts : seconds;
    chips = [...new Set(list.map((d) => d.college))];
    const col = q ? null : college;
    // Departments the user marked as interesting come first when choosing a second major.
    const liked = new Set(step === 3 ? (profile?.interests ?? []) : []);
    rows = [...list.filter((d) => liked.has(d.dept)), ...list.filter((d) => !liked.has(d.dept))]
      .filter((d) => match(d.dept) && (!col || d.college === col))
      .map((d) => ({
        key: d.dept,
        title: d.dept,
        sub: liked.has(d.dept) ? `${d.college} · 관심 전공` : d.college,
        right: `${step === 1 ? "단일" : MODE_LABEL[mode ?? "double"]} ${d.credits}학점`,
        onPick: () => {
          if (step === 1) {
            setPrimary(d.dept);
            setMode(null);
            setSecond("");
            goto(2);
          } else {
            setSecond(d.dept);
            goto(4);
          }
        },
      }));
  } else if (isMdPick) {
    rows = microdegrees
      .filter((m) => match(m.name + m.depts.join("")))
      .map((m) => ({
        key: m.id,
        title: m.name,
        sub: `${m.depts.join(" · ")} · ${m.courses.length}과목`,
        right: `${m.required_credits ?? "?"}학점`,
        onPick: () => {
          setSecond(m.id);
          goto(4);
        },
      }));
  }
  const pickTitle =
    step === 1
      ? "내 본전공은 무엇인가요?"
      : isMdPick
        ? "관심 있는 마이크로디그리를 골라 주세요"
        : `희망 ${MODE_LABEL[mode ?? "double"]}을 골라 주세요`;
  const searchPlaceholder = isMdPick ? "이름이나 운영 학과로 검색" : "학과 이름으로 검색";

  // ---- kinds (step 2) ----
  const kinds = useMemo(() => {
    if (!primary) return [];
    const pageOf = (id: string) => rules.notices.find((n) => n.id === id)?.page;
    const single = creditsOf(data, primary, "single");
    const double = creditsOf(data, primary, "double");
    const minors = data.depts
      .filter((d) => d.dept !== primary && !prohibitedReason(primary, d.dept, rules))
      .flatMap((d) => creditsOf(data, d.dept, "minor")?.계 ?? []);
    const mdCredits = microdegrees.flatMap((m) => m.required_credits ?? []);
    return [
      double && single
        ? {
            mode: "double" as const,
            tag: `본전공 ${single.계} → ${double.계}학점`,
            desc: "두 번째 전공을 정식으로 이수해요. 본전공 이수 학점이 다전공 기준으로 줄어들어요.",
            meta: `2학기 이상 등록 후 신청 · 선발 필요 (p.${pageOf("apply-eligibility")})`,
          }
        : null,
      minors.length
        ? {
            mode: "minor" as const,
            tag: range(minors),
            desc: "다른 전공을 가볍게 이수해요. 본전공은 단일전공 기준 학점을 그대로 들어요.",
            meta: `졸업예정학기에 인포21로 이수 심사 신청 (p.${pageOf("minor-apply")})`,
          }
        : null,
      {
        mode: "microdegree" as const,
        tag: range(mdCredits),
        desc: "특정 분야의 과목 묶음을 이수하는 소단위 과정이에요. 과목은 전공·교양 학점으로도 인정돼요.",
        meta: `${microdegrees.length}개 과정 운영`,
      },
    ].filter((k) => k !== null);
  }, [primary, data, rules, microdegrees]);

  const crumbs: { k: string; v: string; go: () => void }[] = [];
  if (step > 1 && primary) crumbs.push({ k: "본전공", v: primary, go: () => goto(1) });
  if (step > 2 && mode) crumbs.push({ k: "형태", v: MODE_LABEL[mode], go: () => goto(2) });
  if (step > 3 && second) {
    const v = mode === "microdegree" ? (microdegrees.find((m) => m.id === second)?.name ?? second) : second;
    crumbs.push({ k: "희망", v, go: () => goto(3) });
  }

  const backBtn = "-ml-3 flex h-11 w-11 items-center justify-center text-[28px] leading-none";

  return (
    <main className="flex flex-col gap-5 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
      <div className="flex h-11 items-center justify-between">
        {step === 1 ? (
          <Link href="/" aria-label="홈으로" className={backBtn}>
            ‹
          </Link>
        ) : (
          <button type="button" aria-label="이전 단계" onClick={() => goto((step - 1) as Step)} className={backBtn}>
            ‹
          </button>
        )}
        <h1 className="text-base font-bold">다전공 계산기</h1>
        <span className="w-11 text-right text-[13px] tabular-nums text-mute">{step < 4 ? `${step}/3` : "결과"}</span>
      </div>

      <div className="-mt-2.5 grid grid-cols-3 gap-1.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-1 rounded-sm transition-colors duration-300 ${step >= i ? "bg-accent" : "bg-chip"}`} />
        ))}
      </div>

      {crumbs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {crumbs.map((c) => (
            <button
              key={c.k}
              type="button"
              onClick={c.go}
              className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-[7px] text-[13px]"
            >
              <span className="text-mute">{c.k}</span>
              <span className="font-semibold">{c.v}</span>
            </button>
          ))}
        </div>
      )}

      {picking && (
        <div className="flex flex-col gap-4">
          <h2 className="text-pretty text-2xl font-bold leading-[1.35] tracking-[-0.6px]">{pickTitle}</h2>
          <label className="flex h-12 items-center gap-2.5 rounded-[14px] border border-line bg-card px-3.5">
            <span aria-hidden className="box-border h-3.5 w-3.5 flex-none rounded-full border-2 border-faint" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
            />
          </label>
          {chips.length > 0 && (
            <div className="no-scrollbar -mx-[22px] flex gap-1.5 overflow-x-auto px-[22px]">
              {["전체", ...chips].map((c) => {
                const on = c === "전체" ? !college : college === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCollege(c === "전체" ? null : c);
                      setQuery("");
                    }}
                    className={`flex-none whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold ${
                      on ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}
          {step === 1 && mine && !q && (
            <button
              type="button"
              onClick={() => {
                setPrimary(mine.dept);
                setMode(null);
                setSecond("");
                goto(2);
              }}
              className="flex items-center gap-3 rounded-[18px] bg-ink px-4 py-3.5 text-left text-paper active:opacity-90"
            >
              <Avatar dept={profile?.avatar ?? mine.dept} size={36} onDark />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-xs opacity-70">내 정보의 본전공으로 시작</span>
                <span className="text-[15px] font-semibold">{mine.dept}</span>
              </span>
              <span aria-hidden className="text-xl opacity-60">
                ›
              </span>
            </button>
          )}
          <div className="flex flex-col overflow-hidden rounded-[18px] bg-card">
            {rows.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={r.onPick}
                className="box-border flex min-h-14 items-center gap-3 border-t border-line-2 px-4 py-3.5 text-left first:border-t-0 active:bg-paper"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-pretty text-[15px] font-semibold">{r.title}</span>
                  <span className="text-xs text-mute">{r.sub}</span>
                </span>
                <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{r.right}</span>
              </button>
            ))}
            {rows.length === 0 && <p className="px-4 py-5 text-sm text-mute">검색 결과가 없어요.</p>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">
            어떤 방식으로
            <br />더 공부할까요?
          </h2>
          {kinds.map((k) => (
            <button
              key={k.mode}
              type="button"
              onClick={() => {
                setMode(k.mode);
                setSecond("");
                goto(3);
              }}
              className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-card p-[18px] text-left active:scale-[.99]"
            >
              <span className="flex items-baseline justify-between gap-2.5">
                <span className="text-lg font-bold">{MODE_LABEL[k.mode]}</span>
                <span className="whitespace-nowrap text-[13px] font-semibold text-accent">{k.tag}</span>
              </span>
              <span className="text-pretty text-sm leading-normal text-ink-2">{k.desc}</span>
              <span className="text-xs text-mute">{k.meta}</span>
            </button>
          ))}
        </div>
      )}

      {step === 4 && !current && (
        <p className="text-sm text-mute" role="status">
          교육과정 데이터를 불러오는 중…
        </p>
      )}

      {current && "error" in current && (
        <div className="flex flex-col gap-3">
          <Unavailable message={current.error} />
          <button
            type="button"
            onClick={() => {
              setFetched(null);
              setAttempt((n) => n + 1);
            }}
            className="box-border flex h-[50px] items-center justify-center rounded-2xl border border-line bg-card text-[15px] font-semibold"
          >
            다시 시도
          </button>
        </div>
      )}

      {current && !("error" in current) && current.kind === "plan" && (
        <PlanResultSwitch plan={current.plan} data={data} primary={primary} mode={mode} quizMajors={quizMajors} onReset={reset} />
      )}

      {current && !("error" in current) && current.kind === "md" && (
        <MdResultSwitch plan={current.plan} data={data} primary={primary} rules={rules} onReset={reset} />
      )}
    </main>
  );
}

/** Buttons under a result: save it as 내 목표, and open the quiz of the major just calculated. */
function useResultActions(goal: Goal, quizMajors: string[]): ResultActions {
  const saved = isSameGoal(useGoal(), goal);
  const hasQuiz = goal.mode !== "microdegree" && quizMajors.includes(goal.second);
  return {
    goalSaved: saved,
    onSaveGoal: () => saveGoal(goal),
    quizHref: hasQuiz ? `/experience?major=${encodeURIComponent(goal.second)}` : "/experience",
    quizLabel: hasQuiz ? `${goal.second} 체험 문제 풀기` : "전공 체험 문제 보러 가기",
  };
}

function PlanResultSwitch({
  plan,
  data,
  primary,
  mode,
  quizMajors,
  onReset,
}: {
  plan: CoursePlanResult;
  data: CreditData;
  primary: string;
  mode: Mode | null;
  quizMajors: string[];
  onReset: () => void;
}) {
  if (!plan.available) return <ResultWithReset message={plan.message} onReset={onReset} />;
  const a = creditsOf(data, primary, mode === "double" ? "double" : "single");
  const b = creditsOf(data, plan.second.dept, plan.input.kind);
  if (!a || !b) return <ResultWithReset message="학점 데이터를 찾을 수 없어요. 학과 공식 안내를 확인하세요." onReset={onReset} />;
  return <PlanOk plan={plan} a={a} b={b} quizMajors={quizMajors} onReset={onReset} />;
}

function PlanOk({
  plan,
  a,
  b,
  quizMajors,
  onReset,
}: {
  plan: CoursePlanOk;
  a: Breakdown;
  b: Breakdown;
  quizMajors: string[];
  onReset: () => void;
}) {
  const actions = useResultActions(
    {
      primary: plan.primary.dept,
      mode: plan.input.kind,
      second: plan.second.dept,
      secondName: plan.second.dept,
      primaryCredits: plan.totals.primaryCredits,
      secondCredits: plan.totals.secondCredits,
    },
    quizMajors,
  );
  return <PlanView plan={plan} primaryCredits={a} secondCredits={b} actions={actions} onReset={onReset} />;
}

function MdResultSwitch({
  plan,
  data,
  primary,
  rules,
  onReset,
}: {
  plan: MicrodegreePlanResult;
  data: CreditData;
  primary: string;
  rules: MajorRules;
  onReset: () => void;
}) {
  if (!plan.available) return <ResultWithReset message={plan.message} onReset={onReset} />;
  const a = creditsOf(data, primary, "single");
  if (!a) return <ResultWithReset message="학점 데이터를 찾을 수 없어요. 학과 공식 안내를 확인하세요." onReset={onReset} />;
  return <MdOk plan={plan} a={a} rules={rules} onReset={onReset} />;
}

function MdOk({
  plan,
  a,
  rules,
  onReset,
}: {
  plan: MicrodegreePlanOk;
  a: Breakdown;
  rules: MajorRules;
  onReset: () => void;
}) {
  const md = plan.microdegree;
  const actions = useResultActions(
    {
      primary: plan.primary.dept,
      mode: "microdegree",
      second: plan.input.id,
      secondName: md.name,
      primaryCredits: plan.primaryCredits,
      secondCredits: md.required_credits,
    },
    [],
  );
  return <MicrodegreeView plan={plan} primaryCredits={a} rules={rules} actions={actions} onReset={onReset} />;
}

function ResultWithReset({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Unavailable message={message} />
      <button
        type="button"
        onClick={onReset}
        className="box-border flex h-[50px] items-center justify-center rounded-2xl border border-line bg-card text-[15px] font-semibold"
      >
        다시 계산하기
      </button>
    </div>
  );
}
