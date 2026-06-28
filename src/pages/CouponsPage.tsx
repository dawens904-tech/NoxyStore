import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Tag, ChevronRight, Loader2, Check, X, Plus, ChevronDown } from "lucide-react";
import { AccountSidebar } from "@/components/features/AccountSidebar";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";
import { SupportChatButton } from "@/components/features/SupportChatButton";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  type: string;
  discount_value: number;
  max_discount: number | null;
  min_order: number;
  description: string;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ─── Desktop Coupon Card (LootBar style) ─────────────────────────────────────
function DesktopCouponCard({ coupon, onUse }: { coupon: Coupon; onUse: (c: Coupon) => void }) {
  const days = daysUntil(coupon.expires_at);
  const isExpired = days === 0;
  const isUsed = coupon.is_used;
  const isActive = !isUsed && !isExpired;

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${isActive ? "border-gray-200 bg-white hover:shadow-md" : "border-gray-100 bg-gray-50 opacity-70"}`}>
      <div className="p-5 flex items-start gap-4 relative overflow-hidden">
        {/* Decorative background circle */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gray-50 opacity-50 pointer-events-none" />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-2xl font-black ${isActive ? "text-yellow-500" : "text-gray-400"}`}>
              {coupon.discount_value}% OFF
            </span>
            {coupon.max_discount && (
              <span className="text-gray-500 text-sm">(Up to ${coupon.max_discount.toFixed(2)})</span>
            )}
          </div>
          <p className="text-gray-600 text-sm">Valid for orders over ${coupon.min_order?.toFixed(2) || "0.01"}</p>
          <p className="text-gray-800 font-semibold text-sm mt-1">{coupon.description || "Discount Coupon"}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <span>Valid until: {new Date(coupon.expires_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            {isActive && days <= 3 && <span className="text-orange-500 font-semibold ml-1">({days}d left)</span>}
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {isActive ? (
            <button onClick={() => onUse(coupon)}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm px-5 py-2 transition-colors rounded">
              Use
            </button>
          ) : isUsed ? (
            <span className="text-gray-400 text-sm font-semibold border border-gray-300 px-4 py-1.5 rounded">Used</span>
          ) : (
            <span className="text-gray-400 text-sm font-semibold border border-gray-300 px-4 py-1.5 rounded">Expired</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Coupon Card ───────────────────────────────────────────────────────
function MobileCouponCard({ coupon, onUse }: { coupon: Coupon; onUse: (c: Coupon) => void }) {
  const days = daysUntil(coupon.expires_at);
  const isExpired = days === 0;
  const isUsed = coupon.is_used;
  const isActive = !isUsed && !isExpired;

  return (
    <div className={`bg-white border overflow-hidden ${isActive ? "border-orange-100" : "border-gray-100 opacity-60"}`}>
      <div className="flex items-center gap-4 p-4 pb-3 relative overflow-hidden">
        <div className="absolute right-2 top-0 bottom-0 w-20 opacity-10 flex items-center">
          <div className="w-16 h-16 rounded-full bg-yellow-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className={`font-black text-xl leading-none ${isActive ? "text-orange-500" : "text-gray-400"}`}>
              {coupon.discount_value}% OFF
            </p>
            {coupon.max_discount && (
              <span className="text-gray-500 text-xs">(Up to ${coupon.max_discount.toFixed(2)})</span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-1">Valid for orders over ${coupon.min_order?.toFixed(2) || "0.01"}</p>
          <p className="text-gray-800 font-bold text-sm mt-0.5">{coupon.description || "Discount Coupon"}</p>
        </div>
      </div>
      <div className="border-t border-dashed border-orange-100 mx-4" />
      <div className="px-4 py-3 flex items-center justify-between">
        <p className={`text-xs font-medium ${isExpired ? "text-red-400" : days <= 3 ? "text-orange-500" : "text-gray-400"}`}>
          {isUsed ? "Used" : isExpired ? "Expired" : `Expires in ${days} day${days !== 1 ? "s" : ""}`}
        </p>
        {isActive && (
          <button onClick={() => onUse(coupon)}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs px-4 py-2 transition-colors">
            Use
          </button>
        )}
        {isUsed && <span className="flex items-center gap-1 text-green-600 text-xs font-semibold"><Check size={12} /> Used</span>}
        {isExpired && !isUsed && <span className="text-gray-400 text-xs font-semibold">Expired</span>}
      </div>
    </div>
  );
}



export function CouponsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    loadCoupons();
    checkAndGrantNewUserCoupons();
  }, [isAuthenticated]);

  const loadCoupons = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("user_coupons").select("*").eq("user_email", user?.email)
      .order("created_at", { ascending: false });
    if (data) setCoupons(data as Coupon[]);
    setIsLoading(false);
  };

  const checkAndGrantNewUserCoupons = async () => {
    if (!user?.email) return;
    const { count } = await supabase.from("user_coupons").select("id", { count: "exact", head: true }).eq("user_email", user.email);
    if (count === 0) {
      const expires14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("user_coupons").insert([
        { user_email: user.email, code: `NEWUSER10-${Date.now()}`, type: "percent", discount_value: 10, max_discount: 10.00, min_order: 0.01, description: "New User 10% OFF Coupon", expires_at: expires14 },
        { user_email: user.email, code: `NEWUSER6-${Date.now()}`, type: "percent", discount_value: 6, max_discount: 6.00, min_order: 0.01, description: "New User 6% OFF Coupon", expires_at: expires14 },
      ]);
      loadCoupons();
    }
  };

  const handleUseCoupon = (coupon: Coupon) => {
    sessionStorage.setItem("pending_coupon", JSON.stringify(coupon));
    toast.success("Coupon selected! It will be applied at checkout.");
    navigate("/");
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setIsRedeeming(true);
    const { data: adminCode } = await supabase.from("admin_redeem_codes").select("*").eq("code", redeemCode.trim().toUpperCase()).eq("is_active", true).single();
    if (!adminCode) { toast.error("Invalid or expired redeem code"); setIsRedeeming(false); return; }
    if (adminCode.used_count >= adminCode.max_uses) { toast.error("This code has reached its usage limit"); setIsRedeeming(false); return; }
    const { count } = await supabase.from("user_coupons").select("id", { count: "exact", head: true }).eq("user_email", user?.email).eq("code", redeemCode.trim().toUpperCase());
    if (count && count > 0) { toast.error("You already used this code"); setIsRedeeming(false); return; }
    const expires = adminCode.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("user_coupons").insert({ user_email: user?.email, code: redeemCode.trim().toUpperCase(), type: adminCode.type === "coupon" ? "percent" : adminCode.type, discount_value: adminCode.value, min_order: 0.01, description: `Redeemed: ${redeemCode.trim().toUpperCase()}`, expires_at: expires });
    await supabase.from("admin_redeem_codes").update({ used_count: (adminCode.used_count || 0) + 1 }).eq("id", adminCode.id);
    toast.success("Code redeemed successfully!");
    setRedeemCode(""); loadCoupons(); setIsRedeeming(false);
  };

  const activeCoupons = coupons.filter(c => !c.is_used && daysUntil(c.expires_at) > 0);
  const usedExpiredCoupons = coupons.filter(c => c.is_used || daysUntil(c.expires_at) === 0);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="hidden lg:block"><DesktopHeader /></div>
      <div className="lg:hidden"><Header showBack title={t("coupons")} /></div>

      {/* ── Desktop Layout ── */}
      <div className="hidden lg:block max-w-[1280px] mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Home</button>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium">Coupon</span>
        </div>
        <div className="flex gap-6 items-start">
          <AccountSidebar activePage="coupon" className="sticky top-[72px] self-start" />

          {/* Main content */}
          <div className="flex-1">
            <div className="bg-white shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">
                  Coupon({activeCoupons.length})
                </h2>
                {/* Redeem input */}
                <div className="flex items-center gap-2">
                  <input type="text" value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                    placeholder="Please enter the redeem code."
                    className="border border-gray-200 px-4 py-2 text-sm text-gray-700 outline-none focus:border-yellow-400 w-56" />
                  <button onClick={handleRedeem} disabled={!redeemCode.trim() || isRedeeming}
                    className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2 text-sm disabled:opacity-50 transition-colors">
                    {isRedeeming ? <Loader2 size={14} className="animate-spin" /> : "Redeem"}
                  </button>
                </div>
              </div>

              {/* Coupon list */}
              <div className="px-6 py-5">
                {isLoading ? (
                  <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded" />)}</div>
                ) : activeCoupons.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-20 h-20 mb-4 opacity-20">
                      <svg viewBox="0 0 80 80" className="w-full h-full">
                        <path d="M10 30 L40 10 L70 30 L70 70 L10 70 Z" fill="none" stroke="#9ca3af" strokeWidth="3" strokeLinejoin="round"/>
                        <line x1="30" y1="40" x2="50" y2="40" stroke="#9ca3af" strokeWidth="2"/>
                        <line x1="30" y1="48" x2="50" y2="48" stroke="#9ca3af" strokeWidth="2"/>
                        <line x1="30" y1="56" x2="42" y2="56" stroke="#9ca3af" strokeWidth="2"/>
                      </svg>
                    </div>
                    <p className="text-gray-400 font-medium text-sm">No Available Coupons</p>
                    <button onClick={() => navigate("/invite")} className="mt-4 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm px-6 py-2.5 transition-colors">
                      Invite Friends to Earn Coupons
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeCoupons.map(c => <DesktopCouponCard key={c.id} coupon={c} onUse={handleUseCoupon} />)}
                  </div>
                )}
              </div>

              {/* View Expired Coupons toggle */}
              {usedExpiredCoupons.length > 0 && (
                <div className="border-t border-gray-100">
                  <button onClick={() => setShowExpired(!showExpired)}
                    className="w-full flex items-center justify-center gap-2 py-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    View Expired Coupons
                    <ChevronDown size={14} className={`transition-transform ${showExpired ? "rotate-180" : ""}`} />
                  </button>
                  {showExpired && (
                    <div className="px-6 pb-5 space-y-3 border-t border-gray-50">
                      <p className="text-xs text-gray-400 pt-4">Expired / Used Coupons</p>
                      {usedExpiredCoupons.map(c => <DesktopCouponCard key={c.id} coupon={c} onUse={handleUseCoupon} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Layout ── */}
      <div className="lg:hidden pb-24">
        <div className="px-4 pt-4">
          {/* Redeem code */}
          <div className="flex gap-2 mb-5">
            <input type="text" value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="Enter redeem code"
              className="flex-1 bg-white border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-yellow-400" />
            <button onClick={handleRedeem} disabled={!redeemCode.trim() || isRedeeming}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-3 text-sm disabled:opacity-50">
              {isRedeeming ? <Loader2 size={14} className="animate-spin" /> : "Redeem"}
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white h-28 animate-pulse" />)}</div>
          ) : activeCoupons.length === 0 && usedExpiredCoupons.length === 0 ? (
            <div className="bg-white p-12 text-center">
              <Tag size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No coupons yet</p>
              <button onClick={() => navigate("/invite")} className="mt-4 bg-yellow-400 text-black font-bold text-sm px-6 py-2.5">
                Invite Friends
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCoupons.map(c => <MobileCouponCard key={c.id} coupon={c} onUse={handleUseCoupon} />)}
              {usedExpiredCoupons.length > 0 && (
                <>
                  <button onClick={() => setShowExpired(!showExpired)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-400 bg-white border border-gray-100">
                    View Expired Coupons <ChevronDown size={14} className={`transition-transform ${showExpired ? "rotate-180" : ""}`} />
                  </button>
                  {showExpired && usedExpiredCoupons.map(c => <MobileCouponCard key={c.id} coupon={c} onUse={handleUseCoupon} />)}
                </>
              )}
            </div>
          )}
        </div>
        <BottomNav />
      </div>

      <SupportChatButton />
    </div>
  );
}
