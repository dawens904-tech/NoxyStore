/**
 * games-cache-refresh Edge Function
 *
 * Scheduled function that refreshes games_cache by calling lootbar-proxy
 * get_games every hour. Deploy this function and invoke it from a cron
 * job scheduler (e.g. pg_cron, cron-job.org, GitHub Actions, etc.).
 *
 * Trigger URL (POST, no body needed):
 *   https://<project>.backend.onspace.ai/functions/v1/games-cache-refresh
 *
 * pg_cron example (run in Supabase SQL editor):
 *   SELECT cron.schedule(
 *     'refresh-games-cache',
 *     '0 * * * *',
 *     $$
 *       SELECT net.http_post(
 *         url := 'https://<project>.backend.onspace.ai/functions/v1/games-cache-refresh',
 *         headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
 *       );
 *     $$
 *   );
 */
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  console.log(`[GamesCacheRefresh] Starting scheduled refresh at ${startedAt}`);

  try {
    // ── 1. Call lootbar-proxy to refresh games_cache ──────────────────────────
    const proxyUrl = `${SUPABASE_URL}/functions/v1/lootbar-proxy`;

    const proxyResp = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ action: "get_games", params: { page_num: 1, page_size: 200 } }),
      signal: AbortSignal.timeout(60_000), // 60s timeout for full game sync
    });

    if (!proxyResp.ok) {
      const text = await proxyResp.text();
      throw new Error(`lootbar-proxy returned HTTP ${proxyResp.status}: ${text.slice(0, 300)}`);
    }

    const proxyData = await proxyResp.json() as {
      status: string;
      msg?: string;
      data?: { total_count?: number; stale?: boolean };
    };

    if (proxyData.status !== "ok") {
      throw new Error(`lootbar-proxy error: ${proxyData.msg ?? "unknown"}`);
    }

    const totalGames   = proxyData.data?.total_count ?? 0;
    const isStale      = proxyData.data?.stale ?? false;

    console.log(`[GamesCacheRefresh] Synced ${totalGames} games (stale=${isStale})`);

    // ── 2. Count games still missing images ────────────────────────────────────
    const { count: missingCount } = await supabase
      .from("games_cache")
      .select("*", { count: "exact", head: true })
      .or("game_image.is.null,game_image.eq.");

    console.log(`[GamesCacheRefresh] Games missing images: ${missingCount ?? "unknown"}`);

    // ── 3. If any images are missing, trigger fetch-game-images (fire-and-forget)
    if ((missingCount ?? 0) > 0) {
      const imageUrl = `${SUPABASE_URL}/functions/v1/fetch-game-images`;
      fetch(imageUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ use_fallback: true, skip_unsplash: false }),
      }).then((r) => {
        console.log(`[GamesCacheRefresh] Image fetch triggered: HTTP ${r.status}`);
      }).catch((e) => {
        console.warn("[GamesCacheRefresh] Image fetch trigger failed:", e);
      });
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        refreshed_at: startedAt,
        total_games: totalGames,
        missing_images: missingCount ?? 0,
        image_fetch_triggered: (missingCount ?? 0) > 0,
        stale: isStale,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GamesCacheRefresh] Error:", msg);

    return new Response(
      JSON.stringify({ status: "error", msg, refreshed_at: startedAt }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
