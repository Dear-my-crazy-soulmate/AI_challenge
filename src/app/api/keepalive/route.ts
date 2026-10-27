// GET /api/keepalive -- called once a day by Vercel Cron (vercel.json).
// Supabase pauses a free project after about 7 days without database requests;
// one tiny query a day keeps it awake. Only Vercel Cron may call it: Vercel sends
// "Authorization: Bearer <CRON_SECRET>" when the CRON_SECRET env var is set.
// The response says only whether the ping worked, never any data.
import { pingSupabase } from "../../../lib/supabase/keepalive";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await pingSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return Response.json(result, { status: result.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } });
}
