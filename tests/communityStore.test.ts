import { describe, expect, it } from "vitest";

import { fromServer } from "../src/lib/community/store";
import { parseTaken } from "../src/lib/taken/store";

const postRow = {
  id: "p-abc123",
  type: "info",
  dept: "컴퓨터공학과",
  category: "curriculum",
  title: "1학년 때 들으면 좋은 과목",
  body: "자료구조를 일찍 들으세요.",
  fields: { tip: "x" },
  badge: { primary: "컴퓨터공학과", grade: 2, relation: "major" },
  created_at: "2026-10-28T01:00:00Z",
  mine: true,
};

describe("community rows from the server", () => {
  it("become posts and comments the screens already understand", () => {
    const s = fromServer(
      [postRow, { ...postRow, id: "p-other", mine: false }],
      [{ id: "c-1", post_id: "p-abc123", body: "좋아요", badge: { primary: "체육학과", grade: 1 }, created_at: "2026-10-28T02:00:00Z", mine: null }],
    );
    expect(s.posts).toHaveLength(2);
    expect(s.posts[0]).toMatchObject({ id: "p-abc123", createdAt: "2026-10-28T01:00:00Z", is_sample: false, mine: true });
    expect(s.posts[1].mine).toBeUndefined();
    expect(s.comments[0]).toMatchObject({ postId: "p-abc123", is_sample: false });
    expect(s.comments[0].mine).toBeUndefined();
  });

  it("drops malformed rows instead of breaking the screen", () => {
    const s = fromServer([{ ...postRow, type: "spam" }, { ...postRow, category: null }], []);
    expect(s.posts).toHaveLength(0); // unknown type; and 학과 정보 needs a category
  });

  it("never carries an author id", () => {
    const s = fromServer([{ ...postRow, author_id: "u-1" } as typeof postRow], []);
    expect(JSON.stringify(s)).not.toContain("u-1");
  });
});

describe("taken course list", () => {
  it("parses only strings", () => {
    expect(parseTaken('["CSE204", 3, null, "AI3004"]')).toEqual(["CSE204", "AI3004"]);
    expect(parseTaken("not json")).toEqual([]);
    expect(parseTaken("")).toEqual([]);
  });
});
