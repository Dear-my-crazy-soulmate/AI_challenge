import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAuth, explain, fromRow, toRow } from "../../src/lib/auth/supabase";
import type { AuthService, Profile } from "../../src/lib/auth/types";

const profile: Profile = { primary: "컴퓨터공학과", interests: ["철학과"], topics: [], avatar: null, grade: 2, name: "", studentId: "" };

interface FakeUser {
  id: string;
  email: string;
  password: string;
  user_metadata: Record<string, unknown>;
  identities: unknown[];
}

/** Just enough of supabase-js for createSupabaseAuth: auth, the profiles table and one RPC. */
function fakeSupabase(opts: { confirmEmail?: boolean; secureEmailChange?: boolean; lag?: { select: number; insert: number; upsert: number } } = {}) {
  const wait = (ms = 0) => (ms ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());
  const users: FakeUser[] = [];
  const rows = new Map<string, Record<string, unknown>>();
  let session: { user: FakeUser } | null = null;
  const listeners: ((event: string, s: unknown) => void)[] = [];
  const err = (message: string, code: string) => ({ message, code });
  const pub = (u: FakeUser) => ({ id: u.id, email: u.email, user_metadata: u.user_metadata, identities: u.identities });
  const announce = (event: string) => listeners.forEach((l) => l(event, session ? { user: pub(session.user) } : null));

  const client = {
    auth: {
      async getSession() {
        return { data: { session: session ? { user: pub(session.user) } : null } };
      },
      onAuthStateChange(cb: (event: string, s: unknown) => void) {
        listeners.push(cb);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
        const existing = users.find((u) => u.email === email);
        if (existing) return { data: { user: { ...pub(existing), identities: [] }, session: null }, error: null };
        const u: FakeUser = { id: `u${users.length + 1}`, email, password, user_metadata: options?.data ?? {}, identities: [{}] };
        users.push(u);
        if (opts.confirmEmail) return { data: { user: pub(u), session: null }, error: null };
        session = { user: u };
        announce("SIGNED_IN");
        return { data: { user: pub(u), session: { user: pub(u) } }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const u = users.find((x) => x.email === email && x.password === password);
        if (!u) return { data: { user: null, session: null }, error: err("Invalid login credentials", "invalid_credentials") };
        session = { user: u };
        announce("SIGNED_IN");
        return { data: { user: pub(u), session: { user: pub(u) } }, error: null };
      },
      async signOut() {
        session = null;
        announce("SIGNED_OUT");
        return { error: null };
      },
      async updateUser(attrs: { password?: string; email?: string }) {
        if (!session) return { data: { user: null }, error: err("no session", "session_missing") };
        if (attrs.password) session.user.password = attrs.password;
        if (attrs.email && !opts.secureEmailChange) session.user.email = attrs.email;
        return { data: { user: pub(session.user) }, error: null };
      },
    },
    from(table: string) {
      expect(table).toBe("profiles");
      return {
        select() {
          return {
            eq(_col: string, id: string) {
              return {
                maybeSingle: async () => {
                  const found = rows.get(id) ?? null; // what the server sees when the request arrives
                  await wait(opts.lag?.select);
                  return { data: found, error: null };
                },
              };
            },
          };
        },
        async insert(row: Record<string, unknown>) {
          await wait(opts.lag?.insert);
          // RLS: only the signed-in user's own row
          if (row.id !== session?.user.id) return { error: err("rls", "42501") };
          if (rows.has(row.id as string)) return { error: err("duplicate key", "23505") };
          rows.set(row.id as string, row);
          return { error: null };
        },
        async upsert(row: Record<string, unknown>) {
          await wait(opts.lag?.upsert);
          if (row.id !== session?.user.id) return { error: err("rls", "42501") };
          rows.set(row.id as string, { ...rows.get(row.id as string), ...row });
          return { error: null };
        },
      };
    },
    async rpc(name: string) {
      expect(name).toBe("delete_own_account");
      if (!session) return { error: err("not signed in", "P0001") };
      const id = session.user.id;
      users.splice(users.findIndex((u) => u.id === id), 1);
      rows.delete(id); // on delete cascade
      return { error: null };
    },
  };
  return { client: client as unknown as SupabaseClient, users, rows };
}

const tick = () => new Promise((r) => setTimeout(r, 5));

describe("supabase auth", () => {
  let fake: ReturnType<typeof fakeSupabase>;
  let auth: AuthService;
  const state = () => auth.parse(auth.getSnapshot());

  beforeEach(async () => {
    fake = fakeSupabase();
    auth = createSupabaseAuth(fake.client);
    auth.getSnapshot(); // starts the session check
    await tick();
  });

  it("is a real server account and starts signed out", () => {
    expect(auth.kind).toBe("server");
    expect(state()).toEqual({ signedIn: false, profile: null });
  });

  it("sign up stores the profile row and signs in", async () => {
    expect(await auth.signUp("a@b.co", "password1", profile)).toEqual({ ok: true });
    expect(state()).toEqual({ signedIn: true, profile, email: "a@b.co" });
    expect(fake.rows.get("u1")).toMatchObject({ primary_major: "컴퓨터공학과", grade: 2 });
  });

  it("reports an email that already has an account", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    await auth.signOut();
    expect(await auth.signUp("a@b.co", "password2", profile)).toEqual({ ok: false, message: "이미 가입된 이메일이에요." });
  });

  it("signs in again and loads the profile from the server", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    await auth.signOut();
    // a second device: a fresh service on the same server
    const other = createSupabaseAuth(fake.client);
    expect(await other.signIn("a@b.co", "password1")).toEqual({ ok: true });
    expect(other.parse(other.getSnapshot()).profile).toEqual(profile);
  });

  it("wrong password gives a Korean message", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    await auth.signOut();
    expect(await auth.signIn("a@b.co", "nope-nope")).toEqual({ ok: false, message: "이메일 또는 비밀번호가 맞지 않아요." });
  });

  it("saves profile changes", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    const next = { ...profile, interests: ["체육학과"], name: "김경희" };
    expect(await auth.saveProfile(next)).toEqual({ ok: true });
    expect(state().profile).toEqual(next);
    expect(fake.rows.get("u1")).toMatchObject({ interests: ["체육학과"], name: "김경희" });
  });

  it("changes the password after checking the current one", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    expect(await auth.changePassword("wrong-pass", "password2")).toEqual({ ok: false, message: "현재 비밀번호가 맞지 않아요." });
    expect(await auth.changePassword("password1", "password2")).toEqual({ ok: true });
    await auth.signOut();
    expect((await auth.signIn("a@b.co", "password2")).ok).toBe(true);
  });

  it("changes the email", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    expect(await auth.changeEmail("password1", "new@b.co")).toEqual({ ok: true });
    await tick();
    expect(state().email).toBe("new@b.co");
  });

  it("deletes the account and the profile row", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    expect((await auth.deleteAccount("nope-nope")).ok).toBe(false);
    expect(await auth.deleteAccount("password1")).toEqual({ ok: true });
    expect(state().signedIn).toBe(false);
    expect(fake.users).toHaveLength(0);
    expect(fake.rows.size).toBe(0);
  });
});

describe("supabase auth on a slow network", () => {
  it("keeps the profile after sign-up even when the sign-in event's own load finishes last", async () => {
    // the event's load reads before signUp saves the row, then its insert fails as a duplicate
    const fake = fakeSupabase({ lag: { select: 10, insert: 30, upsert: 5 } });
    const auth = createSupabaseAuth(fake.client);
    auth.getSnapshot();
    await tick();
    expect(await auth.signUp("a@b.co", "password1", profile)).toEqual({ ok: true });
    expect(auth.parse(auth.getSnapshot()).profile).toEqual(profile);
    await new Promise((r) => setTimeout(r, 80));
    expect(auth.parse(auth.getSnapshot())).toEqual({ signedIn: true, profile, email: "a@b.co" });
  });
});

describe("supabase auth with mail confirmation on", () => {
  it("asks to confirm, then creates the profile from sign-up data at first login", async () => {
    const fake = fakeSupabase({ confirmEmail: true });
    const auth = createSupabaseAuth(fake.client);
    const r = await auth.signUp("a@b.co", "password1", profile);
    expect(r.ok && r.notice).toContain("확인 메일");
    expect(fake.rows.size).toBe(0);
    expect(await auth.signIn("a@b.co", "password1")).toEqual({ ok: true });
    expect(auth.parse(auth.getSnapshot()).profile).toEqual(profile);
    expect(fake.rows.get("u1")).toMatchObject({ primary_major: "컴퓨터공학과" });
  });

  it("email change waits for the confirmation link", async () => {
    const fake = fakeSupabase({ secureEmailChange: true });
    const auth = createSupabaseAuth(fake.client);
    await auth.signUp("a@b.co", "password1", profile);
    const r = await auth.changeEmail("password1", "new@b.co");
    expect(r.ok && r.notice).toContain("확인 메일");
  });
});

describe("helpers", () => {
  it("profile <-> row round trip", () => {
    const p = { ...profile, name: "김경희", studentId: "2026100123" };
    expect(fromRow(toRow("u1", p))).toEqual(p);
  });

  it("explains server errors in Korean without details", () => {
    expect(explain({ message: "Email not confirmed" })).toContain("확인 메일");
    expect(explain({ message: "boom", status: 500 })).toBe("처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
    expect(explain({ message: "Failed to fetch" })).toContain("인터넷");
  });
});
