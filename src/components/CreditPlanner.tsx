"use client";

import { useMemo, useState } from "react";

import { buildCreditPlan, listCreditOptions } from "@/lib/rules/credits";
import type { CreditBreakdown, CreditData, CreditKind, CreditOption } from "@/lib/rules/credits";

const KIND_LABEL: Record<CreditBreakdown["kind"], string> = { single: "단일전공", double: "다전공", minor: "부전공" };
type Filter = "all" | CreditKind;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "double", label: "다전공" },
  { value: "minor", label: "부전공" },
];

export default function CreditPlanner({ data }: { data: CreditData }) {
  // Only departments with a single major can be a 본전공.
  const byCollege = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of data.depts) {
      if (!d.programs.single.available) continue;
      map.set(d.college, [...(map.get(d.college) ?? []), d.dept]);
    }
    return [...map.entries()];
  }, [data]);

  const [primary, setPrimary] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<CreditOption | null>(null);

  const options = useMemo(() => (primary ? listCreditOptions(primary, data) : []), [primary, data]);
  const shown = options.filter((o) => filter === "all" || o.kind === filter);
  const plan = picked && primary ? buildCreditPlan({ primary, second: picked.dept, kind: picked.kind }, data) : null;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <label className="flex flex-col gap-2 text-sm font-medium">
        본전공
        <select
          className="rounded-md border border-zinc-300 bg-background px-3 py-2 text-base dark:border-zinc-700"
          value={primary}
          onChange={(e) => {
            setPrimary(e.target.value);
            setPicked(null);
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

      {primary && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">가능한 조합 {shown.length}개</h2>
            <div className="flex gap-1" role="tablist">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  role="tab"
                  aria-selected={filter === f.value}
                  onClick={() => setFilter(f.value)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    filter === f.value
                      ? "bg-foreground text-background"
                      : "border border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[28rem] overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-100 text-left dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2">두 번째 전공</th>
                  <th className="px-3 py-2">단과대학</th>
                  <th className="px-3 py-2">유형</th>
                  <th className="px-3 py-2 text-right">전공 학점 합계</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => {
                  const active = picked?.dept === o.dept && picked.kind === o.kind;
                  return (
                    <tr
                      key={`${o.dept}/${o.kind}`}
                      onClick={() => setPicked(o)}
                      className={`cursor-pointer border-t border-zinc-200 dark:border-zinc-800 ${
                        active ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <td className="px-3 py-2">{o.dept}</td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{o.college}</td>
                      <td className="px-3 py-2">{KIND_LABEL[o.kind]}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{o.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-500">
            검증을 통과하지 못했거나 학과에 과정이 없는 조합은 표에서 빠집니다. 행을 누르면 상세 학점을 볼 수 있습니다.
          </p>
        </section>
      )}

      {plan && !plan.available && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
          {plan.message}
        </p>
      )}

      {plan && plan.available && (
        <section className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">
            {plan.input.primary} + {plan.input.second} {KIND_LABEL[plan.input.kind]}
          </h2>
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-600 dark:text-zinc-400">
              <tr>
                <th className="py-1">구분</th>
                <th className="py-1 text-right">기초</th>
                <th className="py-1 text-right">필수</th>
                <th className="py-1 text-right">선택</th>
                <th className="py-1 text-right">계</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[plan.primary, plan.second].map((b) => (
                <tr key={b.dept} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-1">
                    {b.dept} ({KIND_LABEL[b.kind]})
                  </td>
                  <td className="py-1 text-right">{b.기초}</td>
                  <td className="py-1 text-right">{b.필수}</td>
                  <td className="py-1 text-right">{b.선택}</td>
                  <td className="py-1 text-right">{b.계}</td>
                </tr>
              ))}
              <tr className="border-t border-zinc-300 font-semibold dark:border-zinc-700">
                <td className="py-1" colSpan={4}>
                  합계
                </td>
                <td className="py-1 text-right">{plan.totals.total}</td>
              </tr>
            </tbody>
          </table>
          {plan.totals.savedCredits > 0 && (
            <p className="text-sm">
              다전공을 하면 본전공이 단일전공 {plan.singleCredits}학점에서 다전공 기준 {plan.totals.primaryCredits}
              학점으로 바뀌어 본전공 학점이 {plan.totals.savedCredits}학점 줄어듭니다.
            </p>
          )}
          {plan.warnings.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-amber-700 dark:text-amber-400">
                확인이 필요한 항목 {plan.warnings.length}개
              </summary>
              <ul className="mt-2 list-disc pl-5 text-zinc-600 dark:text-zinc-400">
                {plan.warnings.map((w, i) => (
                  <li key={i}>
                    {w.source} · {w.code}: {w.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="text-xs text-zinc-500">
            출처:{" "}
            {Object.entries(plan.sources)
              .map(([d, s]) => `${d} (${s.sourceUrl === "TODO" ? "공식 사이트, 주소 확인 중" : s.sourceUrl}, ${s.asOf})`)
              .join(" · ")}
            . 졸업요건은 학과 공식 안내로 최종 확인하세요.
          </p>
        </section>
      )}
    </div>
  );
}
