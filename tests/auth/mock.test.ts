import { beforeEach, describe, expect, it } from "vitest";

import { createMockAuth } from "../../src/lib/auth/mock";
import type { KeyValueStore } from "../../src/lib/auth/mock";
import type { AuthService, Profile } from "../../src/lib/auth/types";

function memoryStore(): KeyValueStore & { dump(): string } {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    dump: () => JSON.stringify([...m]),
  };
}

const profile: Profile = { primary: "컴퓨터공학과", interests: ["철학과"], avatar: null, grade: 1, name: "김경희", studentId: "2026100123" };

describe("mock auth", () => {
  let store: ReturnType<typeof memoryStore>;
  let auth: AuthService;
  beforeEach(() => {
    store = memoryStore();
    auth = createMockAuth(store);
  });

  it("starts signed out", () => {
    expect(auth.parse(auth.getSnapshot())).toEqual({ signedIn: false, profile: null });
  });

  it("sign up signs the user in with the profile", async () => {
    expect(await auth.signUp("a@b.co", "password1", profile)).toEqual({ ok: true });
    expect(auth.parse(auth.getSnapshot())).toEqual({ signedIn: true, profile, email: "a@b.co" });
  });

  it("rejects a second sign up with the same email", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    await auth.signOut();
    const again = await auth.signUp("a@b.co", "password2", profile);
    expect(again.ok).toBe(false);
  });

  it("signs in with the right password and keeps the profile", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    await auth.signOut();
    expect(auth.parse(auth.getSnapshot()).signedIn).toBe(false);
    expect(await auth.signIn("a@b.co", "password1")).toEqual({ ok: true });
    expect(auth.parse(auth.getSnapshot())).toEqual({ signedIn: true, profile, email: "a@b.co" });
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    await auth.signOut();
    const wrong = await auth.signIn("a@b.co", "nope-nope");
    const unknown = await auth.signIn("x@y.co", "password1");
    expect(wrong).toEqual(unknown);
    expect(wrong.ok).toBe(false);
    expect(auth.parse(auth.getSnapshot()).signedIn).toBe(false);
  });

  it("never stores the password itself", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    expect(store.dump()).not.toContain("password1");
  });

  it("keeps the profile between sessions and saves changes", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    const next = { ...profile, interests: ["철학과", "체육학과"], avatar: "컴퓨터공학과" };
    expect(await auth.saveProfile(next)).toEqual({ ok: true });
    await auth.signOut();
    await auth.signIn("a@b.co", "password1");
    expect(auth.parse(auth.getSnapshot()).profile).toEqual(next);
  });

  it("cannot save a profile when signed out", async () => {
    expect((await auth.saveProfile(profile)).ok).toBe(false);
  });

  it("tells listeners about every change and stops after unsubscribe", async () => {
    let n = 0;
    const off = auth.subscribe(() => n++);
    await auth.signUp("a@b.co", "password1", profile);
    await auth.saveProfile(profile);
    await auth.signOut();
    expect(n).toBe(3);
    off();
    await auth.signIn("a@b.co", "password1");
    expect(n).toBe(3);
  });

  it("fills defaults for a profile saved before grade, name and studentId existed", () => {
    store.setItem("mock.auth.session", "u1");
    store.setItem("mock.auth.profiles", JSON.stringify({ u1: { primary: "철학과", interests: ["체육학과"], avatar: "철학과" } }));
    expect(auth.parse(auth.getSnapshot()).profile).toEqual({
      primary: "철학과",
      interests: ["체육학과"],
      avatar: "철학과",
      grade: 1,
      name: "",
      studentId: "",
    });
  });

  it("keeps two users apart", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    await auth.signOut();
    const other = { ...profile, primary: "철학과", interests: [] };
    await auth.signUp("c@d.co", "password2", other);
    expect(auth.parse(auth.getSnapshot()).profile).toEqual(other);
    await auth.signOut();
    await auth.signIn("a@b.co", "password1");
    expect(auth.parse(auth.getSnapshot()).profile).toEqual(profile);
  });
});

describe("mock auth: account management", () => {
  let store: ReturnType<typeof memoryStore>;
  let auth: AuthService;
  beforeEach(async () => {
    store = memoryStore();
    auth = createMockAuth(store);
    await auth.signUp("a@b.co", "password1", profile);
  });

  it("is a device-only stand-in", () => {
    expect(auth.kind).toBe("device");
  });

  it("changes the password only with the current one", async () => {
    expect((await auth.changePassword("wrong-pass", "password2")).ok).toBe(false);
    expect(await auth.changePassword("password1", "password2")).toEqual({ ok: true });
    await auth.signOut();
    expect((await auth.signIn("a@b.co", "password1")).ok).toBe(false);
    expect(await auth.signIn("a@b.co", "password2")).toEqual({ ok: true });
  });

  it("changes the email and keeps the password and profile", async () => {
    expect(await auth.changeEmail("password1", "new@b.co")).toEqual({ ok: true });
    expect(auth.parse(auth.getSnapshot()).email).toBe("new@b.co");
    await auth.signOut();
    expect((await auth.signIn("a@b.co", "password1")).ok).toBe(false);
    expect(await auth.signIn("new@b.co", "password1")).toEqual({ ok: true });
    expect(auth.parse(auth.getSnapshot()).profile).toEqual(profile);
  });

  it("refuses an email another account uses", async () => {
    await auth.signOut();
    await auth.signUp("c@d.co", "password3", profile);
    expect((await auth.changeEmail("password3", "a@b.co")).ok).toBe(false);
  });

  it("deletes the account and its profile", async () => {
    expect((await auth.deleteAccount("nope-nope")).ok).toBe(false);
    expect(await auth.deleteAccount("password1")).toEqual({ ok: true });
    expect(auth.parse(auth.getSnapshot()).signedIn).toBe(false);
    expect((await auth.signIn("a@b.co", "password1")).ok).toBe(false);
    expect(store.dump()).not.toContain("컴퓨터공학과");
    // the email is free again
    expect(await auth.signUp("a@b.co", "password1", profile)).toEqual({ ok: true });
  });

  it("needs a signed-in user", async () => {
    await auth.signOut();
    expect((await auth.changePassword("password1", "password2")).ok).toBe(false);
    expect((await auth.deleteAccount("password1")).ok).toBe(false);
  });
});
