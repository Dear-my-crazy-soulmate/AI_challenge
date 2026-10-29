"use client";

import { useState } from "react";

import { SearchIcon } from "@/components/Icons";
import type { DeptOption } from "@/lib/depts";

/** Search + pick departments. max=1 replaces the choice, otherwise toggles up to max. */
export default function DeptPicker({
  label,
  hint,
  options,
  selected,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  options: DeptOption[];
  selected: string[];
  max: number;
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().replace(/\s/g, "");
  const shown = options.filter((o) => !q || (o.dept + (o.school ?? "")).replace(/\s/g, "").includes(q));
  // A 신입생 of a 학부 with tracks has not chosen one yet (기계공학부 등).
  const trackNote = max === 1 ? options.find((o) => o.dept === selected[0])?.trackNote : undefined;

  const toggle = (dept: string) => {
    if (selected.includes(dept)) onChange(selected.filter((d) => d !== dept));
    else if (max === 1) onChange([dept]);
    else if (selected.length < max) onChange([...selected, dept]);
  };
  const full = max > 1 && selected.length >= max;

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">{label}</h2>
        {max > 1 && (
          <span className="text-xs tabular-nums text-mute">
            {selected.length}/{max}
          </span>
        )}
      </div>
      {hint && <p className="-mt-1 text-xs text-mute">{hint}</p>}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              aria-label={`${d} 선택 해제`}
              className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-[7px] text-[13px] font-semibold text-paper"
            >
              {d}
              <span aria-hidden className="opacity-60">
                ×
              </span>
            </button>
          ))}
        </div>
      )}
      {trackNote && (
        <p className="-mt-1 text-xs text-mute">{trackNote} 아직 트랙을 정하지 않았다면 관심 있는 트랙을 골라 두세요. 나중에 바꿀 수 있어요.</p>
      )}
      <label className="flex h-12 items-center gap-2.5 rounded-xl border border-edge bg-card px-3.5">
        <SearchIcon className="h-[18px] w-[18px] flex-none text-mute" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="학과 이름으로 검색"
          aria-label={`${label} 검색`}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
        />
      </label>
      <div className="max-h-64 overflow-y-auto rounded-2xl border border-edge bg-card">
        {shown.map((o) => {
          const on = selected.includes(o.dept);
          const locked = full && !on;
          return (
            <button
              key={o.dept}
              type="button"
              disabled={locked}
              aria-pressed={on}
              onClick={() => toggle(o.dept)}
              className="box-border flex min-h-14 w-full items-center gap-3 border-t border-line-2 px-4 py-3 text-left first:border-t-0 enabled:active:bg-paper disabled:opacity-40"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-pretty text-[15px] font-semibold">{o.dept}</span>
                <span className="text-xs text-mute">{o.school ? `${o.college} · ${o.school} 트랙` : o.college}</span>
              </span>
              <span
                aria-hidden
                className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border-2 text-xs ${
                  on ? "border-accent bg-accent text-white" : "border-chip"
                }`}
              >
                {on ? "✓" : ""}
              </span>
            </button>
          );
        })}
        {shown.length === 0 && <p className="px-4 py-5 text-sm text-mute">검색 결과가 없어요.</p>}
      </div>
    </section>
  );
}
