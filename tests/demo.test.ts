import { describe, expect, it } from "vitest";

import { clearDeviceData, demoAccount, isDemoEmail } from "../src/lib/demo";

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

  it("starting over clears what this browser keeps for the student, and nothing else", () => {
    const data = new Map(
      ["goal", "timetable", "recentCalc", "quiz-best-v1", "taken.v1.u1", "quiz-best.v2.u1", "guide.v2:x", "community.v2"].map((k) => [k, "1"]),
    );
    const store = {
      get length() {
        return data.size;
      },
      key: (i: number) => [...data.keys()][i] ?? null,
      removeItem: (k: string) => void data.delete(k),
    };
    clearDeviceData(store);
    expect([...data.keys()]).toEqual(["guide.v2:x", "community.v2"]);
  });
});
