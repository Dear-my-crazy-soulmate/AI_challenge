"""Credit overview: validate per-department credit totals and export Global campus data.

Input : data/extracted/overview_all.json (official site, copied as is)
Output: data/curated/credits_global.json, data/curated/credits_global_issues.json

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
    return {"available": True, "status": "ok", **parts, "계": total}, issues


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


def build(rows: list[dict]) -> tuple[list[dict], dict]:
    names = [r["dept"] for r in rows]
    dupes = {n for n in names if names.count(n) > 1}
    if dupes:
        raise ValueError(f"duplicate dept names in source: {sorted(dupes)}")
    records, all_issues = [], {}
    for row in rows:
        if not is_global(row):
            continue
        rec, iss = check_dept(row)
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
    records, issues = build(rows)
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
