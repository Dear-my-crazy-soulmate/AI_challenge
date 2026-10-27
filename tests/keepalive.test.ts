import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "../src/app/api/keepalive/route";
import { pingSupabase } from "../src/lib/supabase/keepalive";

const ok = (status = 200) => vi.fn(async () => new Response("[]", { status })) as unknown as typeof fetch;

describe("pingSupabase", () => {
  it("queries the profiles table with the public key", async () => {
    const f = ok();
    const r = await pingSupabase("https://x.supabase.co/", "pub-key", f);
    expect(r.ok).toBe(true);
    const [url, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/profiles?select=id&limit=1");
    expect((init.headers as Record<string, string>).apikey).toBe("pub-key");
    expect(init.cache).toBe("no-store");
  });

  it("reports errors without throwing", async () => {
    expect(await pingSupabase(undefined, "k", ok())).toMatchObject({ ok: false, reason: "supabase not configured" });
    expect(await pingSupabase("https://x.supabase.co", "k", ok(503))).toMatchObject({ ok: false, reason: "HTTP 503" });
    const broken = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await pingSupabase("https://x.supabase.co", "k", broken)).toMatchObject({ ok: false, reason: "network error" });
  });
});

describe("GET /api/keepalive", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("refuses calls without the cron secret", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value-1234");
    expect((await GET(new Request("http://x/api/keepalive"))).status).toBe(401);
    const wrong = new Request("http://x/api/keepalive", { headers: { authorization: "Bearer nope" } });
    expect((await GET(wrong)).status).toBe(401);
  });

  it("refuses everything when CRON_SECRET is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const r = new Request("http://x/api/keepalive", { headers: { authorization: "Bearer " } });
    expect((await GET(r)).status).toBe(401);
  });

  it("pings Supabase for Vercel Cron and returns no data", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value-1234");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "pub-key");
    vi.stubGlobal("fetch", ok());
    const res = await GET(new Request("http://x/api/keepalive", { headers: { authorization: "Bearer s3cret-value-1234" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["at", "ok", "status"]);
  });
});
