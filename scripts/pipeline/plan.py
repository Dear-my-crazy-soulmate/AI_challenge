"""Step E (prototype): which courses must a student take for a combination?

  python -I scripts/pipeline/plan.py <본전공> <두번째 전공> <double|minor|microdegree> [이름] [--json]

Reads data/curated only. The same logic lives in src/lib/rules/plan.ts for the
app; this script is the quick way to look at a result.
Code does the math, nothing is guessed: missing or unverified data returns
{"available": false, "reason": ..., "message": ...}.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from paths import CURATED_DIR, use_utf8_stdout  # noqa: E402

KINDS = ("double", "minor", "microdegree")
TODO = "TODO"


def load_curated() -> tuple[dict, dict]:
    """-> ({dept: curated file}, status.json)."""
    depts = {}
    for path in sorted((CURATED_DIR / "requirements").glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        depts[data["dept"]] = data
    status = json.loads((CURATED_DIR / "status.json").read_text(encoding="utf-8"))
    return depts, status


def unavailable(reason: str, message: str) -> dict:
    return {"available": False, "reason": reason, "message": message}


def lookup(depts: dict, status: dict, dept: str, kind: str, name: str):
    """-> (requirement, None) or (None, unavailable-dict)."""
    d = depts.get(dept)
    if d is not None:
        for r in d["requirements"]:
            if r["kind"] == kind and r["name"] == name:
                return r, None
    st = status.get(dept, {})
    if "_dept_error" in st:
        return None, unavailable("NO_DEPT_DATA", f"{dept}: 교육과정 데이터를 만들지 못했습니다 ({st['_dept_error']}).")
    entry = st.get(f"{kind}/{name}")
    if entry is not None and entry["status"] == "needs_review":
        codes = sorted({i["code"] for i in entry["issues"] if i["level"] == "error"})
        return None, unavailable(
            "NOT_VERIFIED", f"{dept} {kind} '{name}'은(는) 검증을 통과하지 못해 제공할 수 없습니다 ({', '.join(codes)}). 학과 공식 안내를 확인하세요."
        )
    if d is None and not st:
        return None, unavailable("NO_DEPT_DATA", f"{dept}: 준비된 교육과정 데이터가 없습니다.")
    return None, unavailable("REQUIREMENT_NOT_FOUND", f"{dept}에 {kind} '{name}' 요건 데이터가 없습니다.")


def _label(g: dict) -> str:
    return f"{g['category']}/{g['sub']}" if g["sub"] else g["category"]


def _slim(req: dict) -> dict:
    return {
        "kind": req["kind"], "name": req["name"], "totalCredits": req["total_credits"],
        "groups": [{
            "label": _label(g), "category": g["category"], "sub": g["sub"], "rule": g["rule"],
            "requiredCredits": g["required_credits"], "chooseN": g["choose_n"],
            "courses": g["coded"], "unresolved": g["unresolved"],
        } for g in req["groups"]],
    }


def _required(slim: dict) -> list[dict]:
    return [{**c, "group": g["label"]} for g in slim["groups"] if g["rule"] == "all" for c in g["courses"]]


def _advice(rule: dict, student_college: str) -> str:
    if rule["status"] != "applies":
        return "needs_check"
    cond = rule.get("applies_if")
    if cond:
        m = re.search(r"\S+대학", cond)
        if m and m.group() not in student_college:
            return "maybe_not_applicable"
    return "applies"


def _notices(req: dict, source: str, student_college: str) -> list[dict]:
    return [{
        "source": source, "id": r["id"], "text": r["text"], "status": r["status"], "why": r["why"],
        "appliesIf": r.get("applies_if"), "advice": _advice(r, student_college), "page": r["page"],
        "evidence": r["evidence"],
    } for r in req["extra_rules"]]


def _warnings(req: dict, source: str) -> list[dict]:
    return [{"source": source, "code": i["code"], "where": i["where"], "message": i["msg"]}
            for i in req["issues"] if i["level"] == "warn" and i["code"] != "AMBIGUOUS_RULE"]  # shown as notices


def build_plan(primary: str, second: str, kind: str, name: str | None, depts: dict, status: dict) -> dict:
    primary, second, name = (primary or "").strip(), (second or "").strip(), (name or "").strip()
    if not primary or not second:
        return unavailable("INVALID_INPUT", "본전공과 두 번째 전공을 모두 입력하세요.")
    if kind not in KINDS:
        return unavailable("INVALID_INPUT", f"kind는 {', '.join(KINDS)} 중 하나여야 합니다 (입력: {kind!r}).")
    if kind == "microdegree" and not name:
        return unavailable("INVALID_INPUT", "마이크로디그리는 이름을 함께 입력하세요.")
    if kind != "microdegree":
        name = second
    if kind != "microdegree" and primary == second:
        return unavailable("SAME_DEPT", "본전공과 같은 학과를 다전공·부전공으로 선택할 수 없습니다.")

    single, err = lookup(depts, status, primary, "single", primary)
    if err:
        return err
    converted = kind == "double"
    base, err = lookup(depts, status, primary, "double", primary) if converted else (single, None)
    if err:
        return err
    other, err = lookup(depts, status, second, kind, name)
    if err:
        return err

    college = depts[primary]["college"]
    p, s = _slim(base), _slim(other)
    p_req = _required(p)
    dropped = []
    if converted:
        keep = {c["code"] for c in p_req}
        dropped = [c for c in _required(_slim(single)) if c["code"] not in keep]
    p_codes = {c["code"]: c for g in p["groups"] for c in g["courses"]}
    s_codes = {c["code"]: c for g in s["groups"] for c in g["courses"]}
    duplicates = [{"code": code, "name": p_codes[code]["name"],
                   "inPrimary": [g["label"] for g in p["groups"] if any(c["code"] == code for c in g["courses"])],
                   "inSecond": [g["label"] for g in s["groups"] if any(c["code"] == code for c in g["courses"])]}
                  for code in sorted(p_codes.keys() & s_codes.keys())]
    warnings = _warnings(base, primary) + _warnings(other, second)
    for dept in dict.fromkeys((primary, second)):
        for field, label in (("source_url", "출처 URL"), ("as_of", "기준일")):
            if depts[dept][field] == TODO:
                warnings.append({"source": dept, "code": "SOURCE_UNCONFIRMED", "where": field,
                                 "message": f"{dept}: {label}이(가) 아직 확인되지 않았습니다(TODO)."})
    return {
        "available": True,
        "input": {"primary": primary, "second": second, "kind": kind, "name": name},
        "primary": {"dept": primary, "college": college, "converted": converted, "requirement": p,
                    "requiredCourses": p_req, "singleTotalCredits": single["total_credits"]},
        "second": {"dept": second, "requirement": s, "requiredCourses": _required(s)},
        "totals": {"primaryCredits": base["total_credits"], "secondCredits": other["total_credits"],
                   "total": base["total_credits"] + other["total_credits"],
                   "savedCredits": single["total_credits"] - base["total_credits"] if converted else 0},
        "droppedRequired": dropped,
        "duplicates": duplicates,
        "notices": _notices(base, primary, college) + _notices(other, second, college),
        "warnings": warnings,
        "sources": {d: {"sourceUrl": depts[d]["source_url"], "asOf": depts[d]["as_of"]}
                    for d in dict.fromkeys((primary, second))},
    }


def _print_group(g: dict) -> None:
    if g["rule"] == "all":
        courses = ", ".join(f"{c['name']}({c['code']},{c['credits']})" for c in g["courses"])
        print(f"    [필수] {g['label']} {g['requiredCredits']}학점: {courses}")
    else:
        how = f"{g['chooseN']}과목 선택" if g["chooseN"] else "이상 선택"
        extra = f", 미확인 {len(g['unresolved'])}과목({', '.join(g['unresolved'])})" if g["unresolved"] else ""
        print(f"    [선택] {g['label']} {g['requiredCredits']}학점 {how}: 후보 {len(g['courses'])}과목{extra}")


def print_report(r: dict) -> None:
    if not r["available"]:
        print(f"제공 불가 [{r['reason']}] {r['message']}")
        return
    i, p, s, t = r["input"], r["primary"], r["second"], r["totals"]
    print(f"=== 본전공 {i['primary']} + {i['kind']} {i['name']} ===")
    arrow = f" (단일전공 {p['singleTotalCredits']}학점 → 다전공 체계)" if p["converted"] else ""
    print(f"\n[본전공] {p['dept']} {p['requirement']['kind']} {p['requirement']['totalCredits']}학점{arrow}")
    for g in p["requirement"]["groups"]:
        _print_group(g)
    print(f"\n[{i['kind']}] {s['dept']} {s['requirement']['name']} {s['requirement']['totalCredits']}학점")
    for g in s["requirement"]["groups"]:
        _print_group(g)
    print(f"\n[학점] 본전공 {t['primaryCredits']} + 두 번째 {t['secondCredits']} = {t['total']}학점, 절감 {t['savedCredits']}학점")
    if p["converted"]:
        print("[단일전공 필수였다가 빠지는 과목] " + (", ".join(f"{c['name']}({c['code']})" for c in r["droppedRequired"]) or "없음"))
    print("[두 전공 중복 학수번호] " + (", ".join(f"{d['name']}({d['code']})" for d in r["duplicates"]) or "없음"))
    label = {"applies": "해당", "maybe_not_applicable": "해당 없을 가능성, 확인 권장", "needs_check": "원문에 불명확, 확인 필요"}
    print("\n[안내]")
    for n in r["notices"]:
        print(f"  - ({n['source']}, {label[n['advice']]}) {n['text']}" + (f" ※{n['why']}" if n["why"] else ""))
    print("\n[경고]")
    for w in r["warnings"]:
        print(f"  - ({w['source']}) {w['code']}: {w['message']}")


def main(argv: list[str]) -> int:
    use_utf8_stdout()
    as_json = "--json" in argv
    args = [a for a in argv if not a.startswith("--")]
    if len(args) < 3:
        print(__doc__)
        return 2
    depts, status = load_curated()
    result = build_plan(args[0], args[1], args[2], args[3] if len(args) > 3 else None, depts, status)
    print(json.dumps(result, ensure_ascii=False, indent=2)) if as_json else print_report(result)
    return 0 if result["available"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
