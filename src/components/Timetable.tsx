"use client";

// Home: this semester's weekly timetable. Colors show which classes count toward the 본전공,
// the 희망 전공 of the saved goal, both, or neither. Classes are kept in this browser only.
import { useState } from "react";

import CourseSheet from "@/components/CourseSheet";
import type { CourseContext } from "@/components/CourseSheet";
import { useGoal } from "@/components/useGoal";
import { useTimetable } from "@/components/useTimetable";
import { useAuth } from "@/lib/auth";
import type { CourseSection } from "@/lib/courseSearch";
import { MODE_NAME } from "@/lib/goal";
import { DAYS, DAY_START, SEMESTER, conflictPairs, fmtHour, saveTimetable, totalCredits } from "@/lib/timetable";
import type { Slot } from "@/lib/timetable";

const HOUR_PX = 34;
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const TONE: Record<Slot["tag"], string> = {
  p: "bg-ink text-paper",
  s: "bg-accent text-white",
  both: "bg-ok text-white",
  etc: "bg-line text-ink",
};
const SAMPLE_TIMES: [number[], number, number][] = [
  [[0, 2], 9, 1.5],
  [[1, 3], 10.5, 1.5],
  [[0, 2], 13, 1.5],
  [[1, 3], 15, 1.5],
];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export default function Timetable() {
  const list = useTimetable();
  const goal = useGoal();
  const { profile } = useAuth();
  const [sheet, setSheet] = useState<"add" | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const ctx: CourseContext = {
    primary: profile?.primary ?? goal?.primary ?? "",
    second: goal && goal.mode !== "microdegree" ? goal.second : "",
    mode: goal?.mode ?? "",
  };
  const pairs = conflictPairs(list);
  const clashing = new Set(pairs.flat().map((s) => s.id));
  const open = list.find((s) => s.id === openId) ?? null;
  const credits = totalCredits(list);
  const secondName = goal ? MODE_NAME[goal.mode] : "희망 전공 (목표 저장 시)";

  async function fillSample() {
    setNote("");
    try {
      const q = new URLSearchParams({ primary: ctx.primary, second: ctx.second, mode: ctx.mode, q: "" });
      const r = await fetch(`/api/courses?${q}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { sections } = (await r.json()) as { sections: CourseSection[] };
      const picks = [...(sections[0]?.rows.slice(0, 3) ?? []), ...(sections[1]?.rows.slice(0, 1) ?? [])];
      if (picks.length === 0) return setNote("로그인하면 내 본전공 과목으로 채워 드려요. 지금은 과목 검색으로 담아 주세요.");
      saveTimetable(picks.map((c, i) => ({ id: uid(), code: c.code, name: c.name, credits: c.credits, days: SAMPLE_TIMES[i][0], start: SAMPLE_TIMES[i][1], len: SAMPLE_TIMES[i][2], tag: c.tag })));
    } catch (e) {
      setNote(`과목을 불러오지 못했어요 (${e instanceof Error ? e.message : String(e)}).`);
    }
  }

  const legend = [
    { label: "본전공", dot: "bg-ink" },
    { label: secondName, dot: "bg-accent" },
    ...(goal?.mode === "double" ? [{ label: "두 전공 인정", dot: "bg-ok" }] : []),
    { label: "기타·교양", dot: "bg-line" },
  ];

  return (
    <section aria-label="시간표" className="flex flex-col gap-3 rounded-[22px] bg-card px-3.5 pb-3.5 pt-4">
      <div className="flex items-center justify-between gap-2.5 px-0.5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-bold">시간표</h2>
          <span className="text-xs text-mute">{list.length > 0 ? `${SEMESTER}학기 · ${list.length}과목 ${credits}학점` : `${SEMESTER}학기`}</span>
        </div>
        <button type="button" onClick={() => setSheet("add")} className="flex h-9 items-center rounded-[18px] bg-ink px-3.5 text-[13px] font-bold text-paper active:opacity-90">
          + 과목
        </button>
      </div>

      {pairs.length > 0 && (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-warn-soft px-3 py-2.5 text-[13px] leading-normal text-warn">
          <b className="flex-none">시간 겹침</b>
          <span className="text-pretty">
            {pairs[0][0].name} · {pairs[0][1].name}
            {pairs.length > 1 ? ` 외 ${pairs.length - 1}건` : ""}
          </span>
        </p>
      )}

      <div className="grid grid-cols-[26px_repeat(5,minmax(0,1fr))]" aria-hidden>
        <div />
        {DAYS.map((d) => (
          <span key={d} className="pb-1.5 text-center text-xs font-semibold text-mute">
            {d}
          </span>
        ))}
      </div>
      <div className="relative -mt-3 grid grid-cols-[26px_repeat(5,minmax(0,1fr))]">
        <div className="flex flex-col" aria-hidden>
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_PX }} className="box-border pt-0.5 text-[10px] leading-none tabular-nums text-faint">
              {h}
            </div>
          ))}
        </div>
        {DAYS.map((d, di) => (
          <div
            key={d}
            role="group"
            aria-label={`${d}요일`}
            className="relative border-l border-line-2"
            style={{
              height: HOURS.length * HOUR_PX,
              backgroundImage: `repeating-linear-gradient(to bottom, var(--color-line-2) 0, var(--color-line-2) 1px, transparent 1px, transparent ${HOUR_PX}px)`,
            }}
          >
            {list
              .filter((s) => s.days.includes(di))
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setOpenId(s.id)}
                  aria-label={`${s.name} ${fmtHour(s.start)}–${fmtHour(s.start + s.len)}`}
                  className={`absolute inset-x-0.5 box-border flex flex-col overflow-hidden rounded-[7px] px-[5px] py-1 text-left ${TONE[s.tag]} ${
                    clashing.has(s.id) ? "ring-2 ring-[#d9822b]" : ""
                  }`}
                  style={{ top: (s.start - DAY_START) * HOUR_PX + 1, height: Math.max(20, s.len * HOUR_PX - 2) }}
                >
                  <span className="line-clamp-3 break-keep text-[10.5px] font-bold leading-tight">{s.name}</span>
                  <span className="mt-0.5 text-[9.5px] opacity-75">{fmtHour(s.start)}</span>
                </button>
              ))}
          </div>
        ))}
        {list.length === 0 && (
          <div className="absolute inset-y-0 left-[26px] right-0 flex flex-col items-center justify-center gap-2.5 bg-card/75">
            <span className="text-sm font-semibold">이번 학기 과목을 담아 보세요</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSheet("add")} className="flex h-10 items-center rounded-xl bg-ink px-3.5 text-[13px] font-bold text-paper">
                과목 검색
              </button>
              <button type="button" onClick={fillSample} className="box-border flex h-10 items-center rounded-xl border border-line bg-card px-3.5 text-[13px] font-semibold">
                예시로 채우기
              </button>
            </div>
            {note && <p className="px-4 text-center text-xs text-mute" role="status">{note}</p>}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 px-0.5 text-[11px] text-mute">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-[5px]">
            <span className={`h-2 w-2 rounded-sm ${l.dot}`} />
            {l.label}
          </span>
        ))}
      </div>
      <p className="px-0.5 text-[11px] leading-normal text-faint">과목은 2026학년도 교육과정 기준이에요. 요일·시간은 직접 입력한 값이에요.</p>

      {sheet === "add" && (
        <CourseSheet
          list={list}
          ctx={ctx}
          onAdd={(slot) => {
            saveTimetable([...list, slot]);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-end" role="dialog" aria-modal="true" aria-label={open.name}>
          <button type="button" aria-label="닫기" onClick={() => setOpenId(null)} className="absolute inset-0 bg-ink/40" />
          <div className="relative flex w-full max-w-[430px] flex-col gap-4 rounded-t-[26px] bg-paper px-5 pb-[max(26px,env(safe-area-inset-bottom))] pt-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-pretty text-[21px] font-bold tracking-[-0.4px]">{open.name}</span>
              <span className="text-sm text-ink-2">
                {open.days.map((d) => DAYS[d]).join("·")} {fmtHour(open.start)}–{fmtHour(open.start + open.len)} · {open.code} · {open.credits}학점
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                saveTimetable(list.filter((s) => s.id !== open.id));
                setOpenId(null);
              }}
              className="box-border flex h-[50px] items-center justify-center rounded-2xl border border-line bg-card text-[15px] font-semibold text-accent-deep"
            >
              시간표에서 삭제
            </button>
            <button type="button" onClick={() => setOpenId(null)} className="flex h-11 items-center justify-center text-sm font-semibold text-mute">
              닫기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
