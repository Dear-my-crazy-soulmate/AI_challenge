// Real accounts with Supabase Auth; the profile lives in public.profiles
// (supabase/migrations/0001_profiles.sql, RLS: own row only).
// Same AuthService shape as mock.ts, so screens do not change.
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { GRADES } from "./types";
import type { AuthResult, AuthService, AuthState, Grade, Profile } from "./types";

interface ProfileRow {
  id: string;
  primary_major: string;
  interests: string[] | null;
  avatar: string | null;
  grade: number | null;
  name: string | null;
  student_id: string | null;
}

const fail = (message: string): AuthResult => ({ ok: false, message });

export function toRow(id: string, p: Profile): ProfileRow {
  return {
    id,
    primary_major: p.primary,
    interests: p.interests,
    avatar: p.avatar,
    grade: p.grade,
    name: p.name,
    student_id: p.studentId,
  };
}

export function fromRow(r: ProfileRow): Profile {
  const grade = GRADES.includes(r.grade as Grade) ? (r.grade as Grade) : 1;
  return {
    primary: r.primary_major,
    interests: r.interests ?? [],
    avatar: r.avatar ?? null,
    grade,
    name: r.name ?? "",
    studentId: r.student_id ?? "",
  };
}

/** Supabase error text -> a message for the user (Korean), without leaking details. */
export function explain(error: { message?: string; code?: string; status?: number } | null | undefined): string {
  const m = (error?.message ?? "").toLowerCase();
  const code = error?.code ?? "";
  if (code === "invalid_credentials" || m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 맞지 않아요.";
  if (code === "email_not_confirmed" || m.includes("email not confirmed")) return "가입 확인 메일의 링크를 먼저 눌러 주세요.";
  if (code === "user_already_exists" || m.includes("already registered")) return "이미 가입된 이메일이에요.";
  if (code === "email_exists" || m.includes("already been registered")) return "이미 가입된 이메일이에요.";
  if (code === "weak_password" || m.includes("password should")) return "비밀번호가 너무 약해요. 더 길게 만들어 주세요.";
  if (code === "same_password" || m.includes("different from the old")) return "지금과 다른 비밀번호를 입력해 주세요.";
  if (code === "over_email_send_rate_limit" || error?.status === 429) return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  if (m.includes("fetch") || m.includes("network")) return "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.";
  return "처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export function createSupabaseAuth(sb: SupabaseClient): AuthService {
  const listeners = new Set<() => void>();
  // "" = not loaded yet (useAuth treats it as not ready), "out" = signed out, JSON = signed in
  let snapshot = "";
  let user: User | null = null;
  let profile: Profile | null = null;

  const emit = () => listeners.forEach((l) => l());
  const publish = () => {
    const next = user ? JSON.stringify({ id: user.id, email: user.email ?? "", profile }) : "out";
    if (next !== snapshot) {
      snapshot = next;
      emit();
    }
  };

  /** Profile row for the user; created from sign-up metadata the first time (e.g. after mail confirmation). */
  async function loadProfile(u: User): Promise<Profile | null> {
    const { data, error } = await sb.from("profiles").select("*").eq("id", u.id).maybeSingle();
    if (error) return null;
    if (data) return fromRow(data as ProfileRow);
    const pending = (u.user_metadata as { profile?: Profile } | undefined)?.profile;
    if (!pending?.primary) return null;
    const { error: insertError } = await sb.from("profiles").insert(toRow(u.id, pending));
    return insertError ? null : pending;
  }

  async function adopt(u: User | null) {
    user = u;
    profile = u ? await loadProfile(u) : null;
    publish();
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    sb.auth.getSession().then(({ data }) => adopt(data.session?.user ?? null));
    sb.auth.onAuthStateChange((event, session) => {
      // token refreshes keep the same user; avoid refetching the profile for them
      if (event === "TOKEN_REFRESHED" && session?.user?.id === user?.id) return;
      // Run outside the auth callback (Supabase recommends not awaiting inside it), and read the
      // session again then: the event's copy can be stale (e.g. verify() signs in right before updateUser).
      setTimeout(() => {
        sb.auth.getSession().then(({ data }) => adopt(data.session?.user ?? null));
      }, 0);
    });
  }

  /** Check the current password by signing in again with it. */
  async function verify(password: string): Promise<AuthResult> {
    if (!user?.email) return fail("로그인이 필요해요.");
    const { error } = await sb.auth.signInWithPassword({ email: user.email, password });
    return error ? fail(explain(error).replace("이메일 또는 비밀번호가", "현재 비밀번호가")) : { ok: true };
  }

  return {
    kind: "server",
    getSnapshot() {
      start();
      return snapshot;
    },
    subscribe(onChange) {
      start();
      listeners.add(onChange);
      return () => void listeners.delete(onChange);
    },
    parse(s): AuthState {
      if (s === "out" || s === "") return { signedIn: false, profile: null };
      try {
        const v = JSON.parse(s) as { email: string; profile: Profile | null };
        return { signedIn: true, profile: v.profile, email: v.email };
      } catch {
        return { signedIn: false, profile: null };
      }
    },
    async signUp(email, password, p) {
      // the profile also goes into user metadata so it can be stored after mail confirmation
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { profile: p } } });
      if (error) return fail(explain(error));
      // Supabase answers an existing email with a user that has no identities (no error, to hide which emails exist)
      if (data.user && data.user.identities?.length === 0) return fail("이미 가입된 이메일이에요.");
      if (!data.session || !data.user) {
        return { ok: true, notice: "가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요." };
      }
      const { error: rowError } = await sb.from("profiles").upsert(toRow(data.user.id, p));
      if (rowError) return fail("계정은 만들었지만 프로필을 저장하지 못했어요. MY에서 다시 저장해 주세요.");
      await adopt(data.user);
      return { ok: true };
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return fail(explain(error));
      await adopt(data.user);
      return { ok: true };
    },
    async signOut() {
      await sb.auth.signOut();
      await adopt(null);
    },
    async saveProfile(p) {
      if (!user) return fail("로그인이 필요해요.");
      const { error } = await sb.from("profiles").upsert({ ...toRow(user.id, p), updated_at: new Date().toISOString() });
      if (error) return fail(explain(error));
      profile = p;
      publish();
      return { ok: true };
    },
    async changePassword(currentPassword, newPassword) {
      const checked = await verify(currentPassword);
      if (!checked.ok) return checked;
      const { error } = await sb.auth.updateUser({ password: newPassword });
      return error ? fail(explain(error)) : { ok: true };
    },
    async changeEmail(currentPassword, newEmail) {
      const checked = await verify(currentPassword);
      if (!checked.ok) return checked;
      const { data, error } = await sb.auth.updateUser({ email: newEmail });
      if (error) return fail(explain(error));
      if (data.user?.email === newEmail) {
        await adopt(data.user);
        return { ok: true };
      }
      // "Secure email change" on: Supabase waits for the confirmation link before switching
      return { ok: true, notice: "확인 메일을 보냈어요. 메일의 링크를 누르면 이메일이 바뀌어요." };
    },
    async deleteAccount(currentPassword) {
      const checked = await verify(currentPassword);
      if (!checked.ok) return checked;
      const { error } = await sb.rpc("delete_own_account");
      if (error) return fail("계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
      await sb.auth.signOut();
      await adopt(null);
      return { ok: true };
    },
  };
}
