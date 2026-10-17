"""Tests for the credit overview (overview.py).

  .venv/Scripts/python -I tests/pipeline/test_overview.py
"""
import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "pipeline"))

from overview import build, check_dept, check_program, is_global  # noqa: E402

FULL = {"기초": 12, "필수": 42, "선택": 27, "계": 81}
NONE = {"기초": None, "필수": None, "선택": None, "계": None}


def codes(issues, level=None):
    return {i["code"] for i in issues if level is None or i["level"] == level}


def row(college="소프트웨어융합대학", dept="컴퓨터공학과", single=FULL, double=None, minor=None):
    return {
        "college": college, "dept": dept, "single": dict(single),
        "double": dict(double or {"기초": 9, "필수": 27, "선택": 15, "계": 51}),
        "minor": dict(minor or {"기초": None, "필수": 15, "선택": 6, "계": 21}),
    }


class ProgramTests(unittest.TestCase):
    def test_full_values_pass(self):
        rec, iss = check_program(FULL, "x")
        self.assertEqual(rec, {"available": True, "status": "ok", **FULL})
        self.assertEqual(iss, [])

    def test_all_null_means_not_offered(self):
        rec, iss = check_program(NONE, "x")
        self.assertEqual(rec, {"available": False, "status": "ok"})
        self.assertEqual(iss, [])

    def test_partial_null_read_as_zero_with_warning(self):
        rec, iss = check_program({"기초": None, "필수": 15, "선택": 6, "계": 21}, "x")
        self.assertEqual(rec["기초"], 0)
        self.assertEqual(codes(iss), {"NULL_AS_ZERO"})

    def test_sum_mismatch_blocks_export(self):
        rec, iss = check_program({"기초": 3, "필수": 9, "선택": 12, "계": 21}, "x")
        self.assertEqual(rec["status"], "needs_review")
        self.assertNotIn("계", rec)
        self.assertIn("SUM_MISMATCH", codes(iss, "error"))

    def test_missing_total_blocks_export(self):
        rec, iss = check_program({"기초": 6, "필수": None, "선택": None, "계": None}, "x")
        self.assertEqual(rec["status"], "needs_review")
        self.assertIn("MISSING_TOTAL", codes(iss, "error"))

    def test_bad_keys_is_error(self):
        _, iss = check_program({"기초": 1, "필수": 1, "계": 2}, "x")
        self.assertIn("BAD_KEYS", codes(iss, "error"))


class DeptTests(unittest.TestCase):
    def test_record_has_source_fields(self):
        rec, _ = check_dept(row())
        for key in ("source_url", "as_of", "campus"):
            self.assertTrue(rec[key])

    def test_double_equal_single_warns(self):
        _, iss = check_dept(row(double=FULL))
        self.assertIn("DOUBLE_EQ_SINGLE", codes(iss, "warn"))

    def test_unusual_minor_total_warns(self):
        _, iss = check_dept(row(minor={"기초": None, "필수": 12, "선택": 21, "계": 33}))
        self.assertIn("UNUSUAL_MINOR_TOTAL", codes(iss, "warn"))

    def test_campus_filter(self):
        self.assertTrue(is_global(row()))
        self.assertFalse(is_global(row(college="문과대학", dept="철학과")))
        self.assertTrue(is_global(row(college="융합전공", dept="양자정보")))
        self.assertFalse(is_global(row(college="융합전공", dept="사회과학융합전공")))


class BuildTests(unittest.TestCase):
    def test_duplicate_dept_raises(self):
        with self.assertRaises(ValueError):
            build([row(), row()])

    def test_real_source(self):
        import json
        rows = json.loads((ROOT / "data" / "extracted" / "overview_all.json").read_text(encoding="utf-8"))
        records, _ = build(copy.deepcopy(rows))
        self.assertEqual(len(records), 64)
        self.assertTrue(all(r["campus"] == "국제" for r in records))


if __name__ == "__main__":
    unittest.main()
