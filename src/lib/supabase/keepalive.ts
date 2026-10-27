// One small real database query so the Supabase free project counts as active.
// Reading public.profiles with the public key goes through PostgREST to Postgres;
// RLS returns no rows to an anonymous caller, so nothing is exposed.

export type PingResult = { ok: true; status: number; at: string } | { ok: false; reason: string; at: string };

export async function pingSupabase(
  url: string | undefined,
  key: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<PingResult> {
  const at = new Date().toISOString();
  if (!url || !key) return { ok: false, reason: "supabase not configured", at };
  try {
    const res = await fetchImpl(`${url.replace(/\/+$/, "")}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    return res.ok ? { ok: true, status: res.status, at } : { ok: false, reason: `HTTP ${res.status}`, at };
  } catch {
    return { ok: false, reason: "network error", at };
  }
}
