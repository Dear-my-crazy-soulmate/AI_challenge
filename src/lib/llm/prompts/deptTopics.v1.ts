// deptTopics.v1 — ChatKHU reads one department's book text and says which 관심 분야 it fits,
// with a one-sentence reason. Run once offline (scripts/recommend/generate.mjs); the result is
// checked by src/lib/recommend/verify.ts and stored in data/curated/<year>/dept_topics.json.
// Changes go into deptTopics.v2.ts and a line in docs/prompt-log.md (CLAUDE.md rule 8).
// Only type imports here, so the Node script can load this file directly.
import type { ChatMessage } from "../types";

export const VERSION = "deptTopics.v1";

export interface DeptTopicInput {
  dept: string; // one or more majors that share this text, e.g. "기계공학, 지능로봇공학, 항공우주모빌리티"
  page: number;
  intro: string;
  purpose: string;
  goals: string;
}

const SYSTEM = `너는 경희대학교 국제캠퍼스 신입생이 다전공할 학과를 찾도록 돕는 안내자다.
학과 하나의 교육과정 원문을 읽고, 주어진 [관심 분야 목록] 중 이 학과가 실제로 가르치는 분야를 고른다.

반드시 지킬 것:
1. [원문]에 분명히 나오는 내용만 근거로 고른다. 원문에 없는 분야는 고르지 않는다.
2. 1~3개를 고르고, 가장 잘 맞는 것부터 쓴다. 억지로 3개를 채우지 않는다.
3. id는 [관심 분야 목록]에 있는 id 그대로 쓴다.
4. reason은 "이 분야에 관심 있는 학생에게 왜 이 학과가 맞는지"를 원문 표현을 살려 한 문장(80자 이내)으로, 존댓말(~해요)로 쓴다.
5. "학점"이라는 말, 숫자, 취업률, 연봉, 순위, 퍼센트, "보장" 같은 말은 쓰지 않는다.
6. page에는 [원문]에 표시된 쪽 번호를 그대로 쓴다.

출력은 아래 JSON 하나만 쓴다. 코드블록이나 다른 글은 쓰지 않는다.
{"topics": [{"id": "분야 id", "reason": "한 문장", "page": 0}]}`;

export function buildMessages(d: DeptTopicInput, topics: readonly { id: string; label: string }[]): ChatMessage[] {
  const list = topics.map((t) => `- ${t.id}: ${t.label}`).join("\n");
  const text = [d.intro && `학과 소개: ${d.intro}`, d.purpose && `교육목적: ${d.purpose}`, d.goals && `교육목표: ${d.goals}`]
    .filter(Boolean)
    .join("\n");
  const user = `[관심 분야 목록]\n${list}\n\n[원문] ${d.dept} (p.${d.page})\n${text}\n\n이 학과에 맞는 관심 분야를 골라 줘.`;
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: user },
  ];
}
