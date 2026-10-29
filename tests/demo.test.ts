import { describe, expect, it } from "vitest";

import { demoAccount, isDemoEmail } from "../src/lib/demo";

describe("심사·체험용 account", () => {
  it("is shown only when both email and password are set", () => {
    expect(demoAccount("", "pw")).toBeNull();
    expect(demoAccount("judge@example.test", "")).toBeNull();
    expect(demoAccount(undefined, undefined)).toBeNull();
    expect(demoAccount(" judge@example.test ", "pw")).toEqual({ email: "judge@example.test", password: "pw" });
  });

  it("is recognised by email, ignoring case and spaces", () => {
    const demo = demoAccount("judge@example.test", "pw");
    expect(isDemoEmail("Judge@Example.test ", demo)).toBe(true);
    expect(isDemoEmail("someone@example.test", demo)).toBe(false);
    expect(isDemoEmail(undefined, demo)).toBe(false);
    expect(isDemoEmail("judge@example.test", null)).toBe(false);
  });
});
