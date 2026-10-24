import { describe, expect, it } from "vitest";

import seed from "../data/seed/community_sample.json";
import { checkPostText } from "../src/lib/safety/content";
import { buildComment, buildPost } from "../src/lib/community/compose";
import type { PostDraft } from "../src/lib/community/compose";
import { isComment, isPost, mergeWithSeed, parseStored, withComment, withPost, withoutPost } from "../src/lib/community/local";
import { badgeParts, filterPosts, NO_FILTERS, summarizeReviews } from "../src/lib/community/query";
import type { Comment, Post } from "../src/lib/community/types";

const author = { primary: "컴퓨터공학과", grade: 2 as const };
const combo = { mode: "double" as const, second: "인공지능학과", secondName: "인공지능학과" };
const now = new Date("2026-10-24T09:00:00Z");

const draft = (over: Partial<PostDraft> = {}): PostDraft => ({
  type: "review",
  title: "다전공 1년 해 본 후기",
  body: "",
  stage: "doing",
  combo,
  review: { startedGrade: 1, startedTerm: 2, load: 3, pros: "관심 분야를 깊게 배워요", cons: "시간표가 빠듯해요", forWhom: "수학을 좋아하는 사람" },
  ...over,
});

const post = (id: string, over: Partial<Post> = {}): Post => ({
  id,
  type: "review",
  title: "t",
  body: "",
  badge: { ...author, stage: "doing", combo },
  review: { startedGrade: 1, startedTerm: 1, load: 2, pros: "a", cons: "b", forWhom: "" },
  createdAt: "2026-10-01T00:00:00Z",
  is_sample: false,
  ...over,
});

describe("the sample file", () => {
  const posts = seed.posts as unknown[];
  const comments = seed.comments as unknown[];
  it("only holds valid posts and comments, all flagged is_sample", () => {
    expect(posts.every(isPost)).toBe(true);
    expect(comments.every(isComment)).toBe(true);
    for (const x of [...posts, ...comments] as { is_sample: boolean }[]) expect(x.is_sample).toBe(true);
  });
  it("passes the same safety check as anything a student writes", () => {
    for (const p of posts as Post[]) {
      for (const t of [p.title, p.body, p.review?.pros ?? "", p.review?.cons ?? "", p.review?.forWhom ?? ""]) {
        expect(checkPostText(t, 2000).ok).toBe(true);
      }
    }
  });
  it("has unique ids and comments that point at real posts", () => {
    const ids = (posts as Post[]).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of comments as Comment[]) expect(ids).toContain(c.postId);
  });
});

describe("buildPost", () => {
  it("builds a review with its fixed fields and an anonymous badge", () => {
    const r = buildPost(draft(), author, "p1", now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.badge).toEqual({ primary: "컴퓨터공학과", grade: 2, stage: "doing", combo });
      expect(r.value.review?.load).toBe(3);
      expect(r.value.is_sample).toBe(false);
      expect(JSON.stringify(r.value)).not.toMatch(/name|studentId/);
    }
  });
  it("needs a title, a combination, pros and cons for a review", () => {
    expect(buildPost(draft({ title: " " }), author, "p", now).ok).toBe(false);
    expect(buildPost(draft({ combo: null }), author, "p", now).ok).toBe(false);
    expect(buildPost(draft({ review: { ...draft().review, pros: "" } }), author, "p", now).ok).toBe(false);
    expect(buildPost(draft({ review: { ...draft().review, cons: "" } }), author, "p", now).ok).toBe(false);
  });
  it("does not accept a review from someone who is only thinking about it", () => {
    expect(buildPost(draft({ stage: "thinking" }), author, "p", now).ok).toBe(false);
  });
  it("lets a question skip the combination but needs a body", () => {
    expect(buildPost(draft({ type: "question", combo: null, stage: "thinking", body: "부전공과 뭐가 달라요?" }), author, "p", now).ok).toBe(true);
    expect(buildPost(draft({ type: "question", combo: null, stage: "thinking", body: "" }), author, "p", now).ok).toBe(false);
  });
  it("rejects personal data in any field", () => {
    expect(buildPost(draft({ title: "문의 010-1234-5678" }), author, "p", now).ok).toBe(false);
    expect(buildPost(draft({ review: { ...draft().review, cons: "제 학번 2026100123" } }), author, "p", now).ok).toBe(false);
  });
});

describe("buildComment", () => {
  it("has no stage and rejects empty or unsafe text", () => {
    const ok = buildComment("p1", "저도 궁금해요", author, null, "c1", now);
    expect(ok.ok && ok.value.badge.stage).toBeNull();
    expect(buildComment("p1", "  ", author, null, "c", now).ok).toBe(false);
    expect(buildComment("p1", "han@example.com", author, null, "c", now).ok).toBe(false);
  });
});

describe("storage helpers", () => {
  it("keeps valid entries and drops broken ones", () => {
    const raw = JSON.stringify({ posts: [post("a"), { id: "x" }], comments: [{ nope: 1 }] });
    expect(parseStored(raw).posts.map((p) => p.id)).toEqual(["a"]);
    expect(parseStored(raw).comments).toEqual([]);
    expect(parseStored("not json")).toEqual({ posts: [], comments: [] });
    expect(parseStored(null)).toEqual({ posts: [], comments: [] });
  });
  it("marks what you write as yours, and removing a post removes its comments", () => {
    const c: Comment = { id: "c1", postId: "a", body: "hi", badge: { ...author, stage: null, combo: null }, createdAt: "2026-10-02T00:00:00Z", is_sample: false };
    let s = withComment(withPost({ posts: [], comments: [] }, post("a")), c);
    expect(s.posts[0].mine).toBe(true);
    expect(s.comments[0].mine).toBe(true);
    s = withoutPost(s, "a");
    expect(s).toEqual({ posts: [], comments: [] });
  });
  it("puts samples next to your own posts without changing either", () => {
    const merged = mergeWithSeed({ posts: [post("s", { is_sample: true })], comments: [] }, { posts: [post("m", { mine: true })], comments: [] });
    expect(merged.posts.map((p) => p.id).sort()).toEqual(["m", "s"]);
  });
});

describe("filterPosts", () => {
  const list = [
    post("old", { createdAt: "2026-09-01T00:00:00Z", title: "이진 탐색 후기" }),
    post("q", { type: "question", review: undefined, createdAt: "2026-10-05T00:00:00Z", badge: { ...author, stage: "thinking", combo: { mode: "minor", second: "응용수학과", secondName: "응용수학과" } } }),
    post("new", { createdAt: "2026-10-10T00:00:00Z", mine: true }),
  ];
  it("sorts newest first", () => expect(filterPosts(list, NO_FILTERS).map((p) => p.id)).toEqual(["new", "q", "old"]));
  it("filters by type and by 이수 형태", () => {
    expect(filterPosts(list, { ...NO_FILTERS, type: "question" }).map((p) => p.id)).toEqual(["q"]);
    expect(filterPosts(list, { ...NO_FILTERS, form: "double" }).map((p) => p.id)).toEqual(["new", "old"]);
  });
  it("searches title and combination names, ignoring spaces", () => {
    expect(filterPosts(list, { ...NO_FILTERS, text: "이진 탐색" }).map((p) => p.id)).toEqual(["old"]);
    expect(filterPosts(list, { ...NO_FILTERS, text: "응용 수학" }).map((p) => p.id)).toEqual(["q"]);
  });
  it("filters by interests and by mine", () => {
    expect(filterPosts(list, { ...NO_FILTERS, interests: ["응용수학과"] }).map((p) => p.id)).toEqual(["q"]);
    expect(filterPosts(list, { ...NO_FILTERS, interests: [] })).toEqual([]);
    expect(filterPosts(list, { ...NO_FILTERS, mineOnly: true }).map((p) => p.id)).toEqual(["new"]);
  });
});

describe("summarizeReviews / badgeParts", () => {
  it("is null without reviews", () => expect(summarizeReviews([])).toBeNull());
  it("averages 학업 부담 and counts stages from reviews only", () => {
    const rs = [
      post("1", { review: { ...post("x").review!, load: 4 } }),
      post("2", { review: { ...post("x").review!, load: 3 }, badge: { ...author, stage: "done", combo } }),
      post("3", { type: "question", review: undefined }),
    ];
    expect(summarizeReviews(rs)).toEqual({ count: 2, avgLoad: 3.5, loadLabel: "매우 힘듦", doing: 1, done: 1 });
  });
  it("describes who wrote it without a name", () => {
    expect(badgeParts(post("1").badge)).toEqual({ who: "컴퓨터공학과 2학년", stage: "이수 중", combo: "다전공 · 인공지능학과" });
    expect(badgeParts({ ...author, stage: null, combo: null })).toEqual({ who: "컴퓨터공학과 2학년", stage: null, combo: null });
    expect(badgeParts({ ...author, stage: null, combo }).combo).toBe("목표 · 다전공 · 인공지능학과");
  });
});
