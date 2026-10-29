// Checks ChatKHU's answer before a student sees it. Pure; a failed check means the
// screen shows the book's own text instead (fallback.ts), never a half-checked answer.
import type { GuideFacts, Guide, GuideItem } from "./types";

// Things the explanation must never claim: credits belong to the calculator, and
// employment numbers or guarantees are not in the book.
const BANNED = ["학점", "취업률", "연봉", "%", "퍼센트", "보장", "순위", "1위", "무조건", "반드시 취업"];
const LIMITS = { summary: 120, item: 220, fit: 200, minItems: 1, maxItems: 4 } as const;

export type Checked = { ok: true; guide: Guide } | { ok: false; problems: string[] };

/** The JSON object in the reply, tolerating a code fence or a sentence around it. */
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

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

function items(v: unknown): GuideItem[] | null {
  if (!Array.isArray(v)) return null;
  const out: GuideItem[] = [];
  for (const x of v) {
    const o = x as { text?: unknown; page?: unknown };
    if (!isStr(o?.text)) return null;
    out.push({ text: o.text.trim(), page: Number(o.page) });
  }
  return out;
}

/** Every text the model was given, so numbers it copies from there are allowed. */
function sourceCorpus(f: GuideFacts): string {
  const depts = [f.primary, ...f.second.depts];
  return [
    ...depts.flatMap((d) => [d.dept, d.intro, d.purpose, d.goals]),
    f.second.name,
    ...f.second.courses.flatMap((c) => c.names),
    ...(f.primaryCourses ?? []).flatMap((c) => c.names),
    ...(f.interests ?? []).flatMap((i) => [i.label, ...i.reasons.map((r) => r.text)]),
    ...f.shared,
    f.mdDefinition?.text ?? "",
  ].join(" ");
}

export function allowedPages(f: GuideFacts): Set<number> {
  const pages = [f.primary, ...f.second.depts].map((d) => d.page).filter((p) => p > 0);
  if (f.mdDefinition) pages.push(f.mdDefinition.page);
  return new Set(pages);
}

export function verifyGuide(reply: string, f: GuideFacts): Checked {
  const raw = parseJson(reply) as Record<string, unknown> | null;
  if (!raw) return { ok: false, problems: ["JSON 형식이 아님"] };
  const strengths = items(raw.strengths);
  const paths = items(raw.paths);
  if (!isStr(raw.summary) || !strengths || !paths) return { ok: false, problems: ["필요한 칸(summary, strengths, paths)이 없음"] };
  const guide: Guide = {
    summary: raw.summary.trim(),
    strengths,
    paths,
    // the card already labels this line, so drop the model's own "이런 학생에게 잘 맞아요:" opener
    fit: isStr(raw.fit) ? raw.fit.trim().replace(/^이런 학생에게 잘 맞아요\s*[:.]?\s*/, "") : "",
  };

  const problems: string[] = [];
  for (const [name, list] of [["strengths", strengths], ["paths", paths]] as const) {
    if (list.length < LIMITS.minItems || list.length > LIMITS.maxItems) problems.push(`${name} 개수 ${list.length}`);
  }
  if (guide.summary.length > LIMITS.summary) problems.push("summary가 너무 김");
  if (guide.fit.length > LIMITS.fit) problems.push("fit이 너무 김");

  const corpus = sourceCorpus(f);
  const pages = allowedPages(f);
  const texts = [guide.summary, guide.fit, ...strengths.map((s) => s.text), ...paths.map((p) => p.text)];
  for (const t of texts) {
    if (t.length > LIMITS.item) problems.push(`너무 긴 문장: "${t.slice(0, 30)}…"`);
    for (const w of BANNED) if (t.includes(w)) problems.push(`쓰면 안 되는 표현 '${w}': "${t.slice(0, 40)}…"`);
    for (const n of t.match(/\d+/g) ?? []) {
      if (!corpus.includes(n)) problems.push(`근거 없는 숫자 ${n}: "${t.slice(0, 40)}…"`);
    }
  }
  for (const it of [...strengths, ...paths]) {
    if (!pages.has(it.page)) problems.push(`근거에 없는 쪽 번호 ${String(it.page)}: "${it.text.slice(0, 30)}…"`);
  }
  return problems.length ? { ok: false, problems } : { ok: true, guide };
}

const V2_LIMITS = { summary: 200, item: 220, fit: 200, consider: 200 } as const;

/** comboGuide.v2: the v1 checks, plus the course names in bridges and activities must be listed courses. */
export function verifyGuideV2(reply: string, f: GuideFacts): Checked {
  const raw = parseJson(reply) as Record<string, unknown> | null;
  if (!raw) return { ok: false, problems: ["JSON 형식이 아님"] };
  const strengths = items(raw.strengths);
  const paths = items(raw.paths);
  if (!isStr(raw.summary) || !strengths || !paths) return { ok: false, problems: ["필요한 칸(summary, strengths, paths)이 없음"] };

  const primaryNames = new Set((f.primaryCourses ?? []).flatMap((c) => c.names));
  const secondNames = new Set(f.second.courses.flatMap((c) => c.names));
  const allNames = [...primaryNames, ...secondNames];
  const problems: string[] = [];

  const bridges: NonNullable<Guide["bridges"]> = [];
  for (const x of Array.isArray(raw.bridges) ? raw.bridges : []) {
    const o = x as { from?: unknown; to?: unknown; text?: unknown };
    if (!isStr(o?.from) || !isStr(o?.to) || !isStr(o?.text)) {
      problems.push("bridges 항목 형식이 다름");
      continue;
    }
    const from = o.from.trim().replace(/\[[12]학기\]$/, "");
    const to = o.to.trim().replace(/\[[12]학기\]$/, "");
    if (!primaryNames.has(from)) problems.push(`본전공 목록에 없는 과목: ${from}`);
    if (!secondNames.has(to)) problems.push(`희망 과정 목록에 없는 과목: ${to}`);
    bridges.push({ from, to, text: o.text.trim() });
  }
  const activities = (Array.isArray(raw.activities) ? raw.activities : []).filter(isStr).map((a) => a.trim());
  for (const a of activities) {
    if (!allNames.some((n) => a.includes(n))) problems.push(`목록의 과목 이름이 없는 활동: "${a.slice(0, 30)}…"`);
  }
  // at least one bridge whenever both course lists exist
  if (bridges.length > 2 || (primaryNames.size > 0 && secondNames.size > 0 && bridges.length < 1)) problems.push(`bridges 개수 ${bridges.length}`);
  if (activities.length < 1 || activities.length > 2) problems.push(`activities 개수 ${activities.length}`);
  for (const [name, list] of [["strengths", strengths], ["paths", paths]] as const) {
    if (list.length < LIMITS.minItems || list.length > LIMITS.maxItems) problems.push(`${name} 개수 ${list.length}`);
  }

  const guide: Guide = {
    summary: raw.summary.trim(),
    strengths,
    paths,
    fit: isStr(raw.fit) ? raw.fit.trim().replace(/^이런 학생에게 잘 맞아요\s*[:.]?\s*/, "") : "",
    bridges,
    activities,
    consider: isStr(raw.consider) ? raw.consider.trim() : "",
  };
  if (guide.summary.length > V2_LIMITS.summary) problems.push("summary가 너무 김");
  if (guide.fit.length > V2_LIMITS.fit) problems.push("fit이 너무 김");
  if ((guide.consider ?? "").length > V2_LIMITS.consider) problems.push("consider가 너무 김");

  const corpus = sourceCorpus(f);
  const pages = allowedPages(f);
  const texts = [
    guide.summary,
    guide.fit,
    guide.consider ?? "",
    ...strengths.map((s) => s.text),
    ...paths.map((p) => p.text),
    ...bridges.map((b) => b.text),
    ...activities,
  ];
  for (const t of texts) {
    if (t.length > V2_LIMITS.item && t !== guide.summary) problems.push(`너무 긴 문장: "${t.slice(0, 30)}…"`);
    for (const w of BANNED) if (t.includes(w)) problems.push(`쓰면 안 되는 표현 '${w}': "${t.slice(0, 40)}…"`);
    for (const n of t.match(/\d+/g) ?? []) {
      if (!corpus.includes(n)) problems.push(`근거 없는 숫자 ${n}: "${t.slice(0, 40)}…"`);
    }
  }
  for (const it of [...strengths, ...paths]) {
    if (!pages.has(it.page)) problems.push(`근거에 없는 쪽 번호 ${String(it.page)}: "${it.text.slice(0, 30)}…"`);
  }
  return problems.length ? { ok: false, problems } : { ok: true, guide };
}
