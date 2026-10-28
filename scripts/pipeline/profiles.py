"""Department introductions from the book: 학과소개, 1. 교육목적, 2. 교육목표.

Every department section opens with a summary page ("... 교육과정 요약표(2026)")
whose first headings are the introduction, the education purpose and the
education goals. The AI combination guide (src/lib/guide/) uses only these
texts as grounds for "what this combination is good for", so they are copied
as printed: no rewriting, only page footers removed and whitespace collapsed.

Sections that hold more than one major (기계공학부, 환경학및환경공학과) give
the same text to each of their majors; `shared_section` marks that.

Output: data/curated/<year>/dept_profiles.json
Run:    PIPELINE_YEAR=2026 .venv/Scripts/python -I scripts/pipeline/profiles.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from paths import CURATED_DIR, WORK_DIR, use_utf8_stdout  # noqa: E402
from programs import SHARED_SECTIONS, default_depts  # noqa: E402

SOURCE_PDF = "2026경희대 교육과정.pdf"
AS_OF = "2026학년도 교육과정"
INTRO = re.compile(r"(?:학\s*과|학\s*부|전\s*공)\s*소\s*개")
# numbering differs (융합전공: 1. 전공소개, 2. 교육목적, 3. 교육목표), so any "N." heading
PURPOSE = re.compile(r"\n\s*\d\s*\.\s*교\s*육\s*목\s*적")
GOALS = re.compile(r"\n\s*\d\s*\.\s*교\s*육\s*목\s*표")
NEXT = re.compile(r"\n\s*\d\s*\.\s")
# sections that open with the 시행세칙 instead of a summary page (e.g. 전자공학과)
LAW_PURPOSE = re.compile(r"제\s*1\s*조\s*\(\s*(?:(?:학\s*과|학\s*부|전\s*공)?\s*설\s*치|교\s*육)\s*목\s*적\s*\)")
LAW_NEXT = re.compile(r"제\s*2\s*조")
FOOTER = re.compile(r"^\s*(?:\d+\s+2026학년도\s*교육과정|Ⅶ\.\s*대학별\s*전공교육과정\s+\d+|\d+)\s*$")
LIMIT = {"intro": 1200, "purpose": 600, "goals": 1200}
FRONT_PAGES = 2  # the three headings always sit on the first one or two pages


def clean(text: str) -> str:
    lines = [ln.strip() for ln in text.splitlines() if not FOOTER.match(ln)]
    return re.sub(r"\s+", " ", " ".join(ln for ln in lines if ln)).strip()


def extract(text: str) -> dict[str, str]:
    """Split the front text into intro / purpose / goals (empty when missing)."""
    out = {"intro": "", "purpose": "", "goals": ""}

    def until_next(start: int) -> str:
        end = NEXT.search(text, start)
        return clean(text[start : end.start() if end else len(text)])

    p = PURPOSE.search(text)
    g = GOALS.search(text)
    intro = INTRO.search(text, 0, p.start() if p else len(text))
    if intro and (p or g):
        out["intro"] = until_next(intro.end())
    if p:
        out["purpose"] = until_next(p.end())
    if g:
        out["goals"] = until_next(g.end())
    if not p and not g:
        law = LAW_PURPOSE.search(text)
        if law:
            end = LAW_NEXT.search(text, law.end())
            out["purpose"] = clean(text[law.end() : end.start() if end else len(text)])
    for k, n in LIMIT.items():
        if len(out[k]) > n:
            out[k] = out[k][:n].rsplit(" ", 1)[0] + " …"
    return out


def main() -> int:
    use_utf8_stdout()
    known = {d["dept"] for d in json.loads((CURATED_DIR / "credits_global.json").read_text(encoding="utf-8"))}
    profiles: dict[str, dict] = {}
    for path in sorted(WORK_DIR.glob("*.pages.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        section = data["dept"]
        pages = data["pages"][:FRONT_PAGES]
        found = extract("\n".join(p["text"] for p in pages))
        page = pages[0]["book_page"]
        for dept in default_depts(section):
            if dept not in known:
                continue  # 서울캠퍼스 등 범위 밖
            profiles[dept] = {
                "section": section,
                "shared_section": section in SHARED_SECTIONS,
                "page": page,
                **found,
                "status": "ok" if found["purpose"] or found["goals"] else "TODO",
                "source_url": f"{SOURCE_PDF} p.{page}",
                "as_of": AS_OF,
            }
    out = CURATED_DIR / WORK_DIR.name / "dept_profiles.json"
    out.write_text(
        json.dumps({"source_pdf": SOURCE_PDF, "as_of": AS_OF, "profiles": profiles}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    missing = sorted(known - profiles.keys())
    todo = sorted(d for d, p in profiles.items() if p["status"] == "TODO")
    print(f"{len(profiles)}/{len(known)} departments -> {out}")
    print("check: no section for", missing or "-")
    print("check: no purpose/goals found", todo or "-")
    print("check: no intro", sorted(d for d, p in profiles.items() if not p["intro"]) or "-")
    return 0


if __name__ == "__main__":
    sys.exit(main())
