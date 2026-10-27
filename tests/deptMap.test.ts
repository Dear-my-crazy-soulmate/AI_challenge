import { describe, expect, it } from "vitest";

import credits from "../data/curated/credits_global.json";
import courses from "../data/curated/2026/courses.json";
import microdegrees from "../data/curated/2026/microdegrees.json";
import { buildEdges, layout, neighborsOf, SIZE, strongest } from "../src/lib/deptMap";
import type { MapDept, MapMicrodegree } from "../src/lib/deptMap";

const depts: MapDept[] = [
  { dept: "A", college: "공대" },
  { dept: "B", college: "공대" },
  { dept: "C", college: "예대" },
  { dept: "D", college: "예대" },
];
const cs = { A: ["자료구조", "미분적분학"], B: ["자료구조", "미분적분학"], C: ["드로잉"], D: ["드로잉"] };

describe("buildEdges", () => {
  it("links departments that list the same course, and weighs rare courses more than common ones", () => {
    const e = buildEdges(depts, { ...cs, C: ["자료구조", "드로잉"] }, []);
    const ab = e.find((x) => x.a === "A" && x.b === "B")!;
    const ac = e.find((x) => x.a === "A" && x.b === "C")!;
    expect(ab.shared).toBe(2);
    expect(ab.w).toBeGreaterThan(ac.w); // A-B share 2 courses and a college
  });
  it("ignores courses most departments share, and spacing in names", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ dept: `X${i}`, college: `c${i}` }));
    const same = Object.fromEntries(many.map((d) => [d.dept, ["미분 적분학"]]));
    expect(buildEdges(many, same, []).every((e) => e.shared === 0)).toBe(true);
    expect(buildEdges(depts, { A: ["미분 적분학"], B: ["미분적분학"] }, []).find((e) => e.a === "A" && e.b === "B")!.shared).toBe(1);
  });
  it("links a micro-degree's host to the departments whose courses it uses, and skips unknown ones", () => {
    const mds: MapMicrodegree[] = [{ name: "MD1", host: "A", from: ["C", "없는학과", "A"] }];
    const e = buildEdges(depts, {}, mds).find((x) => x.a === "A" && x.b === "C")!;
    expect(e.microdegrees).toEqual(["MD1"]);
    expect(buildEdges(depts, {}, mds).some((x) => x.a === "없는학과" || x.b === "없는학과")).toBe(false);
  });
  it("does not make 융합전공 one college", () => {
    const f = [{ dept: "F1", college: "융합전공" }, { dept: "F2", college: "융합전공" }];
    expect(buildEdges(f, {}, [])).toEqual([]);
  });
});

describe("layout", () => {
  it("is deterministic, stays in the box, and puts linked departments closer than unlinked ones", () => {
    const edges = buildEdges(depts, cs, []);
    const a = layout(depts, edges);
    expect(layout(depts, edges)).toEqual(a);
    for (const n of a) for (const v of [n.x, n.y]) expect(v >= 0 && v <= SIZE).toBe(true);
    const d = (p: string, q: string) => {
      const u = a.find((n) => n.dept === p)!;
      const v = a.find((n) => n.dept === q)!;
      return Math.hypot(u.x - v.x, u.y - v.y);
    };
    expect(d("A", "B")).toBeLessThan(d("A", "C"));
  });
});

describe("with the real 2026 data", () => {
  const real = (credits as { dept: string; college: string }[]).map(({ dept, college }) => ({ dept, college }));
  const byDept = Object.fromEntries(
    Object.entries((courses as { depts: Record<string, { catalog: { name: string }[] }> }).depts).map(([k, v]) => [k, v.catalog.map((c) => c.name)]),
  );
  const mds = (microdegrees as { microdegrees: { name: string; dept: string; courses: { offered_by: string | null }[] }[] }).microdegrees.map((m) => ({
    name: m.name,
    host: m.dept,
    from: m.courses.map((c) => c.offered_by).filter((x): x is string => !!x),
  }));
  const edges = buildEdges(real, byDept, mds);
  it("links almost every department, and the layout has no broken numbers", () => {
    const lonely = real.filter((d) => neighborsOf(d.dept, edges).length === 0).map((d) => d.dept);
    expect(lonely).toEqual(["글로벌엔지니어링", "글로벌문화기술"]); // 융합전공 with no shared courses or micro-degrees stay alone rather than get a made-up link
    const nodes = layout(real, edges);
    expect(nodes).toHaveLength(real.length);
    expect(nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
    expect(strongest(edges, 3).length).toBeLessThanOrEqual(real.length * 3);
  });
});
