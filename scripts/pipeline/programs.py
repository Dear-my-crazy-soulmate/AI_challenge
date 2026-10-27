"""Step C (book): course groups per program, checked against the credit overview.

For every department section of the yearly book:
- catalog : [별표1] rows (catalog.py) -> code, name, credits, 이수구분
- groups  : per category (전공기초/전공필수/전공선택) the candidate courses and
  the credits the program needs (data/curated/credits_global.json).
  Candidates are the catalog rows of that category, or, when the book prints
  a "다전공/부전공 ... 편성표" for the program, the 기초·필수 rows named there.
- rule    : decided by code from credits only.
    candidates add up to the credits  -> "all"     (take every course)
    candidates add up to more         -> "choose"  (take that many credits)
    candidates add up to less / no data -> "unknown" (status "check")
- rules   : the department's own rule items about the program, copied as
  printed with their page, so the app can show the source text.
Status: verified (every 기초·필수 group is "all"), choose, or check.
Nothing is guessed: a course is listed only if the book prints it.

Output: data/curated/<year>/courses.json
Run:    PIPELINE_YEAR=2026 .venv/Scripts/python -I scripts/pipeline/programs.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog import parse_catalog  # noqa: E402
from ingest import load_pages  # noqa: E402
from paths import CURATED_DIR, WORK_DIR, use_utf8_stdout  # noqa: E402

KINDS = ("single", "double", "minor")
REQUIRED = {"전공기초": "기초", "전공필수": "필수"}
CREDITS_FILE = CURATED_DIR / "credits_global.json"

# Book section -> department names used by the credit overview. Sections not
# listed map to their own name with " 융합전공" and spaces removed.
SECTION_TO_DEPTS = {
    "기계공학부": ["기계공학", "지능로봇공학", "항공우주모빌리티"],
    "환경학및환경공학과": ["환경학및환경공학과 (환경학)", "환경학및환경공학과 (환경공학)"],
    "한국어학과 한국어학전공": ["한국어학과"],
    "첨단바이오소재 융합전공": ["첨단바이오신소재"],
}
# Sections that hold more than one major: the shared catalog cannot tell which
# rows belong to which major, so their lists always need a human check.
SHARED_SECTIONS = {"기계공학부", "환경학및환경공학과"}

PROGRAM_HEADING = {
    "double": re.compile(r"다\s*전\s*공[^\n]{0,20}편\s*성\s*표"),
    "minor": re.compile(r"부\s*전\s*공[^\n]{0,20}편\s*성\s*표"),
}
BLOCK_END = re.compile(r"\[\s*표\s*\d+\s*\]|편\s*성\s*표|^\s*제\s*\d+\s*조|\[별표", re.M)
FRONT_PAGES = 15  # program tables sit in the 시행세칙 at the front of a section


def squash(text: str) -> str:
    return re.sub(r"\s+", "", text)


def default_depts(section: str) -> list[str]:
    return SECTION_TO_DEPTS.get(section, [section.replace(" 융합전공", "").replace(" ", "")])


def program_block(pages: list[str], kind: str) -> tuple[str, int] | None:
    """Text of the program's course table, without ※ notes, and its page (1-based)."""
    heading = PROGRAM_HEADING[kind]
    for i, text in enumerate(pages[:FRONT_PAGES], start=1):
        m = heading.search(text)
        if not m:
            continue
        rest = text[m.end() :]
        end = BLOCK_END.search(rest)
        block = rest[: end.start()] if end else rest
        lines = [ln for ln in block.splitlines() if not ln.strip().startswith("※")]
        return "\n".join(lines), i
    return None


def mentioned(block: str, rows: list[dict]) -> list[dict]:
    """Catalog rows whose name is printed in the block, longest names first so
    '딥러닝' is not found inside '고급딥러닝'."""
    text = squash(block)
    found = []
    for row in sorted(rows, key=lambda r: len(squash(r["name"])), reverse=True):
        name = squash(row["name"])
        if len(name) >= 2 and name in text:
            found.append(row)
            text = text.replace(name, "\u0000")
    return found


def credit_sum(rows: list[dict]) -> int:
    return sum(r["credits"] for r in rows)


CATEGORIES = (("전공기초", "기초"), ("전공필수", "필수"), ("전공선택", "선택"))
COMBINED = "전공기초·전공필수"  # one credit number for both (merged cell in the credit table)
RULE_ITEM = re.compile(r"^\s*(제\s*\d+\s*조|[①-⑳]|\d\))")
KIND_WORD = {"single": "단일전공", "double": "다전공", "minor": "부전공"}
MAX_RULES = 6


def rule_texts(layout: list[str], last_page: int, kind: str) -> list[dict]:
    """Rule items (제n조 / ① / 1)) in front of the catalog that talk about this
    program and its credits or courses, copied as printed."""
    out = []
    for page in range(1, last_page):
        item: list[str] = []
        lines = layout[page - 1].splitlines() + [""]
        for line in lines:
            if (RULE_ITEM.match(line) or not line.strip()) and item:
                text = re.sub(r"\s+", " ", " ".join(item)).strip()
                sq = squash(text)
                is_header = all(w in sq for w in KIND_WORD.values()) and "조" not in sq[:6]
                specific = re.search(r"\d+\s*학점|과목\s*\(|\[표\s*\d\]", text)
                if KIND_WORD[kind] in sq and specific and not is_header:
                    out.append({"page": page, "text": text})
                item = []
            if line.strip():
                item.append(line.strip())
    return out[:MAX_RULES]


def make_groups(pool: list[dict], credits: dict | None, required: list[dict] | None) -> tuple[list[dict], list[str]]:
    """Course groups per category.

    required given (program table): its 기초/필수 rows are taken as printed.
    Otherwise the catalog rows of each category are candidates and the rule
    follows from credits: equal -> all, more -> choose, fewer -> unknown.
    When the credit table merges 전공기초 and 전공필수 into one number
    (credits["combined"]), both categories form one "전공기초·전공필수" group.
    """
    groups, problems = [], []
    have = credits is not None and credits.get("available")
    combined = have and credits.get("combined")
    if combined:
        rows = [r for r in (required if required is not None else pool) if r["category"] in REQUIRED]
        want, got = credits["기초"], credit_sum(rows)
        rule = "all" if got == want else "choose" if got > want else "unknown"
        if rule == "unknown":
            problems.append(f"{COMBINED}: listed courses add up to {got}, credit table says {want}")
        groups.append({"category": COMBINED, "credits": want, "rule": rule, "courses": [r["code"] for r in rows], "course_credits": got})
    for cat, part in CATEGORIES:
        if combined and cat != "전공선택":
            continue
        want = credits[part] if have else None
        if required is not None and cat != "전공선택":
            rows = [r for r in required if r["category"] == cat]
        else:
            rows = [r for r in pool if r["category"] == cat]
            if required is not None:  # electives: everything not already required
                taken = {r["code"] for r in required}
                rows = [r for r in pool if r["code"] not in taken and r["category"] in ("전공선택", "전공필수", "전공기초")]
        got = credit_sum(rows)
        if not want and (want == 0 or not rows):
            continue  # the program needs no credits in this category
        if want is None:
            rule = "unknown"
            problems.append(f"{cat}: no verified credit data")
        elif cat == "전공선택":
            rule = "choose"
        elif got == want:
            rule = "all"
        elif got > want:
            rule = "choose"
        else:
            rule = "unknown"
            problems.append(f"{cat}: listed courses add up to {got}, credit table says {want}")
        groups.append({"category": cat, "credits": want, "rule": rule, "courses": [r["code"] for r in rows], "course_credits": got})
    return groups, problems


def build_section(section: str, start_page: int, credits_by_dept: dict) -> tuple[dict, list[str]]:
    raw = load_pages(section, "raw")
    layout = load_pages(section)
    catalog, cat_issues = parse_catalog(raw)
    notes = [f"{i['level']} {i['code']} {i['where']} {i['msg']}" for i in cat_issues]
    if not catalog:
        return {}, notes
    book_page = lambda p: start_page + p - 1  # noqa: E731
    first_catalog_page = min(r["page"] for r in catalog)

    out = {}
    for dept in default_depts(section):
        cred = credits_by_dept.get(dept)
        programs = {}
        for kind in KINDS:
            prog_credits = cred["programs"][kind] if cred else None
            if prog_credits is not None and prog_credits.get("available") is False:
                continue  # the department does not run this program
            required, page, source = None, None, "catalog"
            if kind != "single":
                found = program_block(layout, kind)
                if found is not None:
                    block, page = found
                    required = [r for r in mentioned(block, catalog) if r["category"] in REQUIRED]
                    source = "program_table"
            groups, problems = make_groups(catalog, prog_credits, required)
            if source == "program_table" and problems:
                # the printed list does not add up: fall back to catalog candidates
                groups, fallback = make_groups(catalog, prog_credits, None)
                problems = [f"program table on p{book_page(page)} does not add up; showing catalog candidates", *fallback]
                source = "catalog"
            rules = {g["rule"] for g in groups if g["category"] != "전공선택"}
            if problems:
                status = "check"
            elif rules <= {"all"}:
                status = "verified"
            else:
                status = "choose"
            if section in SHARED_SECTIONS:
                status = "check"
                problems = [f"section '{section}' covers several majors; rows are not split per major", *problems]
            programs[kind] = {
                "status": status,
                "source": source,
                "page": book_page(page) if page else None,
                "groups": groups,
                "rules": [{"page": book_page(r["page"]), "text": r["text"]} for r in rule_texts(layout, first_catalog_page, kind)],
                "problems": problems,
            }
        out[dept] = {
            "section": section,
            "college": cred["college"] if cred else None,
            "catalog_pages": sorted({book_page(r["page"]) for r in catalog}),
            "catalog": [{k: r[k] for k in ("code", "name", "credits", "category")} | {"page": book_page(r["page"])} for r in catalog],
            "programs": programs,
        }
        if cred is None:
            notes.append(f"{dept}: not in the credit overview")
    return out, notes


def main() -> int:
    use_utf8_stdout()
    manifest = json.loads((WORK_DIR / "sections.json").read_text(encoding="utf-8"))
    credits_by_dept = {d["dept"]: d for d in json.loads(CREDITS_FILE.read_text(encoding="utf-8"))}
    year = str(manifest["year"])
    depts, report = {}, {}
    for s in manifest["sections"]:
        built, notes = build_section(s["name"], s["start"], credits_by_dept)
        depts.update(built)
        if notes:
            report[s["name"]] = notes
    missing = sorted(set(credits_by_dept) - set(depts))

    out_dir = CURATED_DIR / year
    out_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "year": manifest["year"],
        "source_pdf": manifest["source_pdf"],
        "source_sha256": manifest["sha256"],
        "as_of": f"{year}학년도 교육과정",
        "depts": depts,
        "missing_depts": missing,
        "section_notes": report,
    }
    (out_dir / "courses.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    counts = {k: {} for k in KINDS}
    for name, d in depts.items():
        for kind, p in d["programs"].items():
            counts[kind][p["status"]] = counts[kind].get(p["status"], 0) + 1
    print(f"{len(depts)} departments with a catalog; missing from book data: {missing}")
    for kind in KINDS:
        print(f"  {kind:<7} {counts[kind]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
