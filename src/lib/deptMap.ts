// 학과 지도: how close two departments are, and where to draw each one. Pure functions.
// Closeness comes only from data in the curriculum book (shared courses, shared micro-degrees, same college),
// never from a guess: every edge keeps the reasons it exists so the screen can show them.

export interface MapDept {
  dept: string;
  college: string;
}
export interface MapMicrodegree {
  name: string;
  host: string; // department that runs it
  from: string[]; // departments whose courses it uses
}
export interface MapEdge {
  a: string;
  b: string;
  w: number;
  shared: number; // courses both departments list, not counting ones most departments share
  microdegrees: string[];
  sameCollege: boolean;
}
export interface MapNode extends MapDept {
  x: number;
  y: number;
}

const COMMON_DF = 6; // a course listed by more than this many departments (calculus, physics...) says little
const COLLEGE_W = 0.5;
const MD_W = 2;
export const SIZE = 1000;
const norm = (s: string) => s.replace(/\s/g, "");

export function buildEdges(depts: MapDept[], courses: Record<string, string[]>, mds: MapMicrodegree[]): MapEdge[] {
  const names = new Set(depts.map((d) => d.dept));
  const owners = new Map<string, string[]>(); // course name -> departments listing it
  for (const d of names)
    for (const c of new Set((courses[d] ?? []).map(norm))) owners.set(c, [...(owners.get(c) ?? []), d]);

  const edges = new Map<string, MapEdge>();
  const edge = (x: string, y: string) => {
    const [a, b] = x < y ? [x, y] : [y, x];
    const key = `${a}|${b}`;
    if (!edges.has(key)) edges.set(key, { a, b, w: 0, shared: 0, microdegrees: [], sameCollege: false });
    return edges.get(key)!;
  };

  for (const list of owners.values()) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const e = edge(list[i], list[j]);
        e.w += 1 / (list.length - 1); // the more departments share a course, the less it tells
        if (list.length <= COMMON_DF) e.shared++;
      }
  }
  for (const m of mds)
    for (const f of new Set(m.from)) {
      if (f === m.host || !names.has(f) || !names.has(m.host)) continue;
      const e = edge(m.host, f);
      if (!e.microdegrees.includes(m.name)) {
        e.microdegrees.push(m.name);
        e.w += MD_W;
      }
    }
  for (let i = 0; i < depts.length; i++)
    for (let j = i + 1; j < depts.length; j++)
      if (depts[i].college === depts[j].college && depts[i].college !== "융합전공") {
        const e = edge(depts[i].dept, depts[j].dept); // 융합전공 is a kind of program, not one college
        e.sameCollege = true;
        e.w += COLLEGE_W;
      }
  return [...edges.values()].filter((e) => e.w >= 0.5);
}

/** The strongest `n` neighbors of every department (an edge is kept when either side ranks it), for drawing lines. */
export function strongest(edges: MapEdge[], n: number): MapEdge[] {
  const rank = new Map<string, MapEdge[]>();
  for (const e of edges) for (const k of [e.a, e.b]) rank.set(k, [...(rank.get(k) ?? []), e]);
  const keep = new Set<MapEdge>();
  for (const list of rank.values()) for (const e of [...list].sort((p, q) => q.w - p.w).slice(0, n)) keep.add(e);
  return [...keep];
}

/** Closest departments first. */
export const neighborsOf = (dept: string, edges: MapEdge[]): MapEdge[] =>
  edges.filter((e) => e.a === dept || e.b === dept).sort((p, q) => q.w - p.w);

/** Force layout in a SIZE x SIZE box: linked departments pull together, all push apart, each college drifts to its own corner. */
export function layout(depts: MapDept[], edges: MapEdge[], rounds = 400): MapNode[] {
  const n = depts.length;
  const colleges = [...new Set(depts.map((d) => d.college))];
  const home = (c: string): [number, number] => {
    const t = (colleges.indexOf(c) / colleges.length) * Math.PI * 2;
    return [SIZE / 2 + Math.cos(t) * SIZE * 0.3, SIZE / 2 + Math.sin(t) * SIZE * 0.3];
  };
  const idx = new Map(depts.map((d, i) => [d.dept, i]));
  const pos = depts.map((d, i) => {
    const [hx, hy] = home(d.college);
    const t = i * 2.399963; // golden angle: spreads the start without randomness
    return { x: hx + Math.cos(t) * 40, y: hy + Math.sin(t) * 40 };
  });
  const k = Math.min(70, Math.sqrt((SIZE * SIZE) / n) * 0.7); // capped so a handful of departments do not fly apart
  for (let r = 0; r < rounds; r++) {
    const cool = 1 - r / rounds;
    const f = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i].x - pos[j].x || 0.01;
        const dy = pos[i].y - pos[j].y || 0.01;
        const d = Math.hypot(dx, dy);
        if (d > 4 * k) continue; // far departments do not push, so the whole map is not blown outward
        const push = (k * k) / d / d;
        f[i].x += dx * push;
        f[i].y += dy * push;
        f[j].x -= dx * push;
        f[j].y -= dy * push;
      }
    for (const e of edges) {
      const i = idx.get(e.a)!;
      const j = idx.get(e.b)!;
      const dx = pos[j].x - pos[i].x;
      const dy = pos[j].y - pos[i].y;
      const pull = (Math.hypot(dx, dy) / k) * Math.min(1, e.w / 3);
      f[i].x += dx * pull;
      f[i].y += dy * pull;
      f[j].x -= dx * pull;
      f[j].y -= dy * pull;
    }
    for (let i = 0; i < n; i++) {
      const [hx, hy] = home(depts[i].college);
      f[i].x += (hx - pos[i].x) * 0.012;
      f[i].y += (hy - pos[i].y) * 0.012;
      const m = Math.hypot(f[i].x, f[i].y) || 1;
      const step = Math.min(m, 40 * cool + 1);
      pos[i].x = Math.min(SIZE - 30, Math.max(30, pos[i].x + (f[i].x / m) * step));
      pos[i].y = Math.min(SIZE - 30, Math.max(30, pos[i].y + (f[i].y / m) * step));
    }
  }
  return depts.map((d, i) => ({ ...d, x: Math.round(pos[i].x), y: Math.round(pos[i].y) }));
}
