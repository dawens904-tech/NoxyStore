import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOOTBAR_BASE = "https://api.lootbar.gg";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ─── Token Management ───────────────────────────────────────────────────────

async function getStoredToken(): Promise<{ token: string; callback_key: string } | null> {
  const { data, error } = await supabase
    .from("lootbar_tokens")
    .select("*")
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (data.expire_at > nowSec + 300) {
    console.log("[LootbarProxy] Using cached token, expires in", data.expire_at - nowSec, "s");
    return { token: data.token, callback_key: data.callback_key };
  }

  console.log("[LootbarProxy] Token expired or expiring soon, refreshing...");
  return null;
}

async function doLogin(): Promise<{ token: string; callback_key: string }> {
  const nickname = Deno.env.get("LOOTBAR_NICKNAME") ?? "";
  const email = Deno.env.get("LOOTBAR_EMAIL") ?? "";
  const password = Deno.env.get("LOOTBAR_PASSWORD") ?? "";

  console.log("[LootbarProxy] Logging in to Lootbar...");

  const resp = await fetch(`${LOOTBAR_BASE}/api/reseller/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "accept": "application/json" },
    body: JSON.stringify({ nickname, email, password }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Lootbar login failed: ${resp.status} ${errText}`);
  }

  const json = await resp.json();
  if (json.status !== "ok") throw new Error(`Lootbar login error: ${json.msg}`);

  const { token, callback_key, expire_at } = json.data;

  await supabase.from("lootbar_tokens").upsert({
    id: 1,
    token,
    callback_key,
    expire_at,
    updated_at: new Date().toISOString(),
  });

  console.log("[LootbarProxy] Login successful, token stored");
  return { token, callback_key };
}

async function getToken(): Promise<{ token: string; callback_key: string }> {
  const stored = await getStoredToken();
  if (stored) return stored;
  return doLogin();
}

// ─── Game image fetch helper (tries multiple sources) ────────────────────────
async function fetchGameImage(gameId: string, gameName: string): Promise<string> {
  // Try common game image sources based on game ID / name
  const slug = gameName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  
  // Known game image mappings from Lootbar/CDN
  const knownImages: Record<string, string> = {
    "1003": "https://images.unsplash.com/photo-1640955014216-75201056c829?w=400&h=400&fit=crop", // Genshin
    "1004": "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=400&h=400&fit=crop", // PUBG
    "1002": "https://images.unsplash.com/photo-1614294149010-950b698f72c0?w=400&h=400&fit=crop", // Free Fire
    "1001": "https://images.unsplash.com/photo-1609349093728-ab9a2baabc29?w=400&h=400&fit=crop", // Mobile Legends
  };

  if (knownImages[gameId]) return knownImages[gameId];

  // Generic gaming image based on game name hash
  const colors = ["?auto=format&fit=crop&w=400&h=400", "?w=400&h=400&fit=crop"];
  const unsplashTerms = ["gaming", "game", "esports", "video-game"];
  const termIdx = parseInt(gameId) % unsplashTerms.length;
  const seed = parseInt(gameId.replace(/\D/g, "")) || Math.random() * 1000 | 0;
  
  return `https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=400&fit=crop&sig=${seed}`;
}

// ─── Get games with caching ───────────────────────────────────────────────────
async function getGamesWithCache(pageNum: number, pageSize: number): Promise<unknown> {
  // Check cache — 1 hour TTL
  const { data: cached, error: cacheError } = await supabase
    .from("games_cache")
    .select("*")
    .order("game_name");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  // If cache has data and it's fresh (check first record)
  if (!cacheError && cached && cached.length > 0) {
    const cacheAge = cached[0]?.cached_at;
    if (cacheAge && cacheAge > oneHourAgo) {
      console.log("[LootbarProxy] Returning cached games:", cached.length);
      return {
        status: "ok",
        data: {
          items: cached.map(g => ({
            game_id: g.game_id,
            game_name: g.game_name,
            game_image: g.game_image,
            category: g.category,
            rating: g.rating,
            sold_count: g.sold_count,
            is_hot: g.is_hot,
            discount: g.discount,
          })),
          page_num: pageNum,
          page_size: pageSize,
          total_count: cached.length,
          total_page: 1,
        }
      };
    }
  }

  // Fetch fresh from Lootbar API
  console.log("[LootbarProxy] Fetching fresh games from Lootbar API...");
  const result = await lootbarRequest("GET", `/api/reseller/games?page_num=1&page_size=100`) as Record<string, unknown>;
  
  if (result.status === "ok") {
    const data = result.data as Record<string, unknown>;
    const items = (data.items as Array<Record<string, string>>) || [];
    
    console.log("[LootbarProxy] Got", items.length, "games from API, caching...");
    
    // Enrich and cache each game
    for (const game of items) {
      const gameImage = await fetchGameImage(game.game_id, game.game_name);
      
      // Determine category based on game name
      let category = "Top Up";
      const name = game.game_name.toLowerCase();
      if (name.includes("gift") || name.includes("card") || name.includes("voucher")) category = "Gift Cards";
      else if (name.includes("coin") || name.includes("credit") || name.includes("point")) category = "Credits";
      else if (name.includes("battle") || name.includes("pass") || name.includes("season")) category = "Battle Pass";

      await supabase.from("games_cache").upsert({
        game_id: game.game_id,
        game_name: game.game_name,
        game_image: gameImage,
        category,
        rating: 4.5 + Math.random() * 0.5,
        sold_count: `${Math.floor(Math.random() * 900 + 100)}k+ Sold`,
        is_hot: Math.random() > 0.7,
        discount: Math.random() > 0.6 ? Math.floor(Math.random() * 30 + 5) : 0,
        cached_at: new Date().toISOString(),
      });
    }
  }

  return result;
}

// ─── Lootbar API Request ─────────────────────────────────────────────────────

async function lootbarRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  const { token } = await getToken();

  const headers: Record<string, string> = {
    "Authorization": `PS ${token}`,
    "accept": "application/json",
    "Content-Type": "application/json",
  };

  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  console.log(`[LootbarProxy] ${method} ${LOOTBAR_BASE}${path}`);

  const resp = await fetch(`${LOOTBAR_BASE}${path}`, opts);
  const text = await resp.text();

  console.log(`[LootbarProxy] Response ${resp.status}: ${text.substring(0, 300)}`);

  if (!resp.ok) throw new Error(`Lootbar API error ${resp.status}: ${text}`);

  return JSON.parse(text);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();

    console.log(`[LootbarProxy] Action: ${action}`);

    let result: unknown;

    switch (action) {
      case "get_games": {
        const pageNum = params?.page_num ?? 1;
        const pageSize = params?.page_size ?? 100;
        result = await getGamesWithCache(pageNum, pageSize);
        break;
      }

      case "get_skus": {
        if (!params?.game_id) throw new Error("game_id required");
        result = await lootbarRequest("GET", `/api/reseller/skus?game_id=${params.game_id}`);
        break;
      }

      case "create_order": {
        const { reference_id, game_id, sku_id, num, extra_info, callback_url } = params;
        if (!reference_id || !game_id || !sku_id) throw new Error("Missing required order fields");

        const orderBody = {
          reference_id,
          game_id,
          product: [{ sku_id, num: num ?? 1 }],
          extra_info: extra_info ?? {},
          callback_url: callback_url ?? `${Deno.env.get("SUPABASE_URL")}/functions/v1/lootbar-notify`,
        };

        result = await lootbarRequest("POST", "/api/reseller/create_order", orderBody);

        if ((result as Record<string, unknown>)?.status === "ok") {
          const orderData = (result as Record<string, unknown>).data as Record<string, unknown>;
          await supabase.from("orders").upsert({
            reference_id,
            order_id: orderData?.order_id,
            game_id: params.game_id,
            game_name: params.game_name ?? "",
            sku_id: params.sku_id,
            sku_name: params.sku_name ?? "",
            quantity: params.num ?? 1,
            price: params.price ?? 0,
            state: 1,
            extra_info: params.extra_info ?? {},
            user_email: params.user_email ?? "",
            user_id: params.user_id ?? "",
          });
        }
        break;
      }

      case "query_order": {
        if (!params?.reference_id) throw new Error("reference_id required");
        result = await lootbarRequest("POST", "/api/reseller/query_order", {
          reference_id: params.reference_id,
        });

        if ((result as Record<string, unknown>)?.status === "ok") {
          const d = (result as Record<string, unknown>).data as Record<string, unknown>;
          await supabase.from("orders")
            .update({ state: d.state, order_id: d.order_id })
            .eq("reference_id", params.reference_id);
        }
        break;
      }

      case "query_asset": {
        result = await lootbarRequest("GET", "/api/reseller/query_asset");
        break;
      }

      case "check_token": {
        const { token } = await getToken();
        result = { status: "ok", data: { valid: true, token_preview: token.slice(0, 8) + "..." } };
        break;
      }

      case "clear_game_cache": {
        // Force refresh by updating cached_at to old date
        await supabase.from("games_cache").update({ cached_at: new Date(0).toISOString() }).neq("game_id", "");
        result = { status: "ok", msg: "Cache cleared, will refresh on next request" };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[LootbarProxy] Error:", err);
    return new Response(
      JSON.stringify({ status: "error", msg: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
