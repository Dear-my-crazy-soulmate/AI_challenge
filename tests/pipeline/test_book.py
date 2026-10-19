"""Tests for the yearly-book pipeline (book.py, catalog.py, programs.py).

  PIPELINE_YEAR=2026 .venv/Scripts/python -I tests/pipeline/test_book.py

Unit tests use small inline texts. The real-data tests need data/work/2026
(run book.py) and data/curated/2026/courses.json (run programs.py); they are
skipped when those files are missing.
"""
import json
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "pipeline"))

from book import parse_toc, section_name, split_sections  # noqa: E402
from catalog import parse_catalog, table_pages  # noqa: E402
from programs import make_groups, mentioned  # noqa: E402

COURSES = ROOT / "data" / "curated" / "2026" / "courses.json"
SECTIONS = ROOT / "data" / "work" / "2026" / "sections.json"

TOC = """목차
◆ 공과대학 교육과정 ······· 127
 기계공학부 교육과정 ······· 130
 컴퓨터공학부 컴퓨터공학과 교육과정 ······· 164
 한국어학과 한국어학전공 교육과정 ······· 200
"""

CATALOG = """[별표1]
교육과정 편성표
순번 이수 구분 교과목명 학수번호 학점
1
전공
기초
미분방정식 AMTH1001 3 3 1 ◯
2 선형대수 AMTH1004 3 3 1 ◯
3
전공
필수
자료구조 CSE204 3 2 2 2 ◯
4 졸업논문(컴퓨터공학) CSE403 0 4 ◯
5
전공
선택
딥러닝 CSE331 3 3 3 ◯
6 고급딥러닝 AI3001 3 3 3 ◯
7 융합연구1※2) SWCON301 3 3 ◯
[별표2] 선수과목 지정표
1 자료구조 CSE204 3
"""


def rows(pairs):
    return [{"code": c, "name": n, "credits": cr, "category": cat} for c, n, cr, cat in pairs]


class TocTests(unittest.TestCase):
    def test_parse_and_split(self):
        pages = ["", "", TOC, "", "", ""] + [""] * 300
        entries = parse_toc(pages)
        self.assertEqual([e["start"] for e in entries], [127, 130, 164, 200])
        self.assertTrue(entries[0]["header"])
        sections = split_sections(entries, 250)
        self.assertEqual([(s["name"], s["start"], s["end"]) for s in sections], [
            ("기계공학부", 130, 163), ("컴퓨터공학과", 164, 199), ("한국어학과 한국어학전공", 200, 250),
        ])

    def test_section_name(self):
        self.assertEqual(section_name("식물･환경신소재공학과 교육과정"), "식물·환경신소재공학과")
        self.assertEqual(section_name("글로벌커뮤니케이션학부 영미어문전공 교육과정"), "영미어문전공")


class CatalogTests(unittest.TestCase):
    def test_rows_and_categories(self):
        got, issues = parse_catalog(["규정 [별표1] 참조", CATALOG])
        self.assertEqual(issues, [])
        self.assertEqual([(r["code"], r["category"]) for r in got], [
            ("AMTH1001", "전공기초"), ("AMTH1004", "전공기초"), ("CSE204", "전공필수"), ("CSE403", "전공필수"),
            ("CSE331", "전공선택"), ("AI3001", "전공선택"), ("SWCON301", "전공선택"),
        ])
        self.assertEqual(got[3]["credits"], 0)
        self.assertEqual(got[6]["name"], "융합연구1")  # footnote mark removed

    def test_rules_page_mentioning_table_is_skipped(self):
        self.assertEqual(table_pages(["규정 [별표1] 참조", CATALOG]), [2])

    def test_missing_table_is_an_error(self):
        _, issues = parse_catalog(["no table here"])
        self.assertEqual(issues[0]["code"], "NO_CATALOG")


class ProgramTests(unittest.TestCase):
    CAT = rows([
        ("A1", "미분방정식", 3, "전공기초"), ("A2", "선형대수", 3, "전공기초"),
        ("B1", "자료구조", 3, "전공필수"), ("C1", "딥러닝", 3, "전공선택"), ("C2", "고급딥러닝", 3, "전공선택"),
    ])

    def credits(self, b, r, s):
        return {"available": True, "기초": b, "필수": r, "선택": s}

    def rule_of(self, groups, cat):
        return next(g["rule"] for g in groups if g["category"] == cat)

    def test_equal_credits_mean_all(self):
        groups, problems = make_groups(self.CAT, self.credits(6, 3, 3), None)
        self.assertEqual(problems, [])
        self.assertEqual(self.rule_of(groups, "전공기초"), "all")
        self.assertEqual(self.rule_of(groups, "전공선택"), "choose")

    def test_more_courses_than_credits_mean_choose(self):
        groups, _ = make_groups(self.CAT, self.credits(3, 3, 3), None)
        self.assertEqual(self.rule_of(groups, "전공기초"), "choose")

    def test_fewer_courses_than_credits_is_a_problem(self):
        groups, problems = make_groups(self.CAT, self.credits(9, 3, 3), None)
        self.assertEqual(self.rule_of(groups, "전공기초"), "unknown")
        self.assertTrue(problems)

    def test_zero_credit_category_is_dropped(self):
        groups, _ = make_groups(self.CAT, self.credits(0, 3, 3), None)
        self.assertNotIn("전공기초", [g["category"] for g in groups])

    def test_longest_name_wins(self):
        found = mentioned("전공선택: 고급딥러닝, 자료구조", self.CAT)
        self.assertEqual(sorted(r["code"] for r in found), ["B1", "C2"])


@unittest.skipUnless(COURSES.exists() and SECTIONS.exists(), "run book.py and programs.py first")
class RealDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(COURSES.read_text(encoding="utf-8"))
        cls.sections = json.loads(SECTIONS.read_text(encoding="utf-8"))

    def test_book_manifest(self):
        self.assertEqual(self.sections["n_pages"], 1628)
        self.assertEqual(len(self.sections["sections"]), 78)

    def test_cs_double_and_minor_are_verified(self):
        p = self.data["depts"]["컴퓨터공학과"]["programs"]
        self.assertEqual(p["double"]["status"], "verified")
        self.assertEqual(p["minor"]["status"], "verified")
        self.assertEqual(p["double"]["page"], 398)

    def test_no_name_keeps_a_footnote_mark(self):
        for dept, d in self.data["depts"].items():
            for c in d["catalog"]:
                self.assertNotIn("※", c["name"], dept)

    def test_status_counts_do_not_regress(self):
        verified = sum(
            1 for d in self.data["depts"].values() for p in d["programs"].values() if p["status"] == "verified"
        )
        self.assertGreaterEqual(verified, 66)


if __name__ == "__main__":
    os.environ.setdefault("PIPELINE_YEAR", "2026")
    unittest.main()
