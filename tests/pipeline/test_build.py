"""Tests for step D (build/validation), including fault injection.

  .venv/Scripts/python -I tests/pipeline/test_build.py

Needs data/work (run ingest.py) and data/extracted. Mutations happen on deep
copies in memory; no file is changed.
"""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "pipeline"))

from build import (  # noqa: E402
    build_dept, find_conflicts, match_name, norm, validate_requirement,
)
from ingest import load_pages  # noqa: E402
from parse_table import parse_dept  # noqa: E402
from paths import EXTRACTED_DIR, WORK_DIR  # noqa: E402
from schema import load_dept_file  # noqa: E402

DEPTS = ["인공지능학과", "철학과"]
READY = all((WORK_DIR / f"{d}.pages.json").exists() and (EXTRACTED_DIR / f"{d}.json").exists() for d in DEPTS)


def codes(issues, level=None):
    return {i["code"] for i in issues if level is None or i["level"] == level}


class MatchingTest(unittest.TestCase):
    MASTER = [
        {"row": 1, "code": "A1", "name": "최신기술콜로키움1", "credits": 2},
        {"row": 2, "code": "A2", "name": "최신기술콜로키움2", "credits": 2},
        {"row": 3, "code": "A3", "name": "컴퓨터비젼", "credits": 3},
        {"row": 4, "code": "A4", "name": "몰입심화학습(AI데이터·클라우드디자인)", "credits": 3},
    ]

    def test_tags_spaces_and_middle_dot_are_ignored(self):
        self.assertEqual(norm("몰입심화학습(AI데이터·클라우드 디자인)"), norm(self.MASTER[3]["name"]))
        row, how, _ = match_name("최신기술콜로키움1(CSE)", self.MASTER)
        self.assertEqual((row["code"], how), ("A1", "exact"))

    def test_similar_name_matches_with_a_warning(self):
        row, how, iss = match_name("컴퓨터비전(CSE)", self.MASTER)
        self.assertEqual((row["code"], how, codes(iss)), ("A3", "fuzzy", {"FUZZY_MATCH"}))

    def test_trailing_number_never_fuzzy_matches_another_number(self):
        row, how, _ = match_name("최신기술콜로키움3", self.MASTER)
        self.assertIsNone(row)
        self.assertEqual(how, "none")

    def test_unknown_name_is_unresolved(self):
        self.assertIsNone(match_name("전혀다른과목", self.MASTER)[0])

    def test_conflicts_between_departments_are_reported(self):
        a = {"A": [{"code": "X1", "name": "가나", "credits": 3}]}
        b = {"B": [{"code": "X1", "name": "가나", "credits": 3}], "C": [{"code": "X1", "name": "가다", "credits": 3}]}
        self.assertEqual(find_conflicts({**a, "B": b["B"]}), [])
        self.assertEqual([c["code"] for c in find_conflicts({**a, **b})], ["X1"])


@unittest.skipUnless(READY, "run ingest.py first (needs data/raw PDFs and data/extracted)")
class RealDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.f = {d: load_dept_file(EXTRACTED_DIR / f"{d}.json") for d in DEPTS}
        cls.master = {d: parse_dept(d) for d in DEPTS}
        cls.raw = {d: load_pages(d, "raw") for d in DEPTS}
        cls.layout = {d: load_pages(d) for d in DEPTS}

    def run_req(self, dept, kind, mutate=None, name=None):
        req = next(r for r in self.f[dept].requirements if r.kind == kind and (name is None or r.name == name))
        req = req.model_copy(deep=True)
        if mutate:
            mutate(req)
        issues, groups = validate_requirement(req, self.master[dept], self.raw[dept], self.layout[dept])
        return issues, groups

    # ---- the real data
    def test_statuses_of_the_real_data(self):
        want = {
            ("인공지능학과", "single/인공지능학과"): "auto_pass", ("인공지능학과", "double/인공지능학과"): "auto_pass",
            ("철학과", "single/철학과"): "auto_pass", ("철학과", "double/철학과"): "auto_pass",
            ("철학과", "minor/철학과"): "auto_pass", ("철학과", "microdegree/문명과 철학"): "auto_pass",
            ("철학과", "microdegree/인지과학"): "auto_pass", ("철학과", "microdegree/과학과 철학"): "needs_review",
        }
        got = {}
        for d in DEPTS:
            _, status = build_dept(self.f[d], self.master[d], self.raw[d], self.layout[d], set())
            got.update({(d, k): v["status"] for k, v in status.items()})
        self.assertEqual(got, want)

    def test_needs_review_requirement_is_not_exported(self):
        curated, _ = build_dept(self.f["철학과"], self.master["철학과"], self.raw["철학과"], self.layout["철학과"], set())
        names = {r["name"] for r in curated["requirements"] if r["kind"] == "microdegree"}
        self.assertEqual(names, {"문명과 철학", "인지과학"})

    def test_human_approval_makes_it_verified_but_never_rescues_errors(self):
        key = {"철학과/microdegree/문명과 철학", "철학과/microdegree/과학과 철학"}
        _, status = build_dept(self.f["철학과"], self.master["철학과"], self.raw["철학과"], self.layout["철학과"], key)
        self.assertEqual(status["microdegree/문명과 철학"]["status"], "verified")
        self.assertEqual(status["microdegree/과학과 철학"]["status"], "needs_review")

    def test_microdegree_mismatch_codes(self):
        issues, _ = self.run_req("철학과", "microdegree", name="과학과 철학")
        msgs = " ".join(i["msg"] for i in issues if i["code"] == "CODE_NAME_MISMATCH")
        self.assertIn("PHIL0000", msgs)
        self.assertIn("PHIL4002", msgs)

    def test_ai_double_required_courses_resolve_to_codes(self):
        _, groups = self.run_req("인공지능학과", "double")
        sw_req = next(g for g in groups if g["sub"] == "SW필수")
        self.assertEqual({c["code"] for c in sw_req["coded"]}, {"CSE204", "CSE304", "CSE406", "CSE405", "AI4003"})

    # ---- fault injection (PLAN.md completion condition 3)
    def test_fault_selective_credits_27_to_24_in_the_summary_table(self):
        def mutate(req):
            req.stated.선택 = 24

        issues, _ = self.run_req("인공지능학과", "single", mutate)
        self.assertLessEqual({"STRUCT_MISMATCH", "STRUCT_SUM"}, codes(issues, "error"))

    def test_fault_selective_credits_27_to_24_in_a_group(self):
        def mutate(req):
            next(g for g in req.groups if g.sub == "SW선택").required_credits = 6

        issues, _ = self.run_req("인공지능학과", "single", mutate)
        self.assertLessEqual({"STRUCT_MISMATCH", "TOTAL_MISMATCH"}, codes(issues, "error"))

    def test_fault_tampered_evidence(self):
        def mutate(req):
            req.stated.evidence = req.stated.evidence.replace("27 81", "24 78")

        issues, _ = self.run_req("인공지능학과", "single", mutate)
        self.assertIn("NO_EVIDENCE", codes(issues, "error"))

    def test_fault_evidence_on_the_wrong_page(self):
        def mutate(req):
            req.stated.page = 5

        issues, _ = self.run_req("인공지능학과", "single", mutate)
        self.assertIn("NO_EVIDENCE", codes(issues, "error"))

    def test_fault_basic_group_with_only_three_courses(self):
        def mutate(req):
            g = next(g for g in req.groups if g.category == "전공기초")
            g.courses = g.courses[:3]

        issues, _ = self.run_req("인공지능학과", "single", mutate)
        self.assertIn("CREDIT_MISMATCH", codes(issues, "error"))

    def test_fault_nonexistent_course_in_a_required_group(self):
        def mutate(req):
            next(g for g in req.groups if g.sub == "AI필수").courses.append("존재하지않는과목")

        issues, _ = self.run_req("인공지능학과", "single", mutate)
        self.assertIn("UNRESOLVED_COURSE", codes(issues, "error"))

    def test_fault_unknown_course_in_a_selective_pool_is_only_a_warning(self):
        def mutate(req):
            next(g for g in req.groups if g.sub == "AI선택").courses.append("존재하지않는과목")

        issues, _ = self.run_req("인공지능학과", "single", mutate)
        self.assertNotIn("UNRESOLVED_COURSE", codes(issues, "error"))

    def test_fault_pool_too_small(self):
        def mutate(req):
            next(g for g in req.groups if g.sub == "SW선택").required_credits = 99

        issues, _ = self.run_req("인공지능학과", "single", mutate)
        self.assertIn("POOL_TOO_SMALL", codes(issues, "error"))

    def test_fault_pool_rows_pointing_at_the_wrong_rows(self):
        def mutate(req):
            next(g for g in req.groups if g.category == "전공기초").pool_rows = [1, 2]

        issues, _ = self.run_req("철학과", "single", mutate)
        self.assertIn("POOL_ROW_MISMATCH", codes(issues, "error"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
