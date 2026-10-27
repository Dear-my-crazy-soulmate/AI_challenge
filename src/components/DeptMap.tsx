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
const START_K = 0.9;
const MIN_K = 0.25;
const MAX_K = 3.5;
const TAP_SLOP = 8; // px of finger travel that still counts as a tap

interface View {
  cx: number;
  cy: number;
  k: number;
}
const clamp = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));
/** zoom by f keeping the map point under (qx, qy), measured from the view's center in px, where it is */
const zoomAt = (v: View, f: number, qx: number, qy: number): View => {
  const k = clamp(v.k * f);
  return { cx: v.cx + qx / v.k - qx / k, cy: v.cy + qy / v.k - qy / k, k };
};

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

  // The view is a center point (cx, cy) on the map and a zoom k; null until the student first moves or zooms it.
  const mineNode = mine ? byName.get(mine) : undefined;
  const startX = mineNode?.x ?? x0 + w / 2;
  const startY = mineNode?.y ?? y0 + h / 2;
  const [user, setUser] = useState<View | null>(null);
  const view = user ?? { cx: startX, cy: startY, k: START_K };
  const move = (f: (v: View) => View) => setUser((p) => f(p ?? { cx: startX, cy: startY, k: START_K }));

  const pts = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0); // how far this touch travelled; a long drag must not count as a tap on a dot
  const centre = () => {
    const r = box.current!.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  };

  const onDown = (e: React.PointerEvent) => {
    if (pts.current.size === 0) moved.current = 0;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pts.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    const other = [...pts.current].find(([id]) => id !== e.pointerId)?.[1];
    pts.current.set(e.pointerId, cur);
    if (!other) {
      moved.current += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
      if (moved.current > TAP_SLOP) move((v) => ({ ...v, cx: v.cx - (cur.x - prev.x) / v.k, cy: v.cy - (cur.y - prev.y) / v.k }));
      return;
    }
    // two fingers: zoom by how the distance changed and follow the middle point
    moved.current = TAP_SLOP + 1;
    const c = centre();
    const f = Math.hypot(cur.x - other.x, cur.y - other.y) / (Math.hypot(prev.x - other.x, prev.y - other.y) || 1);
    const mid = { x: (cur.x + other.x) / 2, y: (cur.y + other.y) / 2 };
    const was = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 };
    move((v) => {
      const z = zoomAt(v, f, mid.x - c.x, mid.y - c.y);
      return { ...z, cx: z.cx - (mid.x - was.x) / z.k, cy: z.cy - (mid.y - was.y) / z.k };
    });
  };
  const onUp = (e: React.PointerEvent) => void pts.current.delete(e.pointerId);

  // mouse wheel zooms toward the pointer; it needs a non-passive listener to stop the page from scrolling
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const f = Math.exp(-e.deltaY * 0.0015);
      setUser((p) => zoomAt(p ?? { cx: startX, cy: startY, k: START_K }, f, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [startX, startY]);

  const fit = () => {
    const c = centre();
    setUser({ cx: x0 + w / 2, cy: y0 + h / 2, k: clamp(Math.min(c.w / w, c.h / h)) });
  };
  const pick = (d: string) => {
    setSel(d);
    const n = byName.get(d);
    if (n) move((v) => ({ cx: n.x, cy: n.y, k: Math.max(v.k, 1) }));
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
        <p className="text-sm leading-normal text-ink-2">관련 있는 학과는 가까이 모여 있어요. 점을 누르면 가까운 학과와 이유를 볼 수 있어요. 손가락으로 끌어서 움직이고, 두 손가락으로 확대·축소해 보세요.</p>
      </div>

      <div className="relative">
        <div
          ref={box}
          aria-label="학과 지도"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          className="relative h-[430px] touch-none select-none overflow-hidden rounded-3xl bg-[#0f1020]"
        >
          <svg
            width={1}
            height={1}
            className="absolute left-1/2 top-1/2 overflow-visible"
            style={{ transform: `scale(${view.k}) translate(${-view.cx}px, ${-view.cy}px)`, transformOrigin: "0 0" }}
          >
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
                vectorEffect="non-scaling-stroke"
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
                onClick={() => moved.current <= TAP_SLOP && setSel(n.dept)}
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
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
          {[
            ["확대", "+", () => move((v) => zoomAt(v, 1.4, 0, 0))],
            ["축소", "−", () => move((v) => zoomAt(v, 1 / 1.4, 0, 0))],
          ].map(([label, text, run]) => (
            <button key={label as string} type="button" aria-label={label as string} onClick={run as () => void} className="h-10 w-10 rounded-full bg-white/15 text-xl font-bold leading-none text-white active:bg-white/30">
              {text as string}
            </button>
          ))}
          <button type="button" onClick={fit} className="h-10 rounded-full bg-white/15 px-3 text-xs font-bold text-white active:bg-white/30">
            전체
          </button>
        </div>
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
