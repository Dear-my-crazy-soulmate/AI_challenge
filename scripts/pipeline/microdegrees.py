"""Step D (book): micro-degree course lists per department section.

Each micro-degree page ([별표N] ... 마이크로디그리 이수체계도) carries a name
line "마이크로디그리명: 한글(English)", the credits to complete, and a course
table. Layouts differ a lot, so the table is not parsed cell by cell:
- course codes are collected from the table part of the micro-degree's pages,
- names and credits come from the course catalogs of the whole book (catalog.py),
  or, for courses no catalog lists (other universities, 교양), from the code's line,
- required credits come from "이수학점: N학점" / "총 N학점(이상)을 이수" /
  "(총 N학점)"; the table's "총계" (sum of every listed course) is a
  cross-check: larger than the courses found means one is missing (check).
rule: courses add up to the required credits -> all, more -> choose.
status: verified (all), choose, or check (something does not add up / is missing).

Output: data/curated/<year>/microdegrees.json
Run:    PIPELINE_YEAR=2026 .venv/Scripts/python -I scripts/pipeline/microdegrees.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog import CODE, parse_catalog  # noqa: E402
from ingest import load_pages  # noqa: E402
from paths import CURATED_DIR, WORK_DIR, use_utf8_stdout  # noqa: E402
from programs import default_depts  # noqa: E402

NAME_LINE = re.compile(r"마이크로디그리\s*명\s*[:：]\s*(?P<name>[^\n]+)")
REQUIRED = [
    re.compile(r"이수\s*학점\s*[:：]?\s*(\d+)\s*학점"),
    re.compile(r"총\s*(\d+)\s*학점\s*(?:이상)?\s*(?:을|를)?\s*(?:이상\s*)?이수"),
    re.compile(r"\(총\s*(\d+)\s*학점\)"),
    re.compile(r"\((\d+)\s*학점\)\s*$", re.M),
]
TOTAL = re.compile(r"총\s*계\s*(\d+)")
TABLE_HEAD = re.compile(r"학\s*수\s*번\s*호")
CHOOSE = re.compile(r"택\s*(\d+)")
APPENDIX_HEAD = re.compile(r"\[별표\s*\d")
MAX_PAGES = 4  # a micro-degree never runs longer than this in the book


def split_name(raw: str) -> tuple[str, str]:
    raw = raw.strip()
    m = re.match(r"(.+?)\s*\(([^()]*[A-Za-z][^()]*)\)\s*$", raw)
    return (m.group(1).strip(), m.group(2).strip()) if m else (raw, "")


def md_blocks(raw: list[str], layout: list[str]) -> list[dict]:
    """[{name, english, page, raw, layout}] - text from the name line to the next one."""
    starts = [(i, m) for i, t in enumerate(layout) for m in [NAME_LINE.search(t)] if m]
    blocks = []
    for k, (i, m) in enumerate(starts):
        end = starts[k + 1][0] if k + 1 < len(starts) else min(len(layout), i + MAX_PAGES)
        end = max(end, i + 1)
        # Stop at the next appendix heading ("[별표N]") at the top of a later page.
        for j in range(i + 1, end):
            if APPENDIX_HEAD.search("\n".join(layout[j].strip().splitlines()[:3])):
                end = j
                break
        if k + 1 < len(starts) and starts[k + 1][0] == i:
            end = i + 1  # two micro-degrees on one page: keep the page, codes are split below
        name, english = split_name(m.group("name"))
        blocks.append({
            "name": name,
            "english": english,
            "page": i + 1,
            "raw": "\n".join(raw[i:end]),
            "layout": "\n".join(layout[i:end]),
        })
    # Same page twice: cut each layout text at the next name line.
    for k in range(len(blocks) - 1):
        if blocks[k]["page"] == blocks[k + 1]["page"]:
            text = blocks[k]["layout"]
            first = NAME_LINE.search(text)
            second = NAME_LINE.search(text, first.end())
            blocks[k]["layout"] = text[: second.start()] if second else text
            blocks[k + 1]["layout"] = text[second.start() :] if second else text
    return blocks


def table_codes(layout_text: str) -> list[tuple[str, str]]:
    """(code, line) pairs from the table part (after the 학수번호 header)."""
    head = TABLE_HEAD.search(layout_text)
    if head is None:
        return []
    out, seen = [], set()
    for line in layout_text[head.end() :].splitlines():
        for m in CODE.finditer(line):
            if m.group(1) not in seen:
                seen.add(m.group(1))
                out.append((m.group(1), line))
    return out


def line_course(code: str, line: str) -> tuple[str | None, int | None]:
    """Name and credits printed next to a code, for courses no catalog lists."""
    after = line.split(code, 1)[1]
    after = re.sub(r"전공\s*(기초|필수|선택)|교양|자유이수", "", after)
    m = re.match(r"\s*(.+?)\s+(\d)\s*(?:$|\s)", after)
    if not m:
        return None, None
    name = re.sub(r"\s*택\s*\d+\s*$", "", m.group(1)).strip()
    return (name or None), int(m.group(2))


def required_credits(text: str) -> int | None:
    for pat in REQUIRED:
        m = pat.search(text)
        if m:
            return int(m.group(1))
    return None


def build_md(block: dict, catalog: dict, dept: str, start_page: int) -> dict:
    courses, problems = [], []
    for code, line in table_codes(block["layout"]):
        row = catalog.get(code)
        if row:
            courses.append({"code": code, "name": row["name"], "credits": row["credits"], "offered_by": row["dept"]})
            continue
        name, credits = line_course(code, line)
        if name is None or credits is None:
            problems.append(f"{code}: not in any catalog and its line could not be read")
            continue
        courses.append({"code": code, "name": name, "credits": credits, "offered_by": None})
    need = required_credits(block["layout"])
    total = TOTAL.search(block["layout"])
    printed_total = int(total.group(1)) if total else None
    got = sum(c["credits"] for c in courses)
    if not courses:
        problems.append("no course codes found in the table")
    if need is None:
        need = printed_total
        if need is None:
            problems.append("required credits not printed")
    # 총계 is the sum of every listed course. Larger than what we found means a
    # course is missing; smaller than the required credits is a layout misread.
    notes = []
    if printed_total is not None and printed_total > got:
        problems.append(f"table total says {printed_total}, listed courses add up to {got}: a course may be missing")
    elif printed_total is not None and printed_total != got:
        notes.append(f"table total read as {printed_total} (layout), listed courses add up to {got}")
    if need is None or got < need:
        rule = "unknown"
        if need is not None:
            problems.append(f"listed courses add up to {got}, {need} credits are required")
    else:
        rule = "all" if got == need else "choose"
    choose = CHOOSE.search(block["layout"])
    status = "check" if problems else ("verified" if rule == "all" else "choose")
    return {
        "name": block["name"],
        "english": block["english"],
        "dept": dept,
        "page": start_page + block["page"] - 1,
        "required_credits": need,
        "rule": rule,
        "courses": courses,
        "course_credits": got,
        "choice_note": f"표에 '택{choose.group(1)}' 표시가 있습니다" if choose else None,
        "status": status,
        "problems": problems,
        "notes": notes,
    }


def main() -> int:
    use_utf8_stdout()
    manifest = json.loads((WORK_DIR / "sections.json").read_text(encoding="utf-8"))
    sections = manifest["sections"]
    catalog: dict[str, dict] = {}
    for s in sections:
        rows, _ = parse_catalog(load_pages(s["name"], "raw"))
        for r in rows:
            catalog.setdefault(r["code"], {**r, "dept": default_depts(s["name"])[0]})

    mds = []
    for s in sections:
        layout = load_pages(s["name"])
        for block in md_blocks(load_pages(s["name"], "raw"), layout):
            mds.append(build_md(block, catalog, default_depts(s["name"])[0], s["start"]))

    out = CURATED_DIR / str(manifest["year"]) / "microdegrees.json"
    payload = {"year": manifest["year"], "source_pdf": manifest["source_pdf"], "as_of": f"{manifest['year']}학년도 교육과정", "microdegrees": mds}
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    counts: dict[str, int] = {}
    for m in mds:
        counts[m["status"]] = counts.get(m["status"], 0) + 1
    print(f"{len(mds)} micro-degrees {counts}")
    for m in mds:
        flag = "  " if m["status"] != "check" else "!!"
        print(f"{flag} p{m['page']:<5} {m['dept']} / {m['name']}: {len(m['courses'])} courses {m['course_credits']}/{m['required_credits']} {m['rule']} {'; '.join(m['problems'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
