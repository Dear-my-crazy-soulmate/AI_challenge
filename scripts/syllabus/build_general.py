"""일반 상식 체험 문제를 모아 data/curated/quiz_general.json 으로 만든다.

입력: data/drafts/quiz/_general/*.json  (학과마다 5문제 이상)
  [{"dept": "기계공학", "questions": [
     {"course": "열역학", "skill": "열역학", "q": "...?", "options": ["정답", "오답", "오답", "오답"],
      "exp": "해설 본문(해요체)", "blurb": "~를 배워요 앞에 붙는 구절"}]}]
- options 의 첫 번째가 정답이다. 정답 위치는 여기서 학과·순번으로 고정해 섞는다(번호를 적지 않는다).
- course 는 그 학과의 2026 요람(data/curated/2026/courses.json) 과목 이름과 같아야 한다. 학수번호는 여기서 찾아 붙인다.
- 이미 quiz_general.json 에 있는 학과(인공지능학과)는 입력에 없으면 그대로 둔다.

사용: python -I scripts/syllabus/build_general.py [--write]   (옵션 없이 실행하면 검사만 한다)
"""
import glob
import json
import re
import sys

ROOT = __file__.replace("\\", "/").rsplit("/scripts/", 1)[0]
OUT = f"{ROOT}/data/curated/quiz_general.json"
LETTERS = "①②③④"
PERSONAL = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+|(?<!\d)0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)|(?<!\d)\d{10}(?!\d)|https?://")


def main(write: bool) -> int:
    index = json.load(open(f"{ROOT}/public/quiz/index.json", encoding="utf-8"))
    order = {e["dept"]: i for i, e in enumerate(index)}
    catalog = json.load(open(f"{ROOT}/data/curated/2026/courses.json", encoding="utf-8"))["depts"]
    out = json.load(open(OUT, encoding="utf-8"))
    problems: list[str] = []
    longest = [0, 0]
    batch: dict[str, list[dict]] = {}
    for f in sorted(glob.glob(f"{ROOT}/data/drafts/quiz/_general/*.json")):
        for d in json.load(open(f, encoding="utf-8")):
            batch[d["dept"]] = d["questions"]
    for dept, items in batch.items():
        if dept not in order:
            problems.append(f"{dept}: 문제 목록(public/quiz/index.json)에 없는 학과")
            continue
        names = {c["name"]: c["code"] for c in reversed(catalog[dept]["catalog"])}
        if len(items) < 5:
            problems.append(f"{dept}: {len(items)}문제뿐이에요(5개 이상)")
        made = []
        for k, it in enumerate(items):
            where = f"{dept} #{k + 1}"
            if it["course"] not in names:
                near = [n for n in names if it["course"][:2] in n][:8]
                problems.append(f"{where}: 요람에 없는 과목 '{it['course']}' (비슷한 것: {near})")
                continue
            opts = it["options"]
            if len(opts) != 4 or len(set(opts)) != 4:
                problems.append(f"{where}: 보기가 서로 다른 4개가 아니에요")
                continue
            if not it["q"].rstrip().endswith("?"):
                problems.append(f"{where}: 질문이 물음으로 끝나지 않아요")
            if len(opts[0]) > 1.6 * max(len(o) for o in opts[1:]) + 4:
                problems.append(f"{where}: 정답 보기만 눈에 띄게 길어요")
            if PERSONAL.search(json.dumps(it, ensure_ascii=False)):
                problems.append(f"{where}: 개인정보·링크 모양이 있어요")
            longest[0] += len(opts[0]) >= max(len(o) for o in opts[1:])
            longest[1] += 1
            pos = (order[dept] + k) % 4  # 정답 위치를 학과·순번으로 고정해 고르게 섞는다
            shown = opts[1:]
            shown.insert(pos, opts[0])
            made.append(
                {
                    "id": f"g-{order[dept]:02d}-{k + 1}",
                    "skill": it["skill"],
                    "question": it["q"],
                    "options": shown,
                    "answer": pos,
                    "explanation": f"정답 {LETTERS[pos]} {it['exp']}",
                    "flow": f"🎓 {dept} 「{it['course']}」({names[it['course']]})에서 {it['blurb']}",
                    "status": "approved",
                    "reviewed": False,
                    "is_sample": False,
                    "source_url": "TODO: 일반 개념 문제라 사람이 한 번 읽고 확인해야 해요",
                }
            )
        out["depts"][dept] = made
    out["depts"] = {d: out["depts"][d] for d in sorted(out["depts"], key=lambda d: order.get(d, 999))}
    counts = [len(v) for v in out["depts"].values()]
    pos_count = [0, 0, 0, 0]
    for v in out["depts"].values():
        for q in v:
            pos_count[q["answer"]] += 1
    print(f"학과 {len(out['depts'])}개, 문제 {sum(counts)}개, 정답 위치 {pos_count}")
    print(f"정답 보기가 가장 긴 문제 {longest[0]}/{longest[1]}")
    for p in problems:
        print("문제:", p)
    missing = [e["dept"] for e in index if e["dept"] not in out["depts"]]
    print(f"아직 없는 학과 {len(missing)}개")
    if write and not problems:
        json.dump(out, open(OUT, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
        print("written", OUT)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main("--write" in sys.argv))
