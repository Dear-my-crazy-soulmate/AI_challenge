// Checks for text a student writes in the community, before it is saved or shown (CLAUDE.md rule 4).
// Pure functions. We block contact details and student IDs instead of trying to mask them,
// so nothing personal is ever stored by accident.
import type { Checked } from "./input";

const PATTERNS: { re: RegExp; message: string }[] = [
  { re: /(?<!\d)0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/, message: "전화번호는 올릴 수 없어요." },
  { re: /[^\s@]+@[^\s@]+\.[^\s@]+/, message: "이메일 주소는 올릴 수 없어요." },
  { re: /(?<!\d)\d{6}[-\s]?[1-4]\d{6}(?!\d)/, message: "주민등록번호는 올릴 수 없어요." },
  { re: /(?<!\d)\d{10}(?!\d)/, message: "학번은 올릴 수 없어요. 서로를 알아볼 수 있는 정보는 빼 주세요." },
];

// A short list of common insults. Spaces and punctuation between letters are ignored when matching.
const BAD_WORDS = ["시발", "씨발", "씨바", "병신", "개새끼", "새끼야", "좆", "지랄", "미친놈", "미친년", "꺼져", "닥쳐"];

const squeeze = (s: string) => s.replace(/[\s.\-_*~!?,]+/g, "").toLowerCase();

/** Returns the text trimmed, or a message saying what to remove. */
export function checkPostText(raw: string, max: number, label = "내용"): Checked<string> {
  const text = raw.trim();
  if (text.length > max) return { ok: false, message: `${label}은(는) ${max}자 이하로 적어 주세요.` };
  for (const p of PATTERNS) if (p.re.test(text)) return { ok: false, message: p.message };
  const flat = squeeze(text);
  if (BAD_WORDS.some((w) => flat.includes(w))) return { ok: false, message: "비속어는 올릴 수 없어요. 표현을 바꿔 주세요." };
  return { ok: true, value: text };
}
