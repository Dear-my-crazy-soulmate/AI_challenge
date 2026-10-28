"""The code checks on written 체험 문제 (scripts/syllabus/build_questions.py): evidence, flow weeks, options, answer position."""
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "syllabus"))
from build_questions import LETTER, arrange, check_question, position  # noqa: E402

WEEKS = {1: "강의 소개", 2: "Stack의 동작 원리 및 활용 사례를 학습하고,\n다양한 문제에서 적용", 3: "Queue", 5: "Tree"}


def question(**over):
    q = {
        "subjt_cd": "CSE204",
        "question": "뒤로 가기는 어떻게 동작할까요?",
        "options": ["스택", "무작위", "속도순", "정렬"],
        "explanation": "나중에 넣은 것을 먼저 꺼내요.",
        "flow": "🎓 2주차 Stack, 3주차 Queue로 이어져요.",
        "evidence": {"week": 2, "topic": "Stack의 동작 원리 및 활용 사례를 학습하고", "related_weeks": [3]},
    }
    return {**q, **over}


class CheckTests(unittest.TestCase):
    def test_good_question_passes(self):
        self.assertEqual(check_question(question(), WEEKS), [])

    def test_evidence_must_be_a_verbatim_part_of_that_week(self):
        self.assertTrue(check_question(question(evidence={"week": 2, "topic": "스택을 학습한다", "related_weeks": []}), WEEKS))
        self.assertTrue(check_question(question(evidence={"week": 9, "topic": "Stack", "related_weeks": []}), WEEKS))
        self.assertEqual(check_question(question(evidence={"week": 2, "topic": "적용 방법", "related_weeks": []}), WEEKS)[0][:6], "근거 문구가")

    def test_line_breaks_and_spacing_in_the_syllabus_do_not_matter(self):
        ok = question(evidence={"week": 2, "topic": "학습하고, 다양한 문제에서", "related_weeks": []})
        self.assertEqual(check_question(ok, WEEKS), [])

    def test_weeks_named_in_the_flow_must_exist(self):
        self.assertTrue(check_question(question(flow="🎓 2~3주차 Stack과 9주차 Graph"), WEEKS))
        self.assertTrue(check_question(question(flow="2주차 Stack"), WEEKS))  # no 🎓

    def test_options_must_be_four_different_ones(self):
        self.assertTrue(check_question(question(options=["a", "b", "c"]), WEEKS))
        self.assertTrue(check_question(question(options=["a", "b", "c", "a"]), WEEKS))

    def test_explanation_is_body_only(self):
        self.assertTrue(check_question(question(explanation="정답 ② 스택이에요"), WEEKS))
        self.assertEqual(check_question(question(explanation="정답이 맞아도 근거는 따로 봐야 해요"), WEEKS), [])


class PersonalDataTests(unittest.TestCase):
    """What the school's page hides (names, 학번, e-mail, phone, links) must never reach a question or the saved syllabus."""

    def test_questions_with_personal_data_are_caught(self):
        from build_questions import personal_data

        self.assertEqual(personal_data(question()), [])
        for text in ("문의: kim@khu.ac.kr", "전화 031-201-3460", "학번 2021103456", "자료는 https://example.com 참고"):
            self.assertTrue(personal_data(question(explanation=text)), text)
            self.assertTrue(personal_data(question(options=[text, "b", "c", "d"])), text)

    def test_scrub_keeps_only_the_whitelist_and_blanks_what_is_left(self):
        import fetch_plans as fp

        sections = {
            "기본정보": [["강좌명", "자료구조", "교강사명", "홍길동(소프트웨어융합대학)"], ["연락처", "031-201-0000", "이메일", "a@b.kr"], ["학점", "3", "면담시간", "수업 후"]],
            "수업개요 및 목표": [["수업개요", "홍길동 교수 문의 hong@khu.ac.kr 010-1234-5678 학번 2021103456 https://x.kr"]],
            "장애학생지원내용": [["센터", "02-961-2104"]],
            "주별강의내용": [["1주", "3/3 ~ 3/9", "Stack 소개", ""]],
        }
        clean, info, found = fp.scrub(sections)
        self.assertEqual(info, {"강좌명": "자료구조", "학점": "3"})
        self.assertNotIn("장애학생지원내용", clean)
        text = str(clean)
        for leaked in ("홍길동", "hong@", "010-1234", "2021103456", "https://"):
            self.assertNotIn(leaked, text)
        self.assertEqual((found["emails"], found["phones"], found["student_ids"], found["links"]), (1, 1, 1, 1))
        self.assertEqual(fp.weeks_of(clean)[0]["topic"], "Stack 소개")


class ArrangeTests(unittest.TestCase):
    def test_correct_option_goes_to_its_fixed_place_and_the_letter_matches(self):
        for code in ("CSE204", "AI1002", "VID2027", "SM201", "EE211"):
            q = question(subjt_cd=code)
            out = arrange(q)
            self.assertEqual(out["options"][out["answer"]], "스택")
            self.assertEqual(sorted(out["options"]), sorted(q["options"]))
            self.assertTrue(out["explanation"].startswith(f"정답 {LETTER[out['answer']]} "))

    def test_position_is_stable_and_spread_over_all_four(self):
        self.assertEqual(position("CSE204"), position("CSE204"))
        counts = [0] * 4
        for i in range(2000):
            counts[position(f"X{i}")] += 1
        self.assertTrue(all(400 <= c <= 600 for c in counts), counts)


if __name__ == "__main__":
    os.environ.setdefault("PIPELINE_YEAR", "2026")
    unittest.main()
