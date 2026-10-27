// Stand-in login that lives only in this browser (no server, no Supabase yet).
// Same shape as the real service will have, so screens do not change when it is swapped in.
// The password is stored only as a SHA-256 hash; this is NOT real security, just a demo account.
import { GRADES } from "./types";
import type { AuthResult, AuthService, AuthState, Profile } from "./types";

const USERS = "mock.auth.users"; // [{ id, email, hash }]
const PROFILES = "mock.auth.profiles"; // { [userId]: Profile }
const SESSION = "mock.auth.session"; // userId

interface User {
  id: string;
  email: string;
  hash: string;
}

/** The part of the Web Storage API this file uses (so tests can pass an in-memory object). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const fail = (message: string): AuthResult => ({ ok: false, message });

/** Profiles saved before grade/name/studentId existed get neutral defaults instead of breaking. */
function withDefaults(p: Partial<Profile> | undefined): Profile | null {
  if (!p || typeof p.primary !== "string") return null;
  return {
    primary: p.primary,
    interests: Array.isArray(p.interests) ? p.interests : [],
    avatar: p.avatar ?? null,
    grade: p.grade && GRADES.includes(p.grade) ? p.grade : 1,
    name: typeof p.name === "string" ? p.name : "",
    studentId: typeof p.studentId === "string" ? p.studentId : "",
  };
}

async function hash(email: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${email}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function createMockAuth(store: KeyValueStore): AuthService {
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  const read = <T,>(key: string, fallback: T): T => {
    try {
      const raw = store.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key: string, value: unknown) => store.setItem(key, JSON.stringify(value));

  const sessionId = () => store.getItem(SESSION);

  const currentUser = () => read<User[]>(USERS, []).find((u) => u.id === sessionId());
  /** The signed-in user if the password matches, else an error result. */
  async function verify(password: string): Promise<User | AuthResult> {
    const user = currentUser();
    if (!user) return fail("로그인이 필요해요.");
    if (user.hash !== (await hash(user.email, password))) return fail("현재 비밀번호가 맞지 않아요.");
    return user;
  }
  const isUser = (x: User | AuthResult): x is User => "hash" in x;

  return {
    kind: "device",
    getSnapshot() {
      const id = sessionId();
      if (!id) return "out";
      const email = read<User[]>(USERS, []).find((u) => u.id === id)?.email;
      return JSON.stringify({ id, email, profile: withDefaults(read<Record<string, Partial<Profile>>>(PROFILES, {})[id]) });
    },
    subscribe(onChange) {
      listeners.add(onChange);
      // another tab changed the same storage
      const onStorage = (e: Event) => {
        if ((e as StorageEvent).key === null || String((e as StorageEvent).key).startsWith("mock.auth.")) onChange();
      };
      if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
    parse(snapshot): AuthState {
      if (snapshot === "out" || snapshot === "") return { signedIn: false, profile: null };
      try {
        const s = JSON.parse(snapshot) as { profile: Profile | null; email?: string };
        return { signedIn: true, profile: s.profile, ...(s.email ? { email: s.email } : {}) };
      } catch {
        return { signedIn: false, profile: null };
      }
    },
    async signUp(email, password, profile) {
      const users = read<User[]>(USERS, []);
      if (users.some((u) => u.email === email)) return fail("이미 가입된 이메일이에요.");
      const id = crypto.randomUUID();
      write(USERS, [...users, { id, email, hash: await hash(email, password) }]);
      write(PROFILES, { ...read<Record<string, Profile>>(PROFILES, {}), [id]: profile });
      store.setItem(SESSION, id);
      emit();
      return { ok: true };
    },
    async signIn(email, password) {
      const user = read<User[]>(USERS, []).find((u) => u.email === email);
      // one message for both cases, so the form does not reveal which emails exist
      if (!user || user.hash !== (await hash(email, password))) return fail("이메일 또는 비밀번호가 맞지 않아요.");
      store.setItem(SESSION, user.id);
      emit();
      return { ok: true };
    },
    async signOut() {
      store.removeItem(SESSION);
      emit();
    },
    async saveProfile(profile) {
      const id = sessionId();
      if (!id) return fail("로그인이 필요해요.");
      write(PROFILES, { ...read<Record<string, Profile>>(PROFILES, {}), [id]: profile });
      emit();
      return { ok: true };
    },
    async changePassword(currentPassword, newPassword) {
      const user = await verify(currentPassword);
      if (!isUser(user)) return user;
      const next = await hash(user.email, newPassword);
      write(USERS, read<User[]>(USERS, []).map((u) => (u.id === user.id ? { ...u, hash: next } : u)));
      emit();
      return { ok: true };
    },
    async changeEmail(currentPassword, newEmail) {
      const user = await verify(currentPassword);
      if (!isUser(user)) return user;
      const users = read<User[]>(USERS, []);
      if (users.some((u) => u.email === newEmail && u.id !== user.id)) return fail("이미 가입된 이메일이에요.");
      // the hash includes the email, so it is rebuilt with the same password
      const next = await hash(newEmail, currentPassword);
      write(USERS, users.map((u) => (u.id === user.id ? { ...u, email: newEmail, hash: next } : u)));
      emit();
      return { ok: true };
    },
    async deleteAccount(currentPassword) {
      const user = await verify(currentPassword);
      if (!isUser(user)) return user;
      write(USERS, read<User[]>(USERS, []).filter((u) => u.id !== user.id));
      const profiles = read<Record<string, Profile>>(PROFILES, {});
      delete profiles[user.id];
      write(PROFILES, profiles);
      store.removeItem(SESSION);
      emit();
      return { ok: true };
    },
  };
}
