"""Single source of truth for pipeline paths and shared setup.

Every pipeline script imports from here. Scripts must be runnable with
`python -I`, which drops the script directory from sys.path, so each script
inserts its own directory first (see the top of ingest.py / detect.py).
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

RAW_DIR = ROOT / "data" / "raw"  # source PDFs (git-ignored)
# Intermediate output (git-ignored). PIPELINE_YEAR=2026 selects data/work/2026,
# the per-section pages written by book.py.
WORK_DIR = ROOT / "data" / "work" / os.environ.get("PIPELINE_YEAR", "")
EXTRACTED_DIR = ROOT / "data" / "extracted"  # structured JSON (committed)
CURATED_DIR = ROOT / "data" / "curated"  # validated output (committed)


def use_utf8_stdout() -> None:
    """Korean text must print correctly on Windows consoles (cp949 default)."""
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")


def dept_names(directory: Path = RAW_DIR) -> list[str]:
    """Department names = PDF file names without extension, sorted."""
    return sorted(p.stem for p in directory.glob("*.pdf"))
