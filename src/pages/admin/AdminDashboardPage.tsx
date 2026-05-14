import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, Package, TrendingUp, Activity, RefreshCw
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { lootbarApi } from "@/lib/lootbar-api";
import { ORDER_STATE_MAP } from "@/types";
import { toast } from "sonner";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { orders } = useAuthStore();
  const [balance, setBalance] = useState("—");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [markup, setMarkup] = useState(0);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchBalance();
    checkApi();
    loadMarkup();
    loadRecentOrders();
  }, []);

  const fetchBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const bal = await lootbarApi.getBalance();
      setBalance(bal);
    } catch { toast.error("Failed to fetch balance"); }
    finally { setIsLoadingBalance(false); }
  };

  const checkApi = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("lootbar-proxy", {
        body: { action: "check_token" },
      });
      setApiConnected(!error && data?.status === "ok");
    } catch { setApiConnected(false); }
  };

  const loadMarkup = async () => {
    const { data } = await supabase.from("markup_settings").select("markup_percent").eq("id", 1).single();
    if (data) setMarkup(Number(data.markup_percent));
  };

  const loadRecentOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setRecentOrders(data);
  };

  const allOrders = recentOrders.length > 0 ? recentOrders : orders;
  const totalRevenue = allOrders.reduce((s: number, o: any) => s + Number(o.price || 0), 0);
  const successOrders = allOrders.filter((o: any) => o.state === 2).length;
  const pendingOrders = allOrders.filter((o: any) => o.state === 1).length;

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6 max-w-5xl">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-black">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-semibold opacity-70">Lootbar Reseller Balance</p>
            <button onClick={fetchBalance} disabled={isLoadingBalance} className="bg-black/10 rounded-full p-1.5 hover:bg-black/20">
              <RefreshCw size={14} className={isLoadingBalance ? "animate-spin" : ""} />
            </button>
          </div>
          <p className="text-5xl font-black">${isLoadingBalance ? "—" : parseFloat(balance || "0").toFixed(2)}</p>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs opacity-60">Markup: {markup}%</p>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 bg-black/10 rounded-full px-2.5 py-0.5 text-xs font-semibold`}>
                <span className={`w-1.5 h-1.5 rounded-full ${apiConnected === true ? "bg-green-600" : "bg-red-600"}`} />
                {apiConnected === true ? "API Live" : apiConnected === false ? "API Offline" : "Checking…"}
              </span>
              <span className="bg-black/10 rounded-full px-2.5 py-0.5 text-xs font-semibold">USD</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
            { icon: Package, label: "Total Orders", value: String(allOrders.length), color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
            { icon: TrendingUp, label: "Successful", value: String(successOrders), color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
            { icon: Activity, label: "Pending", value: String(pendingOrders), color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
          ].map((s) => (
            <div key={s.label} className={`bg-[#1a1a1a] border ${s.border} rounded-2xl p-5`}>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon size={20} className={s.color} />
              </div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: "Live Chat", path: "/admin/livechat", color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
            { label: "Products", path: "/admin/products", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
            { label: "Banners", path: "/admin/banners", color: "bg-pink-500/10 border-pink-500/30 text-pink-400" },
            { label: "Analytics", path: "/admin/analytics", color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" },
          ].map((q) => (
            <button key={q.path} onClick={() => navigate(q.path)} className={`border rounded-xl px-4 py-3 text-sm font-bold transition-all hover:scale-[1.02] ${q.color}`}>
              {q.label}
            </button>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Recent Orders</h3>
            <button onClick={() => navigate("/admin/orders")} className="text-xs text-yellow-400 font-semibold">View All →</button>
          </div>
          {allOrders.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {allOrders.slice(0, 8).map((order: any) => {
                const si = ORDER_STATE_MAP[order.state as keyof typeof ORDER_STATE_MAP] || ORDER_STATE_MAP[1];
                return (
                  <div key={order.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-white">{order.game_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{order.reference_id || order.order_id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${si.color} ${si.bg}`}>{si.label}</span>
                      <p className="text-sm font-bold text-white">${Number(order.price || 0).toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

