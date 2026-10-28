"""Step 3 of the 체험 문제 pipeline: compact reading packets, so each course is read once and questions are written from them.

Input : data/extracted/2026/syllabus_courses.json, data/curated/2026/courses.json (book: which department lists which course),
        data/work/syllabus/2026/<학수번호>.json (fetch_plans.py)
Output: data/work/syllabus/2026/packets/<n>.txt   (git-ignored)  + packets/_index.json
Each course appears once, under the first department (in credit-overview order) whose book catalog lists it;
`depts` in the packet shows every department that lists it, with its 이수구분.
Courses whose name is clearly a capstone / thesis / field practice / independent study are not packeted:
they go to the skip list with the reason, so nobody reads them.

Run: python -I scripts/syllabus/packets.py [per_packet=15] [only_dept]
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSES = ROOT / "data" / "extracted" / "2026" / "syllabus_courses.json"
BOOK = ROOT / "data" / "curated" / "2026" / "courses.json"
CREDITS = ROOT / "data" / "curated" / "credits_global.json"
WORK = ROOT / "data" / "work" / "syllabus" / "2026"
OUT = WORK / "packets"

AUTO_SKIP = [
    (re.compile(r"캡스톤|캡스톤디자인"), "캡스톤: 학생이 프로젝트를 수행하는 과목"),
    (re.compile(r"졸업논문|졸업프로젝트|졸업작품|졸업연구|졸업과제|졸업전시|졸업공연"), "졸업논문·졸업작품: 학생이 직접 수행하는 과목"),
    (re.compile(r"현장실습|인턴십|현장연구|산학협력프로젝트"), "현장실습: 학교 밖 실습 과목"),
    (re.compile(r"독립심화|몰입심화|개별연구|자율연구"), "독립심화·몰입심화: 학생별로 내용이 달라지는 과목"),
]
PASS = re.compile(r"오리엔테이션|시험|휴강|보강|고사|평가|발표|Mid|Final|exam|Exam|orientation|Orientation|Introduction$|intro", re.I)


def skip_reason(name: str) -> str | None:
    return next((why for rx, why in AUTO_SKIP if rx.search(name)), None)


def short(s: str, n: int) -> str:
    s = " ".join(s.split())
    return s if len(s) <= n else s[: n - 1] + "…"


def packet_text(code: str, c: dict, plan: dict, depts: dict[str, str]) -> str:
    sec = plan["sections"]
    kv = {r[0]: r[1] for r in sec.get("수업개요 및 목표", []) if len(r) >= 2}
    ev = " | ".join(f"{r[0]} {r[1]}" for r in sec.get("평가방법", []) if len(r) >= 2 and r[1] not in ("0%", "") and r[0] != "평가항목")
    lines = [f"## {code} {c['name']}  ({c['credits']:g}학점, {c['term']=='10' and '1학기' or '2학기'})  depts: " + ", ".join(f"{d}={k}" for d, k in depts.items())]
    lines.append(f"개요: {short(kv.get("수업개요", ""), 200)}")
    if kv.get("수업목표") and len(kv.get("수업개요", "")) < 60:  # the goal line only when the overview says (almost) nothing
        lines.append(f"목표: {short(kv['수업목표'], 160)}")
    if ev:
        lines.append(f"평가: {short(ev, 140)}")
    rows: list[tuple[int, int, str]] = []  # (first week, last week, topic); the same topic on later weeks is one line
    prev = None
    for w in plan["weeks"]:
        t = " ".join(w["topic"].split())
        if not t or (PASS.search(t) and len(t) < 40):
            continue
        key = re.sub(r"[\d①②③④]+", "", t)[:40]
        if rows and key == prev:
            rows[-1] = (rows[-1][0], w["week"], rows[-1][2])
        else:
            rows.append((w["week"], w["week"], short(t, 80)))
        prev = key
    for a, b, t in rows:
        lines.append(f"{a}주: {t}" if a == b else f"{a}~{b}주: {t}")
    return "\n".join(lines)


def department_courses() -> tuple[dict[str, dict], dict[str, dict[str, str]], list[str]]:
    """(site courses by 학수번호, {학수번호: {학과: 이수구분}}, 학과 순서) - departments come from the book catalog."""
    site = {c["subjt_cd"]: c for c in json.loads(COURSES.read_text(encoding="utf-8"))["courses"]}
    book = json.loads(BOOK.read_text(encoding="utf-8"))["depts"]
    order = [d["dept"] for d in json.loads(CREDITS.read_text(encoding="utf-8"))]
    listed: dict[str, dict[str, str]] = {}
    for d in order:
        for r in book.get(d, {}).get("catalog", []):
            if r["code"] in site:
                listed.setdefault(r["code"], {})[d] = r["category"]
    return site, listed, order


BATCHES = ROOT / "data" / "drafts" / "quiz" / "_batches"
ASSIGNMENTS = WORK / "assignments"


def written_codes() -> set[str]:
    """Courses that already have a question or a skip decision (any file in _batches)."""
    done: set[str] = set()
    for f in BATCHES.glob("*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except ValueError:  # another writer is in the middle of saving this file; it counts next time
            continue
        done |= set(data) if isinstance(data, dict) else {q["subjt_cd"] for q in data}
    return done


def todo_codes() -> tuple[list[str], int]:
    """(fetched courses nobody has written yet, in department order of the credit overview; how many are not fetched yet)."""
    done = written_codes()
    site, listed, order = department_courses()
    rank = {d: i for i, d in enumerate(order)}
    todo, waiting = [], 0
    for code, depts in sorted(listed.items(), key=lambda kv: (rank[next(iter(kv[1]))], kv[0])):
        if code in done or skip_reason(site[code]["name"]):
            continue
        if (WORK / f"{code}.json").exists():
            todo.append(code)
        else:
            waiting += 1
    return todo, waiting


def show(codes: list[str], n: int) -> None:
    site, listed, _ = department_courses()
    for code in codes[:n]:
        print(packet_text(code, site[code], json.loads((WORK / f"{code}.json").read_text(encoding="utf-8")), dict(list(listed[code].items())[:4])) + "\n")


def next_courses(n: int) -> int:
    """Print the packets of the next `n` courses nobody has written (or skipped) yet, in department order."""
    todo, waiting = todo_codes()
    show(todo, n)
    print(f"[left to write: {len(todo)} fetched, {waiting} not fetched yet]")
    return 0


def assign(parts: int, prefix: str = "a") -> int:
    """Split everything not written yet into `parts` fixed lists (whole departments stay together as far as possible).
    `prefix` keeps a later round apart from an earlier one (a01.. then b01..): their batch files must never share a name."""
    todo, _ = todo_codes()
    ASSIGNMENTS.mkdir(parents=True, exist_ok=True)
    for old in ASSIGNMENTS.glob(f"{prefix}*.json"):
        old.unlink()
    _, listed, _ = department_courses()
    size = -(-len(todo) // parts)
    for i in range(parts):
        codes = todo[i * size : (i + 1) * size]
        name = f"{prefix}{i + 1:02d}"
        depts = list(dict.fromkeys(next(iter(listed[c])) for c in codes))
        (ASSIGNMENTS / f"{name}.json").write_text(json.dumps({"agent": name, "codes": codes, "departments": depts}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"{name}: {len(codes)} courses, departments: {', '.join(depts)}")
    return 0


def agent_courses(assignment: str, n: int) -> int:
    """Print the next `n` courses of one assignment that are not written yet."""
    codes = json.loads(Path(assignment).read_text(encoding="utf-8"))["codes"]
    done = written_codes()
    left = [c for c in codes if c not in done]
    show(left, n)
    print(f"[left in this assignment: {len(left)} of {len(codes)}]")
    return 0


def main(argv: list[str]) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    if argv and argv[0] == "next":
        return next_courses(int(argv[1]) if len(argv) > 1 else 12)
    if argv and argv[0] == "assign":
        return assign(int(argv[1]), argv[2] if len(argv) > 2 else "a")
    if argv and argv[0] == "agent":
        return agent_courses(argv[1], int(argv[2]) if len(argv) > 2 else 12)
    per = int(argv[0]) if argv else 15
    only = argv[1] if len(argv) > 1 else None
    site, listed, _ = department_courses()
    skipped, no_plan, todo = {}, [], []
    for code, depts in sorted(listed.items(), key=lambda kv: (next(iter(kv[1])), kv[0])):
        if only and only not in depts:
            continue
        why = skip_reason(site[code]["name"])
        if why:
            skipped[code] = {"name": site[code]["name"], "reason": why, "depts": list(depts)}
        elif (WORK / f"{code}.json").exists():
            todo.append(code)
        else:
            no_plan.append(code)  # not fetched yet
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.txt"):
        old.unlink()
    index = {"packets": [], "skipped": skipped, "not_fetched_yet": no_plan}
    for i in range(0, len(todo), per):
        chunk = todo[i : i + per]
        name = f"{i // per + 1:03d}"
        body = "\n\n".join(packet_text(c, site[c], json.loads((WORK / f"{c}.json").read_text(encoding="utf-8")), listed[c]) for c in chunk)
        (OUT / f"{name}.txt").write_text(body + "\n", encoding="utf-8")
        index["packets"].append({"packet": name, "courses": chunk})
    (OUT / "_index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(todo)} courses in {len(index['packets'])} packets, {len(skipped)} auto-skipped, {len(no_plan)} not fetched yet")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
