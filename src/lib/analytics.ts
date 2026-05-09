/**
 * Real analytics tracking — sends events to Supabase analytics_events table
 */
import { supabase } from "@/lib/supabase";

// Simple device detection
function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "mobile";
  return "desktop";
}

// Session ID persisted for the tab
let _sessionId: string | null = null;
function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = sessionStorage.getItem("noxy_session") || `s_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    sessionStorage.setItem("noxy_session", _sessionId);
  }
  return _sessionId;
}

export async function trackEvent(
  eventType: string,
  data: {
    page?: string;
    userId?: string;
    gameId?: string;
    extra?: Record<string, unknown>;
  } = {}
) {
  const payload = {
    event_type: eventType,
    page: data.page || window.location.pathname,
    user_id: data.userId || null,
    session_id: getSessionId(),
    user_agent: navigator.userAgent,
    device_type: getDeviceType(),
    referrer: document.referrer || null,
    game_id: data.gameId || null,
    extra_data: data.extra || {},
  };

  // Fire and forget — don't await or let errors surface
  supabase.from("analytics_events").insert(payload).then(({ error }) => {
    if (error) console.warn("[Analytics] Track event failed:", error.message);
  });
}

export async function getAnalytics(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [visitsRes, deviceRes, pagesRes, gamesRes, dailyRes, eventTypesRes] = await Promise.all([
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("analytics_events").select("device_type, session_id, user_id").gte("created_at", since),
    supabase.from("analytics_events").select("page, session_id").gte("created_at", since),
    supabase.from("analytics_events").select("game_id, session_id").not("game_id", "is", null).gte("created_at", since),
    supabase.from("analytics_events").select("created_at, event_type, user_id").gte("created_at", since).order("created_at"),
    supabase.from("analytics_events").select("event_type").gte("created_at", since),
  ]);

  const totalVisits = visitsRes.count ?? 0;

  // Device breakdown
  const deviceCounts: Record<string, number> = {};
  const sessionSet = new Set<string>();
  const userSet = new Set<string>();
  (deviceRes.data ?? []).forEach((r) => {
    const d = r.device_type || "unknown";
    deviceCounts[d] = (deviceCounts[d] || 0) + 1;
    if (r.session_id) sessionSet.add(r.session_id);
    if (r.user_id) userSet.add(r.user_id);
  });

  // Top pages
  const pageCounts: Record<string, number> = {};
  (pagesRes.data ?? []).forEach((r) => {
    const p = r.page || "/";
    pageCounts[p] = (pageCounts[p] || 0) + 1;
  });
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([page, count]) => ({ page, count }));

  // Top games
  const gameCounts: Record<string, number> = {};
  const gameSessionCounts: Record<string, Set<string>> = {};
  (gamesRes.data ?? []).forEach((r) => {
    if (r.game_id) {
      gameCounts[r.game_id] = (gameCounts[r.game_id] || 0) + 1;
      if (!gameSessionCounts[r.game_id]) gameSessionCounts[r.game_id] = new Set();
      if (r.session_id) gameSessionCounts[r.game_id].add(r.session_id);
    }
  });
  const topGames = Object.entries(gameCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([gameId, count]) => ({ gameId, count, uniqueUsers: gameSessionCounts[gameId]?.size || 0 }));

  // Daily visits over the period
  const dailyCounts: Record<string, number> = {};
  const dailyUsers: Record<string, Set<string>> = {};
  (dailyRes.data ?? []).forEach((r) => {
    const day = r.created_at.slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    if (!dailyUsers[day]) dailyUsers[day] = new Set();
    if (r.user_id) dailyUsers[day].add(r.user_id);
  });
  const dailyData = Object.entries(dailyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count, loggedInUsers: dailyUsers[date]?.size || 0 }));

  // Event type breakdown
  const eventTypeCounts: Record<string, number> = {};
  (eventTypesRes.data ?? []).forEach((r) => {
    const t = r.event_type || "unknown";
    eventTypeCounts[t] = (eventTypeCounts[t] || 0) + 1;
  });

  // Hourly activity heatmap (0-23)
  const hourlyActivity: number[] = Array(24).fill(0);
  (dailyRes.data ?? []).forEach((r) => {
    const hour = new Date(r.created_at).getHours();
    hourlyActivity[hour]++;
  });

  const uniqueSessions = sessionSet.size;
  const uniqueLoggedInUsers = userSet.size;

  return {
    totalVisits,
    uniqueSessions,
    uniqueLoggedInUsers,
    deviceCounts,
    topPages,
    topGames,
    dailyData,
    eventTypeCounts,
    hourlyActivity,
  };
}
