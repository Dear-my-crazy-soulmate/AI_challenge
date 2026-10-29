"use client";

// The calculator: 이수 형태 -> 희망 전공 -> 결과, one question per screen.
// Signed in, the 본전공 is the one from 내 정보 (entered at sign-up). Not signed in, the student
// picks it first, so anyone (a first visit, a judge) can calculate without an account.
// All numbers come from src/lib/rules/ (credits through /api/plan and /api/microdegree for the result).
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BackIcon, SearchIcon } from "@/components/Icons";
import { primaryButton } from "@/components/Field";
import { MicrodegreeView, PlanView, Unavailable } from "@/components/PlanResult";
import type { Breakdown, ResultActions } from "@/components/PlanResult";
import { useGoal } from "@/components/useGoal";
import type { CoursePlanOk, CoursePlanResult } from "@/lib/rules/courses";
import { listCreditOptions } from "@/lib/rules/credits";
import type { CreditData, ProgramKind } from "@/lib/rules/credits";
import { prohibitedReason, trackOf } from "@/lib/rules/majorRules";
import type { MajorRules } from "@/lib/rules/majorRules";
import type { Microdegree, MicrodegreePlanOk, MicrodegreePlanResult } from "@/lib/rules/microdegrees";
import { useAuth } from "@/lib/auth";
import { isSameGoal, saveGoal } from "@/lib/goal";
import type { Goal } from "@/lib/goal";
import { saveRecent } from "@/lib/recent";

type Mode = "double" | "minor" | "microdegree";
type Step = 2 | 3 | 4; // 2 이수 형태, 3 희망 전공, 4 결과
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
  rightTop?: string; // small label over the number: "다전공"
  rightMain: string; // the number: "51학점"
  liked?: boolean; // one of the student's 관심 전공: listed first, under its own heading
  onPick: () => void;
}

/** One list of departments: a hairline between rows, the credits on the right as a number. */
function PickGroup({ title, star = false, rows }: { title?: string; star?: boolean; rows: PickRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      {title && (
        <h3 className="flex items-center gap-1.5 pl-0.5 text-sm font-bold">
          {star && (
            <span aria-hidden className="text-accent">
              ★
            </span>
          )}
          {title}
          <span className="text-xs font-semibold text-mute">{rows.length}</span>
        </h3>
      )}
      <div className="flex flex-col overflow-hidden rounded-3xl border border-edge bg-white">
        {rows.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={r.onPick}
            className="box-border flex min-h-16 items-center gap-3 border-t border-line px-4 py-3 text-left first:border-t-0 active:bg-card"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-pretty text-[15px] font-semibold leading-snug">{r.title}</span>
              <span className="text-xs text-mute">{r.sub}</span>
            </span>
            <span className="flex flex-none flex-col items-end">
              {r.rightTop && <span className="text-xs text-mute">{r.rightTop}</span>}
              <span className="whitespace-nowrap text-base font-bold tabular-nums text-accent-deep">{r.rightMain}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function creditsOf(data: CreditData, dept: string, kind: ProgramKind): Breakdown | null {
  const p = data.depts.find((d) => d.dept === dept)?.programs[kind];
  return p && p.available === true ? { 기초: p.기초, 필수: p.필수, 선택: p.선택, 계: p.계, combined: p.combined } : null;
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

/** "+21~33" (no unit), for the big number of a card */
const rangeNum = (xs: number[]) => {
  if (xs.length === 0) return "";
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  return lo === hi ? `+${lo}` : `+${lo}~${hi}`;
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
  // a link whose combination cannot be computed as asked (e.g. no 다전공 for that pair) still
  // brings its 본전공, so the student only picks the form again instead of starting over
  const [linkOnly] = useState(() =>
    !start && initial && singleDepts(data).some((d) => d.dept === initial.primary) ? initial.primary : "",
  );
  const [step, setStep] = useState<Step>(start ? 4 : 2);
  const [linkPrimary, setLinkPrimary] = useState(start?.primary ?? linkOnly); // 본전공 of a shared link, if any
  const [guestPrimary, setGuestPrimary] = useState(""); // picked here when not signed in
  const [mode, setMode] = useState<Mode | null>(start?.mode ?? null);
  const [second, setSecond] = useState(start?.second ?? "");
  const [query, setQuery] = useState("");
  const [college, setCollege] = useState<string | null>(null);
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { ready, signedIn, profile } = useAuth();

  const goto = (s: Step) => {
    setStep(s);
    setQuery("");
    setCollege(null);
    window.scrollTo({ top: 0 });
  };
  const reset = () => {
    setLinkPrimary(""); // a new calculation uses my own 본전공
    setMode(null);
    setSecond("");
    goto(2);
  };

  const firsts = useMemo(() => singleDepts(data), [data]);
  const mine = firsts.find((d) => d.dept === profile?.primary);
  const primary = linkPrimary || mine?.dept || guestPrimary;
  // the chip then leads to 내 정보 instead of re-picking (a link to my own 본전공 counts as mine)
  const ownPrimary = !!mine && (!linkPrimary || linkPrimary === mine.dept);
  const changePrimary = () => {
    setLinkPrimary("");
    setGuestPrimary("");
    setMode(null);
    setSecond("");
    goto(2);
  };
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

  // ---- 본전공 missing: not signed in, or the saved one has no single-major credits ----
  const needPrimary = step !== 4 && !primary;
  const pickingPrimary = needPrimary && ready && !signedIn;

  // ---- picker (본전공 when not signed in, or step 3) ----
  const picking = (step === 3 && !needPrimary) || pickingPrimary;

  const isMdPick = step === 3 && mode === "microdegree";
  const q = query.trim().replace(/\s/g, "");
  const match = (s: string) => !q || s.replace(/\s/g, "").includes(q);
  // Tracks of one 학부 (기계공학부 등) show the 학부 name and can be found by it.
  const schoolOf = (dept: string) => trackOf(dept, rules)?.school ?? "";
  const withTrack = (college: string, dept: string) => (schoolOf(dept) ? `${college} · ${schoolOf(dept)} 트랙` : college);

  let rows: PickRow[] = [];
  let chips: string[] = [];
  if (pickingPrimary) {
    chips = [...new Set(firsts.map((d) => d.college))];
    const col = q ? null : college;
    rows = firsts
      .filter((d) => match(d.dept + schoolOf(d.dept)) && (!col || d.college === col))
      .map((d) => ({
        key: d.dept,
        title: d.dept,
        sub: withTrack(d.college, d.dept),
        rightTop: "단일전공",
        rightMain: `${d.credits}학점`,
        onPick: () => {
          setGuestPrimary(d.dept);
          goto(2);
        },
      }));
  } else if (step === 3 && !isMdPick) {
    const list = seconds;
    chips = [...new Set(list.map((d) => d.college))];
    const col = q ? null : college;
    // Departments the user marked as interesting come first when choosing a second major.
    const liked = new Set(profile?.interests ?? []);
    rows = [...list.filter((d) => liked.has(d.dept)), ...list.filter((d) => !liked.has(d.dept))]
      .filter((d) => match(d.dept + schoolOf(d.dept)) && (!col || d.college === col))
      .map((d) => ({
        key: d.dept,
        title: d.dept,
        sub: withTrack(d.college, d.dept),
        rightTop: MODE_LABEL[mode ?? "double"],
        rightMain: `${d.credits}학점`,
        liked: liked.has(d.dept),
        onPick: () => {
          setSecond(d.dept);
          goto(4);
        },
      }));
  } else if (isMdPick) {
    rows = microdegrees
      .filter((m) => match(m.name + m.depts.join("")))
      .map((m) => ({
        key: m.id,
        title: m.name,
        sub: `${m.depts.join(" · ")} · ${m.courses.length}과목`,
        rightTop: "필요 학점",
        rightMain: `${m.required_credits ?? "?"}학점`,
        onPick: () => {
          setSecond(m.id);
          goto(4);
        },
      }));
  }
  const pickTitle = pickingPrimary
    ? "본전공을 골라 주세요"
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
            bigLabel: "본전공 학점이 줄어요",
            big: `${single.계} → ${double.계}`,
            desc: "두 번째 전공을 정식으로 이수해요. 본전공 이수 학점이 다전공 기준으로 줄어들어요.",
            meta: `2학기 이상 등록 후 신청 · 선발 필요 (p.${pageOf("apply-eligibility")})`,
          }
        : null,
      minors.length
        ? {
            mode: "minor" as const,
            bigLabel: "추가로 이수해요",
            big: rangeNum(minors),
            desc: "다른 전공을 가볍게 이수해요. 본전공은 단일전공 기준 학점을 그대로 들어요.",
            meta: `졸업예정학기에 인포21로 이수 심사 신청 (p.${pageOf("minor-apply")})`,
          }
        : null,
      {
        mode: "microdegree" as const,
        bigLabel: "추가로 이수해요",
        big: rangeNum(mdCredits),
        desc: "특정 분야의 과목 묶음을 이수하는 소단위 과정이에요. 과목은 전공·교양 학점으로도 인정돼요.",
        meta: `${microdegrees.length}개 과정 운영`,
      },
    ].filter((k) => k !== null);
  }, [primary, data, rules, microdegrees]);

  const crumbs: { k: string; v: string; go: () => void }[] = [];
  if (step > 2 && mode) crumbs.push({ k: "형태", v: MODE_LABEL[mode], go: () => goto(2) });
  if (step > 3 && second) {
    const v = mode === "microdegree" ? (microdegrees.find((m) => m.id === second)?.name ?? second) : second;
    crumbs.push({ k: "희망", v, go: () => goto(3) });
  }

  const backBtn = "-ml-3 flex h-11 w-11 items-center justify-center";

  return (
    <main className={`flex flex-col px-[22px] pt-[max(6px,env(safe-area-inset-top))] ${step === 2 && !needPrimary ? "min-h-[calc(100dvh-62px-env(safe-area-inset-bottom))] gap-4 pb-3" : "gap-5 pb-8"}`}>
      <div className="flex h-11 items-center justify-between">
        {step === 2 ? (
          <span aria-hidden className="w-11" /> // a tab's first screen has nowhere to go back to
        ) : (
          <button type="button" aria-label="이전 단계" onClick={() => goto((step - 1) as Step)} className={backBtn}>
            <BackIcon className="h-6 w-6" />
          </button>
        )}
        <h1 className="text-base font-bold">다전공 계산기</h1>
        <span className="w-11 text-right text-[13px] tabular-nums text-mute">{needPrimary ? "" : step < 4 ? `${step - 1}/2` : "결과"}</span>
      </div>

      <div className="-mt-2.5 grid grid-cols-2 gap-1.5" aria-hidden>
        {[1, 2].map((i) => (
          <div key={i} className={`h-1 rounded-sm transition-colors duration-300 ${step - 1 >= i ? "bg-accent" : "bg-chip"}`} />
        ))}
      </div>

      {(primary || crumbs.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {primary &&
            (ownPrimary ? (
              <Link
                href="/profile"
                title="내 정보에서 바꿀 수 있어요"
                className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-[7px] text-[13px] text-paper"
              >
                <span className="opacity-65">본전공</span>
                <span className="font-semibold">{primary}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={changePrimary}
                title="본전공 다시 고르기"
                className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-[7px] text-[13px] text-paper"
              >
                <span className="opacity-65">본전공</span>
                <span className="font-semibold">{primary}</span>
                <span className="opacity-65">바꾸기</span>
              </button>
            ))}
          {crumbs.map((c) => (
            <button
              key={c.k}
              type="button"
              onClick={c.go}
              className="flex items-center gap-1.5 rounded-full border border-edge bg-card px-3 py-[7px] text-[13px]"
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
          {pickingPrimary && (
            <p className="-mt-2 text-[13px] leading-normal text-mute">
              로그인하지 않아도 계산할 수 있어요.{" "}
              <Link href="/login" className="font-semibold text-accent-deep underline">
                로그인
              </Link>
              하면 내 본전공으로 바로 시작하고, 들은 과목을 체크해 남은 학점도 볼 수 있어요.
            </p>
          )}
          <label className="flex h-12 items-center gap-2.5 rounded-xl border border-edge bg-card px-3.5">
            <SearchIcon className="h-[18px] w-[18px] flex-none text-mute" />
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
            <div className="no-scrollbar -mx-[22px] flex gap-1.5 overflow-x-auto px-[22px] -my-[3px] py-[3px]">
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
                    className={`hit flex-none whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold ${
                      on ? "border-accent bg-accent text-white" : "border-edge bg-card text-ink-2"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}
          <PickGroup title={rows.some((r) => r.liked) ? "관심 전공" : undefined} star rows={rows.filter((r) => r.liked)} />
          <PickGroup title={rows.some((r) => r.liked) ? "전체 학과" : undefined} rows={rows.filter((r) => !r.liked)} />
          {rows.length === 0 && <p className="rounded-3xl border border-edge bg-white px-4 py-5 text-sm text-mute">검색 결과가 없어요.</p>}
        </div>
      )}

      {needPrimary && !pickingPrimary && (
        <div className="flex flex-col gap-3 pt-1">
          {!ready ? (
            <p className="text-sm text-mute" role="status">
              불러오는 중…
            </p>
          ) : (
            <>
              <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">
                내 본전공으로는
                <br />
                계산할 수 없어요
              </h2>
              <p className="text-sm leading-normal text-ink-2">
                {profile?.primary ? `${profile.primary}은(는) 단일전공 학점 정보가 없어요. ` : ""}내 정보에서 본전공을 확인해 주세요.
              </p>
              <Link href="/profile" className={primaryButton}>
                내 정보 확인
              </Link>
            </>
          )}
        </div>
      )}

      {step === 2 && !needPrimary && (
        // flex-1: the three cards share whatever height the phone has left above the tab bar
        <div className="flex flex-1 flex-col gap-3">
          {!ownPrimary && <span className="-mt-1 text-[13px] text-mute">본전공을 바꾸려면 위의 본전공을 누르세요.</span>}
          {kinds.map((k) => (
            <button
              key={k.mode}
              type="button"
              onClick={() => {
                setMode(k.mode);
                setSecond("");
                goto(3);
              }}
              className="flex flex-1 flex-col justify-center gap-2.5 rounded-3xl border border-edge bg-white px-5 py-3.5 text-left active:scale-[.99]"
            >
              <span className="flex flex-col gap-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-lg font-bold">
                    <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-accent" />
                    {MODE_LABEL[k.mode]}
                  </span>
                  <span className="flex flex-none items-baseline gap-1 text-accent-deep">
                    <span className="text-[30px] font-bold leading-none tracking-[-1px] tabular-nums">{k.big}</span>
                    <span className="text-sm font-semibold">학점</span>
                  </span>
                </span>
                <span className="pl-4 text-[13px] text-ink-2">{k.bigLabel}</span>
              </span>
              <span className="text-pretty border-t border-line pt-3 text-sm leading-[1.5] text-ink-2">{k.desc}</span>
              <span className="flex items-center justify-between gap-3 text-[13px] text-mute">
                <span>{k.meta}</span>
                <span aria-hidden className="text-xl">
                  ›
                </span>
              </span>
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
            className="box-border flex h-[50px] items-center justify-center rounded-2xl border border-edge bg-card text-[15px] font-semibold"
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
        className="box-border flex h-[50px] items-center justify-center rounded-2xl border border-edge bg-card text-[15px] font-semibold"
      >
        다시 계산하기
      </button>
    </div>
  );
}
