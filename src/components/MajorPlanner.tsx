"use client";

import { useEffect, useMemo, useState } from "react";

import type { CourseGroup, CoursePlanOk, CoursePlanResult, ProgramCourses } from "@/lib/rules/courses";
import { listCreditOptions } from "@/lib/rules/credits";
import type { CreditData, CreditKind, ProgramKind } from "@/lib/rules/credits";
import { prohibitedReason } from "@/lib/rules/majorRules";
import type { MajorRules } from "@/lib/rules/majorRules";

const KIND_LABEL: Record<ProgramKind, string> = { single: "단일전공", double: "다전공", minor: "부전공" };
const STATUS: Record<ProgramCourses["status"], { label: string; tone: string }> = {
  verified: { label: "학점 검증 완료", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  choose: { label: "일부 선택 이수", tone: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  check: { label: "학과 확인 필요", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  no_courses: { label: "과목 정보 없음", tone: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
};

const selectClass = "rounded-md border border-zinc-300 bg-background px-3 py-2 text-base dark:border-zinc-700";

function ruleText(g: CourseGroup): string {
  if (g.credits === null) return "필요 학점 확인 필요";
  if (g.rule === "all") return `${g.credits}학점 · 모두 이수`;
  if (g.rule === "choose") return `${g.credits}학점 · 아래 과목 중 선택`;
  return `${g.credits}학점 · 과목 목록과 학점이 맞지 않아 확인 필요`;
}

function Group({ g }: { g: CourseGroup }) {
  const list = (
    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
      {g.courses.map((c) => (
        <li key={c.code} className="flex justify-between gap-2 rounded bg-zinc-50 px-2 py-1 text-sm dark:bg-zinc-900">
          <span>
            {c.name} <span className="text-xs text-zinc-500">{c.code}</span>
          </span>
          <span className="tabular-nums text-zinc-600 dark:text-zinc-400">{c.credits}학점</span>
        </li>
      ))}
    </ul>
  );
  const head = (
    <span className="font-medium">
      {g.category} <span className="font-normal text-zinc-600 dark:text-zinc-400">{ruleText(g)}</span>
    </span>
  );
  // Elective pools are long: keep them folded.
  if (g.category === "전공선택") {
    return (
      <details className="text-sm">
        <summary className="cursor-pointer">
          {head} <span className="text-xs text-zinc-500">({g.courses.length}과목 보기)</span>
        </summary>
        {list}
      </details>
    );
  }
  return (
    <div className="text-sm">
      {head}
      {g.courses.length > 0 ? list : <p className="mt-1 text-zinc-500">편성표에 해당 과목이 없습니다.</p>}
    </div>
  );
}

function Program({ title, p, credits }: { title: string; p: ProgramCourses; credits: number }) {
  const s = STATUS[p.status];
  return (
    <section className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">
          {title}: {p.dept} ({KIND_LABEL[p.kind]}) <span className="tabular-nums">{credits}학점</span>
        </h3>
        <span className={`rounded-full px-2 py-0.5 text-xs ${s.tone}`}>{s.label}</span>
      </div>
      {p.groups.map((g) => (
        <Group key={g.category} g={g} />
      ))}
      {p.problems.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-amber-700 dark:text-amber-400">
          {p.problems.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}
      {p.rules.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-zinc-700 dark:text-zinc-300">학과 규정 원문 {p.rules.length}개</summary>
          <ul className="mt-2 flex flex-col gap-2 text-zinc-600 dark:text-zinc-400">
            {p.rules.map((r, i) => (
              <li key={i}>
                <span className="text-xs text-zinc-500">p.{r.page}</span> {r.text}
              </li>
            ))}
          </ul>
        </details>
      )}
      {p.pages.length > 0 && <p className="text-xs text-zinc-500">교육과정 책 확인 쪽: {p.pages.join(", ")}</p>}
    </section>
  );
}

function RulesApplied({ r }: { r: CoursePlanOk }) {
  const m = r.majorRules;
  const items: { key: string; text: string; page: number }[] = [];
  if (m.basicExemption) {
    items.push({
      key: "basic",
      page: m.basicExemption.page,
      text: `같은 단과대학이고 전공기초 과목이 같아서, ${r.second.dept}의 전공기초 ${m.basicExemption.credits}학점은 다시 이수하지 않아도 됩니다.`,
    });
  }
  if (m.overlap) {
    items.push({
      key: "overlap",
      page: m.overlap.page,
      text: `두 전공이 함께 요구하는 과목(${m.overlap.courses.map((c) => c.name).join(", ")}, ${m.overlap.credits}학점)은 양쪽 전공 학점으로 모두 인정되지만 졸업학점에는 한 번만 들어갑니다. 같은 학수번호일 때만 인정되며, 단과대학 시행세칙으로 인정 학점이 제한될 수 있습니다.`,
    });
  }
  if (m.minorOverlap) {
    items.push({
      key: "minor",
      page: m.minorOverlap.page,
      text: `${m.minorOverlap.courses.map((c) => c.name).join(", ")}(${m.minorOverlap.credits}학점)은(는) 본전공에도 있는 과목이라 부전공 학점으로 인정되지 않습니다. 부전공 학점은 다른 부전공 과목으로 채워야 합니다(대체 과목은 학과 규정 확인).`,
    });
  }
  return (
    <section className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      <h3 className="text-base font-semibold">학교 공통 규칙</h3>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {items.map((i) => (
            <li key={i.key}>
              {i.text} <span className="text-xs text-zinc-500">p.{i.page}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-zinc-600 dark:text-zinc-400">이 조합에 학점이 달라지는 공통 규칙은 없습니다.</p>
      )}
      <details>
        <summary className="cursor-pointer text-zinc-700 dark:text-zinc-300">신청·이수 안내 {m.notices.length}개</summary>
        <ul className="mt-2 list-disc pl-5 text-zinc-600 dark:text-zinc-400">
          {m.notices.map((n) => (
            <li key={n.id}>
              {n.text} <span className="text-xs text-zinc-500">p.{n.page}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function MicrodegreeRules({ rules }: { rules: MajorRules }) {
  return (
    <details className="rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      <summary className="cursor-pointer font-semibold">마이크로디그리 규칙</summary>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {rules.microdegree.definition} <span className="text-xs text-zinc-500">p.{rules.microdegree.page}</span>
      </p>
      <ul className="mt-2 list-disc pl-5 text-zinc-600 dark:text-zinc-400">
        {rules.microdegree.rules.map((n) => (
          <li key={n.id}>
            {n.text} <span className="text-xs text-zinc-500">p.{n.page}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function MajorPlanner({ data, rules }: { data: CreditData; rules: MajorRules }) {
  const byCollege = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of data.depts) {
      if (!d.programs.single.available) continue; // only these can be a 본전공
      map.set(d.college, [...(map.get(d.college) ?? []), d.dept]);
    }
    return [...map.entries()];
  }, [data]);

  const [primary, setPrimary] = useState("");
  const [kind, setKind] = useState<CreditKind>("double");
  const [second, setSecond] = useState("");
  const [result, setResult] = useState<CoursePlanResult | null>(null);
  const [error, setError] = useState("");

  const options = useMemo(
    () =>
      primary
        ? listCreditOptions(primary, data).filter((o) => o.kind === kind && !prohibitedReason(primary, o.dept, rules))
        : [],
    [primary, kind, data, rules],
  );
  const optionsByCollege = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const o of [...options].sort((a, b) => a.dept.localeCompare(b.dept, "ko"))) {
      map.set(o.college, [...(map.get(o.college) ?? []), o.dept]);
    }
    return [...map.entries()];
  }, [options]);

  useEffect(() => {
    if (!primary || !second) return;
    const controller = new AbortController();
    const q = new URLSearchParams({ primary, second, kind });
    fetch(`/api/plan?${q}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CoursePlanResult>;
      })
      .then((r) => {
        setResult(r);
        setError("");
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setResult(null);
        setError(`결과를 불러오지 못했습니다 (${e instanceof Error ? e.message : String(e)}). 다시 시도해 주세요.`);
      });
    return () => controller.abort();
  }, [primary, second, kind]);

  const shown = primary && second ? result : null;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <label className="flex flex-col gap-2 text-sm font-medium">
          내 본전공
          <select
            className={selectClass}
            value={primary}
            onChange={(e) => {
              setPrimary(e.target.value);
              setSecond("");
            }}
          >
            <option value="">학과를 선택하세요</option>
            {byCollege.map(([college, names]) => (
              <optgroup key={college} label={college}>
                {names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="flex gap-1" role="radiogroup" aria-label="이수 형태">
          {(["double", "minor"] as const).map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={kind === k}
              onClick={() => {
                setKind(k);
                setSecond("");
              }}
              className={`rounded-full px-3 py-2 text-sm ${
                kind === k ? "bg-foreground text-background" : "border border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium">
          희망 {KIND_LABEL[kind]}
          <select
            className={selectClass}
            value={second}
            disabled={!primary}
            onChange={(e) => setSecond(e.target.value)}
          >
            <option value="">{primary ? `${options.length}개 중 선택` : "본전공을 먼저 고르세요"}</option>
            {optionsByCollege.map(([college, names]) => (
              <optgroup key={college} label={college}>
                {names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm dark:border-red-800 dark:bg-red-950">{error}</p>}

      {shown && !shown.available && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
          {shown.message}
        </p>
      )}

      {shown && shown.available && (
        <div className="flex flex-col gap-4">
          <section className="rounded-md bg-zinc-100 p-4 dark:bg-zinc-900">
            <p className="text-lg font-semibold">
              전공 학점 합계 <span className="tabular-nums">{shown.totals.total}</span>학점
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {shown.primary.dept} {shown.totals.primaryCredits}학점 + {shown.second.dept}{" "}
              {shown.totals.secondCredits}학점
              {shown.totals.savedCredits > 0 &&
                ` · 다전공을 하면 본전공이 단일전공 ${shown.singleCredits}학점에서 ${shown.totals.primaryCredits}학점으로 줄어듭니다`}
            </p>
            {shown.majorRules.minimumCredits < shown.totals.total && (
              <p className="mt-1 text-sm font-medium">
                공통 규칙을 적용하면 실제로 들어야 할 전공 학점은 최소{" "}
                <span className="tabular-nums">{shown.majorRules.minimumCredits}</span>학점입니다.
              </p>
            )}
          </section>
          <RulesApplied r={shown} />
          <Program title="본전공" p={shown.primary} credits={shown.totals.primaryCredits} />
          <Program title={`희망 ${KIND_LABEL[shown.input.kind]}`} p={shown.second} credits={shown.totals.secondCredits} />
          {shown.warnings.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-amber-700 dark:text-amber-400">
                학점 데이터 확인 항목 {shown.warnings.length}개
              </summary>
              <ul className="mt-2 list-disc pl-5 text-zinc-600 dark:text-zinc-400">
                {shown.warnings.map((w, i) => (
                  <li key={i}>
                    {w.source} · {w.code}: {w.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="text-xs text-zinc-500">
            출처: {shown.source.pdf} ({shown.source.asOf}). 과목 목록은 교육과정 편성표에서, 학점은 학과별 이수학점
            표에서 가져왔습니다. 졸업요건은 학과 공식 안내로 최종 확인하세요.
          </p>
        </div>
      )}

      <MicrodegreeRules rules={rules} />
    </div>
  );
}
