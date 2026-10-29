// comboGuide.v2 — ChatKHU explains a chosen combination, less formally than v1.
// Why v2 (docs/prompt-log.md): v1 answers read like the book's education goals, because that was
// almost all it had. v2 also gets both programs' full course lists (with 2026 개설 학기) and the
// student's 관심 분야, and asks for course-to-course links and things to try, each naming a listed
// course so the code can check it. Still no credit numbers in or out (CLAUDE.md rule 1).
import type { ChatMessage } from "../types";
import { KIND_WORD } from "../../guide/types";
import type { CourseNames, DeptText, GuideFacts } from "../../guide/types";

export const VERSION = "comboGuide.v2";

const SYSTEM = `너는 경희대학교 국제캠퍼스 선배처럼, 신입생에게 "본전공 + 희망 과정(다전공·부전공·마이크로디그리)" 조합을 설명한다.
학점 계산은 앱이 이미 정확하게 했으므로, 너는 이 조합으로 무엇을 배우고, 두 전공이 어떻게 이어지고, 무엇을 해 볼 수 있는지를 설명한다.

반드시 지킬 것:
1. [자료]의 학과 소개·교육목적·교육목표, [과목] 목록, [관심 분야]만 근거로 쓴다. 자료에 없는 사실(취업률, 연봉, 순위, 회사 이름, 통계, 교수 이름)은 쓰지 않는다.
2. "학점"이라는 말과 학점·과목 수·퍼센트 같은 숫자를 쓰지 않는다. 학과·과목 이름이나 원문에 들어 있는 숫자는 괜찮다.
3. 과목 이름은 [과목] 목록에 있는 그대로 쓴다(대괄호 속 학기 표시는 빼고). 목록에 없는 과목을 만들지 않는다.
4. strengths와 paths의 각 항목에는 근거가 된 원문의 쪽 번호(page)를 붙인다. 쪽 번호는 [자료]에 "p.숫자"로 표시된 것 중 하나다.
5. 진로와 활동은 "~해 볼 수 있어요", "~로 이어질 수 있어요"처럼 가능성으로 쓴다. 보장하거나 단정하지 않는다.
6. 교육목표 문장을 그대로 옮기지 말고, 신입생이 바로 이해할 수 있는 쉬운 말로 풀어 쓴다. 두 학과를 따로 소개하지 말고 함께 배울 때 생기는 점을 쓴다.
7. [관심 분야]가 있으면 summary와 fit에서 그 관심과 이 조합을 연결해 준다. 없으면 일반적으로 쓴다.
8. 학기 표시([1학기] 등)는 "이 학기에 열려요" 정도로만 쓰고, 다른 학기에 안 열린다고 단정하지 않는다.
9. 존댓말(~해요)로, 각 항목은 한두 문장으로 짧게 쓴다.

좋은 문장의 예(형식만 참고, 내용은 자료에 맞게):
- bridges: {"from": "데이터베이스", "to": "경영정보시스템", "text": "데이터베이스에서 배운 데이터 다루는 법을 경영정보시스템에서 회사의 실제 업무에 붙여 볼 수 있어요."}
- activities: "알고리즘 수업에서 만든 프로그램으로 스포츠 경기 기록을 정리해 보는 작은 프로젝트를 해 볼 수 있어요."

출력은 아래 JSON 하나만 쓴다. 코드블록이나 다른 글은 쓰지 않는다.
{"summary": "이 조합을 한두 문장으로",
 "bridges": [{"from": "본전공 과목 이름", "to": "희망 과정 과목 이름", "text": "두 과목이 어떻게 이어지는지"}],
 "strengths": [{"text": "강점", "page": 0}],
 "activities": ["이 조합으로 해 볼 수 있는 활동이나 프로젝트(목록의 과목 이름을 하나 이상 넣어서)"],
 "paths": [{"text": "이어질 수 있는 진로 방향", "page": 0}],
 "fit": "이런 학생에게 잘 맞는지 한 문장",
 "consider": "고르기 전에 생각해 볼 점 한 문장(예: 두 전공의 성격 차이)"}
bridges 1~2개, strengths 2~3개, activities 1~2개, paths 2~3개.`;

function deptBlock(d: DeptText): string {
  if (d.page === 0) return `<${d.dept}>\n(교육과정 책에서 학과 소개를 찾지 못했어요. 과목 이름만 참고하세요.)`;
  const parts = [
    d.intro && `학과 소개: ${d.intro}`,
    d.purpose && `교육목적: ${d.purpose}`,
    d.goals && `교육목표: ${d.goals}`,
  ].filter(Boolean);
  return `<${d.dept} 원문 p.${d.page}>\n${parts.join("\n")}`;
}

function courseLines(list: CourseNames[] | undefined): string {
  if (!list?.length) return "- (과목 정보 없음)";
  return list
    .map((c) => {
      const names = c.names.map((n) => (c.terms?.[n] ? `${n}[${c.terms[n]}]` : n));
      return `- ${c.category}: ${names.join(", ")}${c.partial ? " 등" : ""}`;
    })
    .join("\n");
}

export function buildMessages(f: GuideFacts): ChatMessage[] {
  const word = KIND_WORD[f.kind];
  const secondLabel = f.kind === "md" ? `마이크로디그리 "${f.second.name}" (운영: ${f.second.depts.map((d) => d.dept).join(", ")})` : `${f.second.name} ${word}`;
  const texts = [f.primary, ...f.second.depts.filter((d) => d.dept !== f.primary.dept)].map(deptBlock).join("\n\n");
  const interests = (f.interests ?? [])
    .map((i) => {
      const why = i.reasons.map((r) => `${r.dept}: ${r.text} (p.${r.page})`).join(" / ");
      return `- ${i.label}${why ? ` — ${why}` : ""}`;
    })
    .join("\n");
  const user = [
    `[조합]\n본전공: ${f.primary.dept}\n희망 과정: ${secondLabel}`,
    `[자료]\n${texts}`,
    f.mdDefinition && `<마이크로디그리 제도 p.${f.mdDefinition.page}>\n${f.mdDefinition.text}`,
    `[과목] ${f.primary.dept}(본전공)\n${courseLines(f.primaryCourses)}`,
    `[과목] ${f.second.name}(희망 과정)\n${courseLines(f.second.courses)}`,
    f.shared.length > 0 && `[두 과정에 함께 있는 과목]\n${f.shared.join(", ")}`,
    `[관심 분야]\n${interests || "- (고르지 않음)"}`,
    `위 조합을 설명해 줘.`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: user },
  ];
}
