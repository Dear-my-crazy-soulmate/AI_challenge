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

const profile: Profile = { primary: "컴퓨터공학과", interests: ["철학과"], avatar: null };

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
    expect(auth.parse(auth.getSnapshot())).toEqual({ signedIn: true, profile });
  });

  it("rejects a second sign up with the same email", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    auth.signOut();
    const again = await auth.signUp("a@b.co", "password2", profile);
    expect(again.ok).toBe(false);
  });

  it("signs in with the right password and keeps the profile", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    auth.signOut();
    expect(auth.parse(auth.getSnapshot()).signedIn).toBe(false);
    expect(await auth.signIn("a@b.co", "password1")).toEqual({ ok: true });
    expect(auth.parse(auth.getSnapshot())).toEqual({ signedIn: true, profile });
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    auth.signOut();
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
    expect(auth.saveProfile(next)).toEqual({ ok: true });
    auth.signOut();
    await auth.signIn("a@b.co", "password1");
    expect(auth.parse(auth.getSnapshot()).profile).toEqual(next);
  });

  it("cannot save a profile when signed out", () => {
    expect(auth.saveProfile(profile).ok).toBe(false);
  });

  it("tells listeners about every change and stops after unsubscribe", async () => {
    let n = 0;
    const off = auth.subscribe(() => n++);
    await auth.signUp("a@b.co", "password1", profile);
    auth.saveProfile(profile);
    auth.signOut();
    expect(n).toBe(3);
    off();
    await auth.signIn("a@b.co", "password1");
    expect(n).toBe(3);
  });

  it("keeps two users apart", async () => {
    await auth.signUp("a@b.co", "password1", profile);
    auth.signOut();
    const other = { ...profile, primary: "철학과", interests: [] };
    await auth.signUp("c@d.co", "password2", other);
    expect(auth.parse(auth.getSnapshot()).profile).toEqual(other);
    auth.signOut();
    await auth.signIn("a@b.co", "password1");
    expect(auth.parse(auth.getSnapshot()).profile).toEqual(profile);
  });
});
