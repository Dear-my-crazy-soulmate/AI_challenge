import { describe, expect, it } from "vitest";

import { checkEmail, checkPassword, checkProfile } from "../../src/lib/safety/input";

const DEPTS = ["컴퓨터공학과", "소프트웨어융합학과", "철학과", "인공지능학과", "체육학과", "응용수학과"];

describe("checkEmail", () => {
  it("trims and lower-cases a valid email", () => {
    expect(checkEmail("  Han@Example.COM ")).toEqual({ ok: true, value: "han@example.com" });
  });
  it.each(["", "han", "han@", "han@example", "a b@example.com"])("rejects %j", (raw) => {
    expect(checkEmail(raw).ok).toBe(false);
  });
});

describe("checkPassword", () => {
  it("needs at least 8 characters", () => {
    expect(checkPassword("1234567").ok).toBe(false);
    expect(checkPassword("12345678").ok).toBe(true);
  });
  it("rejects very long passwords", () => {
    expect(checkPassword("a".repeat(73)).ok).toBe(false);
  });
});

describe("checkProfile", () => {
  const ok = { primary: "컴퓨터공학과", interests: ["철학과"], avatar: null };

  it("accepts known departments", () => {
    expect(checkProfile(ok, DEPTS)).toEqual({ ok: true, value: ok });
  });
  it("rejects an unknown primary, so free text (학번, 이름) cannot be stored", () => {
    expect(checkProfile({ ...ok, primary: "2026101234" }, DEPTS).ok).toBe(false);
    expect(checkProfile({ ...ok, primary: "" }, DEPTS).ok).toBe(false);
  });
  it("rejects an unknown interest or avatar", () => {
    expect(checkProfile({ ...ok, interests: ["010-1234-5678"] }, DEPTS).ok).toBe(false);
    expect(checkProfile({ ...ok, avatar: "홍길동" }, DEPTS).ok).toBe(false);
  });
  it("drops duplicates and the primary from interests", () => {
    const r = checkProfile({ ...ok, interests: ["철학과", "철학과", "컴퓨터공학과"] }, DEPTS);
    expect(r).toEqual({ ok: true, value: { ...ok, interests: ["철학과"] } });
  });
  it("allows at most 5 interests", () => {
    const many = ["소프트웨어융합학과", "철학과", "인공지능학과", "체육학과", "응용수학과", "컴퓨터공학과"];
    expect(checkProfile({ ...ok, primary: "컴퓨터공학과", interests: many.slice(0, 5) }, DEPTS).ok).toBe(true);
    expect(checkProfile({ ...ok, primary: "컴퓨터공학과", interests: [...many.slice(0, 5), "x"] }, DEPTS).ok).toBe(false);
  });
});
