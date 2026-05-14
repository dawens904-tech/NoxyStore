/**
 * LOOTBAR RESELLER API SERVICE — Production-Ready Refactored Version
 * Secure proxy via Supabase Edge Function with proper error handling
 */
import { supabase } from "@/lib/supabase";
import type { LootbarGame, SkuItem } from "@/types";

// ─── Configuration ───────────────────────────────────────────────────────────
const CONFIG = {
  CACHE_TTL_MS: 5 * 60 * 1000,        // 5 minutes client cache
  PROXY_TIMEOUT_MS: 15000,             // Edge function timeout
  FALLBACK_DELAY_MS: 300,              // Artificial delay for fallbacks
  MAX_RETRIES: 1,
} as const;

// ─── Error Classification ────────────────────────────────────────────────────
export class LootbarAPIError extends Error {
  constructor(
    message: string,
    public readonly code: "NETWORK" | "AUTH" | "API" | "TIMEOUT" | "UNAVAILABLE" | "VALIDATION",
    public readonly action?: string,
    public readonly isRetryable = false
  ) {
    super(message);
    this.name = "LootbarAPIError";
  }
}

function classifyError(err: unknown, action: string): LootbarAPIError {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("timeout") || msg.includes("Abort") || msg.includes("network")) {
    return new LootbarAPIError(`Network timeout calling ${action}`, "TIMEOUT", action, true);
  }
  if (msg.includes("401") || msg.includes("token") || msg.includes("login") || msg.includes("credentials")) {
    return new LootbarAPIError(`Authentication failed for ${action}`, "AUTH", action, false);
  }
  if (msg.includes("backend unavailable") || msg.includes("not available")) {
    return new LootbarAPIError(`Backend unavailable for ${action}`, "UNAVAILABLE", action, true);
  }
  if (msg.includes("Missing required") || msg.includes("Invalid")) {
    return new LootbarAPIError(`Invalid request for ${action}: ${msg}`, "VALIDATION", action, false);
  }
  return new LootbarAPIError(`API error in ${action}: ${msg}`, "API", action, false);
}

// ─── Timeout Wrapper ─────────────────────────────────────────────────────────
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─── Call Edge Function Helper ────────────────────────────────────────────────
async function callProxy<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  const invokePromise = supabase.functions.invoke("lootbar-proxy", {
    body: { action, params: params ?? {} },
  });

  const { data, error } = await withTimeout(invokePromise, CONFIG.PROXY_TIMEOUT_MS, `proxy:${action}`);

  if (error) {
    let errorMessage = error.message;
    try {
      // Properly typed error context parsing
      const ctx = error.context as { status?: number; text?: () => Promise<string> } | undefined;
      if (ctx?.status) {
        const text = await ctx.text?.();
        if (text) {
          try {
            const parsed = JSON.parse(text) as { msg?: string };
            errorMessage = parsed.msg || text;
          } catch {
            errorMessage = text;
          }
        }
      }
    } catch {
      // Context parsing failed, use original message
    }
    console.error(`[LootbarAPI] Proxy error for action=${action}:`, errorMessage);
    throw classifyError(errorMessage, action);
  }

  if (data && typeof data === "object" && "status" in data && data.status === "error") {
    const apiError = (data as { msg?: string }).msg || "API returned error status";
    throw classifyError(apiError, action);
  }

  return data as T;
}

// ─── Backend Health Check (Lazy — only called explicitly, never on import) ───
// IMPORTANT: Do NOT call isBackendAvailable() at module level.
// It must only be called from pages that actually need the Lootbar API
// (GameDetailPage, AdminApiStatusPage, AdminDashboardPage).
// All other pages use Supabase directly and must never import lootbar-api.
let _backendAvailable: boolean | null = null;
let _healthCheckPromise: Promise<boolean> | null = null;

async function isBackendAvailable(): Promise<boolean> {
  if (_backendAvailable !== null) return _backendAvailable;
  if (_healthCheckPromise) return _healthCheckPromise;

  _healthCheckPromise = (async () => {
    try {
      await callProxy("check_token");
      _backendAvailable = true;
      console.log("[LootbarAPI] Backend proxy connected");
    } catch (e) {
      console.warn("[LootbarAPI] Backend not available:", e);
      _backendAvailable = false;
    }
    return _backendAvailable as boolean;
  })();

  const result = await _healthCheckPromise;
  _healthCheckPromise = null;
  return result;
}

export function resetBackendHealth(): void {
  _backendAvailable = null;
  _healthCheckPromise = null;
}

// ─── Cache Management ────────────────────────────────────────────────────────
type CacheRow = {
  game_id: string;
  game_name: string;
  game_image: string | null;
  category: string | null;
  rating: number | null;
  sold_count: string | null;
  is_hot: boolean | null;
  discount: number | null;
  min_price: number | null;
};

let _cacheMap: Map<string, CacheRow> | null = null;
let _cacheLoadedAt = 0;

async function getGamesCache(): Promise<Map<string, CacheRow>> {
  const now = Date.now();
  if (_cacheMap && now - _cacheLoadedAt < CONFIG.CACHE_TTL_MS) return _cacheMap;

  try {
    const { data } = await supabase
      .from("games_cache")
      .select("game_id, game_name, game_image, category, rating, sold_count, is_hot, discount, min_price");

    if (data && data.length > 0) {
      _cacheMap = new Map(data.map((r: CacheRow) => [r.game_id, r]));
      _cacheLoadedAt = now;
      console.log(`[LootbarAPI] Loaded ${data.length} games from games_cache`);
    } else {
      _cacheMap = new Map();
    }
  } catch (e) {
    console.warn("[LootbarAPI] Failed to load games_cache:", e);
    _cacheMap = _cacheMap ?? new Map();
  }
  return _cacheMap;
}

export const cacheManager = {
  invalidate: () => {
    _cacheMap = null;
    _cacheLoadedAt = 0;
    console.log("[LootbarAPI] Client cache invalidated");
  },
  refresh: async () => {
    _cacheMap = null;
    _cacheLoadedAt = 0;
    return getGamesCache();
  },
};

function mergeWithCache(
  g: { game_id: string; game_name: string; game_image?: string; category?: string; rating?: number; sold_count?: string; is_hot?: boolean; discount?: number; min_price?: number | null },
  cache: Map<string, CacheRow>
): LootbarGame {
  const row = cache.get(g.game_id);
  return {
    game_id: g.game_id,
    game_name: row?.game_name || g.game_name,
    game_image: (row?.game_image && row.game_image.trim()) ? row.game_image : (g.game_image || ""),
    category: row?.category || g.category || "Top Up",
    rating: row?.rating ?? g.rating ?? 5.0,
    sold_count: row?.sold_count || g.sold_count || "1k+ Sold",
    is_hot: row?.is_hot ?? g.is_hot ?? false,
    discount: row?.discount ?? g.discount ?? 0,
    min_price: row?.min_price ?? g.min_price ?? null,
  };
}

// ─── Secure Reference ID Generation ─────────────────────────────────────────
export function generateReferenceId(): string {
  // Use crypto.getRandomValues for secure randomness, fallback to timestamp + random
  let randomPart: string;
  try {
    const arr = new Uint8Array(4);
    crypto.getRandomValues(arr);
    randomPart = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  } catch {
    randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  return `NOXY-${Date.now()}-${randomPart}`;
}

// ─── Fallback Data Guards ────────────────────────────────────────────────────
function getDevFallbackGames(): LootbarGame[] {
  // Only available in development — prevents mock data in production
  if (process.env.NODE_ENV === "development" || __DEV__) {
    return MOCK_GAMES;
  }
  throw new LootbarAPIError(
    "Backend unavailable and no cached data. Please try again later.",
    "UNAVAILABLE",
    "getGames"
  );
}

function getDevFallbackSkus(gameId: string, gameName: string): SkuItem[] {
  if (process.env.NODE_ENV === "development" || __DEV__) {
    return MOCK_SKUS[gameId] ?? getGenericSkus(gameId, gameName);
  }
  throw new LootbarAPIError(
    `No SKUs available for ${gameName}. Backend unavailable.`,
    "UNAVAILABLE",
    "getSkus"
  );
}

// ─── Public API ─────────────────────────────────────────────────────────────
export const lootbarApi = {
  async getGames(pageNum = 1, pageSize = 200): Promise<LootbarGame[]> {
    const cachePromise = getGamesCache();

    try {
      const available = await isBackendAvailable();
      if (!available) throw new LootbarAPIError("Backend unavailable", "UNAVAILABLE", "getGames", true);

      const [res, cache] = await Promise.all([
        callProxy<{
          status: string;
          data: {
            items: Array<{
              game_id: string;
              game_name: string;
              game_image?: string;
              category?: string;
              rating?: number;
              sold_count?: string;
              is_hot?: boolean;
              discount?: number;
            }>;
          };
        }>("get_games", { page_num: pageNum, page_size: pageSize }),
        cachePromise,
      ]);

      if (res.status !== "ok") throw new LootbarAPIError("API returned non-ok status", "API", "getGames");
      return res.data.items.map((g) => mergeWithCache(g, cache));

    } catch (e) {
      console.warn("[LootbarAPI] getGames failed:", e);

      // Try cache fallback
      const cache = await cachePromise;
      if (cache.size > 0) {
        console.log("[LootbarAPI] Returning cached games as fallback");
        return Array.from(cache.values()).map((row) => ({
          game_id: row.game_id,
          game_name: row.game_name,
          game_image: row.game_image || "",
          category: row.category || "Top Up",
          rating: row.rating ?? 5.0,
          sold_count: row.sold_count || "1k+ Sold",
          is_hot: row.is_hot ?? false,
          discount: row.discount ?? 0,
          min_price: row.min_price ?? null,
        }));
      }

      // Last resort: dev mock data or throw
      await new Promise((r) => setTimeout(r, CONFIG.FALLBACK_DELAY_MS));
      return getDevFallbackGames();
    }
  },

  async getSkus(gameId: string): Promise<SkuItem[]> {
    try {
      const available = await isBackendAvailable();
      if (!available) throw new LootbarAPIError("Backend unavailable", "UNAVAILABLE", "getSkus", true);

      const res = await callProxy<{
        status: string;
        data: { items: SkuItem[] };
      }>("get_skus", { game_id: gameId });

      if (res.status !== "ok" || !res.data?.items?.length) {
        throw new LootbarAPIError("No SKUs returned from API", "API", "getSkus");
      }
      return res.data.items;

    } catch (e) {
      console.warn("[LootbarAPI] getSkus failed:", gameId, e);
      await new Promise((r) => setTimeout(r, CONFIG.FALLBACK_DELAY_MS));

      const game = (await getGamesCache()).get(gameId);
      return getDevFallbackSkus(gameId, game?.game_name ?? "");
    }
  },

  async createOrder(
    gameId: string,
    gameName: string,
    skuId: string,
    skuName: string,
    quantity: number,
    price: number,
    extraInfo: Record<string, string>,
    userEmail?: string,
    userId?: string
  ): Promise<{ order_id: string; reference_id: string }> {
    const reference_id = generateReferenceId();

    try {
      const available = await isBackendAvailable();
      if (!available) throw new LootbarAPIError("Backend unavailable", "UNAVAILABLE", "createOrder", true);

      const res = await callProxy<{
        status: string;
        data: { order_id: string };
      }>("create_order", {
        reference_id,
        game_id: gameId,
        game_name: gameName,
        sku_id: skuId,
        sku_name: skuName,
        num: quantity,
        price,
        extra_info: extraInfo,
        user_email: userEmail,
        user_id: userId,
      });

      if (res.status !== "ok") throw new LootbarAPIError("Order creation rejected by API", "API", "createOrder");

      return { order_id: res.data.order_id, reference_id };

    } catch (e) {
      console.error("[LootbarAPI] createOrder FAILED — not creating fake order:", e);
      // NEVER return fake order IDs — let the UI handle the error
      throw e instanceof LootbarAPIError 
        ? e 
        : classifyError(e, "createOrder");
    }
  },

  async queryOrder(referenceId: string): Promise<{ order_id: string; state: number }> {
    try {
      const available = await isBackendAvailable();
      if (!available) throw new LootbarAPIError("Backend unavailable", "UNAVAILABLE", "queryOrder", true);

      const res = await callProxy<{
        status: string;
        data: { order_id: string; state: number };
      }>("query_order", { reference_id: referenceId });

      if (res.status !== "ok") throw new LootbarAPIError("Order query rejected by API", "API", "queryOrder");
      return res.data;

    } catch (e) {
      console.error("[LootbarAPI] queryOrder FAILED — not returning fake state:", e);
      throw e instanceof LootbarAPIError 
        ? e 
        : classifyError(e, "queryOrder");
    }
  },

  async getBalance(): Promise<string> {
    try {
      const available = await isBackendAvailable();
      if (!available) throw new LootbarAPIError("Backend unavailable", "UNAVAILABLE", "getBalance", true);

      const res = await callProxy<{
        status: string;
        data: { total_amount: string };
      }>("query_asset");

      if (res.status !== "ok") throw new LootbarAPIError("Balance query rejected", "API", "getBalance");
      return res.data.total_amount;

    } catch (e) {
      console.error("[LootbarAPI] getBalance failed:", e);
      // Return "--" to indicate unknown rather than fake "0.00"
      return "--";
    }
  },

  async login(_n: string, _e: string, _p: string): Promise<void> {
    // This is a no-op because auth is handled by Supabase Auth
    // Kept for API compatibility but does not process credentials
    await isBackendAvailable();
  },
};

export const tokenManager = {
  isAuthenticated: () => true,
  getToken: () => "server-side",
  logout: () => {},
};

// ─── Mock Data (Development Only) ───────────────────────────────────────────
const MOCK_GAMES: LootbarGame[] = [
  // ... your existing mock games
];

const MOCK_SKUS: Record<string, SkuItem[]> = {
  // ... your existing mock SKUs
};

function getGenericSkus(_gameId: string, gameName: string): SkuItem[] {
  return [
    {
      sku_id: "generic-1",
      sku_name: `${gameName} - Basic Pack`,
      price: 9.99,
      original_price: 12.99,
      discount_amount: 3.0,
      attribute: [],
      extra_info: [],
    },
  ];
}
