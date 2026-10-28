import { describe, expect, it } from "vitest";

import { deptCatalog, lookupCourses, searchCourses } from "../src/lib/courseSearch";
import type { CourseQuery } from "../src/lib/courseSearch";
import type { CourseData } from "../src/lib/rules/courses";

const c = (code: string, name: string, credits: number, category: string) => ({ code, name, credits, category, page: 1 });
const data = {
  year: 2026,
  source_pdf: "x",
  as_of: "2026학년도 교육과정",
  depts: {
    컴퓨터공학과: { section: "s", college: null, catalog_pages: [1], programs: {}, catalog: [c("CSE101", "프로그래밍", 3, "전공기초"), c("CSE101", "프로그래밍", 3, "전공기초"), c("CSE201", "자료구조", 3, "전공필수"), c("MTH100", "이산수학", 3, "전공기초")] },
    응용수학과: { section: "s", college: null, catalog_pages: [1], programs: {}, catalog: [c("MTH100", "이산수학", 3, "전공기초"), c("MTH200", "해석학", 3, "전공선택")] },
  },
} as unknown as CourseData;

const base: CourseQuery = { primary: "컴퓨터공학과", second: "응용수학과", secondWord: "다전공", query: "" };

describe("searchCourses without a query", () => {
  it("lists the 본전공 then the 희망 전공, each course once", () => {
    const s = searchCourses(data, base);
    expect(s.map((x) => x.label)).toEqual(["내 본전공 · 컴퓨터공학과", "다전공 · 응용수학과"]);
    expect(s[0].rows.map((r) => r.code)).toEqual(["CSE101", "CSE201", "MTH100"]);
  });
  it("tags a course both majors list as 'both' for a double major", () => {
    const rows = searchCourses(data, base)[0].rows;
    expect(rows.find((r) => r.code === "MTH100")).toMatchObject({ tag: "both", label: "본전공 전공기초" });
    expect(rows.find((r) => r.code === "CSE201")).toMatchObject({ tag: "p", label: "본전공 전공필수" });
  });
  it("counts a shared course only for the 본전공 when it is a minor", () => {
    const s = searchCourses(data, { ...base, secondWord: "부전공" });
    expect(s[0].rows.find((r) => r.code === "MTH100")?.tag).toBe("p");
    expect(s[1].rows.find((r) => r.code === "MTH200")).toMatchObject({ tag: "s", label: "부전공 전공선택" });
  });
  it("skips sections for a missing or unknown department", () => {
    expect(searchCourses(data, { ...base, primary: "", second: "" })).toEqual([]);
    expect(searchCourses(data, { ...base, primary: "없는과", second: "" })).toEqual([]);
  });
});

describe("searchCourses with a query", () => {
  it("searches every department by name or code, ignoring spaces and case", () => {
    const s = searchCourses(data, { ...base, query: " 해석 " });
    expect(s).toHaveLength(1);
    expect(s[0].rows.map((r) => r.code)).toEqual(["MTH200"]);
    expect(searchCourses(data, { ...base, query: "cse2" })[0].rows[0].code).toBe("CSE201");
  });
  it("returns each code once and nothing when there is no match", () => {
    expect(searchCourses(data, { ...base, query: "이산" })[0].rows).toHaveLength(1);
    expect(searchCourses(data, { ...base, query: "zzz" })).toEqual([]);
  });
});

describe("deptCatalog (내 이수 과목)", () => {
  it("lists every course once, 전공기초 then 전공필수 then 전공선택", () => {
    const g = deptCatalog(data, "컴퓨터공학과");
    expect(g.map((x) => x.category)).toEqual(["전공기초", "전공필수"]);
    expect(g[0].courses.map((c) => c.code)).toEqual(["CSE101", "MTH100"]);
    expect(deptCatalog(data, "응용수학과").map((x) => x.category)).toEqual(["전공기초", "전공선택"]);
    expect(deptCatalog(data, "없는과")).toEqual([]);
  });
});

describe("lookupCourses", () => {
  it("names saved codes in their order and reports unknown ones", () => {
    expect(lookupCourses(data, ["MTH200", "CSE201", "ZZZ999"])).toEqual({
      courses: [
        { code: "MTH200", name: "해석학", credits: 3 },
        { code: "CSE201", name: "자료구조", credits: 3 },
      ],
      missing: ["ZZZ999"],
    });
  });
});
