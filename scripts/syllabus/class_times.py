"""How classes are timed at 경희대 국제캠퍼스: the start times and meeting lengths that sections actually use.

Reads the same public 종합시간표 as collect.py (field `timetable`, e.g. "월 15:00-16:15 (전226)<BR>수 15:00-16:15 (전226)")
for the 2학기 of 국제캠퍼스, counts every meeting, and writes the few values the timetable on the home screen offers.

Output: data/curated/2026/class_times.json
Run:    python -I scripts/syllabus/class_times.py
"""
import importlib.util
import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "curated" / "2026" / "class_times.json"
TERM = "20"  # 2학기, the semester the home timetable shows (SEMESTER = "2026-2")

spec = importlib.util.spec_from_file_location("collect", Path(__file__).with_name("collect.py"))
collect = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collect)

MEETING = re.compile(r"([월화수목금토일])\s+(\d{2}):(\d{2})-(\d{2}):(\d{2})")


def minutes(h: str, m: str) -> int:
    return int(h) * 60 + int(m)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    collect.open_session()
    js = collect.get(f"/resources/data/data_{collect.YEAR}.js")
    majors = [m for m in collect.js_rows(js, f"major_{collect.YEAR}{TERM}") if m["dh"] in collect.INTL_COLLEGES and m["orgnz_lvl_se_code"] != "11"]
    sections: dict[str, dict] = {}
    for m in majors:
        for r in collect.lectures(m["cd"], TERM):
            if r["campus_nm"] == "국제":
                sections[r["lecture_cd"]] = r  # one row per 분반, whichever department listed it

    meetings = Counter()  # (start "HH:MM", length in minutes) -> count
    timed = 0
    for r in sections.values():
        found = MEETING.findall(r["timetable"] or "")
        if found:
            timed += 1
        for _d, h1, m1, h2, m2 in found:
            meetings[(f"{h1}:{m1}", minutes(h2, m2) - minutes(h1, m1))] += 1

    total = sum(meetings.values())
    by_len = Counter()
    by_start = Counter()
    for (start, length), n in meetings.items():
        by_len[length] += n
        by_start[start] += n

    top_lengths = [(length, n) for length, n in by_len.most_common(6)]
    top_starts = sorted(start for start, _ in by_start.most_common(6))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "year": 2026,
                "term": "2학기",
                "campus": "국제캠퍼스",
                "source_url": "https://sugang.khu.ac.kr/",
                "source": "종합시간표 조회, 2026학년도 2학기, 국제캠퍼스 분반의 `timetable` 값",
                "as_of": date.today().isoformat(),
                "sections": len(sections),
                "sections_with_fixed_time": timed,
                "meetings": total,
                "note": "meetings = 요일마다 한 번씩 센 수업 횟수. starts·lengths는 그중 가장 많이 쓰이는 값이고, 나머지 시간대는 드물어요.",
                "starts": [{"start": s, "meetings": by_start[s]} for s in top_starts],
                "lengths": [{"minutes": length, "meetings": n, "share": round(n / total, 3)} for length, n in top_lengths],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"{len(sections)} sections, {timed} with a fixed time, {total} meetings -> {OUT.relative_to(ROOT)}")
    print("starts:", [(s, by_start[s]) for s in top_starts])
    print("lengths:", [(length, n, f"{n / total:.0%}") for length, n in top_lengths])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
