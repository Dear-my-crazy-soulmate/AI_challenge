// Checks ChatKHU's 관심 분야 answer for one department before it is stored. Pure, and
// without value imports so scripts/recommend/generate.mjs can load it under plain Node.
// A failed check leaves the department as TODO (no recommendation), never a half-checked answer.

export interface DeptTopic {
  id: string;
  reason: string;
  page: number;
}

export type TopicCheck = { ok: true; topics: DeptTopic[] } | { ok: false; problems: string[] };

// Same rule as the combination guide (src/lib/guide/verify.ts): no credits, numbers or promises.
const BANNED = ["학점", "취업률", "연봉", "%", "퍼센트", "보장", "순위", "1위", "무조건", "반드시 취업"];
const MAX_TOPICS = 3;
const MAX_REASON = 120;

function parseJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * @param topicIds the 관심 분야 ids the model was offered
 * @param page     the book page of the department text (the only page allowed)
 * @param source   the text the model was given; numbers copied from it are allowed
 */
export function verifyDeptTopics(reply: string, topicIds: readonly string[], page: number, source: string): TopicCheck {
  const raw = parseJson(reply) as { topics?: unknown } | null;
  if (!raw || !Array.isArray(raw.topics)) return { ok: false, problems: ["JSON 형식이 아니거나 topics가 없음"] };
  const known = new Set(topicIds);
  const problems: string[] = [];
  const topics: DeptTopic[] = [];
  for (const x of raw.topics as unknown[]) {
    const o = x as { id?: unknown; reason?: unknown; page?: unknown };
    const id = typeof o?.id === "string" ? o.id.trim() : "";
    const reason = typeof o?.reason === "string" ? o.reason.trim() : "";
    if (!known.has(id)) problems.push(`목록에 없는 분야: ${id || "(빈 값)"}`);
    else if (topics.some((t) => t.id === id)) problems.push(`같은 분야가 두 번: ${id}`);
    if (!reason) problems.push(`이유가 없음: ${id}`);
    if (reason.length > MAX_REASON) problems.push(`이유가 너무 김: ${id}`);
    for (const w of BANNED) if (reason.includes(w)) problems.push(`금지 표현 "${w}": ${id}`);
    for (const n of reason.match(/\d+/g) ?? []) if (!source.includes(n)) problems.push(`원문에 없는 숫자 ${n}: ${id}`);
    if (Number(o?.page) !== page) problems.push(`쪽 번호가 원문(p.${page})과 다름: ${id}`);
    topics.push({ id, reason, page });
  }
  if (topics.length < 1 || topics.length > MAX_TOPICS) problems.push(`분야 수가 1~${MAX_TOPICS}개가 아님`);
  return problems.length ? { ok: false, problems } : { ok: true, topics };
}
