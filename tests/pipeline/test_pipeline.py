"""Pipeline tests (stdlib unittest; no extra packages).

Run: python -I tests/pipeline/test_pipeline.py
Tests that need real PDFs are skipped when data/raw/<dept>.pdf is missing.
"""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "pipeline"))

from detect import EXPECTED, detect_roles, is_grad_structure, is_microdegree, squash  # noqa: E402
from ingest import extract_pages  # noqa: E402
from parse_table import ParseTableError, parse_dept, parse_page  # noqa: E402
from paths import RAW_DIR  # noqa: E402


class DetectRulesTest(unittest.TestCase):
    def test_general_education_structure_table_is_not_grad_structure(self):
        sq = squash("교양교육과정 기본구조표 전공학점")
        self.assertFalse(is_grad_structure(sq))

    def test_major_structure_table_is_grad_structure(self):
        sq = squash("3. 교육과정 기본 구조표 ... 전공 학점")
        self.assertTrue(is_grad_structure(sq))

    def test_microdegree_reference_in_regulation_is_not_a_microdegree_page(self):
        # A rule article that merely points at the table must not match.
        text = (
            "마이크로디그리 과정을 이수하고자 하는 자는 ‘[별표4] 마이크로디그리 이수체계도’에서 "
            "지정한 소정의 학점을 충족하여야 한다. " + "제도에 관한 일반 설명입니다. " * 60
        )
        self.assertFalse(is_microdegree(squash(text)))

    def test_microdegree_page_with_name_field(self):
        text = "마이크로디그리 이수체계도 마이크로디그리명 문명과 철학 마이크로디그리 학점"
        self.assertTrue(is_microdegree(squash(text)))

    def test_course_table_needs_codes_and_continues_to_next_page(self):
        codes = " ".join(f"CSE{100 + n}" for n in range(9))
        first = "별표1 교육과정 편성표 학수번호 " + codes
        cont = codes.replace("CSE1", "SWC1")  # no title, but still codes
        found = detect_roles([first, cont, "일반 텍스트 페이지"])
        self.assertEqual(found["course_table"], [1, 2])

    def test_transition_page_is_excluded_from_course_table(self):
        codes = " ".join(f"CSE{100 + n}" for n in range(9))
        page = "교육과정 편성표 학수번호 경과조치 " + codes
        self.assertEqual(detect_roles([page])["course_table"], [])

    def test_empty_input_gives_empty_roles(self):
        self.assertTrue(all(v == [] for v in detect_roles([]).values()))


class DetectOnRealPdfTest(unittest.TestCase):
    def test_recall_is_one_on_known_departments(self):
        for dept, expected in EXPECTED.items():
            pdf = RAW_DIR / f"{dept}.pdf"
            if not pdf.exists():
                continue
            with self.subTest(dept=dept):
                found = detect_roles(extract_pages(pdf))
                for role, want in expected.items():
                    missing = set(want) - set(found[role])
                    self.assertEqual(missing, set(), f"{dept}/{role} missed pages")

    def test_missing_pdf_raises_instead_of_failing_silently(self):
        with self.assertRaises(Exception):
            extract_pages(RAW_DIR / "존재하지않는학과.pdf")


class ParseTableRulesTest(unittest.TestCase):
    HEADER = "헤더 쓰레기 CSE000 9\n"  # the first row of a page is ignored on purpose

    def test_wrapped_name_is_joined_and_category_words_removed(self):
        raw = "44\n모바일/웹서비스\n프로그래밍\nCSE450 3 3 4 ◯\n5 전공\n필수\n자료구조 CSE204 3 2 2 2 ◯"
        rows = parse_page(self.HEADER + raw, page=8)
        self.assertEqual([r["name"] for r in rows[1:]], ["모바일/웹서비스프로그래밍", "자료구조"])
        self.assertEqual([r["credits"] for r in rows[1:]], [3, 3])

    def test_vertical_one_character_name_is_joined(self):
        raw = "x CSE001 3\n58 몰\n입\n심\n화\nAI3103 3 3"
        self.assertEqual(parse_page(raw, 1)[1]["name"], "몰입심화")

    def test_zero_credit_course_is_kept_as_zero(self):
        rows = parse_page("x CSE001 3\n9 졸업논문(인공지능) AI4003 0 4 ◯", 1)
        self.assertEqual(rows[1]["credits"], 0)

    def test_missing_credits_raises(self):
        with self.assertRaises(ParseTableError):
            parse_page("x CSE001 3\n9 졸업논문 AI4003", 1)


class ParseTableOnRealPdfTest(unittest.TestCase):
    EXPECTED_ROWS = {"인공지능학과": 67, "철학과": 45}

    def setUp(self):
        from paths import WORK_DIR

        for dept in self.EXPECTED_ROWS:
            if not (WORK_DIR / f"{dept}.pages.json").exists():
                self.skipTest("run ingest.py first (needs data/raw PDFs)")

    def test_row_counts_and_special_credits(self):
        for dept, n in self.EXPECTED_ROWS.items():
            with self.subTest(dept=dept):
                rows = parse_dept(dept)
                self.assertEqual(len(rows), n)
                self.assertEqual([r["row"] for r in rows], list(range(1, n + 1)))
        ai = {r["code"]: r for r in parse_dept("인공지능학과")}
        ph = {r["code"]: r for r in parse_dept("철학과")}
        self.assertEqual(ai["CSE438"]["credits"], 2)
        self.assertEqual(ai["AI4003"]["credits"], 0)
        self.assertEqual(ph["HUMAN1001"]["credits"], 1)
        self.assertEqual(ph["PHIL4004"]["credits"], 0)

    def test_split_names_in_real_table(self):
        names = {r["code"]: r["name"] for r in parse_dept("인공지능학과")}
        self.assertEqual(names["CSE450"], "모바일/웹서비스프로그래밍")
        self.assertEqual(names["AI3103"], "몰입심화학습(AI데이터·클라우드디자인)")


if __name__ == "__main__":
    unittest.main(verbosity=2)
