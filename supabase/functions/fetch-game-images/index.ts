/**
 * fetch-game-images Edge Function
 *
 * Automatically finds and stores game cover images for games missing images.
 * Priority order:
 *   1. SerpApi Google Images — searches "{gameName} lootbar" for exact Lootbar logos
 *   2. RAWG Video Games DB  (RAWG_API_KEY)
 *   3. IGDB                 (TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET)
 *
 * Only fetches when game_image is null/empty — never overwrites existing images.
 * Results are saved directly to games_cache.game_image.
 */
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const RAWG_API_KEY     = Deno.env.get("RAWG_API_KEY") ?? "";
const TWITCH_CLIENT_ID = Deno.env.get("TWITCH_CLIENT_ID") ?? "";
const TWITCH_SECRET    = Deno.env.get("TWITCH_CLIENT_SECRET") ?? "";
const SERPAPI_KEY      = Deno.env.get("SERPAPI_KEY") ?? "";

const RAWG_BASE  = "https://api.rawg.io/api";
const IGDB_BASE  = "https://api.igdb.com/v4";

// ─── Noise word filter ────────────────────────────────────────────────────────
const NOISE_WORDS = [
  "top up", "topup", "top-up", "uc", "diamonds", "gems", "coins", "credits",
  "points", "tokens", "gold", "silver", "voucher", "gift card", "key",
  "steam", "epic", "ubisoft", "bundle", "pack", "recharge", "direct",
  "global", "asia", "eu", "us", "na", "sea", "official", "game", "mobile",
  "pc", "console", "online", "card", "code", "pin",
];

function normalizeGameName(name: string): string {
  let clean = name.toLowerCase();
  for (const noise of NOISE_WORDS) {
    clean = clean.replace(new RegExp(`\\b${noise}\\b`, "gi"), "");
  }
  clean = clean.replace(/\([^)]*\)/g, ""); // Remove (SEA), (Global) etc.
  clean = clean.replace(/\b\d+\b/g, "");   // Remove standalone numbers
  clean = clean.replace(/\s+/g, " ").trim();
  return clean || name;
}

// ─── 1. SerpApi — Lootbar logo search (highest accuracy) ─────────────────────
async function fetchFromSerpApiLootbar(gameName: string): Promise<string | null> {
  if (!SERPAPI_KEY) {
    console.warn("[FetchImages] SERPAPI_KEY not set, skipping SerpApi");
    return null;
  }

  // Search specifically for the Lootbar logo/icon of this game for best visual match
  const q = encodeURIComponent(`${gameName} lootbar`);
  const url = `https://serpapi.com/search.json?engine=google_images&q=${q}&api_key=${SERPAPI_KEY}&num=5&safe=active&imgSize=medium&imgType=photo`;

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) { console.warn(`[FetchImages] SerpApi(lootbar) ${resp.status} for "${gameName}"`); return null; }

    const data = await resp.json() as { images_results?: Array<{ original: string; thumbnail: string; source: string }> };
    const results = data.images_results;
    if (!results?.length) return null;

    // Prefer images from lootbar.gg domain, then any valid http image
    const lootbarImg = results.find(
      (r) => r.source?.includes("lootbar") && r.original?.startsWith("http")
    );
    if (lootbarImg) {
      console.log(`[FetchImages] SerpApi(lootbar.gg): image found for "${gameName}"`);
      return lootbarImg.original;
    }

    // Fallback to any first valid result from the lootbar query
    const first = results.find((r) => r.original?.startsWith("http"));
    if (first) {
      console.log(`[FetchImages] SerpApi(lootbar query): image found for "${gameName}"`);
      return first.original;
    }

    return null;
  } catch (e) {
    console.warn(`[FetchImages] SerpApi(lootbar) error for "${gameName}":`, e);
    return null;
  }
}

// SerpApi generic game cover art fallback (second SerpApi pass)
async function fetchFromSerpApiGeneric(gameName: string): Promise<string | null> {
  if (!SERPAPI_KEY) return null;

  const q = encodeURIComponent(`${normalizeGameName(gameName)} game cover art`);
  const url = `https://serpapi.com/search.json?engine=google_images&q=${q}&api_key=${SERPAPI_KEY}&num=5&safe=active`;

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) { console.warn(`[FetchImages] SerpApi(generic) ${resp.status} for "${gameName}"`); return null; }

    const data = await resp.json() as { images_results?: Array<{ original: string }> };
    const results = data.images_results;
    if (!results?.length) return null;

    const first = results.find((r) => r.original?.startsWith("http"));
    if (!first) return null;

    console.log(`[FetchImages] SerpApi(generic): image found for "${gameName}"`);
    return first.original;
  } catch (e) {
    console.warn(`[FetchImages] SerpApi(generic) error for "${gameName}":`, e);
    return null;
  }
}

// ─── 2. RAWG ──────────────────────────────────────────────────────────────────
async function fetchFromRAWG(gameName: string): Promise<string | null> {
  if (!RAWG_API_KEY) {
    console.warn("[FetchImages] RAWG_API_KEY not set, skipping RAWG");
    return null;
  }

  const query = normalizeGameName(gameName);
  const url = `${RAWG_BASE}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=5&ordering=-rating`;

  try {
    const resp = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) { console.warn(`[FetchImages] RAWG ${resp.status} for "${query}"`); return null; }

    const data = await resp.json() as { results?: Array<{ name: string; background_image: string | null; rating: number }> };
    if (!data.results?.length) return null;

    const best = data.results
      .filter((r) => r.background_image)
      .sort((a, b) => b.rating - a.rating)[0];

    if (!best?.background_image) return null;
    console.log(`[FetchImages] RAWG: "${best.name}" for "${gameName}"`);
    return best.background_image;
  } catch (e) {
    console.warn(`[FetchImages] RAWG error for "${gameName}":`, e);
    return null;
  }
}

// ─── 3. IGDB (Twitch OAuth) ────────────────────────────────────────────────────
let _igdbToken: string | null = null;
let _igdbTokenExpiry = 0;

async function getIGDBToken(): Promise<string | null> {
  if (!TWITCH_CLIENT_ID || !TWITCH_SECRET) return null;

  const now = Date.now() / 1000;
  if (_igdbToken && _igdbTokenExpiry > now + 60) return _igdbToken;

  try {
    const resp = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_SECRET}&grant_type=client_credentials`,
      { method: "POST", signal: AbortSignal.timeout(8000) }
    );
    if (!resp.ok) { console.warn(`[FetchImages] IGDB token fetch failed: ${resp.status}`); return null; }
    const data = await resp.json() as { access_token: string; expires_in: number };
    _igdbToken = data.access_token;
    _igdbTokenExpiry = now + data.expires_in;
    console.log("[FetchImages] IGDB: Obtained access token");
    return _igdbToken;
  } catch (e) {
    console.warn("[FetchImages] IGDB token error:", e);
    return null;
  }
}

async function fetchFromIGDB(gameName: string): Promise<string | null> {
  const token = await getIGDBToken();
  if (!token) return null;

  const query = normalizeGameName(gameName);

  try {
    const resp = await fetch(`${IGDB_BASE}/games`, {
      method: "POST",
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "text/plain",
        "Accept": "application/json",
      },
      body: `search "${query}"; fields name,cover.url,rating; limit 5; where cover != null;`,
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) { console.warn(`[FetchImages] IGDB ${resp.status} for "${query}"`); return null; }

    const data = await resp.json() as Array<{ name: string; rating?: number; cover?: { url: string } }>;
    if (!data?.length) return null;

    const best = data
      .filter((g) => g.cover?.url)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];

    if (!best?.cover?.url) return null;

    const imageUrl = best.cover.url
      .replace("//", "https://")
      .replace("t_thumb", "t_cover_big");

    console.log(`[FetchImages] IGDB: "${best.name}" for "${gameName}"`);
    return imageUrl;
  } catch (e) {
    console.warn(`[FetchImages] IGDB error for "${gameName}":`, e);
    return null;
  }
}

// ─── Unsplash generic fallback ────────────────────────────────────────────────
function getUnsplashFallback(gameName: string): string {
  const keywords = encodeURIComponent(`${normalizeGameName(gameName)} video game`);
  return `https://source.unsplash.com/featured/400x400?${keywords}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
interface GameRow {
  game_id: string;
  game_name: string;
  game_image: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body: { game_ids?: string[]; use_fallback?: boolean; skip_unsplash?: boolean } = {};
    try { body = await req.json(); } catch { /* empty body OK */ }

    const { game_ids, use_fallback = true, skip_unsplash = false } = body;

    // Fetch games missing images
    let query = supabase.from("games_cache").select("game_id, game_name, game_image");
    if (game_ids?.length) query = query.in("game_id", game_ids);

    const { data: games, error: fetchErr } = await query.limit(50);
    if (fetchErr) {
      return new Response(JSON.stringify({ status: "error", msg: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const missing: GameRow[] = (games ?? []).filter(
      (g: GameRow) => !g.game_image || g.game_image.trim() === ""
    );

    console.log(`[FetchImages] Processing ${missing.length} games with missing images`);
    console.log(`[FetchImages] Sources: SerpApi=${!!SERPAPI_KEY}, RAWG=${!!RAWG_API_KEY}, IGDB=${!!TWITCH_CLIENT_ID}`);

    const results: Array<{ game_id: string; game_name: string; status: string; source?: string; image?: string }> = [];

    for (const game of missing) {
      let imageUrl: string | null = null;
      let source = "";

      // 1. SerpApi — search "{gameName} lootbar" for exact Lootbar-style game logos
      imageUrl = await fetchFromSerpApiLootbar(game.game_name);
      if (imageUrl) source = "serpapi_lootbar";

      // 2. SerpApi generic — search "{gameName} game cover art"
      if (!imageUrl) {
        imageUrl = await fetchFromSerpApiGeneric(game.game_name);
        if (imageUrl) source = "serpapi_generic";
      }

      // 3. RAWG
      if (!imageUrl) {
        imageUrl = await fetchFromRAWG(game.game_name);
        if (imageUrl) source = "rawg";
      }

      // 4. IGDB
      if (!imageUrl) {
        imageUrl = await fetchFromIGDB(game.game_name);
        if (imageUrl) source = "igdb";
      }

      // 5. Unsplash generic fallback
      if (!imageUrl && use_fallback && !skip_unsplash) {
        imageUrl = getUnsplashFallback(game.game_name);
        source = "unsplash";
        console.log(`[FetchImages] Unsplash fallback for "${game.game_name}"`);
      }

      if (imageUrl) {
        const { error: updateErr } = await supabase
          .from("games_cache")
          .update({ game_image: imageUrl })
          .eq("game_id", game.game_id);

        if (updateErr) {
          console.error(`[FetchImages] DB update failed for ${game.game_id}:`, updateErr);
          results.push({ game_id: game.game_id, game_name: game.game_name, status: "db_error" });
        } else {
          results.push({ game_id: game.game_id, game_name: game.game_name, status: "updated", source, image: imageUrl });
        }
      } else {
        results.push({ game_id: game.game_id, game_name: game.game_name, status: "not_found" });
      }

      // Respect rate limits
      await new Promise((r) => setTimeout(r, 150));
    }

    const updated  = results.filter((r) => r.status === "updated").length;
    const notFound = results.filter((r) => r.status === "not_found").length;

    // Source breakdown
    const bySource: Record<string, number> = {};
    results.filter((r) => r.source).forEach((r) => {
      bySource[r.source!] = (bySource[r.source!] ?? 0) + 1;
    });

    console.log(`[FetchImages] Done: ${updated} updated, ${notFound} not found`, bySource);

    return new Response(
      JSON.stringify({ status: "ok", total_processed: missing.length, updated, not_found: notFound, by_source: bySource, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[FetchImages] Unhandled error:", msg);
    return new Response(
      JSON.stringify({ status: "error", msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
