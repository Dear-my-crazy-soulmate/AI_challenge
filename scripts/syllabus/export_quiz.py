"""Step 5 of the 체험 문제 pipeline: write what the app reads, one file per department.

Runs build_questions.py first (check every written question, rebuild data/drafts/quiz/depts/), then copies the questions
to public/quiz/<id>.json plus public/quiz/index.json. Only `approved` questions are exported (CLAUDE.md rule 7).
`--preview` also exports the code-verified ones, into public/quiz-preview/ (git-ignored), for looking at the screen locally;
the app reads that folder only when it is built with NEXT_PUBLIC_QUIZ_PREVIEW=1.

Run it after every batch of new questions: python -I scripts/syllabus/export_quiz.py [--preview] [--approve-all]
`--approve-all` approves everything that passed the code checks (for trying the screen); the app still marks questions a person has
not read ("reviewed": false, listed in data/drafts/quiz/_reviewed.json once someone has) with "확인 전 문제".
"""
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_questions import main as build  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DEPTS = ROOT / "data" / "drafts" / "quiz" / "depts"
CREDITS = ROOT / "data" / "curated" / "credits_global.json"


def question(q: dict) -> dict:
    """The shape src/lib/quiz.ts QuizQuestion reads."""
    return {
        "id": q["id"], "skill": q["course"], "question": q["question"], "options": q["options"], "answer": q["answer"],
        "explanation": q["explanation"], "status": q["status"], "reviewed": q["reviewed"], "is_sample": False, "flow": q["flow"],
        "evidence": {"week": q["evidence"]["week"], "topic": q["evidence"]["topic"]}, "source": q["source"],
    }


def main(argv: list[str]) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    preview = "--preview" in argv
    build()  # the exit code (1 = some question has a problem) does not stop the export: those questions are simply left out
    if "--approve-all" in argv:  # trial run of the screen: every question that passed the code checks becomes approved, none becomes "reviewed"
        codes = sorted({q["subjt_cd"] for f in DEPTS.glob("*.json") for q in json.loads(f.read_text(encoding="utf-8"))["questions"]})
        (ROOT / "data" / "drafts" / "quiz" / "_approved.json").write_text(json.dumps(codes, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
        build()
    out = ROOT / "public" / ("quiz-preview" if preview else "quiz")
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    order = [d["dept"] for d in json.loads(CREDITS.read_text(encoding="utf-8"))]
    index = []
    for n, dept in enumerate(order, start=1):
        f = DEPTS / f"{dept}.json"
        if not f.exists():
            continue
        rec = json.loads(f.read_text(encoding="utf-8"))
        qs = [question(q) for q in rec["questions"] if q["status"] == "approved" or preview]
        if not qs:
            continue
        ident = f"d{n:02d}"
        (out / f"{ident}.json").write_text(json.dumps({"dept": dept, "college": rec["college"], "questions": qs}, ensure_ascii=False) + "\n", encoding="utf-8")
        index.append({"id": ident, "dept": dept, "college": rec["college"], "count": len(qs)})
    (out / "index.json").write_text(json.dumps(index, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"exported {sum(e['count'] for e in index)} questions for {len(index)} departments -> {out.relative_to(ROOT)}{' (preview: includes unapproved)' if preview else ''}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
