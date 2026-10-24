import { describe, expect, it } from "vitest";

import { checkPostText } from "../../src/lib/safety/content";

describe("checkPostText", () => {
  it("trims and accepts ordinary text", () => {
    expect(checkPostText("  2학년 때 시작했어요 ", 100)).toEqual({ ok: true, value: "2학년 때 시작했어요" });
  });
  it("allows short numbers like credits and years", () => {
    expect(checkPostText("전공 51학점, 2026학년도 기준, 3과목 9학점", 100).ok).toBe(true);
  });
  it.each(["010-1234-5678", "연락은 01012345678로", "031 123 4567", "02-123-4567"])("blocks the phone number in %j", (t) => {
    expect(checkPostText(t, 100).ok).toBe(false);
  });
  it("blocks an email address", () => {
    expect(checkPostText("메일은 han@example.com", 100)).toMatchObject({ ok: false });
  });
  it("blocks a 10-digit student ID but not a 9- or 11-digit number", () => {
    expect(checkPostText("제 학번은 2026100123", 100).ok).toBe(false);
    expect(checkPostText("202610012", 100).ok).toBe(true);
    expect(checkPostText("20261001234", 100).ok).toBe(true);
  });
  it("blocks a resident registration number", () => {
    expect(checkPostText("990101-1234567", 100).ok).toBe(false);
  });
  it("blocks insults even when letters are spaced out", () => {
    expect(checkPostText("이런 병신 같은", 100).ok).toBe(false);
    expect(checkPostText("시 발", 100).ok).toBe(false);
  });
  it("enforces the length limit with the field name", () => {
    const r = checkPostText("가".repeat(11), 10, "제목");
    expect(r).toEqual({ ok: false, message: "제목은(는) 10자 이하로 적어 주세요." });
  });
});
