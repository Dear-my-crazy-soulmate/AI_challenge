"use client";

// 전공 체험 문제: pick a major -> 3 questions (answer is checked right away) -> report.
// 쿠옹이 dressed for the major cheers along, and the best result per major is kept as stars on this device.
// Which questions show and how they are graded lives in src/lib/quiz.ts.
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import Avatar from "@/components/Avatar";
import { primaryButton, secondaryButton } from "@/components/Field";
import { useAuth } from "@/lib/auth";
import { feedbackFor, isCorrect, isShowable, pickQuestions, QUESTIONS_PER_ROUND, quizBase, reportTitle, scoreOf } from "@/lib/quiz";
import type { QuizIndexEntry, QuizMajor, QuizQuestion } from "@/lib/quiz";
import { parseBest, reaction, readBestRaw, recordBest, saveBest, subscribeBest } from "@/lib/quizProgress";

type Stage = "pick" | "q" | "report";
const LETTERS = "①②③④"; // the same marks the explanations use ("정답 ②")
// Local look at questions nobody has approved yet (scripts/syllabus/export_quiz.py --preview). Never set in production.
const PREVIEW = process.env.NEXT_PUBLIC_QUIZ_PREVIEW === "1";
const BASE = quizBase(PREVIEW);
const chip = (on: boolean) =>
  `flex-none whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold ${on ? "border-accent bg-accent text-white" : "border-edge bg-card text-ink-2"}`;
const CONFETTI = ["bg-accent", "bg-ink", "bg-ok", "bg-accent-soft", "bg-chip"];

const backBtn = "-ml-3 flex h-11 w-11 items-center justify-center text-[28px] leading-none";
const SampleTag = ({ className = "" }: { className?: string }) => (
  <span className={`flex-none rounded-md bg-sand-2 px-[7px] py-0.5 font-semibold text-ink-2 ${className}`}>예시 데이터</span>
);
const Stars = ({ got, of, className = "" }: { got: number; of: number; className?: string }) => (
  <span aria-label={`${of}개 중 ${got}개`} className={`tracking-[2px] ${className}`}>
    {Array.from({ length: of }, (_, i) => (
      <span key={i} aria-hidden className={i < got ? "text-accent" : "text-edge"}>
        ★
      </span>
    ))}
  </span>
);

export default function QuizApp({
  majors,
  deptNames,
  initialMajor,
  map,
}: {
  majors: QuizMajor[];
  deptNames: string[]; // departments the calculator knows, so the report only links to real combinations
  initialMajor?: string | null;
  map?: ReactNode; // the 학과 지도, shown next to the questions on the pick screen
}) {
  const [view, setView] = useState<"quiz" | "map">("quiz");
  const { profile } = useAuth();
  const [major, setMajor] = useState<QuizMajor | null>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [entries, setEntries] = useState<QuizIndexEntry[] | null>(null); // departments that have questions; null until the list is read
  const [pool, setPool] = useState<QuizQuestion[]>([]); // every question of the chosen department; each round draws from it
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [college, setCollege] = useState<string | null>(null);
  const [qi, setQi] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [picks, setPicks] = useState<number[]>([]);
  const [recent, setRecent] = useState<{ major: string; score: number; n: number; isNew: boolean } | null>(null);
  const bestRaw = useSyncExternalStore(subscribeBest, readBestRaw, () => null);
  const best = useMemo(() => parseBest(bestRaw), [bestRaw]);

  const top = () => window.scrollTo({ top: 0 });
  const start = (m: QuizMajor) => {
    setMajor(m);
    setStage("q");
    setQi(0);
    setSel(null);
    setRevealed(false);
    setPicks([]);
    top();
  };
  const toPick = () => {
    setStage("pick");
    setSel(null);
    setRevealed(false);
    top();
  };
  const startSample = (m: QuizMajor) => {
    setPool(m.questions);
    start({ ...m, questions: pickQuestions(m.questions) });
  };
  async function startDept(e: QuizIndexEntry) {
    setBusy(true);
    setFailed(false);
    try {
      const data = (await (await fetch(`${BASE}/${e.id}.json`)).json()) as { dept: string; college: string; questions: QuizQuestion[] };
      const p = data.questions.filter((q) => isShowable(q, PREVIEW));
      if (p.length === 0) throw new Error("no showable question");
      setPool(p);
      start({ major: data.dept, college: data.college, questions: pickQuestions(p) });
    } catch {
      setFailed(true); // the screen keeps working: the list stays, and the student can try again
    }
    setBusy(false);
  }
  // another round of the same department: a new random draw from its pool
  const again = () => major && start({ ...major, questions: pickQuestions(pool.length > 0 ? pool : major.questions) });

  // The departments that have questions come from public/quiz/index.json (see scripts/syllabus/export_quiz.py).
  // Without any (nothing approved yet), the screen falls back to the labelled sample questions.
  useEffect(() => {
    fetch(`${BASE}/index.json`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((list: QuizIndexEntry[]) => {
        setEntries(list);
        if (!initialMajor) return;
        const hit = list.find((e) => e.dept === initialMajor);
        const sample = majors.find((m) => m.major === initialMajor);
        if (hit) void startDept(hit);
        else if (list.length === 0 && sample) startSample(sample);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads the list once, when the screen opens
  }, []);
  const colleges = useMemo(() => [...new Set((entries ?? []).map((e) => e.college))], [entries]);
  const needle = text.replace(/\s/g, "");
  const rows = (entries ?? [])
    .filter((e) => (!needle || e.dept.replace(/\s/g, "").includes(needle)) && (needle || !college || e.college === college))
    .sort((a, b) => Number(b.dept === profile?.primary) - Number(a.dept === profile?.primary)); // the student's own department first

  const qs = major?.questions ?? [];
  const cur = stage === "q" ? qs[qi] : undefined;
  const last = qi === qs.length - 1;
  const right = !!cur && revealed && sel === cur.answer;
  // right answers in a row, counting the one just revealed
  let run = right ? 1 : 0;
  for (let i = qi - 1; right && i >= 0 && isCorrect(qs[i], picks[i]); i--) run++;

  function action() {
    if (!major || !cur || sel === null) return;
    if (!revealed) return setRevealed(true);
    const next = [...picks, sel];
    setPicks(next);
    if (!last) {
      setQi(qi + 1);
      setSel(null);
      setRevealed(false);
    } else {
      const score = scoreOf(qs, next);
      const updated = recordBest(best, major.major, score, qs.length);
      if (updated !== best) saveBest(updated);
      setRecent({ major: major.major, score, n: qs.length, isNew: updated !== best && score > 0 });
      setStage("report");
      setRevealed(false);
    }
    top();
  }

  const title = major && stage !== "pick" ? major.major : "전공 체험 문제";
  const label = stage === "q" ? `${qi + 1}/${qs.length}` : "";
  const canCalc = !!profile && !!major && profile.primary !== major.major && deptNames.includes(major.major);
  const calcHref =
    canCalc && profile && major
      ? `/onboarding?${new URLSearchParams({ primary: profile.primary, mode: "double", second: major.major })}`
      : "/onboarding";
  const said = !cur ? "" : revealed ? reaction(right, run) : qi === 0 ? "같이 풀어 봐요! 편하게 골라 보세요" : last ? "마지막 문제예요!" : "좋아요, 다음 문제예요";

  return (
    <main className="flex flex-col gap-5 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
      <div className="flex h-11 items-center justify-between">
        {stage === "pick" ? (
          <Link href="/" aria-label="홈으로" className={backBtn}>
            ‹
          </Link>
        ) : (
          <button type="button" aria-label="전공 고르기로" onClick={toPick} className={backBtn}>
            ‹
          </button>
        )}
        <h1 className="text-base font-bold">{title}</h1>
        <span className="w-11 text-right text-[13px] tabular-nums text-mute">{label}</span>
      </div>

      {stage === "pick" && map && (
        <div role="tablist" aria-label="체험 보기" className="grid grid-cols-2 gap-1 rounded-2xl bg-sand p-1">
          {(["quiz", "map"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`h-10 rounded-xl text-sm font-bold ${view === v ? "bg-white text-accent-deep shadow-[0_1px_3px_rgba(28,27,24,.12)]" : "text-mute"}`}
            >
              {v === "quiz" ? "문제 풀기" : "학과 지도"}
            </button>
          ))}
        </div>
      )}

      {stage === "pick" && view === "map" && map}

      {stage === "pick" && view === "quiz" && entries === null && <p className="px-1 py-6 text-center text-sm text-mute">학과를 불러오는 중이에요…</p>}

      {stage === "pick" && view === "quiz" && entries !== null && entries.length > 0 && (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-2.5">
            <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">
              어떤 학과의
              <br />
              쿠옹이를 만나 볼까요?
            </h2>
            <p className="text-sm leading-normal text-ink-2">
              문제 {QUESTIONS_PER_ROUND}개를 풀면 별을 모을 수 있어요. 풀 때마다 문제가 새로 뽑혀서, 다시 해도 다른 문제가 나와요.
            </p>
          </div>
          <label className="flex h-10 items-center gap-2.5 rounded-xl border border-edge bg-card px-3.5">
            <span aria-hidden className="box-border h-3.5 w-3.5 flex-none rounded-full border-2 border-faint" />
            <input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="학과 이름으로 검색"
              aria-label="학과 검색"
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
            />
          </label>
          <div className="no-scrollbar -mx-[22px] flex gap-1.5 overflow-x-auto px-[22px]" role="group" aria-label="단과대학">
            {[null, ...colleges].map((c) => (
              <button key={c ?? "all"} type="button" aria-pressed={college === c} onClick={() => setCollege(c)} className={chip(college === c)}>
                {c ?? "전체"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {rows.map((e, i) => {
              const b = best[e.dept];
              return (
                <button
                  key={e.id}
                  type="button"
                  disabled={busy}
                  onClick={() => startDept(e)}
                  className="quiz-pop box-border flex flex-col items-center gap-2 rounded-[22px] border border-edge bg-card px-3 pb-3.5 pt-4 text-center active:scale-[.97] disabled:opacity-60"
                  style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}
                >
                  <span className="flex h-[128px] items-end justify-center rounded-2xl bg-white px-6">
                    <Avatar dept={e.dept} variant="full" size={120} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-mute">{e.college}</span>
                    <span className="text-[15px] font-bold">{e.dept}</span>
                  </span>
                  <Stars got={b?.score ?? 0} of={QUESTIONS_PER_ROUND} className="text-lg leading-none" />
                  <span className="text-[11px] font-semibold text-accent-deep">{b ? `최고 ${b.score}/${b.n}` : "아직 도전 전"}</span>
                </button>
              );
            })}
          </div>
          {rows.length === 0 && <p className="rounded-2xl border border-line bg-white px-4 py-5 text-sm text-mute">찾는 학과가 없어요.</p>}
          {failed && <p role="alert" className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent-deep">문제를 불러오지 못했어요. 잠시 뒤에 다시 눌러 주세요.</p>}
          <p className="px-1 text-xs leading-normal text-mute">
            강의계획서의 주차별 내용을 읽고 AI가 만든 문제를 사람이 확인한 것이에요. 학교 공식 자료가 아니라 참고용이에요.
            {PREVIEW && " (미리보기: 아직 확인하지 않은 문제도 보여요)"}
          </p>
        </div>
      )}

      {stage === "pick" && view === "quiz" && entries !== null && entries.length === 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">
              어떤 전공의
              <br />
              쿠옹이를 만나 볼까요?
            </h2>
            <p className="text-sm leading-normal text-ink-2">
              문제 3개를 풀면 별을 모을 수 있어요. 정답보다 &lsquo;이런 생각이 재밌는지&rsquo;를 느껴 보세요.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {majors.map((m, i) => {
              const b = best[m.major];
              return (
                <button
                  key={m.major}
                  type="button"
                  onClick={() => startSample(m)}
                  className="quiz-pop box-border flex flex-col items-center gap-2 rounded-[22px] border border-edge bg-card px-3 pb-3.5 pt-4 text-center active:scale-[.97]"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <span className="flex h-[128px] items-end justify-center rounded-2xl bg-white px-6">
                    <Avatar dept={m.major} variant="full" size={120} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-mute">{m.college}</span>
                    <span className="text-[15px] font-bold">{m.major}</span>
                  </span>
                  <Stars got={b?.score ?? 0} of={m.questions.length} className="text-lg leading-none" />
                  <span className="text-[11px] font-semibold text-accent-deep">{b ? `최고 ${b.score}/${b.n}` : "아직 도전 전"}</span>
                </button>
              );
            })}
          </div>
          <p className="flex items-start gap-2 text-xs leading-normal text-mute">
            <SampleTag />
            <span>시연용 문제예요. 실제 서비스에서는 AI가 만든 문제를 사람이 검수한 뒤에만 보여 줘요.</span>
          </p>
        </div>
      )}

      {stage === "q" && cur && major && (
        <div className="flex flex-col gap-[18px]">
          <div className="-mt-2.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${qs.length}, 1fr)` }} aria-hidden>
            {qs.map((q, i) => (
              <div
                key={q.id}
                className={`h-1.5 rounded-sm transition-colors duration-300 ${i < qi || (i === qi && revealed) ? "bg-accent" : "bg-chip"}`}
              />
            ))}
          </div>
          <div className="flex items-end gap-3">
            <span key={`${qi}-${revealed}-${right}`} className={`flex-none ${revealed ? (right ? "quiz-hop" : "quiz-tilt") : ""}`}>
              <Avatar dept={major.major} variant="full" size={92} />
            </span>
            <div role="status" className="relative mb-3 flex-1 rounded-2xl border border-edge bg-white px-3.5 py-2.5 text-[13px] font-semibold leading-snug">
              <span aria-hidden className="absolute -left-[7px] bottom-4 h-3 w-3 rotate-45 border-b border-l border-edge bg-white" />
              {said}
              {run >= 2 && revealed && right && <span className="ml-2 rounded-lg bg-accent px-2 py-0.5 text-[11px] font-bold text-white">연속 {run}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-accent-soft px-2.5 py-[5px] text-xs font-semibold text-accent-deep">{cur.skill}</span>
              {cur.is_sample && <SampleTag className="text-xs" />}
              {!cur.is_sample && cur.status !== "approved" && <span className="rounded-md bg-sand-2 px-[7px] py-0.5 text-xs font-semibold text-ink-2">확인 전 문제</span>}
            </div>
            <h2 className="text-pretty text-[21px] font-bold leading-[1.45] tracking-[-0.4px]">{cur.question}</h2>
            {cur.code && (
              <pre className="whitespace-pre-wrap rounded-[14px] bg-ink px-4 py-3.5 font-mono text-sm font-medium leading-[1.6] text-[#edeae2]">
                {cur.code}
              </pre>
            )}
          </div>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="보기">
            {cur.options.map((text, i) => {
              const chosen = sel === i;
              const isRight = i === cur.answer;
              let box = "border-edge bg-card text-ink";
              let dot = "bg-sand text-ink-2";
              let mark = "";
              if (chosen && !revealed) {
                box = "border-accent bg-card text-ink";
                dot = "bg-accent text-white";
              }
              if (revealed && isRight) {
                box = "border-ok bg-ok-soft text-ok";
                dot = "bg-ok text-white";
                mark = "정답";
              }
              if (revealed && chosen && !isRight) {
                box = "border-accent bg-accent-soft text-accent";
                dot = "bg-accent text-white";
                mark = "내 선택";
              }
              return (
                <button
                  key={text}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  disabled={revealed}
                  onClick={() => setSel(i)}
                  className={`box-border flex min-h-14 items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left transition-transform active:scale-[.985] disabled:cursor-default ${chosen && !revealed ? "scale-[1.01]" : ""} ${box}`}
                >
                  <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-bold ${dot}`}>
                    {LETTERS[i]}
                  </span>
                  <span className="flex-1 text-pretty text-[15px] leading-[1.45]">{text}</span>
                  <span className="whitespace-nowrap text-xs font-bold">{mark}</span>
                </button>
              );
            })}
          </div>
          {revealed && (
            <div className="quiz-pop flex flex-col gap-1.5 rounded-[18px] border border-edge bg-card px-[18px] py-4">
              <span className={`text-[15px] font-bold ${right ? "text-ok" : "text-accent"}`}>{right ? "정답이에요" : "아쉬워요"}</span>
              <span className="text-pretty text-sm leading-[1.6] text-ink-3">{cur.explanation}</span>
              {cur.flow && <span className="mt-1 text-pretty text-sm leading-[1.6] text-ink-3">{cur.flow}</span>}
              {cur.evidence && cur.source && (
                <span className="mt-1 text-pretty text-[11px] leading-normal text-mute">
                  근거: {cur.evidence.week}주차 &ldquo;{cur.evidence.topic}&rdquo; · 출처: {cur.source.path} ({cur.source.as_of})
                </span>
              )}
            </div>
          )}
          <button type="button" onClick={action} disabled={sel === null} className={`${primaryButton} mt-1`}>
            {!revealed ? "정답 확인" : last ? "결과 보기" : "다음 문제"}
          </button>
        </div>
      )}

      {stage === "report" && major && recent && (
        <div className="flex flex-col gap-3.5">
          <section className="relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-accent px-5 py-[22px] text-white">
            {recent.score === recent.n && (
              <span aria-hidden className="pointer-events-none absolute inset-0">
                {Array.from({ length: 16 }, (_, i) => (
                  <span
                    key={i}
                    className={`quiz-fall absolute top-0 h-2.5 w-1.5 rounded-[2px] ${CONFETTI[i % CONFETTI.length]}`}
                    style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 160}ms`, animationDuration: `${1700 + (i % 4) * 300}ms` }}
                  />
                ))}
              </span>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-2">
                <span className="text-[13px] opacity-85">{major.major} 체험 결과</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-[60px] font-bold leading-none tracking-[-2px] tabular-nums">{recent.score}</span>
                  <span className="text-xl font-semibold opacity-80">/ {recent.n}</span>
                </div>
                <span aria-hidden className="flex gap-[5px]">
                  {qs.map((q, i) => (
                    <span
                      key={q.id}
                      className={`quiz-pop box-border h-3.5 w-3.5 rounded border-2 border-white ${isCorrect(q, picks[i]) ? "bg-white" : ""}`}
                      style={{ animationDelay: `${300 + i * 150}ms` }}
                    />
                  ))}
                </span>
              </div>
              <span className={`flex-none rounded-2xl bg-white/95 px-3 pt-2 ${recent.score > 0 ? "quiz-hop" : ""}`}>
                <Avatar dept={major.major} variant="full" size={104} />
              </span>
            </div>
            <span className="relative text-pretty text-[15px] font-semibold leading-normal">
              {reportTitle(recent.score, recent.n)}
              {recent.isNew && <span className="ml-2 rounded-lg bg-white px-2 py-0.5 text-[11px] font-bold text-accent">새 기록</span>}
            </span>
          </section>

          <section className="flex flex-col gap-2.5 rounded-[20px] border border-edge bg-card p-[18px]">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold">체험 피드백</h3>
              {qs.some((q) => q.is_sample) && <SampleTag className="text-[11px]" />}
            </div>
            <p className="text-pretty text-sm leading-[1.65] text-ink-3">{feedbackFor(major.major, qs, picks)}</p>
            <p className="text-xs leading-normal text-mute">점수는 참고 지표예요. 전공 적합성을 판정하지 않아요.</p>
          </section>

          <section className="rounded-[20px] border border-edge bg-card px-[18px] py-1.5">
            {qs.map((q, i) => {
              const ok = isCorrect(q, picks[i]);
              return (
                <div key={q.id} className="flex flex-col gap-1.5 border-t border-line-2 py-3.5 first:border-t-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-lg px-2 py-[3px] text-[11px] font-bold ${ok ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"}`}>
                      {ok ? "정답" : "오답"}
                    </span>
                    <span className="text-xs text-mute">{q.skill}</span>
                  </div>
                  <span className="text-pretty text-sm font-semibold leading-[1.45]">{q.question}</span>
                  <span className="text-pretty text-[13px] leading-[1.55] text-ink-2">
                    정답: {q.options[q.answer]} — {q.explanation}
                  </span>
                </div>
              );
            })}
          </section>

          <div className="mt-1 flex flex-col gap-2">
            <Link href={calcHref} className={primaryButton}>
              {canCalc && profile ? `${profile.primary} + ${major.major} 학점 보기` : "다전공 계산기로 가기"}
            </Link>
            <button type="button" onClick={again} className={secondaryButton}>
              새 문제로 한 번 더 도전하기
            </button>
            <button type="button" onClick={toPick} className={secondaryButton}>
              다른 학과 체험하기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
