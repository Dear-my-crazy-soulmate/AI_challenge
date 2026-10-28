import { describe, expect, it } from "vitest";

import credits from "../data/curated/credits_global.json";
import seed from "../data/seed/community_sample.json";
import { buildComment, buildPost } from "../src/lib/community/compose";
import type { PostDraft } from "../src/lib/community/compose";
import { isComment, isPost, mergeWithSeed, parseStored, sampleComments, withComment, withPost, withoutPost } from "../src/lib/community/local";
import { highlights, newestFirst, statsByDept, tally } from "../src/lib/community/query";
import { CATEGORIES } from "../src/lib/community/schema";
import { CATEGORY_IDS } from "../src/lib/community/types";
import type { Comment, Post } from "../src/lib/community/types";
import { checkPostText } from "../src/lib/safety/content";

const DEPTS = (credits as { dept: string }[]).map((d) => d.dept);
const author = { primary: "컴퓨터공학과", grade: 2 as const };
const now = new Date("2026-10-27T09:00:00Z");

const draft = (over: Partial<PostDraft> = {}): PostDraft => ({
  type: "info",
  dept: "컴퓨터공학과",
  category: "curriculum",
  relation: "major",
  title: "1학년 수업 정리",
  body: "",
  values: { courses: "자료구조, 알고리즘", style: ["실습 중심"], load: 3, tip: "과제가 많아요" },
  ...over,
});

const post = (id: string, over: Partial<Post> = {}): Post => ({
  id,
  type: "info",
  dept: "컴퓨터공학과",
  category: "curriculum",
  title: "t",
  body: "",
  fields: { courses: "자료구조", load: 3 },
  badge: { ...author, relation: "major" },
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
  it("is about real departments, and every 학과 정보 post fills the required fields of its category", () => {
    for (const p of posts as Post[]) {
      expect(DEPTS, p.id).toContain(p.dept);
      if (p.type !== "info" || !p.category) continue;
      for (const f of CATEGORIES[p.category].fields.filter((x) => x.required)) expect(p.fields[f.key], `${p.id}.${f.key}`).toBeDefined();
    }
  });
  it("passes the same safety check as anything a student writes", () => {
    for (const p of posts as Post[]) {
      const texts = [p.title, p.body, ...Object.values(p.fields).flatMap((v) => (Array.isArray(v) ? v : typeof v === "string" ? [v] : []))];
      for (const t of texts) expect(checkPostText(t, 2000).ok, `${p.id}: ${t}`).toBe(true);
    }
  });
  it("has unique ids and comments that point at real posts", () => {
    const ids = (posts as Post[]).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of comments as Comment[]) expect(ids).toContain(c.postId);
  });
});

describe("buildPost", () => {
  it("builds a 학과 정보 post with an anonymous badge and only the schema's fields", () => {
    const r = buildPost(draft({ values: { ...draft().values, stray: "x" } }), author, DEPTS, "p1", now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.badge).toEqual({ primary: "컴퓨터공학과", grade: 2, relation: "major" });
      expect(Object.keys(r.value.fields).sort()).toEqual(["courses", "load", "style", "tip"]);
      expect(JSON.stringify(r.value)).not.toMatch(/studentId|name"/);
    }
  });
  it("needs a known department, a category and the required fields", () => {
    expect(buildPost(draft({ dept: "없는학과" }), author, DEPTS, "p", now).ok).toBe(false);
    expect(buildPost(draft({ category: null }), author, DEPTS, "p", now).ok).toBe(false);
    expect(buildPost(draft({ values: { load: 3 } }), author, DEPTS, "p", now).ok).toBe(false); // no courses
    expect(buildPost(draft({ values: { courses: "자료구조" } }), author, DEPTS, "p", now).ok).toBe(false); // no 학업 부담
    expect(buildPost(draft({ title: " " }), author, DEPTS, "p", now).ok).toBe(false);
  });
  it("only accepts values the form could have offered", () => {
    expect(buildPost(draft({ values: { ...draft().values, load: 7 } }), author, DEPTS, "p", now).ok).toBe(false);
    expect(buildPost(draft({ values: { ...draft().values, style: ["없는 방식"] } }), author, DEPTS, "p", now).ok).toBe(false);
    const club = draft({ category: "clubs", values: { name: "스터디", kind: "아무거나", activity: "모여서 공부해요" } });
    expect(buildPost(club, author, DEPTS, "p", now).ok).toBe(false);
    const multi = draft({ category: "multimajor", values: { partner: "없는학과", form: "다전공", load: 2 } });
    expect(buildPost(multi, author, DEPTS, "p", now).ok).toBe(false);
  });
  it("lets only someone who studied the department write 학과 정보, but anyone ask", () => {
    expect(buildPost(draft({ relation: "curious" }), author, DEPTS, "p", now).ok).toBe(false);
    expect(buildPost(draft({ relation: "alumni" }), author, DEPTS, "p", now).ok).toBe(true);
    const q = draft({ type: "question", category: null, relation: "curious", body: "처음 해도 따라갈 수 있나요?", values: {} });
    expect(buildPost(q, author, DEPTS, "p", now).ok).toBe(true);
    expect(buildPost({ ...q, body: "" }, author, DEPTS, "p", now).ok).toBe(false);
  });
  it("rejects personal data in any text", () => {
    expect(buildPost(draft({ title: "문의 010-1234-5678" }), author, DEPTS, "p", now).ok).toBe(false);
    expect(buildPost(draft({ values: { ...draft().values, tip: "제 학번 2026100123" } }), author, DEPTS, "p", now).ok).toBe(false);
    expect(buildPost(draft({ values: { ...draft().values, courses: "han@example.com" } }), author, DEPTS, "p", now).ok).toBe(false);
  });
});

describe("buildComment", () => {
  it("keeps only 본전공 and 학년, and rejects empty or unsafe text", () => {
    const ok = buildComment("p1", "저도 궁금해요", author, "c1", now);
    expect(ok.ok && ok.value.badge).toEqual({ primary: "컴퓨터공학과", grade: 2 });
    expect(buildComment("p1", "  ", author, "c", now).ok).toBe(false);
    expect(buildComment("p1", "han@example.com", author, "c", now).ok).toBe(false);
  });
});

describe("storage helpers", () => {
  it("keeps valid entries and drops broken ones (including the old multi-major reviews)", () => {
    const old = { id: "r", type: "review", title: "t", body: "", badge: { primary: "x", grade: 1, stage: "doing", combo: null }, createdAt: "2026-10-01T00:00:00Z" };
    const raw = JSON.stringify({ posts: [post("a"), { id: "x" }, old], comments: [{ nope: 1 }] });
    expect(parseStored(raw).posts.map((p) => p.id)).toEqual(["a"]);
    expect(parseStored(raw).comments).toEqual([]);
    expect(parseStored("not json")).toEqual({ posts: [], comments: [] });
    expect(parseStored(null)).toEqual({ posts: [], comments: [] });
  });
  it("marks what you write as yours, and removing a post removes its comments", () => {
    const c: Comment = { id: "c1", postId: "a", body: "hi", badge: author, createdAt: "2026-10-02T00:00:00Z", is_sample: false };
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

describe("counting and summarizing by department", () => {
  const posts = [
    post("a", { fields: { courses: "자료구조, 알고리즘", style: ["실습 중심", "팀 프로젝트"], load: 4 }, createdAt: "2026-10-03T00:00:00Z" }),
    post("b", { fields: { courses: "자료구조, 운영체제", style: ["실습 중심"], load: 2 }, createdAt: "2026-10-05T00:00:00Z", badge: { ...author, relation: "alumni" } }),
    post("c", { category: "culture", fields: { vibe: ["활발한", "협력적"], events: "개강 총회" }, createdAt: "2026-10-04T00:00:00Z" }),
    post("d", { category: "clubs", fields: { name: "알고리즘 스터디", kind: "학회·스터디", activity: "문제 풀이" }, createdAt: "2026-10-06T00:00:00Z" }),
    post("e", { category: "career", fields: { paths: "개발자", fields: ["대기업"], grad: "대부분 취업해요" } }),
    post("q", { type: "question", category: null, fields: {}, badge: { ...author, relation: "curious" }, createdAt: "2026-10-07T00:00:00Z" }),
    post("o", { dept: "체육학과", fields: { courses: "스포츠심리학", load: 1 } }),
  ];

  it("counts info, questions, categories and posts by people who studied it, per department", () => {
    const s = statsByDept(posts).get("컴퓨터공학과")!;
    expect(s).toMatchObject({ info: 5, questions: 1, total: 6, fromStudents: 4 });
    expect(s.byCategory).toEqual({ curriculum: 2, culture: 1, clubs: 1, career: 1, multimajor: 0 });
    expect(statsByDept(posts).get("체육학과")?.total).toBe(1);
  });
  it("summarizes 배우는 내용·수업 from the posts: common courses, average load, class style", () => {
    const lines = highlights("curriculum", posts.filter((p) => p.dept === "컴퓨터공학과"));
    expect(lines.find((l) => l.label === "대표 과목")?.value).toBe("자료구조, 알고리즘, 운영체제");
    expect(lines.find((l) => l.label === "학업 부담")?.value).toBe("평균 3.0/4 (빠듯함) · 2명");
    expect(lines.find((l) => l.label === "수업 방식")?.value).toBe("실습 중심 2 · 팀 프로젝트");
  });
  it("summarizes the other categories", () => {
    const mine = posts.filter((p) => p.dept === "컴퓨터공학과");
    expect(highlights("culture", mine)[0]).toEqual({ label: "분위기", value: "협력적 · 활발한" });
    expect(highlights("clubs", mine)[0].value).toBe("알고리즘 스터디(학회·스터디)");
    expect(highlights("career", mine).map((l) => l.label)).toEqual(["졸업 후 진로", "취업 분야", "대학원"]);
  });
  it("gives nothing for a category nobody wrote about, and ignores questions", () => {
    expect(highlights("multimajor", posts)).toEqual([]);
    expect(highlights("curriculum", [post("q2", { type: "question", category: "curriculum", fields: {} })])).toEqual([]);
  });
  it("tallies most common first and sorts posts newest first", () => {
    expect(tally(["b", "a", "b", "", "c", "a", "b"])).toEqual([["b", 3], ["a", 2], ["c", 1]]);
    expect(newestFirst(posts).map((p) => p.id).slice(0, 3)).toEqual(["q", "d", "b"]);
  });
  it("covers every category with at least one field that is required", () => {
    for (const c of CATEGORY_IDS) expect(CATEGORIES[c].fields.some((f) => f.required), c).toBe(true);
  });
});

describe("sampleComments", () => {
  it("keeps only this device's comments on sample posts (the server does not have those posts)", () => {
    const at = "2026-10-29T00:00:00.000Z";
    const badge = { primary: "컴퓨터공학과", grade: 1 as const };
    const c = (id: string, postId: string): Comment => ({ id, postId, body: "좋아요", badge, createdAt: at, is_sample: false });
    const device = { posts: [], comments: [c("c1", "sample-cs-1"), c("c2", "real-post")] };
    expect(sampleComments(device, new Set(["sample-cs-1"])).map((x) => x.id)).toEqual(["c1"]);
  });
});
