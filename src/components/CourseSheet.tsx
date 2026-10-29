"use client";

// Bottom sheet for adding a class: pick a course (from the curriculum book), then its days and time.
// The lengths and start times offered are the ones 경희대 국제캠퍼스 classes really use (src/lib/timetable.ts).
import { useEffect, useState } from "react";

import { SearchIcon } from "@/components/Icons";
import type { CourseRow, CourseSection } from "@/lib/courseSearch";
import { DAYS, DAY_END, LENGTHS, STARTS, conflictsWith, defaultsFor, fmtHour, startOptions } from "@/lib/timetable";
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

// 75분 is more than half of all meetings; 165 and 230 minutes are usually one block a week (class_times.json)
const LENGTH_HINT: Record<number, string> = { 75: "가장 많아요 · 주 2회", 110: "주 1~2회", 165: "주 1회", 230: "주 1회" };
const DAY_PAIRS: readonly (readonly number[])[] = [
  [0, 2],
  [1, 3],
];

const KINDS = ["전공기초", "전공필수", "전공선택"] as const;
const KIND_STYLE: Record<string, string> = {
  전공필수: "bg-accent-soft text-accent-deep",
  전공기초: "bg-sand-2 text-ink-2",
  전공선택: "border border-edge bg-white text-ink-2",
};
const kindOf = (r: CourseRow) => r.label.split(" ").at(-1) ?? "기타";

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
  const [kind, setKind] = useState<string | null>(null);
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [picked, setPicked] = useState<CourseRow | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [len, setLen] = useState(75 / 60);
  const [start, setStart] = useState(10.5);
  const [added, setAdded] = useState<string | null>(null); // the course just put on the timetable: shows it worked, and the sheet stays open for the next one
  const [addedCount, setAddedCount] = useState(0);

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
      ? ""
      : hits.length > 0
        ? `${hits[0].name}과(와) 시간이 겹쳐요 · 그래도 추가할 수 있어요`
        : `${[...days].sort().map((d) => DAYS[d]).join("·")} ${fmtHour(start)}–${fmtHour(start + len)}`;

  // 0-credit entries (졸업논문, 수학계획서 ...) are not classes that meet at a time, so they are not offered
  const sections =
    current && !("error" in current)
      ? current.sections
          .map((s) => ({ ...s, rows: s.rows.filter((r) => r.credits > 0 && (!kind || kindOf(r) === kind)) }))
          .filter((s) => s.rows.length > 0)
      : [];

  function pick(r: CourseRow) {
    const d = defaultsFor(r.credits);
    setPicked(r);
    setLen(d.len);
    setStart(d.start);
    setDays([]);
  }

  function changeLen(v: number) {
    setLen(v);
    // keep the class inside the day: fall back to the latest usual start that still fits
    setStart((s) => (s + v <= DAY_END ? s : ([...STARTS].reverse().find((h) => h + v <= DAY_END) ?? startOptions(v).at(-1) ?? s)));
  }

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
    setAdded(picked.name);
    setAddedCount((n) => n + 1);
    setPicked(null);
    setDays([]);
  }

  const courseRow = (r: CourseRow) => {
    const has = taken.has(r.code);
    const k = kindOf(r);
    return (
      <button
        key={r.code}
        type="button"
        disabled={has}
        onClick={() => pick(r)}
        className="box-border flex min-h-16 w-full items-center gap-3 rounded-2xl border border-edge bg-white px-4 py-3 text-left enabled:active:bg-card disabled:bg-card"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className={`text-pretty text-base font-bold leading-snug ${has ? "text-mute" : ""}`}>{r.name}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${KIND_STYLE[k] ?? "bg-sand text-mute"}`}>{k}</span>
            <span className="text-xs text-mute">
              {r.credits}학점 · {r.code}
            </span>
          </span>
        </span>
        <span className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${has ? "text-mute" : "bg-ink text-paper"}`}>{has ? "✓ 담김" : "담기"}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-end" role="dialog" aria-modal="true" aria-label="시간표에 과목 추가">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div className="relative flex max-h-[86%] w-full max-w-[430px] flex-col rounded-t-3xl bg-paper pb-[max(26px,env(safe-area-inset-bottom))]">
        <div className="flex justify-center pb-1 pt-2.5">
          <div className="h-[5px] w-10 rounded-sm bg-chip" />
        </div>

        {!picked ? (
          <>
            <div className="flex flex-col gap-3 px-5 pb-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-xl font-bold">시간표에 과목 추가</h2>
                  {list.length > 0 && <span className="text-xs text-mute">지금 {list.length}과목 담겨 있어요</span>}
                </div>
                <button type="button" aria-label="닫기" onClick={onClose} className="-mr-3 flex h-11 w-11 items-center justify-center text-lg text-mute">
                  ✕
                </button>
              </div>
              <label className="flex h-[46px] items-center gap-2.5 rounded-xl border border-edge bg-card px-3.5">
                <SearchIcon className="h-[18px] w-[18px] flex-none text-mute" />
                <input
                  type="search"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="과목명이나 학수번호로 검색"
                  aria-label="과목 검색"
                  className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
                />
              </label>
              {!query && (
                <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5" role="group" aria-label="이수 구분">
                  {[null, ...KINDS].map((k) => (
                    <button key={k ?? "all"} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>
                      {k ?? "전체"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex min-h-40 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-3">
              {added && (
                <p role="status" className="rounded-xl bg-ok-soft px-3.5 py-2.5 text-sm font-semibold text-ok">
                  ✓ 담았어요 · {added}
                </p>
              )}
              {!current && (
                <div role="status" className="flex flex-col gap-2">
                  <span className="sr-only">불러오는 중</span>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} aria-hidden className="h-16 rounded-2xl bg-sand-2 motion-safe:animate-pulse" />
                  ))}
                </div>
              )}
              {current && "error" in current && (
                <div className="flex flex-col gap-2">
                  <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm">{current.error}</p>
                  <button type="button" onClick={() => setAttempt((n) => n + 1)} className="h-11 rounded-xl border border-edge bg-card text-sm font-semibold">
                    다시 시도
                  </button>
                </div>
              )}
              {current && !("error" in current) && sections.length === 0 && (
                <p className="py-2 text-sm text-mute">
                  {query ? "검색 결과가 없어요." : kind ? `${kind} 과목이 없어요.` : "위 검색창에 과목명이나 학수번호를 입력해 보세요."}
                </p>
              )}
              {sections.map((sec) => (
                <section key={sec.label} className="flex flex-col gap-3">
                  <h3 className="pl-0.5 text-sm font-bold">{sec.label}</h3>
                  {query ? (
                    <div className="flex flex-col gap-2">{sec.rows.map(courseRow)}</div>
                  ) : (
                    [...KINDS, "기타"]
                      .map((k) => ({ k, rows: sec.rows.filter((r) => kindOf(r) === k) }))
                      .filter((g) => g.rows.length > 0)
                      .map((g) => (
                        <div key={g.k} className="flex flex-col gap-2">
                          <h4 className="flex items-center gap-1.5 pl-0.5 text-xs font-bold text-mute">
                            {g.k}
                            <span className="rounded-full bg-sand-2 px-1.5 py-px text-ink-2">{g.rows.length}</span>
                          </h4>
                          {g.rows.map(courseRow)}
                        </div>
                      ))
                  )}
                </section>
              ))}
            </div>
            {addedCount > 0 && (
              <div className="px-5 pt-2">
                <button type="button" onClick={onClose} className="flex h-[50px] w-full items-center justify-center rounded-2xl bg-ink text-base font-bold text-paper active:opacity-90">
                  완료 · {addedCount}과목 담음
                </button>
              </div>
            )}
          </>
        ) : (
          // shrink-0: when the content is taller than the sheet it scrolls, instead of squeezing the buttons
          <div className="flex flex-col gap-5 overflow-y-auto px-5 pt-1 [&>*]:shrink-0">
            <button type="button" onClick={() => setPicked(null)} className="-ml-2 flex h-11 items-center self-start px-2 text-sm font-semibold text-ink-2">
              ‹ 다른 과목 고르기
            </button>
            <div className="-mt-3 flex flex-col gap-1">
              <span className="text-pretty text-xl font-bold tracking-[-0.4px]">{picked.name}</span>
              <span className="text-[13px] text-mute">
                {picked.code} · {picked.credits}학점 · {picked.label}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold">수업 길이 (한 번에)</span>
              <div className="grid grid-cols-2 gap-2">
                {LENGTHS.map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={len === v}
                    onClick={() => changeLen(v)}
                    className={`flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-xl border px-3.5 py-2 text-left ${len === v ? "border-ink bg-ink text-paper" : "border-edge bg-card text-ink"}`}
                  >
                    <span className="text-sm font-bold">{label}</span>
                    <span className={`text-xs ${len === v ? "text-paper/80" : "text-mute"}`}>{LENGTH_HINT[Math.round(v * 60)] ?? ""}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold">요일</span>
              {len <= 2 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {DAY_PAIRS.map((pair) => {
                    const on = days.length === pair.length && pair.every((d) => days.includes(d));
                    return (
                      <button key={pair.join()} type="button" aria-pressed={on} onClick={() => setDays([...pair])} className={chip(on)}>
                        {pair.map((d) => DAYS[d]).join("·")}
                      </button>
                    );
                  })}
                </div>
              )}
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
              <div className="grid grid-cols-3 gap-1.5">
                {STARTS.filter((h) => h + len <= DAY_END).map((h) => (
                  <button key={h} type="button" aria-pressed={start === h} onClick={() => setStart(h)} className={chip(start === h)}>
                    {fmtHour(h)}
                  </button>
                ))}
              </div>
              <select
                aria-label="다른 시작 시간"
                value={STARTS.includes(start) ? "" : start}
                onChange={(e) => e.target.value && setStart(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-edge bg-card px-3.5 text-sm font-semibold tabular-nums"
              >
                <option value="">{STARTS.includes(start) ? "다른 시간 고르기" : "아래에서 고른 시간"}</option>
                {startOptions(len)
                  .filter((h) => !STARTS.includes(h))
                  .map((h) => (
                    <option key={h} value={h}>
                      {fmtHour(h)}
                    </option>
                  ))}
              </select>
            </div>

            {days.length > 0 && (
              <p
                role="status"
                className={`text-pretty text-sm font-semibold ${hits.length > 0 ? "rounded-xl border border-warn/30 bg-warn-soft px-3.5 py-3 text-warn" : "px-0.5 text-ink"}`}
              >
                {preview}
              </p>
            )}
            <p className="-mt-2 text-sm leading-normal text-mute">경희대 국제캠퍼스에서 많이 쓰는 시간이에요. 실제 개설 시간은 학교 시간표로 확인하세요.</p>
            <button
              type="button"
              onClick={add}
              disabled={days.length === 0}
              className="mb-1 box-border flex h-[54px] w-full items-center justify-center rounded-2xl bg-ink text-base font-bold text-paper active:opacity-90 disabled:bg-sand-2 disabled:text-mute"
            >
              {days.length === 0 ? "요일을 먼저 골라 주세요" : "시간표에 추가"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
