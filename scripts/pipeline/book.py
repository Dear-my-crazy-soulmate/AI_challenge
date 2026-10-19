"""Step A-0: split the yearly curriculum book into per-section page files.

Input : data/raw/<year>경희대 교육과정.pdf (one book for the whole campus)
Output: data/work/<year>/<section>.pages.json (same format as ingest.py)
        and data/work/<year>/sections.json.

Section page ranges come from the book's own table of contents (pages 3-6),
so nothing is hard-coded per department. Printed page numbers equal PDF page
numbers in this book; the script checks that on every section's first page.

Run with the project venv:  .venv/Scripts/python -I scripts/pipeline/book.py
"""
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest import extract_pages  # noqa: E402
from paths import RAW_DIR, ROOT, WORK_DIR, use_utf8_stdout  # noqa: E402

YEAR = 2026
BOOK = RAW_DIR / f"{YEAR}경희대 교육과정.pdf"
OUT_DIR = WORK_DIR / str(YEAR)  # kept apart from the older per-department PDFs
SECTIONS_FILE = OUT_DIR / "sections.json"
TOC_PAGES = range(3, 7)  # 1-based, inclusive of 6
TOC_LINE = re.compile(r"^\s*(◆\s*)?(.+?)\s*[·･]{3,}\s*(\d+)\s*$")
FOOTER = re.compile(r"^\s*(\d+)\s+\d{4}학년도 교육과정\s*$|^\s*\d{4}학년도 교육과정\s+(\d+)\s*$", re.M)


class BookError(Exception):
    """The book does not look the way this script expects."""


def parse_toc(pages: list[str]) -> list[dict]:
    """TOC lines -> [{title, start, college_header}] in book order."""
    entries = []
    for p in TOC_PAGES:
        for line in pages[p - 1].splitlines():
            m = TOC_LINE.match(line)
            if m:
                entries.append({"title": m.group(2).strip(), "start": int(m.group(3)), "header": bool(m.group(1))})
    if not entries:
        raise BookError("no table of contents entries found")
    starts = [e["start"] for e in entries]
    if starts != sorted(starts):
        raise BookError(f"table of contents pages are not increasing: {starts}")
    return entries


def section_name(title: str) -> str:
    """'컴퓨터공학부 컴퓨터공학과 교육과정' -> '컴퓨터공학과'."""
    name = re.sub(r"\s*교육과정(\s*시행세칙)?$", "", title).replace("･", "·")
    name = re.sub(r"\s*·\s*", "·", name)
    parts = name.split()
    # "<학부> <학과>" -> 학과; keeps 1-word names and multi-word convergence names.
    if len(parts) == 2 and parts[0].endswith("학부"):
        return parts[1]
    if len(parts) == 3 and parts[0].endswith("학부") is False and parts[1].endswith("전공"):
        return " ".join(parts)  # e.g. "한국어학과 한국어학전공"
    return name


def printed_page(text: str) -> int | None:
    m = FOOTER.search(text)
    return int(m.group(1) or m.group(2)) if m else None


def split_sections(entries: list[dict], n_pages: int) -> list[dict]:
    """College headers and front matter are skipped; each department section runs to the next entry."""
    sections = []
    for i, e in enumerate(entries):
        end = entries[i + 1]["start"] - 1 if i + 1 < len(entries) else n_pages
        if e["header"] or "교육과정" not in e["title"] or e["start"] < 127:
            continue
        sections.append({"name": section_name(e["title"]), "title": e["title"], "start": e["start"], "end": end})
    return sections


def check_page_numbers(pages: list[str], sections: list[dict]) -> None:
    for s in sections:
        for p in range(s["start"], min(s["end"], s["start"] + 3) + 1):
            n = printed_page(pages[p - 1])
            if n is not None and n != p:
                raise BookError(f"{s['name']}: PDF page {p} prints page {n}; offset not handled")


def main() -> int:
    use_utf8_stdout()
    if not BOOK.exists():
        raise FileNotFoundError(f"{BOOK} not found")
    # A few footnote symbols are not valid UTF-8; they are replaced and listed in the manifest.
    pages = extract_pages(BOOK, errors="replace")
    raw_pages = extract_pages(BOOK, "-raw", errors="replace")
    if len(pages) != len(raw_pages):
        raise BookError("layout/raw page counts differ")
    sections = split_sections(parse_toc(pages), len(pages))
    check_page_numbers(pages, sections)
    names = [s["name"] for s in sections]
    dupes = sorted({n for n in names if names.count(n) > 1})
    if dupes:
        raise BookError(f"duplicate section names: {dupes}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source = BOOK.relative_to(ROOT).as_posix()
    for s in sections:
        payload = {
            "dept": s["name"],
            "source_pdf": source,
            "book_start": s["start"],  # local page i = book page book_start + i - 1
            "n_pages": s["end"] - s["start"] + 1,
            "pages": [
                {"page": i + 1, "book_page": p, "text": pages[p - 1], "raw": raw_pages[p - 1]}
                for i, p in enumerate(range(s["start"], s["end"] + 1))
            ],
        }
        (OUT_DIR / f"{s['name']}.pages.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    manifest = {
        "year": YEAR,
        "source_pdf": source,
        "sha256": hashlib.sha256(BOOK.read_bytes()).hexdigest(),
        "n_pages": len(pages),
        "replaced_char_pages": [i + 1 for i, t in enumerate(pages) if "�" in t],
        "sections": sections,
    }
    SECTIONS_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    for s in sections:
        print(f"{s['start']:>5}-{s['end']:<5} {s['name']}")
    print(f"{len(sections)} sections -> {SECTIONS_FILE.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
