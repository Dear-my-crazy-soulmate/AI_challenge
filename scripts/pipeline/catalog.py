"""Step B (book): course catalog of one section from [별표1] 교육과정 편성표.

Lenient on layout, strict on content: every row needs a code, a name and an
integer credit, and its 이수구분 (전공기초/전공필수/전공선택) must be known.
Rows that break a rule are reported as issues, never guessed.

Input : data/work/<year>/<section>.pages.json (book.py)
Output: rows [{code, name, credits, category, page}] + issues

Run:  PIPELINE_YEAR=2026 .venv/Scripts/python -I scripts/pipeline/catalog.py [section ...]
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest import load_pages  # noqa: E402
from paths import WORK_DIR, use_utf8_stdout  # noqa: E402

CODE = re.compile(r"(?<![A-Za-z0-9])([A-Z]{2,6}\d{3,5}[A-Z]?)(?![A-Za-z0-9])")
TABLE_START = re.compile(r"\[별표\s*1\]")
TABLE_END = re.compile(r"\[별표\s*[2-9]\]")
CATEGORY = {"기초": "전공기초", "필수": "전공필수", "선택": "전공선택"}
# Words of the 이수구분 column that can end up in front of a name.
NOISE = re.compile(r"^(\d+\s+)*(전공\s*(기초|필수|선택)?|기초|필수|선택|\((Basic|Required|Elective)\))\s*")
HEADER_WORDS = ("순번", "연번", "교과목명", "학수번호", "이수", "구분", "학점", "개설학기", "부전공", "Title", "Credit")


def issue(level: str, code: str, msg: str, where: str = "") -> dict:
    return {"level": level, "code": code, "where": where, "msg": msg}


MIN_CODES = 5  # a page that only mentions "[별표1]" in the rules is not the table


def _starts_new_appendix(text: str) -> bool:
    head = "\n".join(text.strip().splitlines()[:4])
    return bool(TABLE_END.search(head))


def table_pages(raw: list[str]) -> list[int]:
    """1-based pages of the [별표1] table: the first page carrying the heading
    and course codes, then following pages while they still list codes."""
    start = next(
        (i for i, t in enumerate(raw, start=1) if TABLE_START.search(t) and len(CODE.findall(t)) >= MIN_CODES),
        None,
    )
    if start is None:
        return []
    pages = [start]
    for i in range(start + 1, len(raw) + 1):
        t = raw[i - 1]
        if TABLE_START.search(TABLE_END.split(t)[0]) is None and _starts_new_appendix(t):
            break
        if len(CODE.findall(t)) < MIN_CODES:
            break
        pages.append(i)
        if TABLE_END.search(t):
            break
    return pages


def _category_marker(line: str) -> str | None:
    """'전공기초', '전공 기초' or a bare '기초' line after '전공' -> category."""
    s = re.sub(r"\s+|\(.*?\)", "", line)
    for word, cat in CATEGORY.items():
        if s in (f"전공{word}", word) or s.startswith(f"전공{word}") and len(s) <= 6:
            return cat
    return None


def _clean_name(text: str) -> str:
    text = text.strip()
    prev = None
    while prev != text:
        prev = text
        text = NOISE.sub("", text).strip()
    text = re.sub(r"※\s*\d*\)?", "", text)  # footnote marks such as "융합연구1※2)"
    return re.sub(r"\s+", " ", re.sub(r"^\d+\s+", "", text)).strip()


def parse_catalog(raw: list[str]) -> tuple[list[dict], list[dict]]:
    rows: list[dict] = []
    issues: list[dict] = []
    pages = table_pages(raw)
    if not pages:
        return [], [issue("error", "NO_CATALOG", "no [별표1] page found")]
    category: str | None = None
    for page in pages:
        text = raw[page - 1]
        if page == pages[0]:
            text = text[TABLE_START.search(text).start() :]
        end = TABLE_END.search(text)
        if end:
            text = text[: end.start()]
        pending: list[str] = []  # lines of a name wrapped above its code
        for line in text.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            cat = _category_marker(stripped)
            if cat:
                category = cat
                pending = []
                continue
            if stripped in ("전공",):
                continue
            m = CODE.search(stripped)
            if not m:
                if any(w in stripped for w in HEADER_WORDS) or re.fullmatch(r"[\d\s]+", stripped):
                    pending = []
                    continue
                # Category words glued to a number, e.g. "1 전공" or "5 전공필수(Required)"
                head = re.sub(r"^\d+\s*", "", stripped)
                cat = _category_marker(head) if head else None
                if cat:
                    category = cat
                    pending = []
                    continue
                pending.append(stripped)
                continue
            before = stripped[: m.start()]
            # A leading "<n> 전공" / "<n> 전공기초" on the code line sets the category too.
            lead = re.match(r"^\d*\s*(전공\s*(기초|필수|선택))", before)
            if lead:
                category = CATEGORY[lead.group(2)]
            name = _clean_name(before)
            if not name and pending:
                name = _clean_name(" ".join(pending))
            elif pending and re.match(r"^\d+\s", pending[0]) is None and not re.match(r"^\d+\s", before):
                # wrapped name: the head of the name sits on the lines above
                name = _clean_name(" ".join(pending + [before]))
            pending = []
            after = stripped[m.end() :]
            cm = re.match(r"\s*(\d+)\b", after)
            where = f"p{page} {m.group(1)}"
            if not name:
                issues.append(issue("warn", "NO_NAME", f"no course name before {m.group(1)}", where))
                continue
            if cm is None:
                issues.append(issue("warn", "NO_CREDITS", f"no credits after {m.group(1)} ({name})", where))
                continue
            if category is None:
                issues.append(issue("warn", "NO_CATEGORY", f"{name} has no 이수구분", where))
                continue
            rows.append({"code": m.group(1), "name": name, "credits": int(cm.group(1)), "category": category, "page": page})
    codes = [r["code"] for r in rows]
    for c in sorted({c for c in codes if codes.count(c) > 1}):
        cats = sorted({r["category"] for r in rows if r["code"] == c})
        issues.append(issue("warn", "DUPLICATE_CODE", f"{c} listed {codes.count(c)} times ({', '.join(cats)})"))
    if not rows:
        issues.append(issue("error", "EMPTY_CATALOG", f"no rows parsed on pages {pages}"))
    return rows, issues


def main(argv: list[str]) -> int:
    use_utf8_stdout()
    names = argv or [s["name"] for s in json.loads((WORK_DIR / "sections.json").read_text(encoding="utf-8"))["sections"]]
    for n in names:
        rows, issues = parse_catalog(load_pages(n, "raw"))
        by_cat = {c: sum(1 for r in rows if r["category"] == c) for c in CATEGORY.values()}
        errs = [i for i in issues if i["level"] == "error"]
        print(f"{'ERR' if errs else 'ok '} {n}: {len(rows)} rows {by_cat} issues={len(issues)}")
        for i in issues[:4]:
            print(f"      {i['code']} {i['where']} {i['msg']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
