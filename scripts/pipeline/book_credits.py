"""Step A-1 (book): the book's own credit table "전공별 교육과정 기본구조표".

The table lists, per major, single / double / minor credits. It is read with
`pdftotext -table`, which keeps the column order. Columns per row:

  졸업 | 단일: 기초 필수 선택 계 | 타전공인정 | 다전공: 기초 필수 선택 계 | 타전공인정 | 부전공: 필수 선택 계

A minor has no 전공기초 column. Rows with fewer cells (merged cells, e.g.
"전공기초+전공필수 30") are not guessed: they are reported and must be
described in data/extracted/<year>/credit_notes.json.

Output: data/extracted/<year>/credits_book.json  {dept: {single, double, minor, recognized, page, line}}
Run:    PIPELINE_YEAR=2026 .venv/Scripts/python -I scripts/pipeline/book_credits.py
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from book import BOOK, YEAR, parse_toc  # noqa: E402
from paths import EXTRACTED_DIR, WORK_DIR, use_utf8_stdout  # noqa: E402

OUT_DIR = EXTRACTED_DIR / str(YEAR)
OUT_FILE = OUT_DIR / "credits_book.json"
TABLE_TITLE = "전공별 교육과정 기본구조표"
CELL = r"(?:\d+|-)"
ROW = re.compile(rf"^(?P<name>.*?[가-힣A-Za-z&)\]])\s+(?P<cells>(?:{CELL}\s+)*{CELL})\s*$")
FULL = 14  # 졸업 + 4 + 1 + 4 + 1 + 3
# Row labels in the book -> department names of the credit overview.
ALIASES = {
    "환경학": "환경학및환경공학과 (환경학)",
    "환경공학": "환경학및환경공학과 (환경공학)",
    "한국어학전공": "한국어학과",
    "한국콘텐츠학전공": "한국어학과 한국콘텐츠학전공",
}
# Words that sit in front of a row label (college / school names in merged cells).
PREFIXES = [
    "공과대학", "전자정보대학", "소프트웨어", "융합대학", "응용과학대학", "생명과학대학", "국제대학", "외국어대학",
    "예술·디자인", "대학", "체육대학", "융합전공", "기계공학부", "컴퓨터공학부", "환경학및", "환경공학과",
    "한국어학과", "글로벌커뮤니", "케이션학부",
]


def table_pages(pages_layout: list[str]) -> list[int]:
    entries = parse_toc(pages_layout)
    for i, e in enumerate(entries):
        if TABLE_TITLE in e["title"]:
            return list(range(e["start"], entries[i + 1]["start"]))
    raise ValueError(f"'{TABLE_TITLE}' not in the table of contents")


def extract_table_text(page: int) -> str:
    exe = shutil.which("pdftotext")
    if exe is None:
        raise RuntimeError("pdftotext not found on PATH (Git Bash ships it at /mingw64/bin)")
    proc = subprocess.run(
        [exe, "-q", "-f", str(page), "-l", str(page), "-table", "-enc", "UTF-8", str(BOOK), "-"],
        capture_output=True,
        check=True,
    )
    return proc.stdout.decode("utf-8", "replace")


def clean_name(raw: str) -> str:
    name = raw.replace("･", "·").strip()
    changed = True
    while changed:
        changed = False
        for p in PREFIXES:
            if name.startswith(p + " ") or name.startswith(p + "  "):
                name = name[len(p) :].strip()
                changed = True
    name = re.sub(r"\s+", "", name)
    return ALIASES.get(name, name)


def num(cell: str) -> int | None:
    return None if cell == "-" else int(cell)


def parse_row(cells: list[str]) -> dict | None:
    """14 cells, or 13 when the 졸업 column is empty (convergence majors)."""
    if len(cells) == FULL - 1 and (cells[0] == "-" or int(cells[0]) < 100):
        cells = ["-", *cells]
    if len(cells) != FULL:
        return None
    v = [num(c) for c in cells]
    return {
        "graduation": v[0],
        "single": {"기초": v[1], "필수": v[2], "선택": v[3], "계": v[4]},
        "recognized": {"single": v[5], "minor": v[10]},
        "double": {"기초": v[6], "필수": v[7], "선택": v[8], "계": v[9]},
        "minor": {"기초": None, "필수": v[11], "선택": v[12], "계": v[13]},
    }


def parse_page(text: str, page: int) -> tuple[dict, list[dict]]:
    rows, problems = {}, []
    for line in text.splitlines():
        m = ROW.match(line.strip())
        if not m or "학점" in m.group("name") or "교육과정" in m.group("name"):
            continue
        name = clean_name(m.group("name"))
        cells = m.group("cells").split()
        if len(cells) < 8:
            continue  # page footer such as "Ⅵ. 전공교육과정 121"
        evidence = re.sub(r"\s+", " ", line.strip())
        row = parse_row(cells)
        if row is None:
            problems.append({"dept": name, "page": page, "line": evidence, "cells": len(cells)})
            continue
        rows[name] = {**row, "page": page, "line": evidence}
    return rows, problems


def main() -> int:
    use_utf8_stdout()
    layout = json.loads((WORK_DIR / "sections.json").read_text(encoding="utf-8"))
    del layout  # book.py must have run; the TOC is read again from the PDF text below
    from ingest import extract_pages  # local import: only needed here

    pages = extract_pages(BOOK, errors="replace")
    rows, problems = {}, []
    for p in table_pages(pages):
        r, pr = parse_page(extract_table_text(p), p)
        rows.update(r)
        problems += pr
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"year": YEAR, "pages": table_pages(pages), "rows": rows, "unparsed": problems}
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(rows)} rows from pages {payload['pages']}")
    for pr in problems:
        print(f"  UNPARSED ({pr['cells']} cells) p{pr['page']}: {pr['line']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
