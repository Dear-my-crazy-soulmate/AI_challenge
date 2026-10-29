import { describe, expect, it } from "vitest";

import courses from "../data/curated/2026/courses.json";
import general from "../data/curated/quiz_general.json";
import type { QuizQuestion } from "../src/lib/quiz";

const LETTERS = "①②③④";
const depts = (general as unknown as { depts: Record<string, QuizQuestion[]> }).depts;
const catalog = (courses as { depts: Record<string, { catalog: { code: string; name: string }[] }> }).depts;

describe("일반 상식 questions", () => {
  for (const [dept, qs] of Object.entries(depts)) {
    it(`${dept}: answers match the explanation and courses are real`, () => {
      expect(qs.length).toBeGreaterThanOrEqual(5);
      for (const q of qs) {
        expect(q.options).toHaveLength(4);
        expect(q.explanation.startsWith(`정답 ${LETTERS[q.answer]}`)).toBe(true);
        // the 🎓 line names a course of this department in the 2026 book, by name and code
        const m = /「(.+?)」\((.+?)\)/.exec(q.flow ?? "");
        expect(m).not.toBeNull();
        expect(catalog[dept].catalog.some((c) => c.name === m![1] && c.code === m![2])).toBe(true);
      }
    });
  }
});
