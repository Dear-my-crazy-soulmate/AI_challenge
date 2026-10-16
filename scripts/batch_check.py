"""Step F: triage a folder of curriculum PDFs (no LLM, nothing is written to data/).

  python -I scripts/batch_check.py <PDF folder> <output folder>

For every PDF it runs ingest + detect + parse_table and grades the department:
  RED    a human must look at the layout before anything else
  YELLOW usable, but something looks off
  GREEN  nothing suspicious
Writes report.md and report.csv. One department failing never stops the rest;
every failure is written into the report with its reason.
Exit code: 0 when all departments were processed, 1 if the tool itself broke
on some department (a parse failure is a RED verdict, not a tool error).
"""
import csv
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "pipeline"))
from detect import ROLES, detect_roles, squash  # noqa: E402
from ingest import extract_pages  # noqa: E402
from parse_table import ParseTableError, duplicate_codes, parse_rows  # noqa: E402
from paths import use_utf8_stdout  # noqa: E402

BLANK_PAGE_MAX_CHARS = 20  # fewer characters than this = no extractable text
SCAN_SUSPECT_RATIO = 0.30
MAX_TABLE_PAGES = 8
MAX_CREDITS = 6
MAX_DUPLICATES = 2
MIN_TOTAL_CREDITS = 12  # a 기본구조표 "계" below this is not a real total
RANK = {"GREEN": 0, "YELLOW": 1, "RED": 2}


def has_structure_sum(text: str) -> bool:
    """True if the text holds 4 consecutive integers a, b, c, d with a+b+c == d
    (기초 + 필수 + 선택 = 계)."""
    nums = [int(t) for t in re.findall(r"(?<![\d.])\d{1,3}(?![\d.])", text)]
    return any(
        d >= MIN_TOTAL_CREDITS and a + b + c == d
        for a, b, c, d in zip(nums, nums[1:], nums[2:], nums[3:])
    )


def check_pdf(pdf: Path) -> dict:
    """Triage of one PDF -> result dict. Raises only for tool errors."""
    return check_pages(pdf.stem, extract_pages(pdf), extract_pages(pdf, "-raw"))


def check_pages(dept: str, layout: list[str], raw: list[str]) -> dict:
    """Pure triage of one department's page texts (layout and raw)."""
    result = {"dept": dept, "pages": len(layout), "rows": None, "roles": {}, "red": [], "yellow": []}

    blank = [i + 1 for i, t in enumerate(layout) if len(squash(t)) < BLANK_PAGE_MAX_CHARS]
    if len(blank) / len(layout) > SCAN_SUSPECT_RATIO:
        result["red"].append(f"스캔본 의심: 텍스트 없는 쪽 {len(blank)}/{len(layout)}")
        return result  # nothing else is meaningful without text

    roles = detect_roles(layout)
    result["roles"] = roles
    if not roles["grad_structure"]:
        result["red"].append("기본구조표 미탐지")
    if not (roles["double_table"] or roles["double_rule"]):
        result["red"].append("다전공 근거 미탐지")
    if not roles["course_table"]:
        result["red"].append("과목표 미탐지")
    if len(roles["course_table"]) > MAX_TABLE_PAGES:
        result["yellow"].append(f"과목표 후보 쪽이 {len(roles['course_table'])}개 (>{MAX_TABLE_PAGES})")

    if roles["grad_structure"] and not any(has_structure_sum(raw[p - 1]) for p in roles["grad_structure"]):
        result["yellow"].append("기본구조표에서 기초+필수+선택=계 숫자열을 못 찾음")

    if roles["course_table"]:
        try:
            rows = parse_rows(dept, raw, roles["course_table"], check_duplicates=False)
        except ParseTableError as e:
            result["red"].append(f"과목표 파싱 실패: {e}")
        else:
            result["rows"] = len(rows)
            big = sorted({r["credits"] for r in rows if r["credits"] > MAX_CREDITS})
            if big:
                result["yellow"].append(f"학점 {MAX_CREDITS} 초과 과목 있음: {big}")
            dup = duplicate_codes(rows)
            if len(dup) > MAX_DUPLICATES:
                result["yellow"].append(f"학수번호 중복 {len(dup)}개: {dup[:5]}")
            elif dup:
                result["notes"] = f"학수번호 중복 {len(dup)}개: {dup}"
    return result


def one_line(error: Exception, limit: int = 160) -> str:
    """Multi-line tool output (e.g. pdftotext stderr) would break the report layout."""
    text = " ".join(str(error).split())
    return text if len(text) <= limit else text[:limit] + "…"


def verdict(r: dict) -> str:
    return "RED" if r["red"] else "YELLOW" if r["yellow"] else "GREEN"


def check_folder(folder: Path) -> list[dict]:
    """Every PDF -> result. A tool error in one PDF is recorded, not raised."""
    results = []
    for pdf in sorted(folder.glob("*.pdf")):
        try:
            r = check_pdf(pdf)
        except Exception as e:  # noqa: BLE001 - recorded in the report, never swallowed
            r = {"dept": pdf.stem, "pages": None, "rows": None, "roles": {}, "yellow": [],
                 "red": [f"점검 도구 오류: {type(e).__name__}: {one_line(e)}"], "tool_error": True}
        r["verdict"] = verdict(r)
        results.append(r)
    return results


def pages_text(r: dict, role: str) -> str:
    return ",".join(map(str, r["roles"].get(role, []))) or "-"


def write_reports(results: list[dict], out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    with open(out / "report.csv", "w", newline="", encoding="utf-8-sig") as f:  # BOM: Excel reads Korean
        w = csv.writer(f)
        w.writerow(["학과", "판정", "쪽수", "과목행수"] + ROLES + ["문제(RED)", "주의(YELLOW)"])
        for r in results:
            w.writerow([r["dept"], r["verdict"], r["pages"], r["rows"]] + [pages_text(r, k) for k in ROLES]
                       + [" | ".join(r["red"]), " | ".join(r["yellow"])])
    counts = {v: sum(r["verdict"] == v for r in results) for v in RANK}
    lines = ["# 교육과정 PDF 일괄 점검", "",
             f"학과 {len(results)}개: GREEN {counts['GREEN']} / YELLOW {counts['YELLOW']} / RED {counts['RED']}", "",
             "| 학과 | 판정 | 쪽수 | 과목행수 | 구조표 | 다전공표 | 다전공규정 | 부전공규정 | 과목표 | 마이크로디그리 |",
             "|---|---|---|---|---|---|---|---|---|---|"]
    for r in sorted(results, key=lambda r: (-RANK[r["verdict"]], r["dept"])):
        lines.append(f"| {r['dept']} | {r['verdict']} | {r['pages']} | {r['rows']} | {pages_text(r, 'grad_structure')} | "
                     f"{pages_text(r, 'double_table')} | {pages_text(r, 'double_rule')} | {pages_text(r, 'minor_rule')} | "
                     f"{pages_text(r, 'course_table')} | {pages_text(r, 'microdegree')} |")
    problems = [r for r in results if r["red"] or r["yellow"] or r.get("notes")]
    if problems:
        lines += ["", "## 문제와 주의", ""]
        for r in problems:
            lines.append(f"### {r['dept']} ({r['verdict']})")
            lines += [f"- RED: {m}" for m in r["red"]] + [f"- YELLOW: {m}" for m in r["yellow"]]
            if r.get("notes"):
                lines.append(f"- 참고: {r['notes']}")
            lines.append("")
    lines += ["", "판정 기준: RED=서식을 사람이 먼저 봐야 함, YELLOW=쓸 수 있으나 확인 필요, GREEN=이상 없음. "
              "GREEN은 '구조화하기 쉬워 보인다'는 뜻이지 데이터가 맞다는 보증이 아닙니다."]
    (out / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(argv: list[str]) -> int:
    use_utf8_stdout()
    if len(argv) != 2:
        print(__doc__)
        return 2
    folder, out = Path(argv[0]), Path(argv[1])
    if not folder.is_dir():
        print(f"not a folder: {folder}", file=sys.stderr)
        return 2
    results = check_folder(folder)
    if not results:
        print(f"no PDF in {folder}", file=sys.stderr)
        return 2
    write_reports(results, out)
    for r in results:
        why = "; ".join(r["red"] + r["yellow"]) or "-"
        print(f"{r['verdict']:6} {r['dept']:12} pages={r['pages']} rows={r['rows']}  {why}")
    print(f"-> {out / 'report.md'}, {out / 'report.csv'}")
    return 1 if any(r.get("tool_error") for r in results) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
