"use client";

// 학과 지도: every 국제캠퍼스 department as a dot, related departments close together, colored by college.
// Closeness is computed in src/lib/deptMap.ts from the 2026 curriculum book; tap a dot to see who is near and why.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { neighborsOf } from "@/lib/deptMap";
import type { MapEdge, MapNode } from "@/lib/deptMap";

const PALETTE = ["#7aa2f7", "#f7768e", "#9ece6a", "#e0af68", "#bb9af7", "#7dcfff", "#ff9e64", "#73daca", "#c0caf5", "#f4b8e4"];
const FUSION = "융합전공";
const TOP = 5;
const PAD = 70;

const reasons = (e: MapEdge) =>
  [e.shared > 0 && `같은 과목 ${e.shared}개`, e.microdegrees.length > 0 && `마이크로디그리 ${e.microdegrees.length === 1 ? e.microdegrees[0] : `${e.microdegrees.length}개`}`, e.sameCollege && "같은 단과대학"].filter(
    (x): x is string => !!x,
  );

export default function DeptMap({ nodes, edges, asOf }: { nodes: MapNode[]; edges: MapEdge[]; asOf: string }) {
  const { profile } = useAuth();
  const [sel, setSel] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const colleges = useMemo(() => [...new Set(nodes.map((n) => n.college))], [nodes]);
  const color = (college: string) => (college === FUSION ? "#a9b1d6" : PALETTE[colleges.filter((c) => c !== FUSION).indexOf(college) % PALETTE.length]);
  const byName = useMemo(() => new Map(nodes.map((n) => [n.dept, n])), [nodes]);
  const near = useMemo(() => (sel ? neighborsOf(sel, edges).slice(0, TOP) : []), [sel, edges]);
  const nearSet = useMemo(() => new Set(near.flatMap((e) => [e.a, e.b])), [near]);
  const mine = profile?.primary;
  // crop the canvas to where the dots are, so the first screen is never empty
  const x0 = Math.min(...nodes.map((n) => n.x)) - PAD;
  const y0 = Math.min(...nodes.map((n) => n.y)) - PAD;
  const w = Math.max(...nodes.map((n) => n.x)) + PAD - x0;
  const h = Math.max(...nodes.map((n) => n.y)) + PAD - y0;

  // open with the map centered on the student's own department
  useEffect(() => {
    const n = mine ? byName.get(mine) : undefined;
    const el = box.current;
    if (el) el.scrollTo({ left: (n ? n.x - x0 : w / 2) - el.clientWidth / 2, top: (n ? n.y - y0 : h / 2) - el.clientHeight / 2 });
  }, [mine, byName, x0, y0, w, h]);

  const pick = (d: string) => {
    setSel(d);
    const n = byName.get(d);
    const el = box.current;
    if (n && el) el.scrollTo({ left: n.x - x0 - el.clientWidth / 2, top: n.y - y0 - el.clientHeight / 2, behavior: "smooth" });
  };
  const node = sel ? byName.get(sel) : undefined;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2.5">
        <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">
          어떤 학과가 있는지
          <br />
          한눈에 둘러봐요
        </h2>
        <p className="text-sm leading-normal text-ink-2">관련 있는 학과는 가까이 모여 있어요. 점을 누르면 가까운 학과와 이유를 볼 수 있어요. 손가락으로 밀어서 둘러보세요.</p>
      </div>

      <div ref={box} className="h-[430px] touch-pan-x touch-pan-y overflow-auto rounded-3xl bg-[#0f1020]" aria-label="학과 지도">
        <svg width={w} height={h} viewBox={`${x0} ${y0} ${w} ${h}`} className="block max-w-none">
          {edges.map((e) => {
            const a = byName.get(e.a)!;
            const b = byName.get(e.b)!;
            const on = sel === e.a || sel === e.b;
            return (
              <line
                key={`${e.a}|${e.b}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={on ? "#ffffff" : "#5b6b8c"}
                strokeOpacity={on ? 0.9 : sel ? 0.12 : 0.3}
                strokeWidth={on ? 2.5 : 1}
              />
            );
          })}
          {nodes.map((n) => {
            const active = n.dept === sel;
            const dim = sel && !active && !nearSet.has(n.dept);
            return (
              <g
                key={n.dept}
                role="button"
                tabIndex={0}
                aria-label={`${n.dept} (${n.college})`}
                aria-pressed={active}
                onClick={() => setSel(n.dept)}
                onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && setSel(n.dept)}
                opacity={dim ? 0.3 : 1}
                className="cursor-pointer outline-none"
              >
                <circle cx={n.x} cy={n.y} r={26} fill="transparent" />
                {n.dept === mine && <circle cx={n.x} cy={n.y} r={20} fill="none" stroke="#f7768e" strokeWidth={3} strokeDasharray="5 4" />}
                <circle cx={n.x} cy={n.y} r={active ? 15 : 10} fill={color(n.college)} stroke={active ? "#fff" : "none"} strokeWidth={3} />
                <text x={n.x} y={n.y + (active ? 32 : 26)} textAnchor="middle" fontSize={active ? 17 : 13} fontWeight={active ? 700 : 500} fill={active ? "#fff" : "#c0caf5"} stroke="#0f1020" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke">
                  {n.dept}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1.5 px-1 text-[11px] text-mute" aria-label="단과대학 색">
        {colleges.map((c) => (
          <li key={c} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: color(c) }} />
            {c}
          </li>
        ))}
        {mine && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="box-border h-2.5 w-2.5 rounded-full border-[1.5px] border-dashed border-accent" />내 본전공
          </li>
        )}
      </ul>

      {node ? (
        <section className="quiz-pop flex flex-col gap-3 rounded-[20px] border border-edge bg-card p-[18px]">
          <div className="flex items-center gap-3">
            <Avatar dept={node.dept} size={44} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs text-mute">{node.college}</span>
              <span className="text-pretty text-lg font-bold">{node.dept}</span>
            </div>
          </div>
          {near.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {near.map((e) => {
                const other = e.a === node.dept ? e.b : e.a;
                return (
                  <li key={other}>
                    <button
                      type="button"
                      onClick={() => pick(other)}
                      className="box-border flex w-full flex-col gap-1 rounded-2xl border border-line bg-white px-3.5 py-2.5 text-left active:scale-[.985]"
                    >
                      <span className="text-[15px] font-semibold">{other}</span>
                      <span className="text-xs leading-normal text-mute">{reasons(e).join(" · ")}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm leading-normal text-ink-2">책에서 겹치는 과목이나 마이크로디그리를 찾지 못했어요. 학과 홈페이지에서 확인해 보세요.</p>
          )}
          <div className="flex flex-col gap-2">
            <Link href={`/community/dept?name=${encodeURIComponent(node.dept)}`} className="box-border flex h-12 items-center justify-center rounded-2xl border border-edge bg-white text-sm font-semibold">
              {node.dept} 이야기 보기
            </Link>
            {mine && mine !== node.dept && (
              <Link
                href={`/onboarding?${new URLSearchParams({ primary: mine, mode: "double", second: node.dept })}`}
                className="box-border flex h-12 items-center justify-center rounded-2xl bg-accent text-sm font-bold text-white active:opacity-90"
              >
                {mine} + {node.dept} 학점 보기
              </Link>
            )}
          </div>
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-edge px-4 py-5 text-center text-sm text-mute">궁금한 학과의 점을 눌러 보세요</p>
      )}

      <p className="px-1 text-xs leading-normal text-mute">
        가깝다는 건 겹치는 과목, 함께 만든 마이크로디그리, 같은 단과대학이 많다는 뜻이에요. {asOf} 교육과정 책 기준이고, 전공을 고를 때 참고만 해 주세요.
      </p>
    </div>
  );
}
