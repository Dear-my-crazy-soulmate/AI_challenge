"""Step A-2: detect which pages play which role (no LLM).

Usage:
  python -I scripts/pipeline/detect.py [dept ...]          # print detected pages
  python -I scripts/pipeline/detect.py --eval              # compare with known answers

Roles: grad_structure, double_table, double_rule, minor_table, minor_rule,
       microdegree, course_table
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest import load_pages  # noqa: E402
from paths import WORK_DIR, dept_names, use_utf8_stdout  # noqa: E402

ROLES = [
    "grad_structure",
    "double_table",
    "double_rule",
    "minor_table",
    "minor_rule",
    "microdegree",
    "course_table",
]

COURSE_CODE = re.compile(r"\b[A-Z]{2,6}\d{3,4}\b")
MIN_CODES_FOR_TABLE = 8
# Pages about transitions/prerequisites/descriptions are never the master table.
COURSE_TABLE_EXCLUDE = ["경과조치", "대체인정", "대체과목", "폐지", "선수과목", "교과목해설"]


def squash(text: str) -> str:
    """Remove all whitespace so layout line breaks do not split keywords."""
    return re.sub(r"\s+", "", text)


# Regulation pages only *mention* "[별표N] 마이크로디그리 이수체계도"; real
# microdegree pages carry a "마이크로디그리명" field. Without that field, accept
# only pages dominated by the term (few characters per mention).
MD_MAX_CHARS_PER_MENTION = 100


def is_microdegree(sq: str) -> bool:
    n = sq.count("마이크로디그리")
    if n < 3:
        return False
    if "마이크로디그리명" in sq:
        return True
    return "이수체계도" in sq and len(sq) / n <= MD_MAX_CHARS_PER_MENTION


def is_grad_structure(sq: str) -> bool:
    # "교양교육과정 기본구조표" alone must not count.
    without_general = sq.replace("교양교육과정기본구조표", "")
    return "교육과정기본구조표" in without_general and "전공학점" in sq


def is_course_table_start(raw: str, sq: str) -> bool:
    return "교육과정편성표" in sq and "학수번호" in sq


def detect_roles(pages: list[str]) -> dict[str, list[int]]:
    """Return {role: [1-based page numbers]} for one department."""
    roles: dict[str, list[int]] = {r: [] for r in ROLES}
    prev_is_course_table = False
    for i, raw in enumerate(pages):
        no = i + 1
        sq = squash(raw)
        micro = is_microdegree(sq)

        if is_grad_structure(sq):
            roles["grad_structure"].append(no)
        if "다전공전공과목편성표" in sq:
            roles["double_table"].append(no)
        if "다전공과정" in sq or "다전공으로이수" in sq:
            roles["double_rule"].append(no)
        if "부전공전공과목편성표" in sq:
            roles["minor_table"].append(no)
        if "부전공과정" in sq or "부전공이수학점" in sq or "부전공이수" in sq:
            roles["minor_rule"].append(no)
        if micro:
            roles["microdegree"].append(no)

        excluded = micro or any(k in sq for k in COURSE_TABLE_EXCLUDE)
        n_codes = len(set(COURSE_CODE.findall(raw)))
        is_table = (
            not excluded
            and n_codes >= MIN_CODES_FOR_TABLE
            and (is_course_table_start(raw, sq) or prev_is_course_table)
        )
        if is_table:
            roles["course_table"].append(no)
        prev_is_course_table = is_table
    return roles


# Known-correct pages (1-based) for the evaluation. A role that is not listed
# for a department is not scored for it.
EXPECTED: dict[str, dict[str, list[int]]] = {
    "인공지능학과": {
        "grad_structure": [2],
        "double_table": [4],
        "double_rule": [2, 3, 5],
        "course_table": [7, 8],
        "microdegree": list(range(24, 32)),
    },
    "철학과": {
        "grad_structure": [1],
        "double_rule": [1, 3, 4],
        "minor_rule": [1, 4],
        "course_table": [7, 8],
        "microdegree": [19, 20, 21],
    },
}


def evaluate(dept: str, found: dict[str, list[int]]) -> tuple[int, int, int]:
    """Print per-role precision/recall. Returns (tp, fp, fn) totals."""
    tp = fp = fn = 0
    for role, want in EXPECTED[dept].items():
        got = set(found[role])
        want_set = set(want)
        r_tp, r_fp, r_fn = len(got & want_set), len(got - want_set), len(want_set - got)
        tp, fp, fn = tp + r_tp, fp + r_fp, fn + r_fn
        precision = r_tp / len(got) if got else 0.0
        recall = r_tp / len(want_set)
        flag = "OK " if r_fp == 0 and r_fn == 0 else "DIFF"
        print(
            f"  {flag} {role:15} precision={precision:.2f} recall={recall:.2f}"
            f"  found={sorted(got)}"
            + (f"  missing={sorted(want_set - got)}" if r_fn else "")
            + (f"  extra={sorted(got - want_set)}" if r_fp else "")
        )
    return tp, fp, fn


def main(argv: list[str]) -> int:
    use_utf8_stdout()
    run_eval = "--eval" in argv
    depts = [a for a in argv if not a.startswith("--")] or (
        sorted(EXPECTED) if run_eval else dept_names()
    )
    worst_recall = 1.0
    for dept in depts:
        found = detect_roles(load_pages(dept))
        out = WORK_DIR / f"{dept}.roles.json"
        out.write_text(json.dumps(found, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"[{dept}]")
        if run_eval:
            if dept not in EXPECTED:
                print("  (no expected answer, skipped)")
                continue
            tp, fp, fn = evaluate(dept, found)
            recall = tp / (tp + fn) if tp + fn else 1.0
            worst_recall = min(worst_recall, recall)
            print(f"  total: tp={tp} fp={fp} fn={fn} recall={recall:.2f}")
        else:
            for role in ROLES:
                print(f"  {role:15} {found[role]}")
    if run_eval:
        print(f"worst recall: {worst_recall:.2f} (target 1.00)")
        return 0 if worst_recall == 1.0 else 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
