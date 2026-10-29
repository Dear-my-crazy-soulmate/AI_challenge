// "AI 조합 설명" card on the calculator result: ChatKHU's explanation of what the chosen
// combination is good for, with the book page behind every point. Credits are not here;
// they stay in the cards above, computed by code. Checked answers are kept in this browser
// so reopening a result is instant and costs no credits.
"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth";
import type { Guide, GuideItem, GuideKind, GuideResult } from "@/lib/guide/types";
import { topicLabel } from "@/lib/recommend/topics";

const STORE = "guide.v2:"; // v1 answers saved earlier are simply not read again

function readStored(key: string): GuideResult | null {
  try {
    const raw = localStorage.getItem(STORE + key);
    return raw ? (JSON.parse(raw) as GuideResult) : null;
  } catch {
    return null;
  }
}
function store(key: string, r: GuideResult) {
  try {
    if (r.source === "ai") localStorage.setItem(STORE + key, JSON.stringify(r));
  } catch {
    // private mode or full storage: the card still works, just without the shortcut
  }
}

const FALLBACK_NOTE: Record<Extract<GuideResult, { source: "fallback" }>["reason"], string> = {
  NO_KEY: "AI 설명이 아직 연결되지 않아 교육과정 책의 학과 소개를 그대로 보여 드려요.",
  LLM_ERROR: "ChatKHU가 지금 응답하지 않아 교육과정 책의 학과 소개를 그대로 보여 드려요.",
  CHECK_FAILED: "AI 설명이 검사를 통과하지 못해 교육과정 책의 학과 소개를 그대로 보여 드려요.",
  BUSY: "지금 요청이 많아 교육과정 책의 학과 소개를 먼저 보여 드려요. 잠시 뒤 다시 시도해 주세요.",
};

function Items({ title, items }: { title: string; items: GuideItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-[13px] font-semibold text-ink-2">{title}</h4>
      <ul className="flex flex-col gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-normal">
            <span aria-hidden className="text-accent-deep">•</span>
            <span className="text-pretty">
              {it.text} <span className="whitespace-nowrap text-xs text-mute">p.{it.page}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** comboGuide.v2 parts: course-to-course links, things to try, one thing to think about. */
function Extras({ guide }: { guide: Guide }) {
  return (
    <>
      {guide.bridges && guide.bridges.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-[13px] font-semibold text-ink-2">두 전공을 잇는 과목</h4>
          <ul className="flex flex-col gap-2">
            {guide.bridges.map((b, i) => (
              <li key={i} className="flex flex-col gap-1 rounded-xl bg-card px-3 py-2.5 text-sm leading-normal">
                <span className="text-[13px] font-semibold text-accent-deep">
                  {b.from} <span aria-hidden>→</span> {b.to}
                </span>
                <span className="text-pretty">{b.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {guide.activities && guide.activities.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-[13px] font-semibold text-ink-2">이 조합으로 해 볼 수 있는 것</h4>
          <ul className="flex flex-col gap-1.5">
            {guide.activities.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm leading-normal">
                <span aria-hidden className="text-accent-deep">•</span>
                <span className="text-pretty">{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function ComboGuide({ primary, kind, second }: { primary: string; kind: GuideKind; second: string }) {
  // 관심 분야 ids are not personal; the explanation is tailored to them (and cached per choice)
  const topics = (useAuth().profile?.topics ?? []).join(",");
  const key = `${kind}|${primary}|${second}|${topics}`;
  const [state, setState] = useState<{ key: string; result: GuideResult | null; failed: boolean }>({
    key,
    result: null,
    failed: false,
  });
  const [attempt, setAttempt] = useState(0);
  const current = state.key === key ? state : { key, result: null, failed: false };

  useEffect(() => {
    const ctrl = new AbortController();
    const saved = attempt === 0 ? readStored(key) : null;
    const q = new URLSearchParams({ primary, kind, second, ...(topics ? { topics } : {}) });
    const load: Promise<GuideResult> = saved
      ? Promise.resolve(saved)
      : fetch(`/api/guide?${q}`, { signal: ctrl.signal }).then((r) =>
          r.ok ? (r.json() as Promise<GuideResult>) : Promise.reject(new Error(String(r.status))),
        );
    load
      .then((r) => {
        if (ctrl.signal.aborted) return;
        store(key, r);
        setState({ key, result: r, failed: false });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ key, result: null, failed: true });
      });
    return () => ctrl.abort();
  }, [key, primary, kind, second, topics, attempt]);

  const r = current.result;
  const retry = () => {
    setState({ key, result: null, failed: false });
    setAttempt((a) => a + 1);
  };

  return (
    <section className="flex flex-col gap-3.5 rounded-3xl border border-edge bg-white p-5" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold">AI 조합 설명</h3>
        <span className="rounded-md bg-sand-2 px-[7px] py-0.5 text-xs font-semibold text-ink-2">ChatKHU</span>
      </div>

      {!r && !current.failed && (
        <div className="flex flex-col gap-2" aria-busy>
          <p className="text-sm text-mute">ChatKHU가 두 전공의 교육과정과 과목을 읽고 설명을 쓰고 있어요… 처음 보는 조합은 10초쯤 걸려요.</p>
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-sand-2" />
          <div className="h-3.5 w-3/5 animate-pulse rounded bg-sand-2" />
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-sand-2" />
        </div>
      )}

      {current.failed && (
        <p className="text-sm text-mute">
          설명을 불러오지 못했어요.{" "}
          <button type="button" onClick={retry} className="font-semibold text-accent-deep underline">
            다시 시도
          </button>
        </p>
      )}

      {r && (
        <>
          {r.source === "fallback" && <p className="rounded-xl bg-sand-2 px-3 py-2 text-xs leading-normal text-ink-2">{FALLBACK_NOTE[r.reason]}</p>}
          <p className="text-pretty text-[15px] font-semibold leading-normal">{r.guide.summary}</p>
          {r.source === "ai" && <Extras guide={r.guide} />}
          <Items title={r.source === "ai" ? "이 조합의 강점" : "학과가 밝힌 교육목적"} items={r.guide.strengths} />
          <Items title="이어질 수 있는 진로" items={r.guide.paths} />
          {r.guide.fit && (
            <p className="border-l-2 border-accent pl-3 text-sm leading-normal">
              <b className="font-semibold text-accent-deep">이런 학생에게 잘 맞아요</b> · {r.guide.fit}
            </p>
          )}
          {r.guide.consider && (
            <p className="border-l-2 border-edge pl-3 text-sm leading-normal">
              <b className="font-semibold text-ink-2">미리 생각해 볼 점</b> · {r.guide.consider}
            </p>
          )}
          <p className="text-xs leading-normal text-mute">
            {r.source === "ai"
              ? `ChatKHU가 2026 교육과정 책의 학과 소개·교육목표와 두 전공의 과목 목록${topics ? `, 내 관심 분야(${topics.split(",").map(topicLabel).join(", ")})` : ""}만 보고 쓴 설명을, 앱이 과목 이름·숫자·표현·쪽 번호까지 검사했어요. 학점은 위 계산 결과를 보세요. 진로를 보장하지는 않아요.`
              : "교육과정 책 원문이에요."}{" "}
            출처: {r.sources.map((s) => `${s.dept} p.${s.page}`).join(", ")}
          </p>
          {r.source === "fallback" && (r.reason === "LLM_ERROR" || r.reason === "BUSY") && (
            <button type="button" onClick={retry} className="self-start text-xs font-semibold text-accent-deep underline">
              AI 설명 다시 시도
            </button>
          )}
        </>
      )}
    </section>
  );
}
