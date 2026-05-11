import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      // Increase fetch timeout for slow connections
      fetch: (url, options) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000); // 15s timeout
        return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
      },
    },
  }
);

/**
 * Retry a Supabase query with exponential backoff.
 * Usage: retryQuery(() => supabase.from("table").select("*"))
 */
export async function retryQuery<T>(
  queryFn: () => PromiseLike<{ data: T | null; error: unknown }>,
  maxRetries = 3,
  baseDelayMs = 800
): Promise<{ data: T | null; error: unknown }> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await queryFn();
    if (!result.error) return result;
    lastError = result.error;
    if (attempt < maxRetries - 1) {
      // Exponential backoff: 800ms, 1600ms, 3200ms …
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
    }
  }
  return { data: null, error: lastError };
}
