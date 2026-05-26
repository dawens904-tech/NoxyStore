import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import AdminSidebar from "./AdminSidebar";
import {
  ShoppingCart, Users, TrendingUp, DollarSign, Package,
  Activity, RefreshCw, Eye, CheckCircle, Clock, XCircle,
} from "lucide-react";

const ADMIN_DASHBOARD_PREFIX = "/secure-dashboard-92x2011";

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  failedOrders: number;
  totalRevenue: number;
  totalUsers: number;
  activeProducts: number;
  todayOrders: number;
}

interface RecentOrder {
  id: string;
  reference_id: string;
  game_name: string;
  sku_name: string;
  price: number;
  state: number;
  user_email: string | null;
  created_at: string;
}

const STATE_LABELS: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
  1: { label: "Pending", color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: <Clock size={12} /> },
  2: { label: "Processing", color: "text-blue-600 bg-blue-50 border-blue-200", icon: <RefreshCw size={12} /> },
  3: { label: "Completed", color: "text-green-600 bg-green-50 border-green-200", icon: <CheckCircle size={12} /> },
  4: { label: "Failed", color: "text-red-600 bg-red-50 border-red-200", icon: <XCircle size={12} /> },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Admin email guard — only allow admin role
    if (!user) { navigate("/login"); return; }
    if (user.role !== "admin") { navigate("/"); return; }
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      const [
        { data: orders },
        { data: manualProds },
        { data: cacheProds },
        { data: userRoles },
        { data: todayOrders },
      ] = await Promise.all([
        supabase.from("orders").select("price, state, profit_amount").limit(10000),
        supabase.from("manual_products").select("id").eq("is_active", true),
        supabase.from("games_cache").select("game_id").limit(1),
        supabase.from("user_roles").select("id"),
        supabase.from("orders").select("id").gte("created_at", `${today}T00:00:00.000Z`),
      ]);

      const allOrders = orders || [];
      setStats({
        totalOrders: allOrders.length,
        pendingOrders: allOrders.filter(o => o.state === 1 || o.state === 2).length,
        completedOrders: allOrders.filter(o => o.state === 3).length,
        failedOrders: allOrders.filter(o => o.state === 4).length,
        totalRevenue: allOrders.filter(o => o.state === 3).reduce((sum, o) => sum + Number(o.price || 0), 0),
        totalUsers: userRoles?.length ?? 0,
        activeProducts: (manualProds?.length ?? 0) + (cacheProds ? 1 : 0),
        todayOrders: todayOrders?.length ?? 0,
      });

      const { data: recent } = await supabase
        .from("orders")
        .select("id, reference_id, game_name, sku_name, price, state, user_email, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setRecentOrders(recent || []);
    } catch (err) {
      console.error("AdminDashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.role !== "admin") return null;

  const statCards = stats ? [
    { label: "Total Orders", value: stats.totalOrders.toLocaleString(), icon: <ShoppingCart size={22} />, color: "bg-blue-500", sub: `${stats.todayOrders} today` },
    { label: "Total Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, icon: <DollarSign size={22} />, color: "bg-green-500", sub: "Completed orders" },
    { label: "Pending / Processing", value: stats.pendingOrders.toLocaleString(), icon: <Clock size={22} />, color: "bg-yellow-500", sub: "Need attention" },
    { label: "Completed", value: stats.completedOrders.toLocaleString(), icon: <CheckCircle size={22} />, color: "bg-emerald-500", sub: "Successfully fulfilled" },
    { label: "Failed Orders", value: stats.failedOrders.toLocaleString(), icon: <XCircle size={22} />, color: "bg-red-500", sub: "Require review" },
    { label: "Registered Users", value: stats.totalUsers.toLocaleString(), icon: <Users size={22} />, color: "bg-purple-500", sub: "All time" },
    { label: "Active Products", value: stats.activeProducts.toLocaleString(), icon: <Package size={22} />, color: "bg-indigo-500", sub: "Manual + API games" },
    { label: "Completion Rate", value: stats.totalOrders > 0 ? `${Math.round((stats.completedOrders / stats.totalOrders) * 100)}%` : "—", icon: <TrendingUp size={22} />, color: "bg-teal-500", sub: "Orders fulfilled" },
  ] : [];

  return (
    <div className="flex min-h-screen bg-[#f5f7fa]">
      <AdminSidebar />

      <main className="ml-64 flex-1 p-8 max-w-[1600px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              Welcome back, <span className="font-semibold text-gray-700">{user.email}</span>
            </p>
          </div>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stat Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
            {statCards.map(card => (
              <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-500">{card.label}</span>
                  <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-white`}>
                    {card.icon}
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Manage Games", desc: "Add or edit games", path: `${ADMIN_DASHBOARD_PREFIX}/games`, color: "from-blue-500 to-blue-600" },
            { label: "Manage Products", desc: "Edit products & pricing", path: `${ADMIN_DASHBOARD_PREFIX}/products`, color: "from-purple-500 to-purple-600" },
            { label: "Add Product", desc: "Create new listing", path: `${ADMIN_DASHBOARD_PREFIX}/products/add`, color: "from-green-500 to-green-600" },
            { label: "View All Orders", desc: "Monitor order status", path: `${ADMIN_DASHBOARD_PREFIX}/orders`, color: "from-orange-500 to-orange-600" },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`bg-gradient-to-br ${action.color} rounded-2xl p-5 text-left text-white hover:opacity-90 transition shadow-sm`}
            >
              <p className="font-bold text-base mb-0.5">{action.label}</p>
              <p className="text-white/80 text-xs">{action.desc}</p>
            </button>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-gray-600" />
              <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
            </div>
            <span className="text-xs text-gray-400">{recentOrders.length} latest</span>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <ShoppingCart size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="px-6 py-3 text-left font-semibold">Reference</th>
                    <th className="px-6 py-3 text-left font-semibold">Game</th>
                    <th className="px-6 py-3 text-left font-semibold">SKU</th>
                    <th className="px-6 py-3 text-left font-semibold">User</th>
                    <th className="px-6 py-3 text-left font-semibold">Price</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                    <th className="px-6 py-3 text-left font-semibold">Date</th>
                    <th className="px-6 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map(order => {
                    const stateInfo = STATE_LABELS[order.state] ?? STATE_LABELS[1];
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-xs text-gray-600 whitespace-nowrap">
                          {order.reference_id}
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-gray-800 whitespace-nowrap max-w-[160px] truncate">
                          {order.game_name}
                        </td>
                        <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap max-w-[160px] truncate">
                          {order.sku_name}
                        </td>
                        <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap max-w-[160px] truncate">
                          {order.user_email ?? "—"}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-gray-900 whitespace-nowrap">
                          ${Number(order.price).toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${stateInfo.color}`}>
                            {stateInfo.icon} {stateInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(order.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => navigate(`/orders/${order.reference_id}`)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            <Eye size={13} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
and please if user are not ogin its put the route admin page show a page error with a video set auto play and Create a reusable AdminRoute wrapper component that checks if the user's email is in the user_roles table with role='admin' before rendering any admin page, redirecting to /login if not authenticated or to / if not admin.
