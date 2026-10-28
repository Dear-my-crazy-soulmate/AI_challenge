// comboGuide.v1 — ChatKHU explains a chosen combination (strengths, career directions).
// Changes go into comboGuide.v2.ts and a line in docs/prompt-log.md (CLAUDE.md rule 8).
import type { ChatMessage } from "../types";
import { KIND_WORD } from "../../guide/types";
import type { DeptText, GuideFacts } from "../../guide/types";

export const VERSION = "comboGuide.v1";

const SYSTEM = `너는 경희대학교 국제캠퍼스 신입생에게 "본전공 + 희망 과정(다전공·부전공·마이크로디그리)" 조합을 설명하는 안내자다.
학점 계산은 앱이 이미 정확하게 했으므로, 너는 이 조합이 어떤 조합인지, 어떤 강점이 있는지, 어떤 진로로 이어질 수 있는지만 설명한다.

반드시 지킬 것:
1. [자료]의 학과 소개·교육목적·교육목표와 과목 이름만 근거로 쓴다. 자료에 없는 사실(취업률, 연봉, 순위, 특정 회사 이름, 통계)은 쓰지 않는다.
2. "학점"이라는 말과 학점·과목 수·퍼센트 같은 숫자를 쓰지 않는다. 학과 이름이나 원문 표현에 들어 있는 숫자(예: 4차 산업혁명)는 괜찮다.
3. 과목 이름은 [자료]에 나온 그대로만 쓴다.
4. strengths와 paths의 각 항목에는 근거가 된 원문의 쪽 번호(page)를 숫자로 붙인다. 쪽 번호는 [자료]에 "p.숫자"로 표시된 것 중 하나다.
5. 진로는 "~로 이어질 수 있어요", "~를 생각해 볼 수 있어요"처럼 가능성으로 쓴다. 보장하거나 단정하는 말은 쓰지 않는다.
6. 두 학과를 따로따로 소개하지 말고, 둘을 함께 배울 때 생기는 강점을 중심으로 쓴다.
7. 신입생이 읽기 쉬운 존댓말(~해요)로, 각 항목은 한두 문장으로 짧게 쓴다.

출력은 아래 JSON 하나만 쓴다. 코드블록이나 다른 글은 쓰지 않는다.
{"summary": "이 조합을 한 문장으로", "strengths": [{"text": "강점", "page": 0}], "paths": [{"text": "이어질 수 있는 진로 방향", "page": 0}], "fit": "이런 학생에게 잘 맞아요로 시작하는 한 문장"}
strengths는 2~3개, paths는 2~3개.`;

function deptBlock(d: DeptText): string {
  if (d.page === 0) return `<${d.dept}>\n(교육과정 책에서 학과 소개를 찾지 못했어요. 과목 이름만 참고하세요.)`;
  const parts = [
    d.intro && `학과 소개: ${d.intro}`,
    d.purpose && `교육목적: ${d.purpose}`,
    d.goals && `교육목표: ${d.goals}`,
  ].filter(Boolean);
  return `<${d.dept} 원문 p.${d.page}>\n${parts.join("\n")}`;
}

export function buildMessages(f: GuideFacts): ChatMessage[] {
  const word = KIND_WORD[f.kind];
  const secondLabel = f.kind === "md" ? `마이크로디그리 "${f.second.name}" (운영: ${f.second.depts.map((d) => d.dept).join(", ")})` : `${f.second.name} ${word}`;
  const texts = [f.primary, ...f.second.depts.filter((d) => d.dept !== f.primary.dept)].map(deptBlock).join("\n\n");
  const courses = f.second.courses
    .map((c) => `- ${c.category}: ${c.names.join(", ")}${c.partial ? " 등" : ""}`)
    .join("\n");
  const user = [
    `[조합]\n본전공: ${f.primary.dept}\n희망 과정: ${secondLabel}`,
    `[자료]\n${texts}`,
    f.mdDefinition && `<마이크로디그리 제도 p.${f.mdDefinition.page}>\n${f.mdDefinition.text}`,
    `[${f.second.name}에서 배우는 과목]\n${courses || "- (과목 정보 없음)"}`,
    f.shared.length > 0 && `[두 과정에 함께 있는 과목]\n${f.shared.join(", ")}`,
    `위 조합을 설명해 줘.`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: user },
  ];
}
