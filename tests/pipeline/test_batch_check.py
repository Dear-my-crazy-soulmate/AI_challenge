"""Tests for step F (batch_check): every verdict must be reachable.

  python -I tests/pipeline/test_batch_check.py

check_pages() takes page texts, so synthetic departments need no PDF.
"""
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "scripts" / "pipeline"))

import batch_check as bc  # noqa: E402
from paths import RAW_DIR  # noqa: E402

FILLER = "일반 설명 문장입니다. " * 5


def course_lines(n: int, credits: int = 3, start: int = 1) -> str:
    """Raw-style table lines: `<row> <name> <code> <credits> ...`."""
    return "\n".join(f"{i} 과목{i} CSE{100 + i} {credits} 3 1 ◯" for i in range(start, start + n))


def good_pages(table_rows: int = 9, credits: int = 3):
    """A minimal healthy department: (layout pages, raw pages)."""
    structure = "4. 졸업 요건\n1) 교육과정 기본구조표\n전공학점\n학과 130 12 42 27 81 6 12 30 9 51 -\n" + FILLER
    double_rule = "다전공과정으로 이수하고자 하는 학생은 ...\n" + FILLER
    table = "[별표1] 교육과정 편성표\n학수번호\n" + course_lines(table_rows, credits)
    layout = [structure, double_rule, table]
    return layout, list(layout)  # raw text is the same for these simple pages


def run(layout, raw=None):
    r = bc.check_pages("테스트학과", layout, raw if raw is not None else list(layout))
    r["verdict"] = bc.verdict(r)
    return r


class VerdictTest(unittest.TestCase):
    def test_healthy_department_is_green(self):
        r = run(*good_pages())
        self.assertEqual((r["verdict"], r["red"], r["yellow"], r["rows"]), ("GREEN", [], [], 9))

    def test_scanned_pdf_is_red(self):
        layout, raw = good_pages()
        layout = layout + ["", " ", ""]  # 3 of 6 pages have no text
        r = run(layout, raw + ["", " ", ""])
        self.assertEqual(r["verdict"], "RED")
        self.assertIn("스캔본 의심", r["red"][0])

    def test_missing_structure_double_and_table_are_red(self):
        r = run([FILLER, FILLER, FILLER])
        self.assertEqual(r["verdict"], "RED")
        self.assertEqual(r["red"], ["기본구조표 미탐지", "다전공 근거 미탐지", "과목표 미탐지"])

    def test_row_number_gap_is_red_with_reason(self):
        layout, raw = good_pages()
        raw[2] = raw[2].replace("5 과목5", "7 과목5")  # table prints 7 where row 5 should be
        r = run(layout, raw)
        self.assertEqual(r["verdict"], "RED")
        self.assertIn("과목표 파싱 실패", r["red"][0])

    def test_credits_over_six_is_yellow(self):
        r = run(*good_pages(credits=9))
        self.assertEqual((r["verdict"], r["red"]), ("YELLOW", []))
        self.assertIn("학점 6 초과", r["yellow"][0])

    def test_structure_without_sum_pattern_is_yellow(self):
        layout, raw = good_pages()
        raw[0] = raw[0].replace("130 12 42 27 81 6 12 30 9 51", "130 12 42 27 99 6 12 30 9 50")  # neither row adds up
        r = run(layout, raw)
        self.assertEqual(r["verdict"], "YELLOW")
        self.assertIn("숫자열", r["yellow"][0])

    def test_many_duplicate_codes_are_yellow_few_are_only_a_note(self):
        layout, raw = good_pages()
        table = raw[2]
        raw[2] = table + "\n10 a CSE101 3 3 1 ◯"  # one duplicated code
        r = run(layout, raw)
        self.assertEqual((r["verdict"], "중복 1개" in r["notes"]), ("GREEN", True))
        raw[2] = table + "\n10 a CSE101 3 3 1 ◯\n11 b CSE102 3 3 1 ◯\n12 c CSE103 3 3 1 ◯"  # three
        r = run(layout, raw)
        self.assertEqual(r["verdict"], "YELLOW")
        self.assertIn("학수번호 중복 3개", r["yellow"][0])

    def test_too_many_table_candidate_pages_is_yellow(self):
        layout, raw = good_pages()
        start = 1
        for _ in range(9):
            layout.append("교육과정 편성표\n학수번호\n" + course_lines(9, start=start))
            start += 9
        r = run(layout[:2] + layout[3:], raw[:2] + layout[3:])  # replace the single table page
        self.assertEqual(r["verdict"], "YELLOW")
        self.assertIn("과목표 후보 쪽", r["yellow"][0])


class StructureSumTest(unittest.TestCase):
    def test_finds_sum_pattern(self):
        self.assertTrue(bc.has_structure_sum("철학과 120 6 6 52 64 0 6 6 27 39"))
        self.assertTrue(bc.has_structure_sum("130 12 42 27 81"))

    def test_rejects_text_without_a_sum(self):
        self.assertFalse(bc.has_structure_sum("1 2 3 4 5 6 7 8 99"))
        self.assertFalse(bc.has_structure_sum("아무 숫자도 없음"))


class FolderTest(unittest.TestCase):
    def test_empty_and_missing_folders_are_reported_not_crashed(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(bc.check_folder(Path(d)), [])
            self.assertEqual(bc.main([d, str(Path(d) / "out")]), 2)
            self.assertEqual(bc.main([str(Path(d) / "nope"), d]), 2)

    @unittest.skipUnless((RAW_DIR / "철학과.pdf").exists(), "needs data/raw/철학과.pdf")
    def test_a_broken_pdf_does_not_stop_the_others_and_is_reported(self):
        with tempfile.TemporaryDirectory() as d:
            folder, out = Path(d) / "pdfs", Path(d) / "out"
            folder.mkdir()
            shutil.copy(RAW_DIR / "철학과.pdf", folder / "철학과.pdf")
            (folder / "깨진파일.pdf").write_text("this is not a pdf", encoding="utf-8")
            code = bc.main([str(folder), str(out)])
            results = {r["dept"]: r for r in bc.check_folder(folder)}
            self.assertEqual(code, 1)  # tool error on one file
            self.assertEqual(results["철학과"]["verdict"], "GREEN")  # the good one still processed
            self.assertEqual(results["깨진파일"]["verdict"], "RED")
            self.assertIn("점검 도구 오류", results["깨진파일"]["red"][0])
            self.assertIn("깨진파일", (out / "report.md").read_text(encoding="utf-8"))
            self.assertTrue((out / "report.csv").read_bytes().startswith(b"\xef\xbb\xbf"))  # BOM for Excel

    @unittest.skipUnless(all((RAW_DIR / f"{n}.pdf").exists() for n in ("인공지능학과", "철학과", "컴퓨터공학과", "소프트웨어융합학과")),
                         "needs the four PDFs")
    def test_four_known_departments_finish_without_error(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(bc.main([str(RAW_DIR), d]), 0)
            rows = {r["dept"]: r for r in bc.check_folder(RAW_DIR)}
            self.assertEqual({k: v["rows"] for k, v in rows.items()},
                             {"인공지능학과": 67, "철학과": 45, "컴퓨터공학과": 93, "소프트웨어융합학과": 103})


if __name__ == "__main__":
    unittest.main(verbosity=2)
