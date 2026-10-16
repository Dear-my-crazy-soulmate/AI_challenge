"""Step B: course master table ([별표1]) -> [{row, code, name, credits, page}].

No LLM. Works on the reading-order ("-raw") text of the course_table pages
found by detect.py. Every code line is one row; the name is the text in front
of the code (including wrapped lines above it); credits is the first integer
after the code.

Usage: python -I scripts/pipeline/parse_table.py [dept ...]
Raises ParseTableError (never returns silently wrong data) when the row
numbers printed in the table do not match the parsed rows.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from detect import COURSE_CODE, detect_roles  # noqa: E402
from ingest import load_pages  # noqa: E402
from paths import WORK_DIR, dept_names, use_utf8_stdout  # noqa: E402

# Category words printed in the first column; never part of a course name.
CATEGORY_WORDS = {"전공", "필수", "선택", "기초", "(교직)", "교직", "전선", "전필", "전기"}
# Vertical heading "학/부/과/정" is split into one character per line.
VERTICAL_HEADING = ["학", "부", "과", "정"]


class ParseTableError(Exception):
    """The table could not be parsed into a verifiably consistent result."""


def _clean_preamble(lines: list[str]) -> tuple[str, set[int]]:
    """Lines in front of a code -> (course name, row numbers printed there)."""
    pieces: list[str] = []
    numbers: set[int] = set()
    for line in lines:
        tokens = line.split()
        while tokens and tokens[0].isdigit():  # leading row number(s)
            numbers.add(int(tokens.pop(0)))
        tokens = [t for t in tokens if t not in CATEGORY_WORDS]
        if tokens:
            pieces.append(" ".join(tokens))
    for i in range(len(pieces) - len(VERTICAL_HEADING) + 1):  # drop 학/부/과/정
        if pieces[i : i + len(VERTICAL_HEADING)] == VERTICAL_HEADING:
            del pieces[i : i + len(VERTICAL_HEADING)]
            break
    # Wrapped / vertical names are glued without spaces.
    return "".join(pieces), numbers


def _first_int(text: str) -> int | None:
    m = re.search(r"\d+", text)
    return int(m.group()) if m else None


def parse_page(raw: str, page: int) -> list[dict]:
    """One page of raw text -> row dicts (row numbers are assigned later)."""
    rows: list[dict] = []
    buf: list[str] = []
    for line in raw.splitlines():
        m = COURSE_CODE.search(line)
        if not m:
            buf.append(line)
            continue
        before = line[: m.start()]
        # The first row of a page is preceded by the table header; only trust
        # the text on the code's own line there.
        preamble = [before] if not rows else buf + [before]
        name, numbers = _clean_preamble(preamble)
        credits = _first_int(line[m.end() :])
        if not name:
            raise ParseTableError(f"page {page}: no course name before {m.group()}")
        if credits is None:
            raise ParseTableError(f"page {page}: no credits after {m.group()}")
        rows.append(
            {"code": m.group(), "name": name, "credits": credits, "page": page, "_numbers": numbers}
        )
        buf = []
    return rows


def parse_dept(dept: str) -> list[dict]:
    pages_raw = load_pages(dept, "raw")
    table_pages = detect_roles(load_pages(dept))["course_table"]
    if not table_pages:
        raise ParseTableError(f"{dept}: no course_table page detected")
    rows: list[dict] = []
    for page in table_pages:
        rows.extend(parse_page(pages_raw[page - 1], page))
    all_numbers: set[int] = set()
    for i, row in enumerate(rows, start=1):
        row["row"] = i
        numbers = row.pop("_numbers")
        all_numbers |= numbers
        # A row number printed near the row must agree with its position.
        if numbers and i not in numbers:
            raise ParseTableError(
                f"{dept}: row {i} ({row['name']}) but the table prints {sorted(numbers)}"
            )
    if all_numbers and max(all_numbers) != len(rows):
        raise ParseTableError(
            f"{dept}: parsed {len(rows)} rows but the table's last row number is {max(all_numbers)}"
        )
    codes = [r["code"] for r in rows]
    dup = sorted({c for c in codes if codes.count(c) > 1})
    if dup:
        raise ParseTableError(f"{dept}: duplicate course codes {dup}")
    return rows


def main(argv: list[str]) -> int:
    use_utf8_stdout()
    status = 0
    for dept in argv or dept_names():
        try:
            rows = parse_dept(dept)
        except ParseTableError as e:
            print(f"[{dept}] FAILED: {e}")
            status = 1
            continue
        out = WORK_DIR / f"{dept}.courses.json"
        out.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"[{dept}] {len(rows)} rows -> {out.name}")
    return status


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
