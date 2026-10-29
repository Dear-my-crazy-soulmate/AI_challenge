import { describe, expect, it } from "vitest";

import { buildComment } from "../../src/lib/community/compose";
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
  it.each([
    "교수 완전 쓰레기네요", "이 학과 애들 다 찌질함", "ㅅㅂ 진짜", "ㅂ ㅅ", "시.발 뭐야", "시1발", "씨 팔", "18놈이", "존나 별로", "fuck this",
    "한남충 같은", "교수가 무능한 사람이에요", "개소리 하지 마",
  ])("blocks the insult in %j", (t) => {
    expect(checkPostText(t, 100)).toMatchObject({ ok: false, message: expect.stringContaining("욕설") });
  });
  it.each([
    "시발점이 어디예요", "수업 시 발표가 있어요", "전염병 관련 수업", "3개년 계획", "5조까지 제출", "시바견 키워요", "쓰레기 분리수거 실습",
    "닥쳐올 취업난", "불이 꺼져 있어요", "새끼 고양이", "시험 때 힘들었지만 좋았어요",
  ])("allows ordinary text %j", (t) => {
    expect(checkPostText(t, 100).ok).toBe(true);
  });
  it("keeps insults out of comments", () => {
    const r = buildComment("p1", "교수 쓰레기", { primary: "컴퓨터공학과", grade: 2 }, "c1", new Date());
    expect(r.ok).toBe(false);
  });
  it("enforces the length limit with the field name", () => {
    const r = checkPostText("가".repeat(11), 10, "제목");
    expect(r).toEqual({ ok: false, message: "제목은(는) 10자 이하로 적어 주세요." });
  });
});
