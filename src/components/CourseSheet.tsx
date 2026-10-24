"use client";

// Bottom sheet for adding a class: pick a course (from the curriculum book), then its days and time.
import { useEffect, useState } from "react";

import type { CourseRow, CourseSection } from "@/lib/courseSearch";
import { DAYS, LENGTHS, conflictsWith, fmtHour, startOptions } from "@/lib/timetable";
import type { Slot } from "@/lib/timetable";

export interface CourseContext {
  primary: string;
  second: string;
  mode: string; // "double" | "minor" | "microdegree" | ""
}

type Fetched = { key: string; sections: CourseSection[] } | { key: string; error: string };

const chip = (on: boolean) =>
  `flex h-11 flex-none items-center justify-center rounded-xl border px-3.5 text-sm font-semibold tabular-nums ${
    on ? "border-ink bg-ink text-paper" : "border-edge bg-card text-ink"
  }`;

export default function CourseSheet({
  list,
  ctx,
  onAdd,
  onClose,
}: {
  list: Slot[];
  ctx: CourseContext;
  onAdd: (slot: Slot) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [picked, setPicked] = useState<CourseRow | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [len, setLen] = useState(1.5);
  const [start, setStart] = useState(10.5);

  // search box -> request, a moment after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text]);

  const key = `${ctx.primary}|${ctx.second}|${ctx.mode}|${query}|${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    const q = new URLSearchParams({ primary: ctx.primary, second: ctx.second, mode: ctx.mode, q: query });
    fetch(`/api/courses?${q}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ sections: CourseSection[] }>;
      })
      .then((j) => setFetched({ key, sections: j.sections }))
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setFetched({ key, error: `과목을 불러오지 못했어요 (${e instanceof Error ? e.message : String(e)}).` });
      });
    return () => controller.abort();
  }, [key, ctx.primary, ctx.second, ctx.mode, query]);
  const current = fetched?.key === key ? fetched : null;

  // Esc closes, and the page behind does not scroll while the sheet is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const taken = new Set(list.map((s) => s.code));
  const hits = days.length > 0 ? conflictsWith(list, { days, start, len }) : [];
  const preview =
    days.length === 0
      ? "요일을 하나 이상 골라 주세요"
      : hits.length > 0
        ? `${hits[0].name}과(와) 시간이 겹쳐요 · 그래도 추가할 수 있어요`
        : `${[...days].sort().map((d) => DAYS[d]).join("·")} ${fmtHour(start)}–${fmtHour(start + len)}`;

  function add() {
    if (!picked || days.length === 0) return;
    onAdd({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      code: picked.code,
      name: picked.name,
      credits: picked.credits,
      days: [...days].sort(),
      start,
      len,
      tag: picked.tag,
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-end" role="dialog" aria-modal="true" aria-label="시간표에 과목 추가">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div className="relative flex max-h-[86%] w-full max-w-[430px] flex-col rounded-t-[26px] bg-paper pb-[max(26px,env(safe-area-inset-bottom))]">
        <div className="flex justify-center pb-1 pt-2.5">
          <div className="h-[5px] w-10 rounded-sm bg-chip" />
        </div>

        {!picked ? (
          <>
            <div className="flex flex-col gap-3 px-5 pb-3 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-[19px] font-bold">시간표에 과목 추가</h2>
                <button type="button" aria-label="닫기" onClick={onClose} className="-mr-3 flex h-11 w-11 items-center justify-center text-lg text-mute">
                  ✕
                </button>
              </div>
              <label className="flex h-[46px] items-center gap-2.5 rounded-[14px] border border-edge bg-card px-3.5">
                <span aria-hidden className="box-border h-3.5 w-3.5 flex-none rounded-full border-2 border-faint" />
                <input
                  type="search"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="과목명이나 학수번호로 검색"
                  aria-label="과목 검색"
                  className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
                />
              </label>
            </div>
            <div className="flex min-h-40 flex-1 flex-col gap-3.5 overflow-y-auto px-5 pb-2">
              {!current && <p className="py-2 text-sm text-mute" role="status">불러오는 중…</p>}
              {current && "error" in current && (
                <div className="flex flex-col gap-2">
                  <p className="rounded-[14px] bg-warn-soft px-4 py-3 text-sm">{current.error}</p>
                  <button type="button" onClick={() => setAttempt((n) => n + 1)} className="h-11 rounded-xl border border-edge bg-card text-sm font-semibold">
                    다시 시도
                  </button>
                </div>
              )}
              {current && !("error" in current) && current.sections.length === 0 && (
                <p className="py-2 text-sm text-mute">
                  {query ? "검색 결과가 없어요." : "로그인하거나 위 검색창에 과목명을 입력해 보세요."}
                </p>
              )}
              {current &&
                !("error" in current) &&
                current.sections.map((sec) => (
                  <section key={sec.label} className="flex flex-col gap-1.5">
                    <h3 className="pl-0.5 text-xs font-bold text-mute">{sec.label}</h3>
                    <div className="overflow-hidden rounded-2xl border border-edge bg-card">
                      {sec.rows.map((r) => {
                        const has = taken.has(r.code);
                        return (
                          <button
                            key={r.code}
                            type="button"
                            disabled={has}
                            onClick={() => {
                              setPicked(r);
                              setLen(r.credits >= 3 ? 1.5 : 1);
                              setStart(10.5);
                              setDays([]);
                            }}
                            className="box-border flex min-h-14 w-full items-center gap-3 border-t border-line-2 px-3.5 py-2.5 text-left first:border-t-0 enabled:active:bg-paper"
                          >
                            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                              <span className={`text-pretty text-[15px] font-semibold ${has ? "text-faint" : ""}`}>{r.name}</span>
                              <span className="text-xs text-mute">
                                {r.code} · {r.credits}학점 · {r.label}
                              </span>
                            </span>
                            <span className={`whitespace-nowrap text-[13px] font-bold ${has ? "text-faint" : ""}`}>{has ? "담김" : "담기"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-[18px] overflow-y-auto px-5 pt-1">
            <button type="button" onClick={() => setPicked(null)} className="flex h-10 items-center self-start text-sm font-semibold text-mute">
              ‹ 다른 과목 고르기
            </button>
            <div className="-mt-2 flex flex-col gap-1">
              <span className="text-pretty text-xl font-bold tracking-[-0.4px]">{picked.name}</span>
              <span className="text-[13px] text-mute">
                {picked.code} · {picked.credits}학점 · {picked.label}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold">요일</span>
              <div className="grid grid-cols-5 gap-1.5">
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={days.includes(i)}
                    onClick={() => setDays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))}
                    className={chip(days.includes(i))}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold">시작 시간</span>
              <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
                {startOptions(len).map((h) => (
                  <button key={h} type="button" aria-pressed={start === h} onClick={() => setStart(h)} className={chip(start === h)}>
                    {fmtHour(h)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold">수업 길이</span>
              <div className="grid grid-cols-4 gap-1.5">
                {LENGTHS.map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={len === v}
                    onClick={() => {
                      setLen(v);
                      setStart((s) => Math.min(s, 18 - v));
                    }}
                    className={chip(len === v)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p
              role="status"
              className={`text-pretty rounded-xl px-3.5 py-3 text-sm font-semibold ${
                hits.length > 0 ? "border border-warn/30 bg-warn-soft text-warn" : days.length === 0 ? "border border-edge bg-card text-mute" : "border border-edge bg-card text-ink"
              }`}
            >
              {preview}
            </p>
            <p className="-mt-2 text-xs leading-normal text-mute">수업 요일·시간은 직접 입력해요. 실제 개설 시간은 학교 시간표로 확인하세요.</p>
            <button
              type="button"
              onClick={add}
              disabled={days.length === 0}
              className="mb-1 box-border flex h-[54px] w-full items-center justify-center rounded-2xl bg-ink text-base font-bold text-paper active:opacity-90 disabled:bg-chip disabled:text-faint"
            >
              시간표에 추가
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
