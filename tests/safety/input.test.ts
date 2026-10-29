import { describe, expect, it } from "vitest";

import { checkEmail, checkName, checkPassword, checkProfile, checkStudentId, forLlm } from "../../src/lib/safety/input";

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

describe("checkName / checkStudentId", () => {
  it("trims and squeezes spaces in a name, allows empty", () => {
    expect(checkName("  김  경희 ")).toEqual({ ok: true, value: "김 경희" });
    expect(checkName("")).toEqual({ ok: true, value: "" });
  });
  it("rejects a name over 20 characters", () => {
    expect(checkName("가".repeat(21)).ok).toBe(false);
  });
  it("accepts an empty or 10-digit 학번 only", () => {
    expect(checkStudentId("")).toEqual({ ok: true, value: "" });
    expect(checkStudentId(" 2026100123 ")).toEqual({ ok: true, value: "2026100123" });
    for (const bad of ["12345", "202610012", "20261001234", "abcdefghij", "2026-10012"]) {
      expect(checkStudentId(bad).ok).toBe(false);
    }
  });
});

describe("checkProfile", () => {
  const ok = { primary: "컴퓨터공학과", interests: ["철학과"], topics: [] as string[], avatar: null, grade: 2 as const, name: "김경희", studentId: "2026100123" };

  it("accepts known departments", () => {
    expect(checkProfile(ok, DEPTS)).toEqual({ ok: true, value: ok });
  });
  it("rejects a grade outside 1-4, a bad 학번 and a too-long name", () => {
    expect(checkProfile({ ...ok, grade: 5 as never }, DEPTS).ok).toBe(false);
    expect(checkProfile({ ...ok, studentId: "12" }, DEPTS).ok).toBe(false);
    expect(checkProfile({ ...ok, name: "가".repeat(21) }, DEPTS).ok).toBe(false);
  });
  it("never lets name or 학번 reach an LLM", () => {
    const sent = JSON.stringify(forLlm(ok));
    expect(sent).not.toContain("김경희");
    expect(sent).not.toContain("2026100123");
    expect(forLlm(ok)).toEqual({ primary: "컴퓨터공학과", interests: ["철학과"], grade: 2 });
  });
  it("rejects an unknown primary, so free text cannot be saved as a department", () => {
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
