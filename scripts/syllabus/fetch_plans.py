"""Step 2 of the 체험 문제 pipeline: read each course's public 강의계획서 and keep what questions are built from.

Input : data/extracted/2026/syllabus_courses.json (collect.py)
Output: data/work/syllabus/2026/<학수번호>.json   (git-ignored: the school's own text is not republished)
        data/work/syllabus/2026/_failed.json, _scrub_report.json
Each file: {subjt_cd, name, term, url, info{...}, sections{제목: [[셀, ...], ...]}, weeks[{week, date, topic, note}], scrubbed{...}}

Personal data is removed BEFORE anything is written (see scrub): the page carries 교강사명, 연구실, 연락처, 이메일,
홈페이지, 면담시간 and the instructor's name inside 강의시간. Only a short whitelist of fields and sections is kept,
and e-mail addresses, phone numbers, 학번-like numbers, links and the instructor's own name are blanked in what is left.

Resumes where it stopped: files that already exist are skipped.
Run: python -I scripts/syllabus/fetch_plans.py [limit]      fetch (and scrub)
     python -I scripts/syllabus/fetch_plans.py scrub        scrub files fetched earlier, in place
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from html.parser import HTMLParser
from http.cookiejar import CookieJar
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSES = ROOT / "data" / "extracted" / "2026" / "syllabus_courses.json"
OUT = ROOT / "data" / "work" / "syllabus" / "2026"
BASE = "https://sugang.khu.ac.kr"
PAUSE = 0.5

KEEP_INFO = ("강좌명", "학수번호", "이수구분", "개설학과", "학점", "영어강좌여부", "성적기록방법")
KEEP_SECTIONS = ("선수과목", "수업개요 및 목표", "수업운영방식", "수업유형 및 방법", "교재 및 참고자료", "평가방법", "주별강의내용")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE = re.compile(r"(?<!\d)(?:\+?82[-\s.]?)?0\d{1,2}[-\s.)]*\d{3,4}[-\s.]*\d{4}(?!\d)")
STUDENT_ID = re.compile(r"(?<!\d)(?:19|20)\d{8}(?!\d)")  # 10 digits starting with a year, like 2021103456
URL = re.compile(r"https?://\S+|www\.\S+")

opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
opener.addheaders = [("User-Agent", "Mozilla/5.0 (AI-challenge student project)"), ("Referer", BASE + "/")]


def get(path: str) -> str:
    time.sleep(PAUSE)
    with opener.open(BASE + path, timeout=30) as r:
        return r.read().decode("utf-8")


def plan_url(c: dict, year: int = 2026) -> str:
    return "/core?" + urllib.parse.urlencode({
        "attribute": "lectPlan", "p_year": year, "p_term": c["term"], "p_teach": c["teach_cd"], "p_code": c["lecture_cd"],
        "p_subjt": c["subjt_cd"], "lang": "ko", "loginYn": "N", "schedule_cd": "hakbu",
    })


class Tables(HTMLParser):
    """<h2> title -> rows of cell texts, for every table that follows it."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.sections: dict[str, list[list[str]]] = {}
        self.title = ""
        self._h2 = False
        self._cell: list[str] | None = None
        self._row: list[str] | None = None

    def handle_starttag(self, tag, attrs):
        if tag == "h2":
            self._h2, self.title = True, ""
        elif tag == "tr":
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = []
        elif tag == "br" and self._cell is not None:
            self._cell.append("\n")

    def handle_endtag(self, tag):
        if tag == "h2":
            self._h2 = False
            self.title = " ".join(self.title.split())
        elif tag in ("td", "th") and self._cell is not None and self._row is not None:
            self._row.append(clean("".join(self._cell)))
            self._cell = None
        elif tag == "tr" and self._row is not None:
            if any(self._row):
                self.sections.setdefault(self.title or "기본정보", []).append(self._row)
            self._row = None

    def handle_data(self, data):
        if self._h2:
            self.title += data
        elif self._cell is not None:
            self._cell.append(data)


def clean(s: str) -> str:
    return "\n".join(" ".join(line.split()) for line in s.strip().splitlines() if line.strip())


def instructor_name(sections: dict) -> str:
    """'인성원(소프트웨어융합대학 컴퓨터공학부)' -> '인성원' (read from the 기본정보 table, used to blank the name elsewhere)."""
    for row in sections.get("기본정보", []):
        for i, cell in enumerate(row[:-1]):
            if cell == "교강사명":
                return re.split(r"[(（,]", row[i + 1])[0].strip()
    return ""


def redact(text: str, name: str, found: Counter) -> str:
    for kind, rx, mark in (("emails", EMAIL, "[이메일 삭제]"), ("phones", PHONE, "[전화번호 삭제]"),
                           ("student_ids", STUDENT_ID, "[학번 삭제]"), ("links", URL, "[링크 삭제]")):
        text, n = rx.subn(mark, text)
        found[kind] += n
    if len(name) >= 2 and name in text:  # the instructor's own name, if it is repeated in the text
        found["instructor_name"] += text.count(name)
        text = text.replace(name, "[교강사]")
    return text


def scrub(sections: dict) -> tuple[dict, dict, dict]:
    """(clean sections, 기본정보 kept as {label: value}, what was found and blanked). Everything not on the whitelist is dropped."""
    found: Counter = Counter()
    name = instructor_name(sections)
    info: dict[str, str] = {}
    for row in sections.get("기본정보", []):
        for i, cell in enumerate(row[:-1]):
            if cell in KEEP_INFO and cell not in info:
                info[cell] = redact(row[i + 1], name, found)
    kept = {t: [[redact(c, name, found) for c in row] for row in rows] for t, rows in sections.items() if t in KEEP_SECTIONS}
    dropped = [t for t in sections if t not in KEEP_SECTIONS and t != "기본정보"]
    return kept, info, {**found, "dropped_sections": dropped, "had_instructor_name": bool(name)}


def weeks_of(sections: dict) -> list[dict]:
    weeks = []
    for row in sections.get("주별강의내용", []):
        if len(row) >= 3 and row[0].endswith("주") and row[0][:-1].isdigit():
            weeks.append({"week": int(row[0][:-1]), "date": row[1], "topic": row[2], "note": row[3] if len(row) > 3 else ""})
    return weeks


def parse(html: str) -> dict:
    p = Tables()
    p.feed(html)
    sections, info, found = scrub(p.sections)
    return {"info": info, "sections": sections, "weeks": weeks_of(sections), "scrubbed": found}


def scrub_existing() -> int:
    """Scrub files fetched before the scrubbing existed. Their saved 기본정보 is a table of cells, not the {label: value} info."""
    total: Counter = Counter()
    files = [f for f in OUT.glob("*.json") if not f.name.startswith("_")]
    touched = 0
    for f in files:
        rec = json.loads(f.read_text(encoding="utf-8"))
        if "scrubbed" in rec:
            continue
        sections, info, found = scrub(rec["sections"])
        rec.update({"info": info, "sections": sections, "weeks": weeks_of(sections), "scrubbed": found})
        f.write_text(json.dumps(rec, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        touched += 1
        for k, v in found.items():
            if isinstance(v, bool):
                total[k] += int(v)
            elif isinstance(v, int):
                total[k] += v
        total["files_with_links"] += 1 if found.get("links") else 0
        total["files_with_phones"] += 1 if found.get("phones") else 0
        total["files_with_emails"] += 1 if found.get("emails") else 0
        total["files_with_student_ids"] += 1 if found.get("student_ids") else 0
    print(f"scrubbed {touched} of {len(files)} files: {dict(total)}")
    return 0


def main(argv: list[str]) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    if argv and argv[0] == "scrub":
        return scrub_existing()
    limit = int(argv[0]) if argv else None
    courses = json.loads(COURSES.read_text(encoding="utf-8"))["courses"]
    teachers = json.loads((OUT / "_teacher_codes.json").read_text(encoding="utf-8"))  # the page address needs it; it is never written to a result
    courses = [{**c, "teach_cd": teachers[c["subjt_cd"]]} for c in courses]
    OUT.mkdir(parents=True, exist_ok=True)
    get("/")
    get("/login?attribute=loginFrame&fake=1")
    failed, done = [], 0
    found_total: Counter = Counter()
    for c in courses:
        target = OUT / f"{c['subjt_cd']}.json"
        if target.exists():
            continue
        if limit is not None and done >= limit:
            break
        try:
            parsed = parse(get(plan_url(c)))
            if not parsed["sections"]:
                raise ValueError("no usable tables in the page")
            record = {"subjt_cd": c["subjt_cd"], "name": c["name"], "term": c["term"], "term_label": "1학기" if c["term"] == "10" else "2학기",
                      "lecture_cd": c["lecture_cd"], **parsed}  # no page address: it carries the instructor code
            target.write_text(json.dumps(record, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            for k in ("emails", "phones", "student_ids", "links", "instructor_name"):
                found_total[k] += parsed["scrubbed"].get(k, 0)
        except Exception as e:  # keep going; the failures are listed at the end
            failed.append({"subjt_cd": c["subjt_cd"], "name": c["name"], "error": str(e)[:120]})
        done += 1
        if done % 50 == 0:
            print(f"{done} fetched, {len(failed)} failed", flush=True)
    (OUT / "_failed.json").write_text(json.dumps(failed, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (OUT / "_scrub_report.json").write_text(json.dumps(dict(found_total), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"done: {done} fetched this run, {len(failed)} failed; blanked {dict(found_total)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
