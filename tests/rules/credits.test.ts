import { describe, expect, it } from "vitest";

import depts from "../../data/curated/credits_global.json";
import issues from "../../data/curated/credits_global_issues.json";
import { buildCreditPlan, listCreditOptions } from "../../src/lib/rules/credits";
import type { CreditData, CreditOk, CreditResult } from "../../src/lib/rules/credits";

const real = { depts, issues } as unknown as CreditData;

function ok(r: CreditResult): CreditOk {
  if (!r.available) throw new Error(`unavailable: ${r.reason} ${r.message}`);
  return r;
}
const reason = (r: CreditResult) => (r.available ? "available" : r.reason);

describe("컴퓨터공학과 (본전공)", () => {
  it("+ 소프트웨어융합학과 다전공: primary switches to double", () => {
    const r = ok(buildCreditPlan({ primary: "컴퓨터공학과", second: "소프트웨어융합학과", kind: "double" }, real));
    expect(r.primary).toMatchObject({ kind: "double", 기초: 9, 필수: 27, 선택: 15, 계: 51 });
    expect(r.second.계).toBe(51);
    expect(r.singleCredits).toBe(81);
    expect(r.totals).toEqual({ primaryCredits: 51, secondCredits: 51, total: 102, savedCredits: 30 });
  });

  it("+ 소프트웨어융합학과 부전공: primary stays single", () => {
    const r = ok(buildCreditPlan({ primary: "컴퓨터공학과", second: "소프트웨어융합학과", kind: "minor" }, real));
    expect(r.primary.kind).toBe("single");
    expect(r.totals).toEqual({ primaryCredits: 81, secondCredits: 21, total: 102, savedCredits: 0 });
    expect(r.warnings.map((w) => w.code)).toContain("NULL_AS_ZERO");
  });

  it("cites the curriculum book's credit table as the source", () => {
    const r = ok(buildCreditPlan({ primary: "컴퓨터공학과", second: "체육학과", kind: "double" }, real));
    expect(r.warnings.filter((w) => w.code === "SOURCE_UNCONFIRMED")).toHaveLength(0);
    expect(r.sources["컴퓨터공학과"].sourceUrl).toBe("2026경희대 교육과정.pdf p.121");
    expect(r.sources["체육학과"].sourceUrl).toBe("2026경희대 교육과정.pdf p.122");
    expect(r.sources["체육학과"].asOf).toBe("2026학년도 교육과정");
  });

  it("uses the book's numbers where the old overview was wrong", () => {
    // book p.121: 컴퓨터공학과 단일 12/39/30 = 81 (overview had 필수 42, 선택 27)
    const r = ok(buildCreditPlan({ primary: "컴퓨터공학과", second: "전자공학과", kind: "minor" }, real));
    expect(r.primary).toMatchObject({ 기초: 12, 필수: 39, 선택: 30, 계: 81 });
    // 전자공학과 minor: the "3" was 타전공 인정학점, not 전공기초 -> 9 + 12 = 21 now verifies
    expect(r.second).toMatchObject({ 기초: 0, 필수: 9, 선택: 12, 계: 21 });
  });

  it("keeps the merged 기초+필수 credits of 전자공학과 다전공", () => {
    const r = ok(buildCreditPlan({ primary: "컴퓨터공학과", second: "전자공학과", kind: "double" }, real));
    expect(r.second).toMatchObject({ 기초: 30, 선택: 21, 계: 51, combined: true });
  });
});

describe("unavailable results", () => {
  it("minor that failed verification is not provided", () => {
    const r = buildCreditPlan({ primary: "컴퓨터공학과", second: "융합바이오·신소재공학과", kind: "minor" }, real);
    expect(reason(r)).toBe("NOT_VERIFIED");
    if (!r.available) expect(r.message).toContain("SUM_MISMATCH");
  });

  it("program the department does not run", () => {
    expect(reason(buildCreditPlan({ primary: "컴퓨터공학과", second: "인공지능학과", kind: "minor" }, real))).toBe(
      "NOT_OFFERED",
    );
    // a convergence major has no single major, so it cannot be a 본전공
    expect(reason(buildCreditPlan({ primary: "양자정보", second: "컴퓨터공학과", kind: "double" }, real))).toBe(
      "NOT_OFFERED",
    );
  });

  it("Seoul campus or unknown department has no data", () => {
    expect(reason(buildCreditPlan({ primary: "컴퓨터공학과", second: "철학과", kind: "double" }, real))).toBe(
      "NO_DEPT_DATA",
    );
  });

  it("invalid input never throws", () => {
    expect(reason(buildCreditPlan({ primary: "", second: "체육학과", kind: "double" }, real))).toBe("INVALID_INPUT");
    expect(reason(buildCreditPlan({ primary: "컴퓨터공학과", second: "체육학과", kind: "x" as never }, real))).toBe(
      "INVALID_INPUT",
    );
    expect(reason(buildCreditPlan({ primary: undefined as never, second: "체육학과", kind: "double" }, real))).toBe(
      "INVALID_INPUT",
    );
    expect(reason(buildCreditPlan({ primary: "체육학과", second: " 체육학과 ", kind: "double" }, real))).toBe(
      "SAME_DEPT",
    );
  });
});

describe("listCreditOptions", () => {
  const opts = listCreditOptions("컴퓨터공학과", real);

  it("excludes itself, unverified and not-offered programs", () => {
    expect(opts.some((o) => o.dept === "컴퓨터공학과")).toBe(false);
    expect(opts.some((o) => o.dept === "융합바이오·신소재공학과" && o.kind === "minor")).toBe(false);
    expect(opts.some((o) => o.dept === "인공지능학과" && o.kind === "minor")).toBe(false);
    expect(opts.some((o) => o.dept === "양자정보" && o.kind === "double")).toBe(true);
  });

  it("is sorted by total credits", () => {
    const totals = opts.map((o) => o.total);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
  });

  it("is empty for a department that cannot be a 본전공", () => {
    expect(listCreditOptions("양자정보", real)).toEqual([]);
  });
});
