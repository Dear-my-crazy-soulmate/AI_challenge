"""Step A-1: PDF -> per-page text (data/work/<dept>.pages.json).

Usage: python -I scripts/pipeline/ingest.py [dept ...]
With no arguments, every PDF in data/raw/ is processed.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from paths import RAW_DIR, ROOT, WORK_DIR, dept_names, use_utf8_stdout  # noqa: E402

INSTALL_HINT = (
    "pdftotext (poppler) was not found on PATH. "
    "Windows: install poppler (e.g. `scoop install poppler`) or use Git Bash, "
    "which ships it at /mingw64/bin. macOS: `brew install poppler`. "
    "Linux: `apt install poppler-utils`. "
    "Do not swap in another PDF library without asking."
)


def extract_pages(pdf: Path) -> list[str]:
    """Return page texts (index 0 = page 1) using `pdftotext -layout`."""
    exe = shutil.which("pdftotext")
    if exe is None:
        raise RuntimeError(INSTALL_HINT)
    # -enc UTF-8 is required: the Windows default encoding garbles Korean.
    proc = subprocess.run(
        [exe, "-layout", "-enc", "UTF-8", str(pdf), "-"],
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"pdftotext failed for {pdf.name} (exit {proc.returncode}): "
            f"{proc.stderr.decode('utf-8', 'replace').strip()}"
        )
    text = proc.stdout.decode("utf-8")
    pages = text.split("\f")
    if pages and pages[-1].strip() == "":
        pages.pop()  # pdftotext ends the output with a trailing form feed
    if not pages:
        raise RuntimeError(f"{pdf.name}: no pages extracted")
    return pages


def ingest(dept: str) -> Path:
    pdf = RAW_DIR / f"{dept}.pdf"
    if not pdf.exists():
        raise FileNotFoundError(f"PDF not found: {pdf}")
    pages = extract_pages(pdf)
    out = WORK_DIR / f"{dept}.pages.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "dept": dept,
        "source_pdf": pdf.relative_to(ROOT).as_posix(),
        "n_pages": len(pages),
        "pages": [{"page": i + 1, "text": t} for i, t in enumerate(pages)],
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    return out


def load_pages(dept: str) -> list[str]:
    """Page texts from the ingest output (index 0 = page 1)."""
    path = WORK_DIR / f"{dept}.pages.json"
    if not path.exists():
        raise FileNotFoundError(f"{path} not found. Run ingest.py first.")
    data = json.loads(path.read_text(encoding="utf-8"))
    return [p["text"] for p in data["pages"]]


def main(argv: list[str]) -> int:
    use_utf8_stdout()
    depts = argv or dept_names()
    if not depts:
        print(f"No PDFs in {RAW_DIR}. Put <dept>.pdf files there.", file=sys.stderr)
        return 1
    for dept in depts:
        out = ingest(dept)
        n = json.loads(out.read_text(encoding="utf-8"))["n_pages"]
        print(f"{dept}: {n} pages -> {out.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
