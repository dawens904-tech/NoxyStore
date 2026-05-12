import { useEffect, useState } from "react";
import { RefreshCw, Eye, Users, Monitor, Smartphone, Globe, Star, BarChart2, DollarSign, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from "recharts";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { getAnalytics } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f0f] border border-white/20 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="text-gray-400 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-bold mb-0.5" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.dataKey !== "visits" ? `$${p.value.toFixed(2)}` : p.value}
        </p>
      ))}
    </div>
  );
};

interface RevenueDay {
  date: string;
  revenue: number;
  baseCost: number;
  profit: number;
}

async function loadRevenueData(days: number): Promise<RevenueDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("price, base_price, profit_amount, created_at, state")
    .gte("created_at", since.toISOString())
    .in("state", [2, 4, 5]); // successful orders

  if (error || !orders) return [];

  // Group by date
  const map = new Map<string, { revenue: number; baseCost: number; profit: number }>();

  // Seed all dates
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { revenue: 0, baseCost: 0, profit: 0 });
  }

  for (const order of orders) {
    const key = order.created_at.slice(0, 10);
    const existing = map.get(key) || { revenue: 0, baseCost: 0, profit: 0 };
    existing.revenue += Number(order.price || 0);
    existing.baseCost += Number(order.base_price || 0);
    existing.profit += Number(order.profit_amount || 0);
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date: date.slice(5), // MM-DD
      ...vals,
    }));
}

export function AdminAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDay[]>([]);
  const [days, setDays] = useState(7);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { load(); }, [days]);

  const load = async () => {
    setIsLoading(true);
    try {
      const [analytics, revenue] = await Promise.all([
        getAnalytics(days),
        loadRevenueData(days),
      ]);
      setAnalyticsData(analytics);
      setRevenueData(revenue);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  const dailyChartData = (analyticsData?.dailyData || []).map((d: any) => ({
    date: d.date.slice(5),
    visits: d.count,
  }));

  const hourlyChartData = (analyticsData?.hourlyActivity || []).map((count: number, hour: number) => ({
    hour: `${hour}h`,
    visits: count,
  }));

  // Revenue summary
  const totalRevenue = revenueData.reduce((s, d) => s + d.revenue, 0);
  const totalBaseCost = revenueData.reduce((s, d) => s + d.baseCost, 0);
  const totalProfit = revenueData.reduce((s, d) => s + d.profit, 0);

  return (
    <AdminLayout title="Analytics">
      <div className="space-y-6 max-w-5xl">
        {/* Time range + refresh */}
        <div className="flex items-center gap-2">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold ${days === d ? "bg-yellow-400 text-black" : "bg-white/10 text-gray-300 hover:bg-white/15"}`}>
              {d}d
            </button>
          ))}
          <button onClick={load} disabled={isLoading} className="p-2 text-gray-400 hover:text-white ml-2">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
          <span className="text-xs text-gray-500 ml-2">Last {days} days</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-[#1a1a1a] rounded-2xl h-28 animate-pulse" />)}
          </div>
        ) : analyticsData ? (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Eye, label: "Total Visits", value: String(analyticsData.totalVisits), color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
                { icon: Users, label: "Unique Sessions", value: String(analyticsData.uniqueSessions), color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
                { icon: Monitor, label: "Desktop", value: String(analyticsData.deviceCounts?.desktop || 0), color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
                { icon: Smartphone, label: "Mobile", value: String(analyticsData.deviceCounts?.mobile || 0), color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
                { icon: Users, label: "Logged-in Users", value: String(analyticsData.uniqueLoggedInUsers), color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
                { icon: Globe, label: "Tablet", value: String(analyticsData.deviceCounts?.tablet || 0), color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20" },
                { icon: Eye, label: "Game Views", value: String(analyticsData.topGames?.reduce((s: number, g: any) => s + g.count, 0) || 0), color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
                { icon: Star, label: "Page Views", value: String(analyticsData.topPages?.reduce((s: number, p: any) => s + p.count, 0) || 0), color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" },
              ].map((s) => (
                <div key={s.label} className={`bg-[#1a1a1a] border ${s.border} rounded-2xl p-5`}>
                  <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}><s.icon size={20} className={s.color} /></div>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* ── Revenue Area Chart ── */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-white">Revenue Trend</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Successful orders · last {days} days</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />Revenue</span>
                  <span className="flex items-center gap-1.5 text-gray-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />Base Cost</span>
                  <span className="flex items-center gap-1.5 text-gray-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />Profit</span>
                </div>
              </div>

              {/* Revenue summary row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { icon: DollarSign, label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, color: "text-yellow-400" },
                  { icon: TrendingUp, label: "Base Cost", value: `$${totalBaseCost.toFixed(2)}`, color: "text-blue-400" },
                  { icon: TrendingUp, label: "Net Profit", value: `$${totalProfit.toFixed(2)}`, color: "text-emerald-400" },
                ].map((item) => (
                  <div key={item.label} className="bg-white/5 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <item.icon size={16} className={item.color} />
                    <div>
                      <p className={`text-sm font-black ${item.color}`}>{item.value}</p>
                      <p className="text-[10px] text-gray-500">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {revenueData.length > 0 && revenueData.some(d => d.revenue > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FACC15" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#FACC15" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34D399" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#FACC15" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: "#FACC15" }} />
                    <Area type="monotone" dataKey="baseCost" name="Base Cost" stroke="#3B82F6" strokeWidth={1.5} fill="url(#costGrad)" dot={false} activeDot={{ r: 4, fill: "#3B82F6" }} />
                    <Area type="monotone" dataKey="profit" name="Profit" stroke="#34D399" strokeWidth={2} fill="url(#profitGrad)" dot={false} activeDot={{ r: 4, fill: "#34D399" }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-gray-600 text-sm">No revenue data yet — orders will appear here once completed</p>
                </div>
              )}
            </div>

            {/* Daily visits — Area chart */}
            {dailyChartData.length > 0 && (
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-white">Daily Visits</h3>
                  <span className="text-xs text-gray-500">Last {days} days</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={dailyChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="visitsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FACC15" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FACC15" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="visits" name="Visits" stroke="#FACC15" strokeWidth={2} fill="url(#visitsGrad)" dot={{ fill: "#FACC15", r: 3 }} activeDot={{ r: 5, fill: "#FACC15" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Hourly activity */}
            {hourlyChartData.length > 0 && (
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-white">Hourly Activity (UTC)</h3>
                  <span className="text-xs text-gray-500">Peak traffic hours</span>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={hourlyChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="visits" name="Visits" fill="#FACC15" opacity={0.8} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top pages + games */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                <h3 className="font-bold text-white mb-4">Top Pages</h3>
                {analyticsData.topPages?.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart
                        data={(analyticsData.topPages || []).slice(0, 6).map((p: any) => ({ page: p.page?.split("/").pop() || "/", count: p.count }))}
                        layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="page" tick={{ fill: "#9ca3af", fontSize: 9 }} axisLine={false} tickLine={false} width={60} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Views" fill="#818cf8" radius={[0, 4, 4, 0]} opacity={0.8} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5">
                      {(analyticsData.topPages || []).slice(0, 5).map((p: any) => (
                        <div key={p.page} className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 font-mono truncate flex-1">{p.page || "/"}</span>
                          <span className="text-xs font-bold text-indigo-400 ml-3">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="text-gray-500 text-sm">No page data yet</p>}
              </div>

              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                <h3 className="font-bold text-white mb-4">Top Viewed Games</h3>
                {analyticsData.topGames?.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart
                        data={(analyticsData.topGames || []).slice(0, 6).map((g: any) => ({ game: `#${g.gameId}`, count: g.count }))}
                        layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="game" tick={{ fill: "#9ca3af", fontSize: 9 }} axisLine={false} tickLine={false} width={48} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Views" fill="#fb923c" radius={[0, 4, 4, 0]} opacity={0.8} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5">
                      {(analyticsData.topGames || []).slice(0, 5).map((g: any) => (
                        <div key={g.gameId} className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 truncate flex-1">Game {g.gameId}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">{g.uniqueUsers} users</span>
                            <span className="text-xs font-bold text-orange-400">{g.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="text-gray-500 text-sm">No game view data yet</p>}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-12 text-center">
            <BarChart2 size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-3">Click refresh to load analytics data</p>
            <button onClick={load} className="bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-300 text-sm">
              Load Analytics
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
