"""Step 1 of the 체험 문제 pipeline: which major courses exist, one row per course.

Reads the public 종합시간표 (https://sugang.khu.ac.kr/) the way the page itself does:
college/department codes from resources/data/data_<year>.js, then lectListJson per department.

Keeps 국제캠퍼스 rows whose 이수구분 is 전공기초(11) / 전공필수(04) / 전공선택(05).
Same 학수번호 with several 분반 -> one row (lowest 분반). Open in both terms -> term 1 (10) wins.

Output: data/extracted/2026/syllabus_courses.json
Run:    python -I scripts/syllabus/collect.py
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "extracted" / "2026" / "syllabus_courses.json"
TEACHER_CODES = ROOT / "data" / "work" / "syllabus" / "2026" / "_teacher_codes.json"
BASE = "https://sugang.khu.ac.kr"
YEAR = 2026
TERMS = ("10", "20")  # 10 = 1학기, 20 = 2학기
PAUSE = 0.5  # seconds between requests, so the school's server is never hurried
CATEGORY = {"11": "전공기초", "04": "전공필수", "05": "전공선택"}
# 국제캠퍼스 colleges (codes from daehak_<year><term>) and the 융합전공 group.
INTL_COLLEGES = {
    "A04754": "공과대학", "A05091": "전자정보대학", "A07340": "소프트웨어융합대학", "A05346": "응용과학대학",
    "A05165": "생명과학대학", "A05366": "국제대학", "A04620": "외국어대학", "A05240": "예술·디자인대학",
    "A05297": "체육대학", "A10158": "융합",
}

opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
opener.addheaders = [("User-Agent", "Mozilla/5.0 (AI-challenge student project)"), ("Referer", BASE + "/")]


def get(path: str) -> str:
    time.sleep(PAUSE)
    with opener.open(BASE + path, timeout=30) as r:
        return r.read().decode("utf-8")


def open_session() -> None:
    get("/")
    get("/login?attribute=loginFrame&fake=1")


def js_rows(js: str, name: str) -> list[dict]:
    """`var name = {"rows":[...]};` -> rows."""
    i = js.index(f"var {name}")
    start = js.index("{", i)
    depth = 0
    for j in range(start, len(js)):
        depth += {"{": 1, "}": -1}.get(js[j], 0)
        if depth == 0:
            return json.loads(js[start : j + 1])["rows"]
    raise ValueError(name)


def lectures(major: str, term: str) -> list[dict]:
    q = urllib.parse.urlencode({
        "attribute": "lectListJson", "lang": "ko", "loginYn": "N", "menu": "1", "search_div": "E", "p_day": "", "p_time": "",
        "p_teach": "", "p_subjt": "", "p_major": major, "p_lang": "", "p_year": YEAR, "p_term": term, "lecture_cd": "",
        "initYn": "Y", "_search": "false", "rows": "-1", "page": "1", "sidx": "", "sord": "asc",
    })
    for attempt in range(2):
        text = get("/core?" + q)
        if text.lstrip().startswith("{"):
            return json.loads(text)["rows"]
        open_session()  # the server answers a warning page when the session is missing or expired
    raise RuntimeError(f"no JSON for {major} term {term}")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    open_session()
    js = get(f"/resources/data/data_{YEAR}.js")
    found: dict[str, dict] = {}  # 학수번호 -> row
    for term in TERMS:
        majors = [m for m in js_rows(js, f"major_{YEAR}{term}") if m["dh"] in INTL_COLLEGES and m["orgnz_lvl_se_code"] != "11"]
        print(f"term {term}: {len(majors)} departments", flush=True)
        for m in majors:
            for r in lectures(m["cd"], term):
                cat = CATEGORY.get(r["field_gb"])
                if cat is None or r["campus_nm"] != "국제":
                    continue
                code = r["subjt_cd"]
                row = found.get(code)
                if row is None or (row["term"] == "20" and term == "10"):  # term 1 beats term 2
                    row = found[code] = {
                        "subjt_cd": code, "name": r["subjt_name"], "credits": float(r["unit_num"].strip() or 0), "term": term,
                        "lecture_cd": r["lecture_cd"], "teach_cd": r["teach_cd"], "categories": {}, "depts": {},
                    }
                elif row["term"] == term and r["lecture_cd"] < row["lecture_cd"]:
                    row.update(lecture_cd=r["lecture_cd"], teach_cd=r["teach_cd"])  # lowest 분반 of that term
                if row["term"] == term:
                    row["categories"][m["nm"]] = cat
                    row["depts"][m["nm"]] = m["cd"]
    rows = sorted(found.values(), key=lambda r: r["subjt_cd"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "year": YEAR, "source": BASE + "/ (종합시간표 조회)", "as_of": f"{YEAR}학년도 1·2학기 개설 과목",
        "note": "국제캠퍼스 전공기초·전공필수·전공선택, 학수번호당 1행(1학기 우선, 가장 낮은 분반)",
        "courses": [{k: v for k, v in r.items() if k != "teach_cd"} for r in rows],  # the instructor code stays out of this file
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    TEACHER_CODES.parent.mkdir(parents=True, exist_ok=True)  # git-ignored folder: fetch_plans.py needs the code to open each syllabus
    TEACHER_CODES.write_text(json.dumps({r["subjt_cd"]: r["teach_cd"] for r in rows}, indent=1) + "\n", encoding="utf-8")
    print(f"{len(rows)} courses -> {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
