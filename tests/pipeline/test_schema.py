"""Tests for step C (schema + structured JSON). Needs the project venv (pydantic):

  .venv/Scripts/python -I tests/pipeline/test_schema.py

Source-text checks need data/work/<dept>.pages.json (run ingest.py first).
"""
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "pipeline"))

from pydantic import ValidationError  # noqa: E402

from ingest import load_pages  # noqa: E402
from paths import EXTRACTED_DIR, WORK_DIR  # noqa: E402
from schema import DeptFile, ExtraRule, Group, load_dept_file  # noqa: E402

DEPTS = ["인공지능학과", "철학과"]


def squash(text: str) -> str:
    return re.sub(r"\s+", "", text)


def on_page(dept_pages: list[str], page: int, text: str) -> bool:
    """True if `text` appears on the page, ignoring all whitespace."""
    return squash(text) in squash(dept_pages[page - 1])


def group_kwargs(**over):
    base = dict(category="전공필수", rule="all", required_credits=6, page=1, evidence="x")
    base.update(over)
    return base


class SchemaRulesTest(unittest.TestCase):
    def test_choose_n_requires_choose_n(self):
        with self.assertRaises(ValidationError):
            Group(**group_kwargs(rule="choose_n"))

    def test_choose_n_only_with_choose_n_rule(self):
        with self.assertRaises(ValidationError):
            Group(**group_kwargs(rule="all", choose_n=3))

    def test_pool_rows_must_be_ordered_range(self):
        with self.assertRaises(ValidationError):
            Group(**group_kwargs(pool_rows=[10, 3]))

    def test_unknown_key_is_rejected(self):
        with self.assertRaises(ValidationError):
            Group(**group_kwargs(tpyo=1))

    def test_empty_evidence_is_rejected(self):
        with self.assertRaises(ValidationError):
            Group(**group_kwargs(evidence=""))

    def test_uncertain_rule_needs_a_reason(self):
        with self.assertRaises(ValidationError):
            ExtraRule(id="r", text="t", page=1, evidence="e", status="ambiguous")

    def test_credit_page_and_evidence_go_together(self):
        with self.assertRaises(ValidationError):
            Group(**group_kwargs(credit_page=3))


class ExtractedFilesTest(unittest.TestCase):
    def setUp(self):
        self.files = {}
        for dept in DEPTS:
            path = EXTRACTED_DIR / f"{dept}.json"
            if not path.exists():
                self.skipTest(f"{path} missing")
            self.files[dept] = load_dept_file(path)

    def test_files_load_and_have_expected_requirements(self):
        kinds = lambda d: sorted((r.kind, r.name) for r in self.files[d].requirements)  # noqa: E731
        self.assertEqual(kinds("인공지능학과"), [("double", "인공지능학과"), ("single", "인공지능학과")])
        self.assertEqual(
            kinds("철학과"),
            [("double", "철학과"), ("microdegree", "과학과 철학"), ("microdegree", "문명과 철학"),
             ("microdegree", "인지과학"), ("minor", "철학과"), ("single", "철학과")],
        )

    def test_source_url_and_as_of_are_marked_todo_not_invented(self):
        for dept, f in self.files.items():
            self.assertEqual(f.todo_fields(), ["source_url", "as_of"], dept)

    def test_stated_numbers_match_the_known_answers(self):
        by = lambda d, k: next(r for r in self.files[d].requirements if r.kind == k)  # noqa: E731
        for d, k, want in [
            ("인공지능학과", "single", (12, 42, 27, 81)), ("인공지능학과", "double", (12, 30, 9, 51)),
            ("철학과", "single", (6, 6, 52, 64)), ("철학과", "double", (6, 6, 27, 39)),
        ]:
            s = by(d, k).stated
            self.assertEqual((s.기초, s.필수, s.선택, s.계), want, f"{d}/{k}")
        minor = by("철학과", "minor").stated
        self.assertEqual((minor.필수, minor.선택, minor.계), (6, 15, 21))

    def test_group_credits_add_up_to_the_stated_total(self):
        for dept, f in self.files.items():
            for r in f.requirements:
                if r.stated is None or r.kind == "microdegree":
                    continue
                self.assertEqual(sum(g.required_credits for g in r.groups), r.stated.계, f"{dept}/{r.kind}")
                self.assertEqual(r.total_credits, r.stated.계, f"{dept}/{r.kind}")

    def test_declared_counts_match_listed_courses(self):
        for dept, f in self.files.items():
            for r in f.requirements:
                for g in r.groups:
                    if g.declared_count is not None and g.courses:
                        self.assertEqual(len(g.courses), g.declared_count, f"{dept}/{r.kind}/{g.sub}")


@unittest.skipUnless(all((WORK_DIR / f"{d}.pages.json").exists() for d in DEPTS), "run ingest.py first")
class SourceTextMatchTest(unittest.TestCase):
    """Everything copied from the PDF must really be on the cited page."""

    def setUp(self):
        self.pages = {d: load_pages(d, "raw") for d in DEPTS}
        self.files = {d: load_dept_file(EXTRACTED_DIR / f"{d}.json") for d in DEPTS}

    def test_every_evidence_line_is_on_its_page(self):
        missing = []
        for dept, f in self.files.items():
            for r in f.requirements:
                label = f"{dept}/{r.kind}/{r.name}"
                if r.stated and not on_page(self.pages[dept], r.stated.page, r.stated.evidence):
                    missing.append(f"{label} stated")
                for rule in r.extra_rules:
                    if not on_page(self.pages[dept], rule.page, rule.evidence):
                        missing.append(f"{label} rule {rule.id}")
                for g in r.groups:
                    if not on_page(self.pages[dept], g.page, g.evidence):
                        missing.append(f"{label} group {g.sub or g.category} evidence")
                    if g.credit_evidence and not on_page(self.pages[dept], g.credit_page, g.credit_evidence):
                        missing.append(f"{label} group {g.sub or g.category} credit_evidence")
        self.assertEqual(missing, [])

    def test_every_listed_course_name_is_on_its_page(self):
        missing = []
        for dept, f in self.files.items():
            for r in f.requirements:
                for g in r.groups:
                    for name in g.courses:
                        if not on_page(self.pages[dept], g.page, name):
                            missing.append(f"{dept}/{r.kind}/{g.sub or g.category}: {name}")
        self.assertEqual(missing, [])

    def test_microdegree_codes_are_on_their_page(self):
        missing = []
        for r in self.files["철학과"].requirements:
            for g in r.groups:
                for c in g.coded:
                    if not on_page(self.pages["철학과"], g.page, c.code):
                        missing.append(f"{r.name}: {c.code}")
        self.assertEqual(missing, [])

    def test_a_tampered_evidence_is_detected(self):
        page = self.pages["인공지능학과"]
        good = "인공지능학과 130 12 42 27 81 6 12 30 9 51 -"
        self.assertTrue(on_page(page, 2, good))
        self.assertFalse(on_page(page, 2, good.replace("27 81", "24 78")))  # 선택 27 -> 24
        self.assertFalse(on_page(page, 5, good))  # right text, wrong page


if __name__ == "__main__":
    unittest.main(verbosity=2)
