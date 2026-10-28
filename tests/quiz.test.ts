import { describe, expect, it } from "vitest";

import sample from "../data/seed/quiz_sample.json";
import { feedbackFor, isCorrect, isShowable, pickQuestions, QUESTIONS_PER_ROUND, reportTitle, scoreOf, showableMajors } from "../src/lib/quiz";
import type { QuizQuestion, QuizSet } from "../src/lib/quiz";
import { parseBest, reaction, recordBest } from "../src/lib/quizProgress";

const set = sample as unknown as QuizSet;
const q = (over: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id: "t",
  skill: "개념",
  question: "?",
  options: ["a", "b", "c"],
  answer: 1,
  explanation: "",
  status: "draft",
  is_sample: false,
  ...over,
});

describe("isShowable", () => {
  it("shows approved questions", () => expect(isShowable(q({ status: "approved" }))).toBe(true));
  it("hides draft and verified questions that are not samples", () => {
    expect(isShowable(q({ status: "draft" }))).toBe(false);
    expect(isShowable(q({ status: "verified" }))).toBe(false);
  });
  it("shows samples, which the screen labels 예시 데이터", () => expect(isShowable(q({ is_sample: true }))).toBe(true));
});

describe("showableMajors", () => {
  it("drops hidden questions, and majors left with none", () => {
    const s: QuizSet = {
      ...set,
      majors: [
        { major: "A", college: "c", questions: [q({ id: "1", status: "approved" }), q({ id: "2" })] },
        { major: "B", college: "c", questions: [q({ id: "3" })] },
      ],
    };
    expect(showableMajors(s).map((m) => [m.major, m.questions.map((x) => x.id)])).toEqual([["A", ["1"]]]);
  });
});

describe("the sample file", () => {
  it("has 4 majors with 3 questions each, all flagged is_sample", () => {
    expect(set.majors).toHaveLength(4);
    for (const m of set.majors) {
      expect(m.questions).toHaveLength(3);
      for (const x of m.questions) expect(x.is_sample).toBe(true);
    }
  });
  it("has a valid answer index and unique ids everywhere", () => {
    const all = set.majors.flatMap((m) => m.questions);
    for (const x of all) {
      expect(Number.isInteger(x.answer)).toBe(true);
      expect(x.answer).toBeGreaterThanOrEqual(0);
      expect(x.answer).toBeLessThan(x.options.length);
    }
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
  });
});

describe("grading", () => {
  const qs = [q({ answer: 0 }), q({ answer: 2 }), q({ answer: 1 })];
  it("compares the picked index with the answer", () => {
    expect(isCorrect(qs[0], 0)).toBe(true);
    expect(isCorrect(qs[0], 1)).toBe(false);
    expect(isCorrect(qs[0], undefined)).toBe(false);
  });
  it("counts correct picks", () => {
    expect(scoreOf(qs, [0, 2, 1])).toBe(3);
    expect(scoreOf(qs, [0, 0, 0])).toBe(1);
    expect(scoreOf(qs, [])).toBe(0);
  });
  it("matches the CS sample: the python snippet prints 6", () => {
    const cs3 = set.majors.find((m) => m.major === "컴퓨터공학과")!.questions[2];
    expect(cs3.options[cs3.answer]).toBe("6");
  });
});

describe("reportTitle / feedbackFor", () => {
  it("picks a title by how many were right", () => {
    expect(reportTitle(3, 3)).toBe("모든 문제를 맞혔어요!");
    expect(reportTitle(2, 3)).toBe("감을 잘 잡고 있어요");
    expect(reportTitle(1, 3)).toBe("조금 더 알아볼 가치가 있어요");
    expect(reportTitle(0, 3)).toBe("새로운 분야를 경험했어요");
  });
  it("names the skills that were missed, and never claims a fit", () => {
    const qs = [q({ answer: 0, skill: "논증" }), q({ answer: 0, skill: "철학사" })];
    const text = feedbackFor("철학과", qs, [0, 1]);
    expect(text).toContain("철학사");
    expect(text).not.toContain("논증 문제처럼");
    expect(text).not.toMatch(/적합|추천/);
  });
});

describe("quiz progress (stars and 쿠옹이's reactions)", () => {
  it("keeps the best score per major, and an equal score keeps the old record", () => {
    let b = recordBest({}, "철학과", 1, 3);
    b = recordBest(b, "철학과", 3, 3);
    expect(b["철학과"]).toEqual({ score: 3, n: 3 });
    expect(recordBest(b, "철학과", 2, 3)).toBe(b);
  });
  it("reads saved records and drops broken ones", () => {
    expect(parseBest(JSON.stringify({ a: { score: 2, n: 3 }, b: { score: 5, n: 3 }, c: 1 }))).toEqual({ a: { score: 2, n: 3 } });
    expect(parseBest("not json")).toEqual({});
    expect(parseBest(null)).toEqual({});
    expect(parseBest("[1]")).toEqual({});
  });
  it("cheers on a streak and comforts on a miss", () => {
    expect(reaction(true, 1)).toBe("정답! 잘했어요");
    expect(reaction(true, 2)).toContain("2연속");
    expect(reaction(true, 3)).toContain("3연속");
    expect(reaction(false, 0)).toContain("괜찮아요");
  });
});

describe("one round = 5 random questions from the department's pool", () => {
  const pool = Array.from({ length: 12 }, (_, i) => q({ id: `q${i}`, status: "approved" }));
  const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

  it("draws 5 different questions and leaves the pool alone", () => {
    const before = pool.map((x) => x.id);
    const got = pickQuestions(pool, QUESTIONS_PER_ROUND, seeded(1));
    expect(got).toHaveLength(5);
    expect(new Set(got.map((x) => x.id)).size).toBe(5);
    expect(pool.map((x) => x.id)).toEqual(before);
  });
  it("gives a different draw next time, and the same draw for the same seed", () => {
    const a = pickQuestions(pool, 5, seeded(1)).map((x) => x.id);
    expect(pickQuestions(pool, 5, seeded(1)).map((x) => x.id)).toEqual(a);
    const draws = new Set(Array.from({ length: 20 }, (_, i) => pickQuestions(pool, 5, seeded(i + 2)).map((x) => x.id).join()));
    expect(draws.size).toBeGreaterThan(10);
  });
  it("uses the whole pool when it has fewer than 5, and never repeats an id", () => {
    expect(pickQuestions(pool.slice(0, 3))).toHaveLength(3);
    expect(pickQuestions([pool[0], pool[0], pool[1]])).toHaveLength(2);
    expect(pickQuestions([])).toEqual([]);
  });
  it("shows unapproved questions only in preview", () => {
    const draft = q({ status: "verified", is_sample: false });
    expect(isShowable(draft)).toBe(false);
    expect(isShowable(draft, true)).toBe(true);
    expect(isShowable(q({ status: "approved" }))).toBe(true);
  });
});
