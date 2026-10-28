"""Step 4 of the 체험 문제 pipeline: check the written questions against the syllabi, then build one file per department.

Input : data/drafts/quiz/_batches/*.json  (authored by hand: options[0] is the correct answer, explanation has no "정답 ②" prefix)
        data/work/syllabus/2026/<학수번호>.json (fetch_plans.py), packets.department_courses()
Output: data/drafts/quiz/depts/<학과>.json, data/drafts/quiz/_summary.json
Every check is done by code: evidence must be a verbatim part of the named week's topic, the weeks named in the
course-flow sentence must exist, there are exactly 4 different options. Whether a concept is *true* is not checkable
here, so every question stays status "draft" until a person has read it.

Run: python -I scripts/syllabus/build_questions.py
"""
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from packets import department_courses, skip_reason  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / "data" / "work" / "syllabus" / "2026"
OUT = ROOT / "data" / "drafts" / "quiz"
BOOK = ROOT / "data" / "curated" / "2026" / "courses.json"
CREDITS = ROOT / "data" / "curated" / "credits_global.json"
LETTER = "①②③④"
WEEKS_IN_FLOW = re.compile(r"(\d+)(?:~(\d+))?주차")


def squash(s: str) -> str:
    return re.sub(r"\s+", "", s)


def check_question(q: dict, weeks: dict[int, str]) -> list[str]:
    """Problems found in one authored question (empty list = fine). `weeks` is {주차: 강의주제 원문}."""
    bad = []
    opts = q.get("options", [])
    if len(opts) != 4 or len({squash(o) for o in opts}) != 4:
        bad.append("보기는 서로 다른 4개여야 함")
    if not q.get("question", "").strip():
        bad.append("질문이 비어 있음")
    if re.match(r"\s*정답\s*[①②③④1-4]", q.get("explanation", "")) or not q.get("explanation", "").strip():
        bad.append("설명은 '정답 ②' 없이 본문만 적어야 함(번호는 코드가 붙임)")
    ev = q.get("evidence", {})
    topic = weeks.get(ev.get("week", -1))
    if topic is None:
        bad.append(f"근거 주차 {ev.get('week')}주가 계획서에 없음")
    elif not ev.get("topic") or squash(ev["topic"]) not in squash(topic):
        bad.append(f"근거 문구가 {ev.get('week')}주 원문에 없음: {ev.get('topic')!r}")
    for w in ev.get("related_weeks", []):
        if w not in weeks:
            bad.append(f"관련 주차 {w}주가 계획서에 없음")
    flow = q.get("flow", "")
    if not flow.startswith("🎓"):
        bad.append("과목 흐름 문장은 🎓로 시작해야 함")
    for a, b in WEEKS_IN_FLOW.findall(flow):
        for n in {int(a), int(b or a)}:
            if n not in weeks:
                bad.append(f"흐름 문장의 {n}주차가 계획서에 없음")
    return bad


PERSONAL = [  # same patterns fetch_plans.py blanks; nothing that matches may reach a question
    re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"),
    re.compile(r"(?<!\d)(?:\+?82[-\s.]?)?0\d{1,2}[-\s.)]*\d{3,4}[-\s.]*\d{4}(?!\d)"),
    re.compile(r"(?<!\d)(?:19|20)\d{8}(?!\d)"),
    re.compile(r"https?://\S+|www\.\S+|teach|p_teach"),
]


def personal_data(q: dict) -> list[str]:
    texts = [q.get("question", ""), q.get("explanation", ""), q.get("flow", ""), q.get("evidence", {}).get("topic", ""), *q.get("options", [])]
    return [f"개인정보·링크 모양이 있음: {m.group(0)[:20]}" for t in texts for rx in PERSONAL if (m := rx.search(t))]


def position(code: str) -> int:
    """Where the correct answer goes (0-3): fixed per course by its code, so adding questions never moves the old ones."""
    return int(hashlib.sha1(code.encode()).hexdigest(), 16) % 4


def arrange(q: dict) -> dict:
    """Authoring order -> final order: the correct option (first) moves to its fixed place, the others keep their order."""
    right, wrong = q["options"][0], q["options"][1:]
    at = position(q["subjt_cd"])
    options = wrong[:at] + [right] + wrong[at:]
    return {"options": options, "answer": at, "explanation": f"정답 {LETTER[at]} {q['explanation']}"}


def batch_files() -> list[Path]:
    return [f for f in sorted((OUT / "_batches").glob("*.json")) if not f.name.startswith("skip_")]


def check_file(path: str) -> int:
    """Check one batch file on its own (questions or a skip_ file) and write nothing. Several writers can use this at once."""
    sys.stdout.reconfigure(encoding="utf-8")
    site, listed, _ = department_courses()
    target = Path(path)
    data = json.loads(target.read_text(encoding="utf-8"))
    others = set()
    for f in sorted((OUT / "_batches").glob("*.json")):
        if f.resolve() != target.resolve():
            try:
                d = json.loads(f.read_text(encoding="utf-8"))
            except ValueError:  # another writer is saving it right now
                continue
            others |= set(d) if isinstance(d, dict) else {q["subjt_cd"] for q in d}
    bad: dict[str, list[str]] = {}
    codes = []
    if target.name.startswith("skip_"):
        for code, v in data.items():
            codes.append(code)
            if code not in listed:
                bad[code] = ["알 수 없는 과목"]
            elif not v.get("name") or not v.get("reason"):
                bad[code] = ["name과 reason이 필요함"]
    else:
        for q in data:
            code = q["subjt_cd"]
            codes.append(code)
            plan_file = WORK / f"{code}.json"
            if code not in listed or not plan_file.exists():
                bad[code] = ["이 과목의 계획서나 학과 배정이 없음"]
                continue
            plan = json.loads(plan_file.read_text(encoding="utf-8"))
            problems = check_question(q, {w["week"]: w["topic"] for w in plan["weeks"]}) + personal_data(q)
            if problems:
                bad[code] = problems
    for code in {c for c in codes if codes.count(c) > 1}:
        bad.setdefault(code, []).append("이 파일 안에 같은 과목이 두 번 있음")
    for code in set(codes) & others:
        bad.setdefault(code, []).append("다른 파일에 이미 같은 과목이 있음")
    print(f"{target.name}: {len(codes)} items, {len(bad)} with problems")
    for code, b in bad.items():
        print(" !", code, b)
    return 1 if bad else 0


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    site, listed, order = department_courses()
    college = {d["dept"]: d["college"] for d in json.loads(CREDITS.read_text(encoding="utf-8"))}
    book = json.loads(BOOK.read_text(encoding="utf-8"))["depts"]

    # passed every code check -> "verified"; a person reads it and lists its code in _approved.json -> "approved" (CLAUDE.md rule 7)
    approved_file = OUT / "_approved.json"
    approved = set(json.loads(approved_file.read_text(encoding="utf-8"))) if approved_file.exists() else set()
    authored: dict[str, dict] = {}
    problems: dict[str, list[str]] = {}
    for f in batch_files():
        for q in json.loads(f.read_text(encoding="utf-8")):
            code = q["subjt_cd"]
            plan_file = WORK / f"{code}.json"
            if code in authored:
                problems[code] = ["같은 과목의 문제가 두 번 있음"]
            elif code not in listed or not plan_file.exists():
                problems[code] = ["이 과목의 계획서나 학과 배정이 없음"]
            else:
                plan = json.loads(plan_file.read_text(encoding="utf-8"))
                bad = check_question(q, {w["week"]: w["topic"] for w in plan["weeks"]}) + personal_data(q)
                if bad:
                    problems[code] = bad
                else:
                    authored[code] = {**q, "_plan": plan}

    skipped = {c: {"name": site[c]["name"], "reason": r} for c in listed if (r := skip_reason(site[c]["name"]))}
    for f in sorted((OUT / "_batches").glob("skip_*.json")):  # skips decided by reading the syllabus
        skipped.update(json.loads(f.read_text(encoding="utf-8")))

    depts_dir = OUT / "depts"
    depts_dir.mkdir(parents=True, exist_ok=True)
    for old in depts_dir.glob("*.json"):
        old.unlink()
    summary, answers = [], Counter()
    for dept in order:
        mine = {c: cat for c, cat in ((c, d.get(dept)) for c, d in listed.items()) if cat}
        questions, skips, waiting = [], [], []
        for code, cat in sorted(mine.items()):
            name = site[code]["name"]
            if code in authored:
                q = authored[code]
                plan = q["_plan"]
                final = arrange(q)
                answers[final["answer"]] += 1 if dept == next(iter(listed[code])) else 0  # count each question once
                questions.append({
                    "id": f"q-{code}", "subjt_cd": code, "course": name, "category": cat, "status": "approved" if code in approved else "verified", "question": q["question"],
                    **final, "flow": q["flow"], "evidence": q["evidence"],
                    "source": {
                        "site": "https://sugang.khu.ac.kr", "path": f"종합시간표 조회 > 2026학년도 {plan['term_label']} > 학수번호 {code} 강의계획서",
                        "as_of": f"2026학년도 {plan['term_label']} 강의계획서",
                    },
                    "is_sample": False,
                })
            elif code in skipped:
                skips.append({"subjt_cd": code, "course": name, "category": cat, **skipped[code]})
            else:
                waiting.append({"subjt_cd": code, "course": name, "category": cat})  # no question written yet
        no_plan = [{"subjt_cd": r["code"], "course": r["name"]} for r in book.get(dept, {}).get("catalog", []) if r["code"] not in site]
        record = {
            "dept": dept, "college": college[dept], "as_of": "2026학년도 강의계획서",
            "counts": {"questions": len(questions), "skipped": len(skips), "not_written_yet": len(waiting), "no_plan_in_2026": len(no_plan)},
            "questions": questions, "skipped": skips, "not_written_yet": waiting, "no_plan_in_2026": no_plan,
        }
        (depts_dir / f"{dept}.json").write_text(json.dumps(record, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        summary.append({"dept": dept, **record["counts"]})
    (OUT / "_summary.json").write_text(json.dumps({"problems": problems, "answer_positions": {LETTER[k]: v for k, v in sorted(answers.items())}, "depts": summary}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    total = sum(answers.values())
    print(f"{len(authored)} questions OK, {len(problems)} with problems, answers {dict(sorted(answers.items()))} of {total}")
    for code, bad in problems.items():
        print(" !", code, bad)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(check_file(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[1] == "--check" else main())
