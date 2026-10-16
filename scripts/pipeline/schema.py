"""Step C: schema for structured curriculum JSON (data/extracted/<dept>.json).

Values in these files are read from the source PDF by a human/LLM; code then
verifies them against the page text (step D). Run with the project venv:
  .venv/Scripts/python -I scripts/pipeline/schema.py [file ...]
"""
import json
import sys
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

sys.path.insert(0, str(Path(__file__).resolve().parent))
from paths import EXTRACTED_DIR, use_utf8_stdout  # noqa: E402

Category = Literal["전공기초", "전공필수", "전공선택", "마이크로디그리"]
Rule = Literal["all", "choose_credits", "choose_n"]
Kind = Literal["single", "double", "minor", "microdegree"]
RuleStatus = Literal["applies", "ambiguous", "pending"]
TODO = "TODO"  # placeholder for facts nobody has confirmed yet


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")  # a typo in a key must not pass


class CodedCourse(Strict):
    code: str
    name: str
    credits: int = Field(ge=0)


class Group(Strict):
    category: Category
    sub: str = ""  # e.g. "SW필수", "AI선택"
    rule: Rule
    required_credits: int = Field(ge=0)
    choose_n: int | None = Field(default=None, ge=1)
    courses: list[str] = Field(default_factory=list)  # names as printed in the source
    pool_rows: list[int] | None = None  # [start, end] rows of the course master (별표1)
    coded: list[CodedCourse] = Field(default_factory=list)  # filled by build, or by the source table
    declared_count: int | None = None  # "과목수" column as printed
    declared_credits: int | None = None  # credits as printed next to the group
    page: int = Field(ge=1)  # page holding the course list
    evidence: str = Field(min_length=1)  # one line copied from `page`
    credit_page: int | None = Field(default=None, ge=1)
    credit_evidence: str | None = None  # line copied from `credit_page` that fixes required_credits
    note: str = ""

    @field_validator("pool_rows")
    @classmethod
    def _pool_rows_is_range(cls, v):
        if v is not None and (len(v) != 2 or v[0] > v[1] or v[0] < 1):
            raise ValueError("pool_rows must be [start, end] with 1 <= start <= end")
        return v

    @model_validator(mode="after")
    def _rule_is_consistent(self):
        if self.rule == "choose_n" and self.choose_n is None:
            raise ValueError("rule=choose_n requires choose_n")
        if self.rule != "choose_n" and self.choose_n is not None:
            raise ValueError("choose_n is only valid with rule=choose_n")
        if (self.credit_evidence is None) != (self.credit_page is None):
            raise ValueError("credit_page and credit_evidence go together")
        return self


class Stated(Strict):
    """Credit numbers printed in the summary table (기본구조표)."""

    기초: int | None = None
    필수: int | None = None
    선택: int | None = None
    계: int
    page: int = Field(ge=1)
    evidence: str = Field(min_length=1)


class ExtraRule(Strict):
    id: str
    text: str
    page: int = Field(ge=1)
    evidence: str = Field(min_length=1)
    applies_if: str | None = None  # e.g. "문과대학 소속 학생"
    status: RuleStatus
    why: str = ""  # required when status is not "applies"

    @model_validator(mode="after")
    def _why_when_uncertain(self):
        if self.status != "applies" and not self.why:
            raise ValueError(f"{self.id}: status={self.status} needs a `why`")
        return self


class Requirement(Strict):
    kind: Kind
    name: str
    total_credits: int = Field(ge=0)
    stated: Stated | None = None
    groups: list[Group] = Field(min_length=1)
    extra_rules: list[ExtraRule] = Field(default_factory=list)


class DeptFile(Strict):
    dept: str
    college: str
    source_pdf: str
    source_url: str  # TODO until a human confirms the official URL
    as_of: str  # TODO until a human confirms the reference date
    graduation_credits: int = Field(gt=0)
    table_pages: list[int]
    requirements: list[Requirement] = Field(min_length=1)
    notes: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _requirement_keys_unique(self):
        keys = [(r.kind, r.name) for r in self.requirements]
        if len(keys) != len(set(keys)):
            raise ValueError("duplicate (kind, name) requirement")
        return self

    def todo_fields(self) -> list[str]:
        return [f for f in ("source_url", "as_of") if getattr(self, f) == TODO]


def load_dept_file(path: Path) -> DeptFile:
    return DeptFile.model_validate(json.loads(path.read_text(encoding="utf-8")))


def main(argv: list[str]) -> int:
    use_utf8_stdout()
    files = [Path(a) for a in argv] or sorted(EXTRACTED_DIR.glob("*.json"))
    status = 0
    for path in files:
        try:
            d = load_dept_file(path)
        except Exception as e:  # report every file, then fail
            print(f"[{path.name}] INVALID\n{e}")
            status = 1
            continue
        todo = d.todo_fields()
        print(
            f"[{path.name}] OK: {len(d.requirements)} requirements"
            + (f"  (TODO: {', '.join(todo)})" if todo else "")
        )
    return status


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
