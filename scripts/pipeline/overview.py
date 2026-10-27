"""Credit overview: validate per-department credit totals and export Global campus data.

Input : data/extracted/overview_all.json (official site, copied as is)
        data/extracted/<year>/credits_book.json + credit_notes.json (the curriculum
        book's own table "전공별 교육과정 기본구조표", written by book_credits.py)
Output: data/curated/credits_global.json, data/curated/credits_global_issues.json

The book is the source of truth: where it lists a department its numbers
replace the overview's, and every difference is kept as a BOOK_DIFFERS warning.

Run with the project venv:  .venv/Scripts/python -I scripts/pipeline/overview.py

Rules: code decides, nothing is guessed.
- All four values of a program null  -> program not offered (available: false).
- Some values null                  -> read as 0, with a NULL_AS_ZERO warning.
- An `error` keeps that program out of the export (status needs_review).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from paths import CURATED_DIR, EXTRACTED_DIR, use_utf8_stdout  # noqa: E402

SOURCE_FILE = EXTRACTED_DIR / "overview_all.json"
YEAR = 2026
BOOK_FILE = EXTRACTED_DIR / str(YEAR) / "credits_book.json"
NOTES_FILE = EXTRACTED_DIR / str(YEAR) / "credit_notes.json"
BOOK_SOURCE = f"{YEAR}경희대 교육과정.pdf"
OUT_FILE = CURATED_DIR / "credits_global.json"
ISSUES_FILE = CURATED_DIR / "credits_global_issues.json"

SOURCE_URL = "TODO"  # official site; exact page URL not recorded yet
AS_OF = "2026학년도 교육과정"
CHECKED_ON = "2026-10-17"

KINDS = ("single", "double", "minor")
PARTS = ("기초", "필수", "선택")
USUAL_MINOR_TOTAL = 21

GLOBAL_COLLEGES = {
    "공과대학", "전자정보대학", "소프트웨어융합대학", "응용과학대학", "생명과학대학",
    "국제대학", "외국어대학", "예술·디자인대학", "체육대학",
}
# 융합전공 has no campus in the source; these are the Global campus ones (user confirmed).
GLOBAL_CONVERGENCE = {
    "글로벌엔지니어링", "글로벌문화기술", "4D아트", "아트&테크놀로지", "K-퍼포밍아트", "실감미디어",
    "양자정보", "우주인공지능", "첨단바이오신소재", "첨단종자푸드테크", "인공지능반도체",
    "웨어러블디자인테크놀로지",
}


def issue(level: str, code: str, msg: str, where: str = "") -> dict:
    return {"level": level, "code": code, "where": where, "msg": msg}


def is_global(row: dict) -> bool:
    if row["college"] == "융합전공":
        return row["dept"] in GLOBAL_CONVERGENCE
    return row["college"] in GLOBAL_COLLEGES


def check_program(values: dict, where: str) -> tuple[dict, list[dict]]:
    """One program (single/double/minor) -> (exported record, issues)."""
    keys = (*PARTS, "계")
    combined = bool(values.get("combined"))
    values = {k: v for k, v in values.items() if k != "combined"}
    if set(values) != set(keys):
        return {"available": None, "status": "needs_review"}, [
            issue("error", "BAD_KEYS", f"keys {sorted(values)}", where)]
    if all(values[k] is None for k in keys):
        return {"available": False, "status": "ok"}, []

    issues = []
    parts = {}
    for p in PARTS:
        if values[p] is None:
            issues.append(issue("warn", "NULL_AS_ZERO", f"{p} is null, read as 0", where))
        parts[p] = values[p] or 0
    total = values["계"]
    if total is None:
        issues.append(issue("error", "MISSING_TOTAL", "계 is null", where))
    elif sum(parts.values()) != total:
        issues.append(issue("error", "SUM_MISMATCH", f"{parts} sums to {sum(parts.values())}, 계 is {total}", where))
    for p, v in parts.items():
        if v == 1:
            issues.append(issue("warn", "ONE_CREDIT", f"{p} is 1 credit, check the source", where))

    if any(i["level"] == "error" for i in issues):
        return {"available": None, "status": "needs_review"}, issues
    record = {"available": True, "status": "ok", **parts, "계": total}
    if combined:
        record["combined"] = True  # 기초 holds 전공기초 and 전공필수 together
    return record, issues


def check_dept(row: dict) -> tuple[dict, list[dict]]:
    name = row["dept"]
    programs, issues = {}, []
    for kind in KINDS:
        rec, iss = check_program(row[kind], f"{name}/{kind}")
        programs[kind] = rec
        issues += iss

    single, double, minor = (programs[k] for k in KINDS)
    if single.get("available") and double.get("available"):
        if double["계"] > single["계"]:
            issues.append(issue("warn", "DOUBLE_GT_SINGLE", f"double {double['계']} > single {single['계']}", name))
        elif double["계"] == single["계"]:
            issues.append(issue("warn", "DOUBLE_EQ_SINGLE", f"double equals single ({single['계']})", name))
    if minor.get("available") and minor["계"] != USUAL_MINOR_TOTAL:
        issues.append(issue("warn", "UNUSUAL_MINOR_TOTAL", f"minor {minor['계']} (usual {USUAL_MINOR_TOTAL})", name))
    if "학부 내 다전공" in name:
        issues.append(issue("warn", "VARIANT_ENTRY", "separate entry for in-school double major", name))

    record = {
        "college": row["college"], "dept": name, "campus": "국제",
        "source_url": SOURCE_URL, "as_of": AS_OF, "checked_on": CHECKED_ON,
        "programs": programs,
    }
    return record, issues


def load_book() -> dict:
    """dept -> {single, double, minor, page, line} from the book; {} if not built yet."""
    if not BOOK_FILE.exists():
        return {}
    rows = json.loads(BOOK_FILE.read_text(encoding="utf-8"))["rows"]
    if NOTES_FILE.exists():
        notes = json.loads(NOTES_FILE.read_text(encoding="utf-8"))
        rows.update({k: v for k, v in notes.items() if not k.startswith("_")})
    return rows


def apply_book(row: dict, book: dict) -> tuple[dict, list[dict]]:
    """Replace a row's credits with the book's, warning about each difference."""
    entry = book.get(row["dept"])
    if entry is None:
        return row, [issue("warn", "NOT_IN_BOOK", "credit table of the book has no row; overview values kept", row["dept"])]
    new, issues = dict(row), []
    for kind in KINDS:
        values = entry[kind]
        old = {k: row[kind][k] for k in (*PARTS, "계")}
        fresh = {k: values[k] for k in (*PARTS, "계")}
        if old != fresh:
            issues.append(issue("warn", "BOOK_DIFFERS", f"overview {old} -> book {fresh} (p.{entry['page']})", f"{row['dept']}/{kind}"))
        new[kind] = dict(values)
    new["book_page"] = entry["page"]
    return new, issues


def build(rows: list[dict], book: dict | None = None) -> tuple[list[dict], dict]:
    names = [r["dept"] for r in rows]
    dupes = {n for n in names if names.count(n) > 1}
    if dupes:
        raise ValueError(f"duplicate dept names in source: {sorted(dupes)}")
    records, all_issues = [], {}
    for row in rows:
        if not is_global(row):
            continue
        book_issues: list[dict] = []
        if book:
            row, book_issues = apply_book(row, book)
        rec, iss = check_dept(row)
        if book and "book_page" in row:
            rec["source_url"] = f"{BOOK_SOURCE} p.{row['book_page']}"
        iss = book_issues + iss
        records.append(rec)
        if iss:
            all_issues[row["dept"]] = iss
    missing = GLOBAL_CONVERGENCE - set(names)
    if missing:
        raise ValueError(f"convergence majors not in source: {sorted(missing)}")
    return records, all_issues


def main() -> None:
    use_utf8_stdout()
    rows = json.loads(SOURCE_FILE.read_text(encoding="utf-8"))
    book = load_book()
    if not book:
        print(f"WARNING: {BOOK_FILE} not found, using the overview only (run book_credits.py)")
    records, issues = build(rows, book)
    OUT_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ISSUES_FILE.write_text(json.dumps(issues, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    flat = [i for iss in issues.values() for i in iss]
    blocked = sum(1 for r in records for p in r["programs"].values() if p["status"] == "needs_review")
    print(f"{len(records)} Global campus depts (of {len(rows)}), {blocked} programs need review")
    for level in ("error", "warn"):
        for i in (i for i in flat if i["level"] == level):
            print(f"  [{level}] {i['code']:<20} {i['where']}: {i['msg']}")


if __name__ == "__main__":
    main()
