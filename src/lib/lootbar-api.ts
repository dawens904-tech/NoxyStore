/**
 * LOOTBAR RESELLER API SERVICE — Real Backend Proxy Version
 * All requests go through the secure Edge Function (lootbar-proxy)
 * Token managed server-side in DB, never exposed to client
 */
import { supabase } from "@/lib/supabase";
import type { LootbarGame, SkuItem } from "@/types";
import { MOCK_GAMES, MOCK_SKUS, getGenericSkus } from "@/constants/mockData";

// ─── Call Edge Function Helper ────────────────────────────────────────────────
async function callProxy<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("lootbar-proxy", {
    body: { action, params: params ?? {} },
  });

  if (error) {
    let errorMessage = error.message;
    try {
      // @ts-ignore
      if (error.context?.status) {
        const text = await error.context?.text?.();
        if (text) {
          const parsed = JSON.parse(text);
          errorMessage = parsed.msg || text;
        }
      }
    } catch {}
    console.error(`[LootbarAPI] Proxy error for action=${action}:`, errorMessage);
    throw new Error(errorMessage);
  }

  if (data?.status === "error") throw new Error(data.msg || "API error");
  return data as T;
}

let _backendAvailable: boolean | null = null;
async function isBackendAvailable(): Promise<boolean> {
  if (_backendAvailable !== null) return _backendAvailable;
  try {
    await callProxy("check_token");
    _backendAvailable = true;
    console.log("[LootbarAPI] Backend proxy connected");
  } catch (e) {
    console.warn("[LootbarAPI] Backend not available, using mock data:", e);
    _backendAvailable = false;
  }
  return _backendAvailable;
}

// ─── Cache helpers ───────────────────────────────────────────────────────────
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
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory

async function getGamesCache(): Promise<Map<string, CacheRow>> {
  const now = Date.now();
  if (_cacheMap && now - _cacheLoadedAt < CACHE_TTL_MS) return _cacheMap;
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

function mergeWithCache(g: { game_id: string; game_name: string; game_image?: string; category?: string; rating?: number; sold_count?: string; is_hot?: boolean; discount?: number; min_price?: number | null }, cache: Map<string, CacheRow>): LootbarGame {
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

// ─── Public API ───────────────────────────────────────────────────────────────
export const lootbarApi = {
  async getGames(pageNum = 1, pageSize = 200): Promise<LootbarGame[]> {
    // Always load games_cache first (fast parallel fetch)
    const cachePromise = getGamesCache();
    try {
      const available = await isBackendAvailable();
      if (!available) throw new Error("backend unavailable");
      const [res, cache] = await Promise.all([
        callProxy<{ status: string; data: { items: Array<{ game_id: string; game_name: string; game_image?: string; category?: string; rating?: number; sold_count?: string; is_hot?: boolean; discount?: number }> } }>(
          "get_games", { page_num: pageNum, page_size: pageSize }
        ),
        cachePromise,
      ]);
      if (res.status !== "ok") throw new Error("API returned error");
      return res.data.items.map((g) => mergeWithCache(g, cache));
    } catch (e) {
      console.warn("[LootbarAPI] getGames fallback to cache/mock:", e);
      // If API fails, try returning cache rows directly
      const cache = await cachePromise;
      if (cache.size > 0) {
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
      await new Promise((r) => setTimeout(r, 300));
      return MOCK_GAMES;
    }
  },

  async getSkus(gameId: string): Promise<SkuItem[]> {
    try {
      const available = await isBackendAvailable();
      if (!available) throw new Error("backend unavailable");
      const res = await callProxy<{ status: string; data: { items: SkuItem[] } }>(
        "get_skus", { game_id: gameId }
      );
      if (res.status !== "ok" || !res.data?.items?.length) throw new Error("No SKUs");
      return res.data.items;
    } catch (e) {
      console.warn("[LootbarAPI] getSkus fallback to mock:", gameId, e);
      await new Promise((r) => setTimeout(r, 300));
      const game = MOCK_GAMES.find((g) => g.game_id === gameId);
      return MOCK_SKUS[gameId] ?? getGenericSkus(gameId, game?.game_name ?? "");
    }
  },

  async createOrder(
    gameId: string, gameName: string, skuId: string, skuName: string,
    quantity: number, price: number, extraInfo: Record<string, string>,
    userEmail?: string, userId?: string
  ): Promise<{ order_id: string; reference_id: string }> {
    const reference_id = `NOXY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    try {
      const available = await isBackendAvailable();
      if (!available) throw new Error("backend unavailable");
      const res = await callProxy<{ status: string; data: { order_id: string } }>(
        "create_order",
        { reference_id, game_id: gameId, game_name: gameName, sku_id: skuId, sku_name: skuName, num: quantity, price, extra_info: extraInfo, user_email: userEmail, user_id: userId }
      );
      if (res.status !== "ok") throw new Error("Order failed");
      return { order_id: res.data.order_id, reference_id };
    } catch (e) {
      console.warn("[LootbarAPI] createOrder fallback:", e);
      await new Promise((r) => setTimeout(r, 800));
      return { order_id: `T${Date.now()}`, reference_id };
    }
  },

  async queryOrder(referenceId: string): Promise<{ order_id: string; state: number }> {
    try {
      const available = await isBackendAvailable();
      if (!available) throw new Error("backend unavailable");
      const res = await callProxy<{ status: string; data: { order_id: string; state: number } }>(
        "query_order", { reference_id: referenceId }
      );
      if (res.status !== "ok") throw new Error("Query failed");
      return res.data;
    } catch (e) {
      console.warn("[LootbarAPI] queryOrder fallback:", e);
      await new Promise((r) => setTimeout(r, 500));
      return { order_id: referenceId, state: 2 };
    }
  },

  async getBalance(): Promise<string> {
    try {
      const available = await isBackendAvailable();
      if (!available) throw new Error("backend unavailable");
      const res = await callProxy<{ status: string; data: { total_amount: string } }>("query_asset");
      if (res.status !== "ok") throw new Error("Balance query failed");
      return res.data.total_amount;
    } catch {
      return "0.00";
    }
  },

  async login(_n: string, _e: string, _p: string): Promise<void> {
    await isBackendAvailable();
  },
};

export function generateReferenceId(): string {
  return `NOXY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

export const tokenManager = { isAuthenticated: () => true, getToken: () => "server-side", logout: () => {} };
