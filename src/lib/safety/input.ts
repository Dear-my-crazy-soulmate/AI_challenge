// Checks for what users type or pick before it is stored (CLAUDE.md rule 4).
// Pure functions. Messages are written for the user.
import { MAX_INTERESTS } from "../auth/types";
import type { Profile } from "../auth/types";

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

/** Only known department names get through, so a typed-in 학번, name or phone number cannot end up in a profile. */
export function checkProfile(input: Profile, knownDepts: string[]): Checked<Profile> {
  const known = new Set(knownDepts);
  if (!known.has(input.primary)) return { ok: false, message: "본전공을 목록에서 골라 주세요." };
  const interests = [...new Set(input.interests)].filter((d) => d !== input.primary);
  if (interests.some((d) => !known.has(d))) return { ok: false, message: "관심 전공을 목록에서 골라 주세요." };
  if (interests.length > MAX_INTERESTS) return { ok: false, message: `관심 전공은 ${MAX_INTERESTS}개까지 고를 수 있어요.` };
  if (input.avatar !== null && !known.has(input.avatar)) return { ok: false, message: "프로필 캐릭터를 목록에서 골라 주세요." };
  return { ok: true, value: { primary: input.primary, interests, avatar: input.avatar } };
}
