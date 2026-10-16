"""Step D: validate structured JSON against the source, merge, set status, export.

Inputs : data/extracted/<dept>.json (step C), course master from step B,
         page text of the source PDF (for evidence checks).
Outputs: data/curated/courses.json, requirements/<dept>.json, status.json,
         conflicts.json. Only requirements without errors are exported.

Run with the project venv:  .venv/Scripts/python -I scripts/pipeline/build.py

Rules: code decides, nothing is guessed. Every problem becomes an issue with a
code; an `error` blocks export (status needs_review), a `warn` is kept.
"""
import difflib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from detect import squash  # noqa: E402
from ingest import load_pages  # noqa: E402
from parse_table import ParseTableError, parse_dept  # noqa: E402
from paths import CURATED_DIR, EXTRACTED_DIR, use_utf8_stdout  # noqa: E402
from schema import DeptFile, Group, Requirement, load_dept_file  # noqa: E402

FUZZY_THRESHOLD = 0.8
APPROVALS_FILE = EXTRACTED_DIR / "approvals.json"  # optional: ["dept/kind/name", ...]
CATEGORIES = {"전공기초": "기초", "전공필수": "필수", "전공선택": "선택"}
TAG = re.compile(r"\((?:CSE|SWCON|EE)\)")  # department tags in the structure tables


def issue(level: str, code: str, msg: str, where: str = "") -> dict:
    return {"level": level, "code": code, "where": where, "msg": msg}


def norm(name: str) -> str:
    """Name used for matching: no dept tag, whitespace or middle dot."""
    return re.sub(r"[\s·]", "", TAG.sub("", name))


def _digit_tail(s: str) -> str:
    m = re.search(r"\d+$", s)
    return m.group() if m else ""


def match_name(name: str, master: list[dict]) -> tuple[dict | None, str, list[dict]]:
    """name -> (master row, how, issues). how: exact | fuzzy | none."""
    n = norm(name)
    exact = [m for m in master if norm(m["name"]) == n]
    if len(exact) == 1:
        return exact[0], "exact", []
    if len(exact) > 1:
        return exact[0], "exact", [issue("error", "AMBIGUOUS_MATCH", f"'{name}' matches {len(exact)} rows")]
    best, best_ratio = None, 0.0
    for m in master:
        mn = norm(m["name"])
        if _digit_tail(mn) != _digit_tail(n):  # 콜로키움1 must never match 콜로키움2
            continue
        r = difflib.SequenceMatcher(None, n, mn).ratio()
        if r > best_ratio:
            best, best_ratio = m, r
    if best is not None and best_ratio >= FUZZY_THRESHOLD:
        msg = f"'{name}' ~ '{best['name']}' ({best['code']}) similarity {best_ratio:.2f}"
        return best, "fuzzy", [issue("warn", "FUZZY_MATCH", msg)]
    return None, "none", []


def _sum(courses: list[dict]) -> int:
    return sum(c["credits"] for c in courses)


def _resolve_coded_group(g: Group, master: list[dict], where: str):
    """Group with a code table in the source (microdegree): check against the master."""
    by_code = {m["code"]: m for m in master}
    by_name = {norm(m["name"]): m for m in master}
    prefixes = {re.match(r"[A-Z]+", m["code"]).group() for m in master}
    issues, coded = [], []
    for c in g.coded:
        own = by_code.get(c.code)
        if own is not None:
            if norm(own["name"]) != norm(c.name) or own["credits"] != c.credits:
                issues.append(issue("error", "CODE_NAME_MISMATCH", f"{c.code} is '{c.name}' {c.credits}학점 "
                                    f"here but '{own['name']}' {own['credits']}학점 in 별표1", where))
        elif norm(c.name) in by_name:
            issues.append(issue("error", "CODE_NAME_MISMATCH", f"'{c.name}' has code {c.code} here but "
                                f"{by_name[norm(c.name)]['code']} in 별표1", where))
        elif re.match(r"[A-Z]+", c.code).group() in prefixes:
            issues.append(issue("error", "CODE_NOT_IN_OWN_MASTER", f"{c.code} '{c.name}' not in 별표1", where))
        else:
            issues.append(issue("warn", "EXTERNAL_COURSE", f"{c.code} '{c.name}' belongs to another "
                                "department; not checkable against this 별표1", where))
        coded.append(c.model_dump())
    return coded, [], issues


def resolve_group(g: Group, master: list[dict], where: str):
    """-> (coded courses, unresolved names, issues)."""
    if g.coded:
        return _resolve_coded_group(g, master, where)
    issues: list[dict] = []
    matched: list[dict] = []
    unresolved: list[str] = []
    for name in g.courses:
        row, how, iss = match_name(name, master)
        issues += [{**i, "where": where} for i in iss]
        if row is None:
            unresolved.append(name)
            level = "error" if g.rule == "all" else "warn"
            issues.append(issue(level, "UNRESOLVED_COURSE", f"'{name}' not found in 별표1", where))
        else:
            matched.append(row)
    if g.pool_rows:
        lo, hi = g.pool_rows
        in_range = [m for m in master if lo <= m["row"] <= hi]
        if len(in_range) != hi - lo + 1:
            issues.append(issue("error", "POOL_ROW_MISMATCH", f"rows {lo}-{hi} not all in 별표1", where))
        outside = [m["name"] for m in matched if not lo <= m["row"] <= hi]
        if outside:
            issues.append(issue("error", "POOL_ROW_MISMATCH", f"{outside} are outside rows {lo}-{hi}", where))
        if g.rule == "all" and g.courses and {m["row"] for m in matched} != {m["row"] for m in in_range}:
            issues.append(issue("error", "POOL_ROW_MISMATCH", f"listed courses differ from rows {lo}-{hi}", where))
        return [_c(m) for m in in_range], unresolved, issues
    if not g.courses:
        level = "error" if g.rule == "all" else "warn"
        issues.append(issue(level, "POOL_UNKNOWN", "no course list or pool_rows; cannot list candidates", where))
    return [_c(m) for m in matched], unresolved, issues


def _c(m: dict) -> dict:
    return {"code": m["code"], "name": m["name"], "credits": m["credits"]}


def check_group(g: Group, coded: list[dict], unresolved: list[str], where: str) -> list[dict]:
    issues = []
    if g.declared_count is not None and g.courses and len(g.courses) != g.declared_count:
        issues.append(issue("warn", "COUNT_MISMATCH", f"declared {g.declared_count} courses, listed {len(g.courses)}", where))
    if g.declared_credits is not None and coded and g.declared_credits not in (g.required_credits, _sum(coded)):
        issues.append(issue("warn", "POOL_CREDIT_MISMATCH", f"declared {g.declared_credits}학점 is neither the "
                            f"requirement ({g.required_credits}) nor the pool sum ({_sum(coded)})", where))
    if g.rule == "all" and not unresolved and coded and _sum(coded) != g.required_credits:
        issues.append(issue("error", "CREDIT_MISMATCH", f"courses add up to {_sum(coded)}학점, "
                            f"requirement is {g.required_credits}", where))
    if g.rule == "choose_credits" and coded and _sum(coded) < g.required_credits:
        issues.append(issue("error", "POOL_TOO_SMALL", f"pool has {_sum(coded)}학점 < {g.required_credits}", where))
    if g.rule == "choose_n" and coded:
        best = sorted((c["credits"] for c in coded), reverse=True)[: g.choose_n]
        if len(coded) < g.choose_n or sum(best) < g.required_credits:
            issues.append(issue("error", "POOL_TOO_SMALL", f"cannot reach {g.required_credits}학점 with "
                                f"{g.choose_n} of {len(coded)} courses", where))
    return issues


def check_structure(req: Requirement) -> list[dict]:
    issues = []
    group_total = sum(g.required_credits for g in req.groups)
    s = req.stated
    if s is not None:
        parts = [v for v in (s.기초, s.필수, s.선택) if v is not None]
        if sum(parts) != s.계:
            issues.append(issue("error", "STRUCT_SUM", f"stated parts add up to {sum(parts)}, 계 is {s.계}"))
        for category, key in CATEGORIES.items():
            want = getattr(s, key)
            have = sum(g.required_credits for g in req.groups if g.category == category)
            if want is not None and have != want:
                issues.append(issue("error", "STRUCT_MISMATCH", f"{key}: groups give {have}, table says {want}"))
        if req.total_credits != s.계:
            issues.append(issue("error", "TOTAL_MISMATCH", f"total_credits {req.total_credits} != stated 계 {s.계}"))
    if req.total_credits != group_total:
        issues.append(issue("error", "TOTAL_MISMATCH", f"total_credits {req.total_credits} != groups {group_total}"))
    return issues


def check_evidence(req: Requirement, pages_raw: list[str], pages_layout: list[str]) -> list[dict]:
    """Every quoted line must be on its page (whitespace ignored)."""
    def present(page: int, text: str) -> bool:
        if not 1 <= page <= len(pages_raw):
            return False
        t = squash(text)
        return t in squash(pages_raw[page - 1]) or t in squash(pages_layout[page - 1])

    quotes = []
    if req.stated:
        quotes.append(("stated", req.stated.page, req.stated.evidence))
    quotes += [(f"rule {r.id}", r.page, r.evidence) for r in req.extra_rules]
    for g in req.groups:
        label = f"{g.category}/{g.sub}" if g.sub else g.category
        quotes.append((f"{label} list", g.page, g.evidence))
        if g.credit_evidence:
            quotes.append((f"{label} credits", g.credit_page, g.credit_evidence))
    return [issue("error", "NO_EVIDENCE", f"quote not found on page {p}: {t[:40]}…", w)
            for w, p, t in quotes if not present(p, t)]


def validate_requirement(req: Requirement, master, pages_raw, pages_layout):
    """-> (issues, groups with resolved codes). Pure: no file access."""
    issues = check_structure(req) + check_evidence(req, pages_raw, pages_layout)
    groups = []
    for g in req.groups:
        where = f"{g.category}/{g.sub}" if g.sub else g.category
        coded, unresolved, iss = resolve_group(g, master, where)
        issues += iss + check_group(g, coded, unresolved, where)
        groups.append({**g.model_dump(mode="json"), "coded": coded, "unresolved": unresolved})
    for r in req.extra_rules:
        if r.status != "applies":
            issues.append(issue("warn", "AMBIGUOUS_RULE", f"{r.id}: {r.why}"))
    return issues, groups


def build_dept(f: DeptFile, master, pages_raw, pages_layout, approved: set[str]):
    """-> (curated dict with only exportable requirements, status dict)."""
    exported, status = [], {}
    for req in f.requirements:
        issues, groups = validate_requirement(req, master, pages_raw, pages_layout)
        errors = [i for i in issues if i["level"] == "error"]
        key = f"{f.dept}/{req.kind}/{req.name}"
        state = "needs_review" if errors else ("verified" if key in approved else "auto_pass")
        status[f"{req.kind}/{req.name}"] = {"status": state, "issues": issues}
        if not errors:
            exported.append({**req.model_dump(mode="json"), "groups": groups, "status": state, "issues": issues})
    meta = f.model_dump(mode="json", exclude={"requirements"})
    return {**meta, "requirements": exported}, status


def find_conflicts(masters: dict[str, list[dict]]) -> list[dict]:
    variants: dict[str, dict] = {}
    for dept, rows in masters.items():
        for r in rows:
            variants.setdefault(r["code"], {})[(norm(r["name"]), r["credits"])] = (dept, r["name"], r["credits"])
    out = []
    for code, v in sorted(variants.items()):
        if len(v) > 1:
            out.append({"code": code, "variants": [{"dept": d, "name": n, "credits": c} for d, n, c in v.values()]})
    return out


def merge_courses(masters: dict[str, list[dict]]) -> list[dict]:
    merged: dict[str, dict] = {}
    for dept, rows in masters.items():
        for r in rows:
            e = merged.setdefault(r["code"], {"code": r["code"], "name": r["name"], "credits": r["credits"], "depts": []})
            e["depts"].append(dept)
    return [merged[c] for c in sorted(merged)]


def _write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main(argv: list[str]) -> int:
    use_utf8_stdout()
    from paths import dept_names

    approved = set(json.loads(APPROVALS_FILE.read_text(encoding="utf-8"))) if APPROVALS_FILE.exists() else set()
    masters: dict[str, list[dict]] = {}
    all_status: dict[str, dict] = {}
    for dept in dept_names():
        try:
            masters[dept] = parse_dept(dept)
        except ParseTableError as e:  # surfaced, never swallowed
            all_status[dept] = {"_dept_error": f"course master failed: {e}"}
    req_dir = CURATED_DIR / "requirements"
    for old in req_dir.glob("*.json"):
        old.unlink()
    for path in sorted(EXTRACTED_DIR.glob("*.json")):
        if path == APPROVALS_FILE:
            continue
        f = load_dept_file(path)
        if f.dept not in masters:
            all_status[f.dept] = {"_dept_error": all_status.get(f.dept, {}).get("_dept_error", "no course master")}
            continue
        curated, status = build_dept(f, masters[f.dept], load_pages(f.dept, "raw"), load_pages(f.dept), approved)
        all_status[f.dept] = status
        _write(req_dir / f"{f.dept}.json", curated)
    conflicts = find_conflicts(masters)
    _write(CURATED_DIR / "courses.json", merge_courses(masters))
    _write(CURATED_DIR / "conflicts.json", conflicts)
    _write(CURATED_DIR / "status.json", all_status)

    for dept, st in all_status.items():
        print(f"[{dept}]")
        if "_dept_error" in st:
            print(f"  FAILED: {st['_dept_error']}")
            continue
        for key, v in st.items():
            n_err = sum(i["level"] == "error" for i in v["issues"])
            n_warn = len(v["issues"]) - n_err
            print(f"  {v['status']:12} {key}  (errors={n_err}, warnings={n_warn})")
            for i in v["issues"]:
                print(f"      {i['level']:5} {i['code']:22} {i['where']}: {i['msg']}")
    print(f"courses: {len(merge_courses(masters))} codes from {len(masters)} departments, conflicts: {len(conflicts)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
