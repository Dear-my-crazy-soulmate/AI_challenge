"use client";

// MY > 내 이수 과목: the courses I already took, kept in my account (taken_courses, like 에브리타임's
// course list). Pick them from my 본전공, interest majors or goal, or search any course of the book.
// The calculator reads the same list, so every result leaves these courses out automatically.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SearchIcon } from "@/components/Icons";
import { primaryButton, secondaryButton } from "@/components/Field";
import ScreenHeader from "@/components/ScreenHeader";
import { useGoal } from "@/components/useGoal";
import { useTaken } from "@/components/useTaken";
import { useAuth } from "@/lib/auth";
import type { CatalogEntry, CourseSection } from "@/lib/courseSearch";

type Groups = { category: string; courses: CatalogEntry[] }[];
type Loaded<T> = { key: string; value: T } | { key: string; error: string };

function useJson<T>(url: string | null): Loaded<T> | null {
  const [state, setState] = useState<Loaded<T> | null>(null);
  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(String(r.status)))))
      .then((value) => setState({ key: url, value }))
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ key: url, error: "불러오지 못했어요. 인터넷 연결을 확인해 주세요." });
      });
    return () => ctrl.abort();
  }, [url]);
  return url && state?.key === url ? state : null;
}

function CheckRow({ c, on, onToggle, sub }: { c: CatalogEntry; on: boolean; onToggle: (on: boolean) => void; sub?: string }) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center gap-3 border-t border-line-2 px-4 py-2.5 first:border-t-0 ${on ? "bg-ok-soft" : ""}`}
    >
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={`${c.name} 들었어요`}
        className="h-5 w-5 flex-none accent-[var(--color-accent)]"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-pretty text-[15px] font-semibold">{c.name}</span>
        <span className="text-xs text-mute">
          {c.code}
          {sub ? ` · ${sub}` : ""}
        </span>
      </span>
      <span className="whitespace-nowrap text-sm tabular-nums text-ink-2">{c.credits}학점</span>
    </label>
  );
}

export default function MyCourses() {
  const { ready, signedIn, profile } = useAuth();
  const taken = useTaken();
  const goal = useGoal();
  const [error, setError] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");

  const codes = useMemo(() => [...taken.codes].sort(), [taken.codes]);
  const saved = useJson<{ courses: CatalogEntry[]; missing: string[] }>(
    codes.length ? `/api/catalog?codes=${encodeURIComponent(codes.join(","))}` : null,
  );

  // departments to pick from: my 본전공, my interests, the goal's second major
  const depts = useMemo(() => {
    const list = [
      profile?.primary && { dept: profile.primary, tag: "내 본전공" },
      ...(profile?.interests ?? []).map((d) => ({ dept: d, tag: "관심 전공" })),
      goal && goal.mode !== "microdegree" && { dept: goal.second, tag: "내 목표" },
    ].filter((x): x is { dept: string; tag: string } => !!x);
    const seen = new Set<string>();
    return list.filter((x) => !seen.has(x.dept) && !!seen.add(x.dept));
  }, [profile, goal]);
  const current = query ? null : (dept ?? depts[0]?.dept ?? null);
  const catalog = useJson<{ groups: Groups }>(current ? `/api/catalog?dept=${encodeURIComponent(current)}` : null);
  const search = useJson<{ sections: CourseSection[] }>(query ? `/api/courses?q=${encodeURIComponent(query)}` : null);

  if (!ready) return <p className="px-[22px] pt-6 text-sm text-mute">불러오는 중…</p>;
  if (!signedIn) {
    return (
      <main className="flex flex-col gap-4 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
        <ScreenHeader title="내 이수 과목" backHref="/profile" />
        <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">
          로그인하면
          <br />
          들은 과목을 저장할 수 있어요
        </h2>
        <p className="text-sm leading-normal text-ink-2">저장한 과목은 다전공 계산에서 자동으로 빠져요.</p>
        <Link href="/login" className={primaryButton}>
          로그인
        </Link>
        <Link href="/signup" className={secondaryButton}>
          가입하기
        </Link>
      </main>
    );
  }

  const toggle = (code: string, on: boolean) => {
    setError("");
    void taken.setTaken(code, on).then((r) => {
      if (!r.ok) setError(r.message);
    });
  };
  const known = saved && "value" in saved ? saved.value.courses : [];
  const missing = saved && "value" in saved ? saved.value.missing : [];
  const credits = known.reduce((s, c) => s + c.credits, 0);
  const calcHref = goal
    ? `/onboarding?${new URLSearchParams({ primary: goal.primary, mode: goal.mode, second: goal.second })}`
    : "/onboarding";

  return (
    <main className="flex flex-col gap-4 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
      <ScreenHeader title="내 이수 과목" backHref="/profile" />

      <section className="flex flex-col gap-3 rounded-3xl bg-ink px-[18px] py-4 text-paper">
        <span className="text-xs opacity-65">이미 들은 전공 과목</span>
        <span className="text-[26px] font-bold tabular-nums">
          {codes.length}과목 · {credits}학점
        </span>
        <span className="text-[13px] leading-normal opacity-75">
          여기 저장한 과목은 다전공·부전공·마이크로디그리를 계산할 때 자동으로 빠지고, 남은 학점과 과목 수가 다시 계산돼요.
        </span>
        <Link href={calcHref} className="hit self-start rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white">
          {goal ? "내 목표로 남은 학점 보기 ›" : "계산기에서 남은 학점 보기 ›"}
        </Link>
      </section>
      {error && <p className="text-sm text-warn">{error}</p>}

      {codes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-bold">내가 들은 과목</h2>
          <div className="flex flex-col overflow-hidden rounded-2xl border border-edge bg-card">
            {known.map((c) => (
              <div key={c.code} className="flex min-h-12 items-center gap-3 border-t border-line-2 px-4 py-2.5 first:border-t-0">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-pretty text-[15px] font-semibold">{c.name}</span>
                  <span className="text-xs text-mute">
                    {c.code} · {c.credits}학점
                  </span>
                </span>
                <button type="button" onClick={() => toggle(c.code, false)} className="text-xs font-semibold text-mute underline">
                  빼기
                </button>
              </div>
            ))}
            {missing.map((code) => (
              <div key={code} className="flex min-h-12 items-center gap-3 border-t border-line-2 px-4 py-2.5 first:border-t-0">
                <span className="flex-1 text-sm text-mute">{code} (교육과정에 없는 과목)</span>
                <button type="button" onClick={() => toggle(code, false)} className="text-xs font-semibold text-mute underline">
                  빼기
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-bold">들은 과목 추가</h2>
        <form
          className="flex h-12 items-center gap-2.5 rounded-xl border border-edge bg-card px-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(text.trim());
          }}
        >
          <SearchIcon className="h-[18px] w-[18px] flex-none text-mute" />
          <input
            type="search"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (!e.target.value.trim()) setQuery("");
            }}
            placeholder="과목 이름이나 학수번호로 검색"
            aria-label="과목 이름이나 학수번호로 검색"
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
          />
          <button type="submit" className="text-sm font-semibold text-accent-deep">
            검색
          </button>
        </form>

        {!query && depts.length > 0 && (
          <div className="no-scrollbar -mx-[22px] flex gap-1.5 overflow-x-auto px-[22px]">
            {depts.map((d) => {
              const on = d.dept === current;
              return (
                <button
                  key={d.dept}
                  type="button"
                  onClick={() => setDept(d.dept)}
                  className={`flex flex-none flex-col items-start rounded-2xl border px-3.5 py-2 text-left ${
                    on ? "border-accent bg-accent text-white" : "border-edge bg-card text-ink"
                  }`}
                >
                  <span className={`text-xs ${on ? "opacity-80" : "text-mute"}`}>{d.tag}</span>
                  <span className="whitespace-nowrap text-[13px] font-semibold">{d.dept}</span>
                </button>
              );
            })}
          </div>
        )}

        {query ? (
          search === null ? (
            <p className="text-sm text-mute">검색하는 중…</p>
          ) : "error" in search ? (
            <p className="text-sm text-warn">{search.error}</p>
          ) : search.value.sections.length === 0 ? (
            <p className="text-sm text-mute">찾는 과목이 없어요. 학수번호로도 검색해 보세요.</p>
          ) : (
            <div className="flex flex-col overflow-hidden rounded-2xl border border-edge bg-card">
              {search.value.sections[0].rows.map((c) => (
                <CheckRow key={c.code} c={c} on={taken.codes.has(c.code)} onToggle={(on) => toggle(c.code, on)} />
              ))}
            </div>
          )
        ) : current === null ? (
          <p className="text-sm text-mute">과목 이름으로 검색해 추가하세요.</p>
        ) : catalog === null ? (
          <p className="text-sm text-mute">과목을 불러오는 중…</p>
        ) : "error" in catalog ? (
          <p className="text-sm text-warn">{current}: 교육과정 책에서 과목 목록을 찾지 못했어요. 검색으로 추가해 주세요.</p>
        ) : (
          catalog.value.groups.map((g) => (
            <div key={g.category} className="flex flex-col gap-1.5">
              <h3 className="px-1 text-[13px] font-semibold text-ink-2">
                {g.category} <span className="font-normal text-mute">{g.courses.length}과목</span>
              </h3>
              <div className="flex flex-col overflow-hidden rounded-2xl border border-edge bg-card">
                {g.courses.map((c) => (
                  <CheckRow key={c.code} c={c} on={taken.codes.has(c.code)} onToggle={(on) => toggle(c.code, on)} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <p className="px-1 text-xs leading-normal text-mute">
        과목 목록: 2026 경희대 교육과정. 같은 과목이 두 전공에 있으면 계산할 때 양쪽에 인정돼요(부전공은 본전공과 겹치면 미인정).
      </p>
    </main>
  );
}
