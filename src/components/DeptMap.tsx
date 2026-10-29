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
const PAD = 100; // room around the dots for names at the edge of the map
const START_K = 0.9;
const MIN_K = 0.25;
const MAX_K = 3.5;
const TAP_SLOP = 8; // px of finger travel that still counts as a tap
const SHOW_ALL_K = 1.8; // zoomed in this far there is room: every department shows its name
const FOCUS_PAD = 60; // map units kept around a college when the view jumps to it

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
  const members = useMemo(() => new Map(colleges.map((c) => [c, nodes.filter((n) => n.college === c)])), [colleges, nodes]);
  const mine = profile?.primary;
  // crop the canvas to where the dots are, so the first screen is never empty
  const x0 = Math.min(...nodes.map((n) => n.x)) - PAD;
  const y0 = Math.min(...nodes.map((n) => n.y)) - PAD - 40; // college names sit above their dots, so the top needs more room
  const w = Math.max(...nodes.map((n) => n.x)) + PAD - x0;
  const h = Math.max(...nodes.map((n) => n.y)) + PAD - y0;

  // The view is a center point (cx, cy) on the map and a zoom k; null until the student first moves or zooms it.
  const mineNode = mine ? byName.get(mine) : undefined;
  const startX = mineNode?.x ?? x0 + w / 2;
  const startY = mineNode?.y ?? y0 + h / 2;
  const [user, setUser] = useState<View | null>(null);
  const view = user ?? { cx: startX, cy: startY, k: START_K };
  const unit = 1 / view.k; // one screen px in map units: names keep their size on screen at any zoom
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
    setSel(null);
    setUser({ cx: x0 + w / 2, cy: y0 + h / 2, k: clamp(Math.min(c.w / w, c.h / h)) });
  };
  /** Choose a department: its name and its neighbours' names show, and the view frames them so the names have room. */
  const pick = (d: string) => {
    setSel(d);
    const group = [d, ...neighborsOf(d, edges).slice(0, TOP).flatMap((e) => [e.a, e.b])];
    const ns = group.map((x) => byName.get(x)).filter((n): n is MapNode => !!n);
    const xs = ns.map((n) => n.x);
    const ys = ns.map((n) => n.y);
    const x1 = Math.min(...xs);
    const x2 = Math.max(...xs);
    const y1 = Math.min(...ys);
    const y2 = Math.max(...ys);
    const r = centre();
    setUser({ cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, k: Math.max(1, clamp(Math.min(r.w / (x2 - x1 + 2 * FOCUS_PAD), r.h / (y2 - y1 + 2 * FOCUS_PAD)))) });
  };
  const node = sel ? byName.get(sel) : undefined;

  // start with the whole map in view, so every college shows up (the student's own department stays one tap away)
  useEffect(() => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setUser((cur) => cur ?? { cx: x0 + w / 2, cy: y0 + h / 2, k: clamp(Math.min(r.width / w, r.height / h)) });
  }, [x0, y0, w, h]);

  const chips = (() => {
    if (sel || view.k >= SHOW_ALL_K) return []; // a chosen department or a close zoom needs the room for names
    const list = colleges
      .map((c) => {
        const m = members.get(c) ?? [];
        // above the topmost dot, so the name never sits on a dot
        return { name: c, x: m.reduce((a, n) => a + n.x, 0) / m.length, y: Math.min(...m.map((n) => n.y)) - 20 * unit, w: (c.length * 12 + 6) * unit, h: 14 * unit };
      })
      .sort((a, b) => a.y - b.y);
    // lift a name up while it overlaps one that is already placed (a few rounds are enough for ten names)
    for (let round = 0; round < 12; round++) {
      let changed = false;
      for (let i = 0; i < list.length; i++) {
        for (let j = 0; j < i; j++) {
          const a = list[i];
          const b = list[j];
          if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 2 * unit && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + 2 * unit) {
            a.y = b.y - (a.h + b.h) / 2 - 2 * unit;
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
    return list;
  })();

  // A name shows once it has room at this zoom: chosen and neighbouring names always, the rest only if
  // their text would sit on no other name, college name or dot (all measured in map units).
  const named = (() => {
    const out = new Set<string>();
    const boxes = chips.map((c) => ({ x0: c.x - c.w / 2, x1: c.x + c.w / 2, y0: c.y - c.h / 2, y1: c.y + c.h / 2 }));
    const clash = (a: { x0: number; x1: number; y0: number; y1: number }, b: typeof a) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    const lit = (d: string) => d === sel || nearSet.has(d);
    for (const n of [...nodes].sort((a, b) => Number(lit(b.dept)) - Number(lit(a.dept)))) {
      const big = n.dept === sel;
      const w = (n.dept.length * (big ? 15 : 12) + 4) * unit;
      const top = n.y + (big ? 15 : 10) + 2 * unit;
      const box = { x0: n.x - w / 2, x1: n.x + w / 2, y0: top, y1: top + (big ? 18 : 15) * unit };
      const free = !boxes.some((o) => clash(box, o)) && !nodes.some((m) => m !== n && clash(box, { x0: m.x - 11, x1: m.x + 11, y0: m.y - 11, y1: m.y + 11 }));
      if (lit(n.dept) || free) {
        out.add(n.dept);
        boxes.push(box);
      }
    }
    return out;
  })();

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2.5">
        <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">
          어떤 학과가 있는지
          <br />
          한눈에 둘러봐요
        </h2>
        <p className="text-sm leading-normal text-ink-2">단과대학 이름은 그 학과들이 모여 있는 자리예요. 점을 누르면 가까운 학과와 이유를 볼 수 있어요. 손가락으로 끌어서 움직이고, 두 손가락으로 확대·축소해 보세요.</p>
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
            const lit = active || nearSet.has(n.dept);
            const dim = !!sel && !lit;
            return (
              <g
                key={n.dept}
                role="button"
                tabIndex={0}
                aria-label={`${n.dept} (${n.college})`}
                aria-pressed={active}
                onClick={() => moved.current <= TAP_SLOP && pick(n.dept)}
                onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && pick(n.dept)}
                opacity={dim ? 0.3 : 1}
                className="cursor-pointer outline-none"
              >
                <circle cx={n.x} cy={n.y} r={26} fill="transparent" />
                <circle cx={n.x} cy={n.y} r={active ? 15 : 10} fill={color(n.college)} stroke={active ? "#fff" : "none"} strokeWidth={3} />
                {named.has(n.dept) && (
                <text
                  x={n.x}
                  y={n.y + (active ? 15 : 10) + 4 * unit + (active ? 15 : 12) * unit * 0.85}
                  textAnchor="middle"
                  fontSize={(active ? 15 : 12) * unit}
                  fontWeight={active ? 700 : 500}
                  fill={active ? "#ffffff" : "#e3e8ff"}
                  stroke="#0f1020"
                  strokeWidth={4 * unit}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                >
                  {n.dept}
                </text>
                )}
              </g>
            );
          })}
          {chips.map((c) => (
            <text
              key={c.name}
              x={c.x}
              y={c.y}
              textAnchor="middle"
              fontSize={12 * unit}
              fontWeight={700}
              fill={color(c.name)}
              stroke="#0f1020"
              strokeWidth={3 * unit}
              strokeLinejoin="round"
              paintOrder="stroke"
              pointerEvents="none"
              aria-hidden
            >
              {c.name}
            </text>
          ))}
          </svg>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          ["축소", "−", () => move((v) => zoomAt(v, 1 / 1.4, 0, 0))],
          ["확대", "+", () => move((v) => zoomAt(v, 1.4, 0, 0))],
        ].map(([label, text, run]) => (
          <button key={label as string} type="button" aria-label={label as string} onClick={run as () => void} className="box-border flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-edge bg-white text-xl font-bold leading-none active:bg-card">
            {text as string}
          </button>
        ))}
        <button type="button" onClick={fit} className="box-border flex h-11 flex-1 items-center justify-center rounded-xl border border-edge bg-white text-sm font-semibold active:bg-card">
          전체 보기
        </button>
        {mineNode && (
          <button
            type="button"
            onClick={() => setUser({ cx: mineNode.x, cy: mineNode.y, k: Math.max(view.k, 1) })}
            className="box-border flex h-11 flex-1 items-center justify-center rounded-xl border border-edge bg-white text-sm font-semibold active:bg-card"
          >
            내 학과로
          </button>
        )}
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1.5 px-1 text-xs text-mute" aria-label="단과대학 색">
        {colleges.map((c) => (
          <li key={c} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: color(c) }} />
            {c}
          </li>
        ))}
      </ul>

      {node ? (
        <section className="quiz-pop flex flex-col gap-3 rounded-3xl border border-edge bg-white p-[18px]">
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
