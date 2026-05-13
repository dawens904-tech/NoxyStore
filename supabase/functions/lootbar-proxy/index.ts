import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOOTBAR_BASE = "https://api.lootbar.gg";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ─── Error Helper ────────────────────────────────────────────────────────────
function errorResponse(msg: string, detail?: string, statusCode = 500) {
  const body = JSON.stringify({ status: "error", msg, detail: detail ?? msg });
  console.error(`[LootbarProxy] ERROR ${statusCode}: ${msg}`, detail ?? "");
  return new Response(body, {
    status: statusCode,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Token Management ────────────────────────────────────────────────────────
async function getStoredToken(): Promise<{ token: string; callback_key: string } | null> {
  const { data, error } = await supabase
    .from("lootbar_tokens")
    .select("*")
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.log("[LootbarProxy] No token in DB, need fresh login");
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (data.expire_at > nowSec + 300) {
    console.log("[LootbarProxy] Using cached token, expires in", data.expire_at - nowSec, "s");
    return { token: data.token, callback_key: data.callback_key };
  }

  console.log("[LootbarProxy] Token expired or expiring soon (expire_at:", data.expire_at, "now:", nowSec, "), refreshing...");
  return null;
}

async function doLogin(): Promise<{ token: string; callback_key: string }> {
  const nickname = Deno.env.get("LOOTBAR_NICKNAME") ?? "";
  const email = Deno.env.get("LOOTBAR_EMAIL") ?? "";
  const password = Deno.env.get("LOOTBAR_PASSWORD") ?? "";

  if (!email || !password) {
    throw new Error("Lootbar credentials not configured: LOOTBAR_EMAIL or LOOTBAR_PASSWORD secret is missing");
  }

  console.log("[LootbarProxy] Logging in to Lootbar with email:", email);

  const resp = await fetch(`${LOOTBAR_BASE}/api/reseller/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "accept": "application/json" },
    body: JSON.stringify({ nickname, email, password }),
    signal: AbortSignal.timeout(15000),
  });

  const text = await resp.text();
  console.log("[LootbarProxy] Login response status:", resp.status, "body:", text.slice(0, 300));

  if (!resp.ok) {
    throw new Error(`Lootbar login HTTP error ${resp.status}: ${text}`);
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Lootbar login returned non-JSON: ${text.slice(0, 200)}`);
  }

  if (json.status !== "ok") {
    throw new Error(`Lootbar login failed: ${json.msg ?? JSON.stringify(json)}`);
  }

  const { token, callback_key, expire_at } = json.data as Record<string, unknown>;
  if (!token) throw new Error("Lootbar login OK but token missing from response");

  await supabase.from("lootbar_tokens").upsert({
    id: 1,
    token: String(token),
    callback_key: String(callback_key ?? ""),
    expire_at: Number(expire_at),
    updated_at: new Date().toISOString(),
  });

  console.log("[LootbarProxy] Login successful, token stored (expires_at:", expire_at, ")");
  return { token: String(token), callback_key: String(callback_key ?? "") };
}

async function getToken(): Promise<{ token: string; callback_key: string }> {
  const stored = await getStoredToken();
  if (stored) return stored;
  return doLogin();
}

// ─── Lootbar API Request ─────────────────────────────────────────────────────
async function lootbarRequest(method: string, path: string, body?: unknown, retried = false): Promise<unknown> {
  const { token } = await getToken();

  const headers: Record<string, string> = {
    "Authorization": `PS ${token}`,
    "accept": "application/json",
    "Content-Type": "application/json",
  };

  const opts: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(20000),
  };
  if (body) opts.body = JSON.stringify(body);

  console.log(`[LootbarProxy] ${method} ${LOOTBAR_BASE}${path}`);

  let resp: Response;
  try {
    resp = await fetch(`${LOOTBAR_BASE}${path}`, opts);
  } catch (fetchErr) {
    throw new Error(`Lootbar API network error on ${path}: ${String(fetchErr)}`);
  }

  const text = await resp.text();
  console.log(`[LootbarProxy] Response ${resp.status}: ${text.substring(0, 500)}`);

  // 401 = token expired, retry once with fresh login
  if (resp.status === 401 && !retried) {
    console.log("[LootbarProxy] Got 401, forcing token refresh and retrying...");
    await supabase.from("lootbar_tokens").update({ expire_at: 0 }).eq("id", 1);
    return lootbarRequest(method, path, body, true);
  }

  if (!resp.ok) {
    let parsed: Record<string, unknown> | null = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
    const apiMsg = parsed?.msg ?? parsed?.message ?? text;
    throw new Error(`Lootbar API ${resp.status} on ${path}: ${apiMsg}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Lootbar API returned non-JSON on ${path}: ${text.slice(0, 200)}`);
  }

  return parsed;
}

// ─── Get games with caching ──────────────────────────────────────────────────
async function getGamesWithCache(pageNum: number, pageSize: number): Promise<unknown> {
  const { data: cached, error: cacheError } = await supabase
    .from("games_cache")
    .select("*")
    .order("game_name");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  if (!cacheError && cached && cached.length > 0) {
    const cacheAge = cached[0]?.cached_at;
    if (cacheAge && cacheAge > oneHourAgo) {
      console.log("[LootbarProxy] Returning cached games:", cached.length);
      return {
        status: "ok",
        data: {
          items: cached.map((g: Record<string, unknown>) => ({
            game_id: g.game_id,
            game_name: g.game_name,
            game_image: g.game_image,
            category: g.category,
            rating: g.rating,
            sold_count: g.sold_count,
            is_hot: g.is_hot,
            discount: g.discount,
            min_price: g.min_price,
          })),
          page_num: pageNum,
          page_size: pageSize,
          total_count: cached.length,
          total_page: 1,
        }
      };
    }
  }

  console.log("[LootbarProxy] Cache miss/stale, fetching fresh games from Lootbar API...");
  const result = await lootbarRequest("GET", `/api/reseller/games?page_num=1&page_size=200`) as Record<string, unknown>;

  if (result.status === "ok") {
    const data = result.data as Record<string, unknown>;
    const items = (data.items as Array<Record<string, unknown>>) || [];

    console.log("[LootbarProxy] Got", items.length, "games from API, caching...");

    const upsertData = items.map((game: Record<string, unknown>) => {
      const name = String(game.game_name || "").toLowerCase();
      let category = "Top Up";
      if (name.includes("gift") || name.includes("card") || name.includes("voucher") || name.includes("itunes") || name.includes("google play")) category = "Gift Card";
      else if (name.includes("coin") || name.includes("credit") || name.includes("gold") || name.includes("token")) category = "Game Coins";
      else if (name.includes("key") || name.includes("steam") || name.includes("epic") || name.includes("ubisoft")) category = "Game Keys";

      const rawImage = game.game_image || game.image_url || game.icon || game.thumb || null;
      const gameImage = rawImage ? String(rawImage) : null;

      const soldRaw = Number(game.sold_num || game.sold_count || 0);
      const soldCount = soldRaw > 100000
        ? `${Math.floor(soldRaw / 1000)}k+ Sold`
        : soldRaw > 1000 ? `${Math.floor(soldRaw / 1000)}k Sold`
        : soldRaw > 0 ? `${soldRaw} Sold` : "100k+ Sold";

      return {
        game_id: String(game.game_id),
        game_name: String(game.game_name),
        game_image: gameImage,
        category,
        rating: Number(game.rating || game.score || 5.0),
        sold_count: soldCount,
        is_hot: Boolean(game.is_hot || game.hot),
        discount: Number(game.discount || game.discount_percent || 0),
        cached_at: new Date().toISOString(),
      };
    });

    if (upsertData.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < upsertData.length; i += batchSize) {
        await supabase.from("games_cache").upsert(upsertData.slice(i, i + batchSize));
      }
      console.log("[LootbarProxy] Cached", upsertData.length, "games");
    }

    return {
      status: "ok",
      data: { ...data, items: upsertData, total_count: upsertData.length }
    };
  }

  return result;
}

// ─── Get SKUs with caching ───────────────────────────────────────────────────
async function getSkusWithMinPrice(gameId: string): Promise<unknown> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: cached, error: cacheErr } = await supabase
    .from("sku_cache")
    .select("*")
    .eq("game_id", gameId)
    .gte("cached_at", oneHourAgo);

  if (!cacheErr && cached && cached.length > 0) {
    console.log(`[LootbarProxy] Returning ${cached.length} SKUs from sku_cache for game ${gameId}`);
    return {
      status: "ok",
      data: {
        items: cached.map((r: Record<string, unknown>) => ({
          sku_id: r.sku_id,
          sku_name: r.sku_name,
          price: r.price,
          original_price: r.original_price,
          discount_amount: r.discount_amount,
          attribute: r.attributes,
          extra_info: r.extra_info,
          image: r.image,
        })),
      },
    };
  }

  const result = await lootbarRequest("GET", `/api/reseller/skus?game_id=${gameId}`) as Record<string, unknown>;

  if (result.status === "ok") {
    const data = result.data as Record<string, unknown>;
    const items = (data.items as Array<Record<string, unknown>>) || [];

    const prices = items
      .map((sku: Record<string, unknown>) => Number(sku.price || sku.final_price || 0))
      .filter((p: number) => p > 0);

    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      await supabase.from("games_cache").update({ min_price: minPrice }).eq("game_id", gameId);
      console.log(`[LootbarProxy] Updated min_price for game ${gameId}: $${minPrice}`);
    }

    if (items.length > 0) {
      const now = new Date().toISOString();
      const upsertData = items.map((sku: Record<string, unknown>) => ({
        game_id: gameId,
        sku_id: String(sku.sku_id),
        sku_name: String(sku.sku_name || ""),
        price: Number(sku.price || sku.final_price || 0),
        original_price: Number(sku.original_price || sku.price || 0),
        discount_amount: Number(sku.discount_amount || 0),
        attributes: sku.attribute || [],
        extra_info: sku.extra_info || [],
        image: sku.image || sku.icon || null,
        cached_at: now,
      }));

      await supabase.from("sku_cache").delete().eq("game_id", gameId);
      const batchSize = 50;
      for (let i = 0; i < upsertData.length; i += batchSize) {
        await supabase.from("sku_cache").insert(upsertData.slice(i, i + batchSize));
      }
      console.log(`[LootbarProxy] Cached ${items.length} SKUs for game ${gameId}`);
    }
  }

  return result;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let action = "(unknown)";
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON in request body", undefined, 400);
    }

    action = String(body.action ?? "");
    const params = (body.params ?? {}) as Record<string, unknown>;

    console.log(`[LootbarProxy] Action: ${action}`, params);

    let result: unknown;

    switch (action) {
      case "get_games": {
        const pageNum = Number(params?.page_num ?? 1);
        const pageSize = Number(params?.page_size ?? 200);
        result = await getGamesWithCache(pageNum, pageSize);
        break;
      }

      case "get_skus": {
        if (!params?.game_id) return errorResponse("Missing required param: game_id", undefined, 400);
        result = await getSkusWithMinPrice(String(params.game_id));
        break;
      }

      case "create_order": {
        const { reference_id, game_id, sku_id, num, extra_info, callback_url } = params;
        if (!reference_id || !game_id || !sku_id) {
          return errorResponse("Missing required order fields: reference_id, game_id, sku_id", undefined, 400);
        }

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
            base_price: params.base_price ?? 0,
            profit_amount: params.profit_amount ?? 0,
            markup_percent: params.markup_percent ?? 0,
            state: 1,
            extra_info: params.extra_info ?? {},
            user_email: params.user_email ?? "",
            user_id: params.user_id ?? "",
          });
        }
        break;
      }

      case "query_order": {
        if (!params?.reference_id) return errorResponse("Missing required param: reference_id", undefined, 400);
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

      case "force_relogin": {
        // Force a fresh login regardless of cached token
        await supabase.from("lootbar_tokens").update({ expire_at: 0 }).eq("id", 1);
        const { token, callback_key } = await doLogin();
        result = { status: "ok", data: { relogged: true, token_preview: token.slice(0, 8) + "...", callback_key_preview: callback_key.slice(0, 8) + "..." } };
        break;
      }

      case "clear_game_cache": {
        await supabase.from("games_cache").update({ cached_at: new Date(0).toISOString() }).neq("game_id", "");
        result = { status: "ok", msg: "Game cache cleared — will refresh from Lootbar on next request" };
        break;
      }

      case "clear_sku_cache": {
        const gameId = params?.game_id ? String(params.game_id) : null;
        if (gameId) {
          await supabase.from("sku_cache").delete().eq("game_id", gameId);
          result = { status: "ok", msg: `SKU cache cleared for game ${gameId}` };
        } else {
          await supabase.from("sku_cache").delete().neq("game_id", "");
          result = { status: "ok", msg: "All SKU cache cleared" };
        }
        break;
      }

      default:
        return errorResponse(`Unknown action: ${action}. Valid actions: get_games, get_skus, create_order, query_order, query_asset, check_token, force_relogin, clear_game_cache, clear_sku_cache`, undefined, 400);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = String(err);

    // Classify the error for easier debugging
    let category = "Internal error";
    if (msg.includes("login")) category = "Auth/Login error";
    else if (msg.includes("network") || msg.includes("fetch") || msg.includes("timeout") || msg.includes("AbortError")) category = "Network error";
    else if (msg.includes("credentials") || msg.includes("LOOTBAR_")) category = "Configuration error";
    else if (msg.includes("401")) category = "Token expired";
    else if (msg.includes("JSON")) category = "Parse error";

    console.error(`[LootbarProxy] [${category}] action=${action}:`, msg);

    return errorResponse(`${category}: ${msg}`, msg);
  }
});
