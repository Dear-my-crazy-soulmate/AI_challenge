"use client";

// 전공 체험 문제: pick a major -> 3 questions (answer is checked right away) -> report.
// Which questions show and how they are graded lives in src/lib/quiz.ts.
import Link from "next/link";
import { useState } from "react";

import { primaryButton, secondaryButton } from "@/components/Field";
import { useAuth } from "@/lib/auth";
import { feedbackFor, isCorrect, reportTitle, scoreOf } from "@/lib/quiz";
import type { QuizMajor } from "@/lib/quiz";

type Stage = "pick" | "q" | "report";
const LETTERS = "ABCD";

const backBtn = "-ml-3 flex h-11 w-11 items-center justify-center text-[28px] leading-none";
const SampleTag = ({ className = "" }: { className?: string }) => (
  <span className={`flex-none rounded-md bg-sand-2 px-[7px] py-0.5 font-semibold text-ink-2 ${className}`}>예시 데이터</span>
);

export default function QuizApp({
  majors,
  deptNames,
  initialMajor,
}: {
  majors: QuizMajor[];
  deptNames: string[]; // departments the calculator knows, so the report only links to real combinations
  initialMajor?: string | null;
}) {
  const { profile } = useAuth();
  const [major, setMajor] = useState<QuizMajor | null>(() => majors.find((m) => m.major === initialMajor) ?? null);
  const [stage, setStage] = useState<Stage>(major ? "q" : "pick");
  const [qi, setQi] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [picks, setPicks] = useState<number[]>([]);
  const [recent, setRecent] = useState<{ major: string; score: number; n: number } | null>(null);

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

  const qs = major?.questions ?? [];
  const cur = stage === "q" ? qs[qi] : undefined;
  const last = qi === qs.length - 1;

  function action() {
    if (!major || !cur || sel === null) return;
    if (!revealed) return setRevealed(true);
    const next = [...picks, sel];
    if (!last) {
      setPicks(next);
      setQi(qi + 1);
      setSel(null);
      setRevealed(false);
    } else {
      setPicks(next);
      setRecent({ major: major.major, score: scoreOf(qs, next), n: qs.length });
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

      {stage === "pick" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">
              어떤 전공을
              <br />
              먼저 체험해 볼까요?
            </h2>
            <p className="text-sm leading-normal text-ink-2">
              1학년이 풀 수 있는 입문 문제예요. 정답보다 &lsquo;이런 생각이 재밌는지&rsquo;를 느껴 보세요.
            </p>
          </div>
          {majors.map((m) => {
            const done = recent?.major === m.major;
            return (
              <button
                key={m.major}
                type="button"
                onClick={() => start(m)}
                className="flex flex-col gap-3 rounded-[20px] border border-edge bg-card p-[18px] text-left active:scale-[.99]"
              >
                <span className="flex items-center justify-between gap-2.5">
                  <span className="flex flex-col gap-[3px]">
                    <span className="text-xs text-mute">{m.college}</span>
                    <span className="text-lg font-bold">{m.major}</span>
                  </span>
                  <span
                    className={`whitespace-nowrap rounded-xl px-2.5 py-[5px] text-xs font-semibold ${
                      done ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent-deep"
                    }`}
                  >
                    {done ? `최근 ${recent.score}/${recent.n}` : `${m.questions.length}문제`}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {m.questions.map((q) => (
                    <span key={q.id} className="rounded-xl bg-sand px-[9px] py-1 text-xs text-ink-2">
                      {q.skill}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
          <p className="flex items-start gap-2 text-xs leading-normal text-mute">
            <SampleTag />
            <span>시연용 문제예요. 실제 서비스에서는 AI가 만든 문제를 사람이 검수한 뒤에만 보여 줘요.</span>
          </p>
        </div>
      )}

      {stage === "q" && cur && (
        <div className="flex flex-col gap-[18px]">
          <div className="-mt-2.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${qs.length}, 1fr)` }} aria-hidden>
            {qs.map((q, i) => (
              <div
                key={q.id}
                className={`h-1 rounded-sm transition-colors duration-300 ${i < qi || (i === qi && revealed) ? "bg-accent" : "bg-chip"}`}
              />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-accent-soft px-2.5 py-[5px] text-xs font-semibold text-accent-deep">{cur.skill}</span>
              {cur.is_sample && <SampleTag className="text-xs" />}
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
              const right = i === cur.answer;
              let box = "border-edge bg-card text-ink";
              let dot = "bg-sand text-ink-2";
              let mark = "";
              if (chosen && !revealed) {
                box = "border-accent bg-card text-ink";
                dot = "bg-accent text-white";
              }
              if (revealed && right) {
                box = "border-ok bg-ok-soft text-ok";
                dot = "bg-ok text-white";
                mark = "정답";
              }
              if (revealed && chosen && !right) {
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
                  className={`box-border flex min-h-14 items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left disabled:cursor-default ${box}`}
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
            <div role="status" className="flex flex-col gap-1.5 rounded-[18px] border border-edge bg-card px-[18px] py-4">
              <span className={`text-[15px] font-bold ${sel === cur.answer ? "text-ok" : "text-accent"}`}>
                {sel === cur.answer ? "정답이에요" : "아쉬워요"}
              </span>
              <span className="text-pretty text-sm leading-[1.6] text-ink-3">{cur.explanation}</span>
            </div>
          )}
          <button type="button" onClick={action} disabled={sel === null} className={`${primaryButton} mt-1`}>
            {!revealed ? "정답 확인" : last ? "결과 보기" : "다음 문제"}
          </button>
        </div>
      )}

      {stage === "report" && major && recent && (
        <div className="flex flex-col gap-3.5">
          <section className="flex flex-col gap-4 rounded-3xl bg-accent px-5 py-[22px] text-white">
            <span className="text-[13px] opacity-85">{major.major} 체험 결과</span>
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-baseline gap-1">
                <span className="text-[60px] font-bold leading-none tracking-[-2px] tabular-nums">{recent.score}</span>
                <span className="text-xl font-semibold opacity-80">/ {recent.n}</span>
              </div>
              <div className="flex gap-[5px] pb-2" aria-hidden>
                {qs.map((q, i) => (
                  <span
                    key={q.id}
                    className={`box-border h-3.5 w-3.5 rounded border-2 border-white ${isCorrect(q, picks[i]) ? "bg-white" : ""}`}
                  />
                ))}
              </div>
            </div>
            <span className="text-pretty text-[15px] font-semibold leading-normal">{reportTitle(recent.score, recent.n)}</span>
          </section>

          <section className="flex flex-col gap-2.5 rounded-[20px] border border-edge bg-card p-[18px]">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold">체험 피드백</h3>
              <SampleTag className="text-[11px]" />
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
            <button type="button" onClick={toPick} className={secondaryButton}>
              다른 전공 체험하기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
