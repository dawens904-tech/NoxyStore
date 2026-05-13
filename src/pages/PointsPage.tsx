/**
 * PointsPage — Real points with Earn / Redeem / Details tabs.
 * Desktop: sidebar layout (photo 1-2-3). Mobile: gold banner + tabs (photo 4-5-6).
 * Points are fetched from orders table (1 point per $1 spent).
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

type PointsTab = "earn" | "redeem" | "details";

// ─── VIP Level from points ─────────────────────────────────────────────────
function getVipLevel(points: number): number {
  if (points >= 3000) return 5;
  if (points >= 1000) return 4;
  if (points >= 500) return 3;
  if (points >= 300) return 2;
  return 1;
}

// ─── Redeem items ─────────────────────────────────────────────────────────
const REDEEM_ITEMS = [
  { id: 1, name: "Genshin/HSR/ZZZ 5% Off Coupon", cost: 1, limit: 999999, redeemed: 0, color: "#f59e0b", vipRequired: 1, icon: "🎟️" },
  { id: 2, name: "Game Keys 15% OFF Coupon", cost: 200, limit: 5, redeemed: 0, color: "#ef4444", vipRequired: 1, icon: "🎟️" },
  { id: 3, name: "FC 26 - 100K Safe Coins", cost: 400, limit: 1, redeemed: 0, color: "#10b981", vipRequired: 1, icon: "🪙" },
  { id: 4, name: "Game Keys 8% OFF Coupon", cost: 100, limit: 5, redeemed: 0, color: "#f97316", vipRequired: 1, icon: "🎟️" },
  { id: 5, name: "5% OFF Coupon", cost: 200, limit: 1, redeemed: 0, color: "#f59e0b", vipRequired: 1, icon: "🎟️" },
  { id: 6, name: "Wuthering Waves - Lunite Subscription", cost: 400, limit: 1, redeemed: 0, color: "#8b5cf6", vipRequired: 1, icon: "🎮" },
  { id: 7, name: "$5.00 OFF Coupon, not applicable to Genshin Impact, Honkai: Star Rail, or Zenless Zone Zero.", cost: 450, limit: 1, redeemed: 0, color: "#10b981", vipRequired: 1, icon: "🎟️" },
  { id: 8, name: "8% OFF coupon, not applicable to Genshin Impact, Honkai: Star Rail, or Zenless Zone Zero.", cost: 500, limit: 1, redeemed: 0, color: "#f97316", vipRequired: 2, icon: "🎟️" },
  { id: 9, name: "$10.00 OFF Coupon, not applicable to Genshin Impact, Honkai: Star Rail, or Zenless Zone Zero.", cost: 900, limit: 1, redeemed: 0, color: "#10b981", vipRequired: 2, icon: "🎟️" },
  { id: 10, name: "$20.00 OFF Coupon, not applicable to Genshin Impact, Honkai: Star Rail, or Zenless Zone Zero.", cost: 1800, limit: 1, redeemed: 0, color: "#10b981", vipRequired: 4, icon: "🎟️" },
  { id: 11, name: "$50.00 off coupon, not applicable to Genshin Impact, Honkai: Star Rail, or Zenless Zone Zero.", cost: 4500, limit: 1, redeemed: 0, color: "#10b981", vipRequired: 5, icon: "🎟️" },
];

// ─── Sidebar (desktop) ──────────────────────────────────────────────────────
function DesktopSidebar({ user, points }: { user: any; points: number }) {
  const navigate = useNavigate();
  const vip = getVipLevel(points);
  const sidebarItems = [
    { label: "Buy History", path: "/account", section: "buyHistory" },
    { label: "Coupon", path: "/account", section: "coupon", badge: "1397" },
    { label: "Settings", path: "/account", section: "settings" },
    { label: "Help Center", path: "/support" },
    { label: "Feedback", path: "/feedback" },
    { label: "Invite for Coupons", path: "/invite" },
    { label: "Affiliate Program", path: "/affiliate", highlight: true },
  ];
  return (
    <div className="w-60 flex-shrink-0">
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white text-lg font-bold">
              {user?.nickname?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm border border-white">
              V{vip}
            </div>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{user?.nickname || user?.email?.split("@")[0]}</p>
            <button onClick={() => navigate("/account")} className="text-xs text-gray-500 flex items-center gap-0.5 hover:text-gray-700">
              Check VIP Benefits <ChevronRight size={12} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 border-t border-gray-100 pt-3">
          <div>
            <p className="text-base font-bold text-gray-900">${user?.balance?.toFixed(2) || "0.00"}</p>
            <p className="text-xs text-gray-500">Balance</p>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div>
            <p className="text-base font-bold text-gray-900 flex items-center gap-1">
              <span className="text-yellow-500">●</span> {points}
            </p>
            <p className="text-xs text-gray-500">Points</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {sidebarItems.map((item, idx) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${item.highlight ? "text-yellow-600 hover:bg-yellow-50" : "text-gray-700 hover:bg-gray-50"}`}
          >
            <span>{item.label}</span>
            {item.badge && <span className="text-gray-400 text-xs">{item.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Earn Points Tab ───────────────────────────────────────────────────────
function EarnTab() {
  const earnWays = [
    { action: "Complete an order", points: "1 point per $1 spent", icon: "🛒" },
    { action: "Daily login", points: "+2 points", icon: "📅" },
    { action: "Invite a friend (they complete order)", points: "+50 points", icon: "👥" },
    { action: "Birthday bonus (VIP members)", points: "+50 points", icon: "🎂" },
    { action: "Write a review", points: "+10 points", icon: "✍️" },
    { action: "First top-up bonus", points: "+100 points", icon: "🎉" },
  ];
  return (
    <div className="py-4">
      <p className="text-sm text-gray-500 mb-5">Earn points through purchases and activities to unlock exclusive rewards.</p>
      <div className="space-y-3">
        {earnWays.map((w) => (
          <div key={w.action} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{w.icon}</span>
              <p className="font-medium text-gray-900 text-sm">{w.action}</p>
            </div>
            <p className="text-sm font-bold text-yellow-600">{w.points}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Redeem Tab ────────────────────────────────────────────────────────────
function RedeemTab({ points, vipLevel }: { points: number; vipLevel: number }) {
  const navigate = useNavigate();
  const handleRedeem = (item: typeof REDEEM_ITEMS[0]) => {
    if (vipLevel < item.vipRequired) {
      toast.error(`VIP ${item.vipRequired} required to redeem this item`);
      return;
    }
    if (points < item.cost) {
      toast.error(`Need ${item.cost - points} more points to redeem`);
      return;
    }
    toast.success(`Redeemed: ${item.name}`);
  };

  const available = REDEEM_ITEMS.filter(i => i.vipRequired <= vipLevel);
  const locked = REDEEM_ITEMS.filter(i => i.vipRequired > vipLevel);

  return (
    <div className="py-4">
      <p className="text-sm font-bold text-gray-900 mb-4">Regular Redeem</p>
      <div className="space-y-3">
        {available.map((item) => {
          const canRedeem = points >= item.cost;
          const needMore = item.cost - points;
          return (
            <div key={item.id} className="border border-gray-100 rounded-lg p-4 flex items-start gap-3">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl bg-gray-50 border border-gray-100 flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-500 text-sm">●</span>
                  <span className="text-sm font-bold text-gray-800">{item.cost}</span>
                </div>
                {!canRedeem && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Need {needMore} more points to redeem{" "}
                    <button onClick={() => navigate("/")} className="text-yellow-600 font-semibold">Go spend &gt;</button>
                  </p>
                )}
                <p className="text-xs text-gray-400">Redeemed {item.redeemed} / {item.limit}</p>
              </div>
              <button
                onClick={() => handleRedeem(item)}
                disabled={!canRedeem}
                className={`text-sm font-bold px-4 py-2 rounded-lg flex-shrink-0 transition-colors ${canRedeem ? "bg-yellow-400 hover:bg-yellow-300 text-black" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              >
                Redeem
              </button>
            </div>
          );
        })}
        {locked.map((item) => (
          <div key={item.id} className="border border-gray-100 rounded-lg p-4 flex items-start gap-3 opacity-70">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl bg-gray-50 border border-gray-100 flex-shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-700 text-sm leading-tight">{item.name}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-500 text-sm">●</span>
                <span className="text-sm font-bold text-gray-600">{item.cost}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded-sm">🔒 V{item.vipRequired}</span>
                <span className="text-xs text-gray-400">Level up to VIP{item.vipRequired} to unlock</span>
              </div>
            </div>
            <button
              onClick={() => navigate("/account")}
              className="text-xs text-gray-400 flex-shrink-0 hover:text-gray-600 flex items-center gap-0.5"
            >
              View <ChevronRight size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-8 bg-gray-50 rounded-xl p-5">
        <p className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <span className="text-yellow-500">●</span> Redemption Instructions
        </p>
        <ol className="space-y-2 text-xs text-gray-600 leading-relaxed list-decimal pl-4">
          <li>After redeeming a coupon with points, please pay attention to the coupon's validity period and use it before it expires.</li>
          <li>Redeeming items like Blessing of the Welkin Moon/100K coins with points means you receive a free redemption voucher. You need to place a new order and pay $0.00 to receive the item.</li>
          <li>The redemption limit for certain items will reset periodically: every 30 days for Blessing of the Welkin Moon, Express Supply Pass, Inter-Knot Membership, Lunite Subscription, and every 90 days for 8% OFF coupon.</li>
          <li>After reaching higher VIP levels, you will unlock more redemption opportunities. The higher your level, the more you can redeem.</li>
        </ol>
      </div>
    </div>
  );
}

// ─── Details Tab ───────────────────────────────────────────────────────────
function DetailsTab({ userEmail }: { userEmail: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) { setIsLoading(false); return; }
    supabase
      .from("orders")
      .select("reference_id, order_id, price, created_at, state")
      .eq("user_email", userEmail)
      .eq("state", 2)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          let runningBalance = 0;
          const items = data.map(o => {
            const pts = Math.floor((o.price || 0));
            return { ...o, pts_earned: pts };
          });
          // Calculate running balances
          const withBalance = [...items].reverse().map(o => {
            runningBalance += o.pts_earned;
            return { ...o, running_balance: runningBalance };
          }).reverse();
          setHistory(withBalance);
        }
        setIsLoading(false);
      });
  }, [userEmail]);

  if (isLoading) return (
    <div className="py-8 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
    </div>
  );

  if (history.length === 0) return (
    <div className="py-16 text-center">
      <p className="text-gray-400 text-sm">No points history yet. Complete your first order to earn points!</p>
    </div>
  );

  return (
    <div className="py-4 space-y-0 divide-y divide-gray-100">
      {history.map((item, idx) => (
        <div key={item.reference_id || idx} className="py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900 text-sm">Consumption gained</p>
              <p className="text-xs text-gray-500 mt-0.5">ID: {item.order_id || item.reference_id}</p>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
            </div>
            <div className="text-right">
              <p className="text-orange-500 font-bold text-base">+{item.pts_earned}</p>
              <p className="text-xs text-gray-500 mt-0.5">Points Balance: {item.running_balance}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function PointsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<PointsTab>("earn");
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user?.email) { setIsLoading(false); return; }
    supabase
      .from("orders")
      .select("price")
      .eq("user_email", user.email)
      .eq("state", 2)
      .then(({ data }) => {
        if (data) {
          const total = data.reduce((acc, o) => acc + Math.floor(o.price || 0), 0);
          setPoints(total);
        }
        setIsLoading(false);
      });
  }, [user, isAuthenticated]);

  const vipLevel = getVipLevel(points);

  // ─── Desktop ──────────────────────────────────────────────────────────────
  const DesktopLayout = () => (
    <div className="hidden lg:block min-h-screen bg-[#f5f5f5]">
      <DesktopHeader />
      {/* Breadcrumb */}
      <div className="max-w-[1280px] mx-auto px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Home</button>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium">Points</span>
        </div>
      </div>
      <div className="max-w-[1280px] mx-auto px-6 pb-12 flex gap-6 items-start">
        <DesktopSidebar user={user} points={points} />
        {/* Main content */}
        <div className="flex-1">
          {/* Points banner */}
          <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
            <div className="px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-gray-700 mb-1">Points</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl text-yellow-500">●</span>
                  <span className="text-4xl font-black text-gray-900">{isLoading ? "..." : points}</span>
                </div>
              </div>
              {/* Gold coin decoration */}
              <div className="absolute right-0 top-0 bottom-0 w-48 overflow-hidden opacity-20 pointer-events-none">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-yellow-400" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-yellow-300" />
              </div>
              <div className="w-32 h-24 flex items-center justify-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center shadow-lg">
                    <span className="text-white font-black text-2xl">P</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-200 opacity-60" />
                </div>
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex border-b border-gray-100">
              {(["earn", "redeem", "details"] as PointsTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-6 py-4 text-sm font-semibold capitalize transition-colors relative ${tab === t ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {t === "earn" ? "Earn Points" : t === "redeem" ? "Redeem" : "Details"}
                  {tab === t && <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-yellow-400 rounded-full" />}
                </button>
              ))}
            </div>
            <div className="px-6">
              {tab === "earn" && <EarnTab />}
              {tab === "redeem" && <RedeemTab points={points} vipLevel={vipLevel} />}
              {tab === "details" && <DetailsTab userEmail={user?.email || ""} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Mobile ───────────────────────────────────────────────────────────────
  const MobileLayout = () => (
    <div className="lg:hidden min-h-screen bg-[#f2f2f7] pb-20">
      {/* Mobile header */}
      <div className="bg-black sticky top-0 z-40 flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft size={20} />
        </button>
        <p className="text-white font-bold">Points</p>
        <div className="w-8" />
      </div>
      {/* Gold banner */}
      <div className="relative bg-gradient-to-br from-yellow-500 via-yellow-400 to-amber-500 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-yellow-300" />
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-amber-200" />
        </div>
        <div className="px-4 py-6 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            {/* 3D coin illustration */}
            <div className="w-20 h-20 flex items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-600 shadow-2xl flex items-center justify-center border-4 border-yellow-300">
                  <span className="text-yellow-900 font-black text-2xl">P</span>
                </div>
                <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-yellow-100 opacity-80" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-600 opacity-60" />
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm font-semibold">Points</p>
            <p className="text-white font-black text-5xl">{isLoading ? "..." : points}</p>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex">
        {(["earn", "redeem", "details"] as PointsTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${tab === t ? "text-gray-900 font-bold" : "text-gray-500"}`}
          >
            {t === "earn" ? "Earn Points" : t === "redeem" ? "Redeem" : "Details"}
            {tab === t && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-yellow-400 rounded-full" />}
          </button>
        ))}
      </div>
      <div className="px-4">
        {tab === "earn" && <EarnTab />}
        {tab === "redeem" && <RedeemTab points={points} vipLevel={vipLevel} />}
        {tab === "details" && <DetailsTab userEmail={user?.email || ""} />}
      </div>
      <BottomNav />
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f5] px-4">
        <p className="text-gray-500 mb-4">Please log in to view your points</p>
        <button onClick={() => navigate("/login")} className="bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl">Login</button>
      </div>
    );
  }

  return (
    <>
      <DesktopLayout />
      <MobileLayout />
    </>
  );
}
