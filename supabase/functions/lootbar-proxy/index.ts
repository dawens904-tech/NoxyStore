import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOOTBAR_BASE = "https://api.lootbar.gg";

// ─── Environment Validation ────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[LootbarProxy] CRITICAL: Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "");

// ─── Configuration ───────────────────────────────────────────────────────────
const CONFIG = {
  LOGIN_TIMEOUT_MS: 15000,
  API_TIMEOUT_MS: 20000,
  TOKEN_REFRESH_BUFFER_SEC: 300,  // Refresh 5 min before expiry
  GAME_CACHE_TTL_MS: 60 * 60 * 1000,  // 1 hour
  SKU_CACHE_TTL_MS: 60 * 60 * 1000,
  UPSERT_BATCH_SIZE: 50,
} as const;

// ─── Typed Error Response ────────────────────────────────────────────────────
interface ProxyError {
  status: "error";
  msg: string;
  detail?: string;
  code?: string;
  retryable?: boolean;
}

function errorResponse(msg: string, detail?: string, statusCode = 500, code?: string, retryable = false): Response {
  const body: ProxyError = { 
    status: "error", 
    msg, 
    detail: detail ?? msg,
    code,
    retryable,
  };
  console.error(`[LootbarProxy] ERROR ${statusCode} [${code ?? "UNKNOWN"}]: ${msg}`, detail ?? "");
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function successResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Token Management ────────────────────────────────────────────────────────
interface TokenData {
  token: string;
  callback_key: string;
  expire_at: number;
}

async function getStoredToken(): Promise<TokenData | null> {
  const { data, error } = await supabase
    .from("lootbar_tokens")
    .select("token, callback_key, expire_at")
    .eq("id", 1)
    .single();

  if (error || !data) {
    console.log("[LootbarProxy] No valid token in DB");
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expiresIn = data.expire_at - nowSec;

  if (expiresIn > CONFIG.TOKEN_REFRESH_BUFFER_SEC) {
    console.log(`[LootbarProxy] Using cached token, expires in ${expiresIn}s`);
    return {
      token: data.token,
      callback_key: data.callback_key,
      expire_at: data.expire_at,
    };
  }

  console.log(`[LootbarProxy] Token expiring soon (${expiresIn}s), refreshing...`);
  return null;
}

async function doLogin(): Promise<TokenData> {
  const nickname = Deno.env.get("LOOTBAR_NICKNAME") ?? "";
  const email = Deno.env.get("LOOTBAR_EMAIL") ?? "";
  const password = Deno.env.get("LOOTBAR_PASSWORD") ?? "";

  if (!email || !password) {
    throw new Error("Missing LOOTBAR_EMAIL or LOOTBAR_PASSWORD environment variables");
  }

  console.log(`[LootbarProxy] Logging in as ${email}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.LOGIN_TIMEOUT_MS);

  try {
    const resp = await fetch(`${LOOTBAR_BASE}/api/reseller/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "accept": "application/json" },
      body: JSON.stringify({ nickname, email, password }),
      signal: controller.signal,
    });

    const text = await resp.text();
    console.log(`[LootbarProxy] Login response: ${resp.status} ${text.slice(0, 300)}`);

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
    }

    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
    }

    if (json.status !== "ok") {
      throw new Error(`Login rejected: ${String(json.msg ?? "Unknown error")}`);
    }

    const resultData = json.data as Record<string, unknown> | undefined;
    if (!resultData?.token) {
      throw new Error("Login succeeded but token missing");
    }

    const tokenData: TokenData = {
      token: String(resultData.token),
      callback_key: String(resultData.callback_key ?? ""),
      expire_at: Number(resultData.expire_at ?? 0),
    };

    // Upsert token to DB
    const { error: upsertError } = await supabase
      .from("lootbar_tokens")
      .upsert({
        id: 1,
        ...tokenData,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("[LootbarProxy] Failed to persist token:", upsertError);
      // Continue anyway — token works for this request
    }

    console.log(`[LootbarProxy] Login successful, token expires at ${tokenData.expire_at}`);
    return tokenData;

  } finally {
    clearTimeout(timeoutId);
  }
}

// Token promise lock to prevent concurrent logins
let _tokenPromise: Promise<TokenData> | null = null;

async function getToken(): Promise<TokenData> {
  // Check stored token first
  const stored = await getStoredToken();
  if (stored) return stored;

  // If login already in progress, wait for it
  if (_tokenPromise) return _tokenPromise;

  _tokenPromise = doLogin().finally(() => {
    _tokenPromise = null;
  });

  return _tokenPromise;
}

// ─── Lootbar API Request ───────────────────────────────────────────────────
interface LootbarResponse {
  status: string;
  msg?: string;
  data?: unknown;
}

async function lootbarRequest(
  method: string, 
  path: string, 
  body?: unknown, 
  retried = false
): Promise<LootbarResponse> {
  const { token } = await getToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

  try {
    const opts: RequestInit = {
      method,
      headers: {
        "Authorization": `PS ${token}`,
        "accept": "application/json",
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    };
    if (body) opts.body = JSON.stringify(body);

    console.log(`[LootbarProxy] ${method} ${path}`);

    let resp: Response;
    try {
      resp = await fetch(`${LOOTBAR_BASE}${path}`, opts);
    } catch (fetchErr) {
      const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      throw new Error(`Network error: ${errMsg}`);
    }

    const text = await resp.text();
    console.log(`[LootbarProxy] Response ${resp.status}: ${text.substring(0, 500)}`);

    // 401 = token expired, force refresh and retry once
    if (resp.status === 401 && !retried) {
      console.log("[LootbarProxy] 401 received, forcing token refresh...");

      // Invalidate stored token
      await supabase
        .from("lootbar_tokens")
        .update({ expire_at: 0 })
        .eq("id", 1);

      // Clear promise lock so doLogin runs fresh
      _tokenPromise = null;

      return lootbarRequest(method, path, body, true);
    }

    if (!resp.ok) {
      let parsed: LootbarResponse | null = null;
      try { parsed = JSON.parse(text) as LootbarResponse; } catch { /* not JSON */ }
      throw new Error(`HTTP ${resp.status}: ${parsed?.msg ?? text.slice(0, 200)}`);
    }

    let parsed: LootbarResponse;
    try {
      parsed = JSON.parse(text) as LootbarResponse;
    } catch {
      throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
    }

    return parsed;

  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Cache Helpers ─────────────────────────────────────────────────────────
async function batchUpsert(table: string, data: Array<Record<string, unknown>>): Promise<void> {
  if (data.length === 0) return;

  for (let i = 0; i < data.length; i += CONFIG.UPSERT_BATCH_SIZE) {
    const batch = data.slice(i, i + CONFIG.UPSERT_BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch);
    if (error) {
      console.error(`[LootbarProxy] Batch upsert error (${table}):`, error);
    }
  }
}

function categorizeGame(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("gift") || lower.includes("card") || lower.includes("voucher") || lower.includes("itunes") || lower.includes("google play")) {
    return "Gift Card";
  }
  if (lower.includes("coin") || lower.includes("credit") || lower.includes("gold") || lower.includes("token")) {
    return "Game Coins";
  }
  if (lower.includes("key") || lower.includes("steam") || lower.includes("epic") || lower.includes("ubisoft")) {
    return "Game Keys";
  }
  return "Top Up";
}

function formatSoldCount(soldRaw: number): string {
  if (soldRaw > 100_000) return `${Math.floor(soldRaw / 1000)}k+ Sold`;
  if (soldRaw > 1000) return `${Math.floor(soldRaw / 1000)}k Sold`;
  if (soldRaw > 0) return `${soldRaw} Sold`;
  return "100k+ Sold";
}

// ─── Get Games with Smart Caching ──────────────────────────────────────────
async function getGamesWithCache(pageNum: number, pageSize: number): Promise<LootbarResponse> {
  const oneHourAgo = new Date(Date.now() - CONFIG.GAME_CACHE_TTL_MS).toISOString();

  const { data: cached, error: cacheError } = await supabase
    .from("games_cache")
    .select("*")
    .order("game_name");

  if (!cacheError && cached && cached.length > 0) {
    const cacheAge = cached[0]?.cached_at;
    if (cacheAge && cacheAge > oneHourAgo) {
      console.log(`[LootbarProxy] Cache HIT: ${cached.length} games`);
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

  console.log("[LootbarProxy] Cache MISS, fetching from Lootbar API...");

  try {
    const result = await lootbarRequest("GET", `/api/reseller/games?page_num=1&page_size=200`);

    if (result.status !== "ok" || !result.data) {
      // Return stale cache if API fails
      if (cached && cached.length > 0) {
        console.warn("[LootbarProxy] API failed, returning stale cache");
        return {
          status: "ok",
          data: {
            items: cached,
            page_num: pageNum,
            page_size: pageSize,
            total_count: cached.length,
            total_page: 1,
            stale: true,
          }
        };
      }
      throw new Error(`API error: ${result.msg ?? "Unknown"}`);
    }

    const data = result.data as Record<string, unknown>;
    const items = (data.items as Array<Record<string, unknown>>) || [];

    const upsertData = items.map((game) => {
      const name = String(game.game_name || "");
      const rawImage = game.game_image || game.image_url || game.icon || game.thumb || null;
      const soldRaw = Number(game.sold_num || game.sold_count || 0);

      return {
        game_id: String(game.game_id),
        game_name: name,
        game_image: rawImage ? String(rawImage) : null,
        category: categorizeGame(name),
        rating: Number(game.rating || game.score || 5.0),
        sold_count: formatSoldCount(soldRaw),
        is_hot: Boolean(game.is_hot || game.hot),
        discount: Number(game.discount || game.discount_percent || 0),
        min_price: null, // Will be updated by SKU fetch
        cached_at: new Date().toISOString(),
      };
    });

    await batchUpsert("games_cache", upsertData);
    console.log(`[LootbarProxy] Cached ${upsertData.length} games`);

    return {
      status: "ok",
      data: { 
        ...data, 
        items: upsertData, 
        total_count: upsertData.length 
      }
    };

  } catch (err) {
    // Return stale cache as fallback
    if (cached && cached.length > 0) {
      console.warn("[LootbarProxy] Error fetching games, returning stale cache:", err);
      return {
        status: "ok",
        data: {
          items: cached,
          page_num: pageNum,
          page_size: pageSize,
          total_count: cached.length,
          total_page: 1,
          stale: true,
        }
      };
    }
    throw err;
  }
}

// ─── Get SKUs with Smart Caching ───────────────────────────────────────────
async function getSkusWithMinPrice(gameId: string): Promise<LootbarResponse> {
  const oneHourAgo = new Date(Date.now() - CONFIG.SKU_CACHE_TTL_MS).toISOString();

  const { data: cached, error: cacheErr } = await supabase
    .from("sku_cache")
    .select("*")
    .eq("game_id", gameId)
    .gte("cached_at", oneHourAgo);

  if (!cacheErr && cached && cached.length > 0) {
    console.log(`[LootbarProxy] SKU Cache HIT: ${cached.length} SKUs for ${gameId}`);
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

  try {
    const result = await lootbarRequest("GET", `/api/reseller/skus?game_id=${gameId}`);

    if (result.status !== "ok") {
      if (cached && cached.length > 0) {
        console.warn(`[LootbarProxy] SKU API failed for ${gameId}, returning stale cache`);
        return {
          status: "ok",
          data: { items: cached, stale: true },
        };
      }
      throw new Error(`SKU API error: ${result.msg ?? "Unknown"}`);
    }

    const data = result.data as Record<string, unknown>;
    const items = (data.items as Array<Record<string, unknown>>) || [];

    // Update min_price on games_cache
    const prices = items
      .map((sku) => Number(sku.price || sku.final_price || 0))
      .filter((p) => p > 0);

    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      await supabase
        .from("games_cache")
        .update({ min_price: minPrice })
        .eq("game_id", gameId);
      console.log(`[LootbarProxy] Updated min_price for ${gameId}: $${minPrice}`);
    }

    // Cache SKUs
    if (items.length > 0) {
      const now = new Date().toISOString();
      const upsertData = items.map((sku) => ({
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

      // Clear old cache for this game first
      await supabase.from("sku_cache").delete().eq("game_id", gameId);
      await batchUpsert("sku_cache", upsertData);
      console.log(`[LootbarProxy] Cached ${items.length} SKUs for ${gameId}`);
    }

    return result;

  } catch (err) {
    if (cached && cached.length > 0) {
      console.warn(`[LootbarProxy] SKU fetch error for ${gameId}, returning stale cache:`, err);
      return {
        status: "ok",
        data: { items: cached, stale: true },
      };
    }
    throw err;
  }
}

// ─── Order Operations ────────────────────────────────────────────────────────
async function createOrder(params: Record<string, unknown>): Promise<LootbarResponse> {
  const { reference_id, game_id, sku_id, num, extra_info, callback_url, 
          game_name, sku_name, price, base_price, profit_amount, markup_percent,
          user_email, user_id } = params;

  if (!reference_id || !game_id || !sku_id) {
    return {
      status: "error",
      msg: "Missing required fields: reference_id, game_id, sku_id",
    };
  }

  const orderBody = {
    reference_id,
    game_id,
    product: [{ sku_id, num: num ?? 1 }],
    extra_info: extra_info ?? {},
    callback_url: callback_url ?? `${SUPABASE_URL}/functions/v1/lootbar-notify`,
  };

  const result = await lootbarRequest("POST", "/api/reseller/create_order", orderBody);

  if (result.status === "ok") {
    const orderData = (result.data as Record<string, unknown>) ?? {};

    // Persist order locally
    const { error: dbError } = await supabase.from("orders").upsert({
      reference_id: String(reference_id),
      order_id: orderData.order_id,
      game_id: String(game_id),
      game_name: String(game_name ?? ""),
      sku_id: String(sku_id),
      sku_name: String(sku_name ?? ""),
      quantity: Number(num ?? 1),
      price: Number(price ?? 0),
      base_price: Number(base_price ?? 0),
      profit_amount: Number(profit_amount ?? 0),
      markup_percent: Number(markup_percent ?? 0),
      state: 1, // Pending
      extra_info: extra_info ?? {},
      user_email: String(user_email ?? ""),
      user_id: String(user_id ?? ""),
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("[LootbarProxy] Failed to persist order:", dbError);
      // Don't fail the request — order was created upstream
    }
  }

  return result;
}

async function queryOrder(params: Record<string, unknown>): Promise<LootbarResponse> {
  const reference_id = params.reference_id;
  if (!reference_id) {
    return { status: "error", msg: "Missing required param: reference_id" };
  }

  const result = await lootbarRequest("POST", "/api/reseller/query_order", {
    reference_id,
  });

  if (result.status === "ok") {
    const d = (result.data as Record<string, unknown>) ?? {};

    await supabase
      .from("orders")
      .update({ 
        state: d.state, 
        order_id: d.order_id,
        updated_at: new Date().toISOString(),
      })
      .eq("reference_id", reference_id);
  }

  return result;
}

// ─── Main Handler ────────────────────────────────────────────────────────────
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
      return errorResponse("Invalid JSON in request body", undefined, 400, "VALIDATION");
    }

    action = String(body.action ?? "");
    const params = (body.params ?? {}) as Record<string, unknown>;

    console.log(`[LootbarProxy] Action: ${action}`, JSON.stringify(params, null, 0).slice(0, 200));

    let result: LootbarResponse;

    switch (action) {
      case "get_games": {
        const pageNum = Number(params?.page_num ?? 1);
        const pageSize = Number(params?.page_size ?? 200);
        result = await getGamesWithCache(pageNum, pageSize);
        break;
      }

      case "get_skus": {
        if (!params?.game_id) {
          return errorResponse("Missing required param: game_id", undefined, 400, "VALIDATION");
        }
        result = await getSkusWithMinPrice(String(params.game_id));
        break;
      }

      case "create_order": {
        result = await createOrder(params);
        break;
      }

      case "query_order": {
        result = await queryOrder(params);
        break;
      }

      case "query_asset": {
        result = await lootbarRequest("GET", "/api/reseller/query_asset");
        break;
      }

      case "check_token": {
        const { token } = await getToken();
        result = { 
          status: "ok", 
          data: { 
            valid: true, 
            token_preview: token.slice(0, 8) + "...",
            timestamp: new Date().toISOString(),
          } 
        };
        break;
      }

      case "force_relogin": {
        // Force fresh login
        await supabase.from("lootbar_tokens").update({ expire_at: 0 }).eq("id", 1);
        _tokenPromise = null;
        const { token, callback_key } = await doLogin();
        result = { 
          status: "ok", 
          data: { 
            relogged: true, 
            token_preview: token.slice(0, 8) + "...", 
            callback_key_preview: callback_key.slice(0, 8) + "...",
          } 
        };
        break;
      }

      case "clear_game_cache": {
        await supabase.from("games_cache").update({ cached_at: new Date(0).toISOString() }).neq("game_id", "");
        result = { status: "ok", msg: "Game cache cleared" };
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
        return errorResponse(
          `Unknown action: ${action}`,
          "Valid: get_games, get_skus, create_order, query_order, query_asset, check_token, force_relogin, clear_game_cache, clear_sku_cache",
          400,
          "VALIDATION"
        );
    }

    // If the handler returned an error object, forward it properly
    if (result.status === "error") {
      return errorResponse(result.msg ?? "Unknown error", undefined, 400, "API");
    }

    return successResponse(result);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // Classify error for client
    let category = "INTERNAL";
    let statusCode = 500;
    let retryable = false;

    if (msg.includes("timeout") || msg.includes("Abort") || msg.includes("network")) {
      category = "TIMEOUT";
      statusCode = 504;
      retryable = true;
    } else if (msg.includes("401") || msg.includes("token") || msg.includes("login") || msg.includes("credentials")) {
      category = "AUTH";
      statusCode = 401;
    } else if (msg.includes("Missing required") || msg.includes("Invalid")) {
      category = "VALIDATION";
      statusCode = 400;
    } else if (msg.includes("HTTP")) {
      category = "API";
      statusCode = 502;
    }

    console.error(`[LootbarProxy] [${category}] action=${action}:`, msg);
    return errorResponse(msg, undefined, statusCode, category, retryable);
  }
});
