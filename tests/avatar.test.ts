import { describe, expect, it } from "vitest";

import credits from "../data/curated/credits_global.json";
import micro from "../data/curated/2026/microdegrees.json";
import { avatarSvg, avatarUri, isFusionDept } from "../src/lib/avatar/compose";
import type { GoalLike } from "../src/lib/avatar/compose";
import { DEPT_LOOK } from "../src/lib/avatar/departments";
import { LOOKS } from "../src/lib/avatar/looks";

const depts = credits as unknown as { dept: string; college: string }[];
const mds = [...new Set((micro as unknown as { microdegrees: { name: string }[] }).microdegrees.map((m) => m.name.split(" - ")[0]))];

/** tag balance check: every opened tag is closed in order (enough to catch a broken drawing string) */
function wellFormed(svg: string): boolean {
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)[^>]*?(\/?)>/g)) {
    const [, close, name, self] = m;
    if (self) continue;
    if (close) {
      if (stack.pop() !== name) return false;
    } else stack.push(name);
  }
  return stack.length === 0;
}
const clean = (svg: string) => wellFormed(svg) && svg.startsWith("<svg") && svg.endsWith("</svg>") && !/undefined|NaN|\[object/.test(svg);

describe("department looks", () => {
  it("covers every department in the credit data, and nothing else", () => {
    const names = depts.map((d) => d.dept);
    expect(names.filter((n) => !DEPT_LOOK[n])).toEqual([]);
    expect(Object.keys(DEPT_LOOK).filter((n) => !names.includes(n))).toEqual([]);
  });
  it("points every department at a look that exists", () => {
    for (const key of Object.values(DEPT_LOOK)) expect(LOOKS[key], key).toBeDefined();
  });
  it("treats exactly the 융합전공 college as new-look (fusion) departments", () => {
    for (const d of depts) expect(isFusionDept(d.dept), d.dept).toBe(d.college === "융합전공");
  });
});

describe("how different the characters are", () => {
  it("gives (almost) every department its own drawing; only the two 환경 and two 식물/스마트팜 pairs share one", () => {
    const drawings = new Set(depts.map((d) => avatarSvg(d.dept)));
    expect(drawings.size).toBe(depts.length - 2);
  });
  it("makes the eight language departments clearly different, each with its own greeting", () => {
    const langs = ["프랑스어학과", "스페인어학과", "러시아어학과", "중국어학과", "일본어학과", "한국어학과", "영미어문전공", "영미문화전공"];
    expect(new Set(langs.map((d) => avatarSvg(d))).size).toBe(8);
    const greetings = ["Bonjour", "¡Hola!", "Привет", "你好", "こんにちは", "안녕!", "Hello", "Hi!"];
    langs.forEach((d, i) => expect(avatarSvg(d)).toContain(`>${greetings[i]}</text>`));
  });
  it("keeps the 체육학과 about sports in general, not soccer", () => {
    const pe = avatarSvg("체육학과");
    expect(pe).toContain("#f08c00"); // basketball
    expect(pe).not.toContain('d="M116 874 L142 892'); // the old soccer-ball pentagon
  });
});

describe("avatarSvg", () => {
  it("draws every department alone as clean SVG, both crops", () => {
    for (const d of depts) {
      expect(clean(avatarSvg(d.dept, null, "full")), d.dept).toBe(true);
      expect(clean(avatarSvg(d.dept, null, "head")), d.dept).toBe(true);
    }
  });
  it("draws every department as 본전공 with a double, a minor and a micro-degree goal", () => {
    const second = depts.find((d) => d.dept === "응용수학과")!.dept;
    for (const d of depts) {
      const goals: GoalLike[] = [
        { mode: "double", second, secondName: second },
        { mode: "minor", second, secondName: second },
        { mode: "microdegree", second: "x", secondName: "빅데이터 분석" },
      ];
      for (const g of goals) expect(clean(avatarSvg(d.dept, g)), `${d.dept} ${g.mode}`).toBe(true);
    }
  });
  it("draws every pair of departments mixed (double and minor)", () => {
    const names = depts.map((d) => d.dept);
    for (const a of names) {
      for (const b of names) {
        if (a === b) continue;
        for (const mode of ["double", "minor"] as const) expect(clean(avatarSvg(a, { mode, second: b, secondName: b })), `${a}+${b} ${mode}`).toBe(true);
      }
    }
  }, 60000);
  it("draws every micro-degree, and keeps markup in a name out of the SVG", () => {
    for (const name of mds) expect(clean(avatarSvg("컴퓨터공학과", { mode: "microdegree", second: "1", secondName: name })), name).toBe(true);
    const evil = avatarSvg("컴퓨터공학과", { mode: "microdegree", second: "1", secondName: '<script>alert(1)</script>' });
    expect(evil).not.toContain("<script>");
    expect(clean(evil)).toBe(true);
  });
  it("falls back to the plain mascot for no department or an unknown one", () => {
    expect(clean(avatarSvg(null))).toBe(true);
    expect(avatarSvg("없는학과")).toBe(avatarSvg(null));
  });
  it("blends a double major from both looks, but a minor mostly from the 본전공", () => {
    const g = (mode: "double" | "minor"): GoalLike => ({ mode, second: "체육학과", secondName: "체육학과" });
    const cs = avatarSvg("컴퓨터공학과");
    const pe = avatarSvg("체육학과");
    const double = avatarSvg("컴퓨터공학과", g("double"));
    const minor = avatarSvg("컴퓨터공학과", g("minor"));
    expect(double).not.toBe(cs);
    expect(double).not.toBe(pe);
    expect(minor).not.toBe(cs);
    // the minor keeps the 본전공's laptop front; the double does too, plus the 부전공 prop floating
    expect(minor.split("scale(0.52)").length).toBe(2);
    expect(double.split("scale(0.78)").length).toBe(2);
  });
  it("gives a 융합전공 student a new look no matter the goal, and a fusion second major too", () => {
    const a = avatarSvg("우주인공지능");
    expect(avatarSvg("우주인공지능", { mode: "double", second: "응용수학과", secondName: "응용수학과" })).toBe(a);
    expect(avatarSvg("컴퓨터공학과", { mode: "double", second: "우주인공지능", secondName: "우주인공지능" })).toBe(a);
  });
  it("makes a data URI that decodes back to the SVG", () => {
    const uri = avatarUri("건축학과", null, "head");
    expect(uri.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(uri.split(",").slice(1).join(","))).toBe(avatarSvg("건축학과", null, "head"));
  });
});
