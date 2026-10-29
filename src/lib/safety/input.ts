// Checks for what users type or pick before it is stored (CLAUDE.md rule 4).
// Pure functions. Messages are written for the user.
import { GRADES, MAX_INTERESTS, MAX_NAME } from "../auth/types";
import type { Profile } from "../auth/types";
import { MAX_TOPICS, TOPICS } from "../recommend/topics";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;

export type Checked<T> = { ok: true; value: T } | { ok: false; message: string };

export function checkEmail(raw: string): Checked<string> {
  const email = raw.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 120) return { ok: false, message: "이메일 형식을 확인해 주세요." };
  return { ok: true, value: email };
}

export function checkPassword(password: string): Checked<string> {
  if (password.length < MIN_PASSWORD) return { ok: false, message: `비밀번호는 ${MIN_PASSWORD}자 이상이어야 해요.` };
  if (password.length > 72) return { ok: false, message: "비밀번호는 72자 이하여야 해요." };
  return { ok: true, value: password };
}

export function checkName(raw: string): Checked<string> {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length > MAX_NAME) return { ok: false, message: `이름은 ${MAX_NAME}자 이하로 적어 주세요.` };
  return { ok: true, value: name };
}

/** Empty is fine (optional). Otherwise exactly 10 digits, like 2026100123. */
export function checkStudentId(raw: string): Checked<string> {
  const id = raw.trim();
  if (id !== "" && !/^\d{10}$/.test(id)) return { ok: false, message: "학번은 숫자 10자리로 적어 주세요." };
  return { ok: true, value: id };
}

/** Department names must come from the list; name and 학번 are checked by their own rules above. */
export function checkProfile(input: Profile, knownDepts: string[]): Checked<Profile> {
  const known = new Set(knownDepts);
  if (!known.has(input.primary)) return { ok: false, message: "본전공을 목록에서 골라 주세요." };
  const interests = [...new Set(input.interests)].filter((d) => d !== input.primary);
  if (interests.some((d) => !known.has(d))) return { ok: false, message: "관심 전공을 목록에서 골라 주세요." };
  if (interests.length > MAX_INTERESTS) return { ok: false, message: `관심 전공은 ${MAX_INTERESTS}개까지 고를 수 있어요.` };
  const topics = [...new Set(input.topics ?? [])];
  if (topics.some((t) => !TOPICS.some((x) => x.id === t))) return { ok: false, message: "관심 분야를 목록에서 골라 주세요." };
  if (topics.length > MAX_TOPICS) return { ok: false, message: `관심 분야는 ${MAX_TOPICS}개까지 고를 수 있어요.` };
  if (input.avatar !== null && !known.has(input.avatar)) return { ok: false, message: "프로필 캐릭터를 목록에서 골라 주세요." };
  if (!GRADES.includes(input.grade)) return { ok: false, message: "학년을 골라 주세요." };
  const name = checkName(input.name);
  if (!name.ok) return name;
  const studentId = checkStudentId(input.studentId);
  if (!studentId.ok) return studentId;
  return {
    ok: true,
    value: { primary: input.primary, interests, topics, avatar: input.avatar, grade: input.grade, name: name.value, studentId: studentId.value },
  };
}

/** The only part of a profile an LLM may see: no name, no 학번 (CLAUDE.md rule 4). */
export function forLlm(profile: Profile): Pick<Profile, "primary" | "interests" | "grade"> {
  return { primary: profile.primary, interests: profile.interests, grade: profile.grade };
}
