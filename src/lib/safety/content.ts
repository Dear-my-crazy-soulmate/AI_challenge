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

// 욕설·비방: swearing, insults aimed at people, and slurs against a group. Each entry must not sit inside an
// everyday word (so no "염병" for 전염병, "개년" for 3개년, "조까" for 5조까지, "꺼져" for 불이 꺼져).
const BAD_WORDS = [
  "시발", "씨발", "씨바", "시바", "씨팔", "시팔", "씨빨", "시빨", "씨벌", "시벌", "병신", "븅신", "빙신", "개새끼", "새끼야", "좆", "지랄",
  "염병하", "염병떨", "엠창", "니애미", "느금", "니미럴", "썅", "쌍년", "쌍놈", "씹새", "씹년", "씹놈", "씹창", "존나", "미친놈", "미친년",
  "미친새끼", "또라이", "돌아이", "엿먹", "빌어먹", "뒈져", "뒈지", "개소리", "개같",
  "쓰레기", "찌질", "찐따", "한심", "멍청", "머저리", "등신", "무능한", "무능력자", "사기꾼", "꼴통", "꼰대", "거지같", "못생", "뚱땡이", "뚱보",
  "한남충", "김치녀", "된장녀", "맘충", "틀딱", "급식충", "개독", "메갈", "일베충", "짱깨", "쪽발이", "깜둥이", "똥남아",
  "fuck", "shit", "bitch", "bastard", "asshole", "cunt", "nigger", "faggot",
];
const JAMO = ["ㅅㅂ", "ㅆㅂ", "ㅂㅅ", "ㅄ", "ㅈㄹ", "ㅁㅊ", "ㅈㄴ", "ㄲㅈ", "ㄷㅊ"]; // typed as bare consonants
const NUMBER_SWEAR = /(?<!\d)18\s?(놈|새끼|롬|럼)/; // 18놈, 18새끼
const FINE = /시발점|시발역|시발지|시바견|쓰레기\s?(통|봉투|장|처리|분리|소각|매립)/g; // words that merely contain a listed one

/** Punctuation between letters is ignored and one-letter tokens are joined ("시 발"), but ordinary spaces stay, so "수업 시 발표" is fine. */
function normalize(s: string): string {
  const out: string[] = [];
  let prevSingle = false;
  for (const t of s.replace(/[.\-_*~!?,·]/g, "").replace(/(?<=[가-힣])[0-9|](?=[가-힣])/g, "").toLowerCase().split(/\s+/)) {
    const single = /^[가-힣ㄱ-ㅎ]$/.test(t);
    if (single && prevSingle) out[out.length - 1] += t;
    else out.push(t);
    prevSingle = single;
  }
  return out.join(" ").replace(FINE, "");
}

export const isAbusive = (text: string): boolean => {
  const n = normalize(text);
  return BAD_WORDS.some((w) => n.includes(w)) || JAMO.some((w) => n.includes(w)) || NUMBER_SWEAR.test(text);
};

/** Returns the text trimmed, or a message saying what to remove. */
export function checkPostText(raw: string, max: number, label = "내용"): Checked<string> {
  const text = raw.trim();
  if (text.length > max) return { ok: false, message: `${label}은(는) ${max}자 이하로 적어 주세요.` };
  for (const p of PATTERNS) if (p.re.test(text)) return { ok: false, message: p.message };
  if (isAbusive(text)) return { ok: false, message: "욕설이나 비방하는 표현은 올릴 수 없어요. 순한 말로 바꿔 주세요." };
  return { ok: true, value: text };
}
