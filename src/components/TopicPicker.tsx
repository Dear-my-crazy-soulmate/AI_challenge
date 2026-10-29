"use client";

import { MAX_TOPICS, TOPICS } from "@/lib/recommend/topics";

/** 관심 분야 chips (up to MAX_TOPICS); the calculator suggests 다전공 학과 from them. */
export default function TopicPicker({ selected, onChange }: { selected: string[]; onChange: (next: string[]) => void }) {
  const full = selected.length >= MAX_TOPICS;
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((t) => t !== id));
    else if (!full) onChange([...selected, id]);
  };
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">관심 분야 (선택)</h2>
        <span className="text-xs tabular-nums text-mute">
          {selected.length}/{MAX_TOPICS}
        </span>
      </div>
      <p className="-mt-1 text-xs text-mute">고르면 계산기에서 맞는 다전공 학과를 먼저 추천해 드려요. 나중에 바꿀 수 있어요.</p>
      <div className="flex flex-wrap gap-1.5">
        {TOPICS.map((t) => {
          const on = selected.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              disabled={full && !on}
              onClick={() => toggle(t.id)}
              className={`min-h-11 rounded-full border px-3.5 text-[13px] font-semibold disabled:opacity-40 ${
                on ? "border-ink bg-ink text-paper" : "border-edge bg-card text-ink-2"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
