import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Tag, ChevronRight, Loader2, Check } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import coupon10off from "@/assets/coupon-10off.png";
import coupon6off from "@/assets/coupon-6off.png";
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

function CouponCard({ coupon, onUse }: { coupon: Coupon; onUse: (c: Coupon) => void }) {
  const days = daysUntil(coupon.expires_at);
  const isExpired = days === 0;
  const img = coupon.discount_value >= 10 ? coupon10off : coupon6off;

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${isExpired || coupon.is_used ? "border-gray-100 opacity-60" : "border-orange-100"}`}>
      <div className="flex items-center gap-4 p-4 pb-3">
        <img src={img} alt={`${coupon.discount_value}% OFF`} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-orange-500 font-black text-2xl leading-none">
              {coupon.discount_value}% OFF
            </p>
            {coupon.max_discount && (
              <span className="text-gray-500 text-sm font-medium">(Up to ${coupon.max_discount.toFixed(2)})</span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-1">Valid for orders over ${coupon.min_order.toFixed(2)}</p>
          <p className="text-gray-900 font-bold text-sm mt-0.5">
            {coupon.description || `New User ${coupon.discount_value}% OFF Coupon`}
          </p>
          <button className="flex items-center gap-0.5 mt-0.5">
            <span className="text-xs text-gray-400">Coupon rules</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          </button>
        </div>
      </div>
      <div className="border-t border-dashed border-orange-100 mx-4" />
      <div className="px-4 py-3 flex items-center justify-between">
        <p className={`text-sm font-medium ${isExpired ? "text-red-400" : days <= 3 ? "text-orange-500" : "text-gray-500"}`}>
          {coupon.is_used ? "Used" : isExpired ? "Expired" : `Expires in ${days} day${days !== 1 ? "s" : ""}`}
        </p>
        {!coupon.is_used && !isExpired && (
          <button
            onClick={() => onUse(coupon)}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm px-5 py-2 rounded-xl transition-colors"
          >
            Use
          </button>
        )}
        {coupon.is_used && (
          <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
            <Check size={14} /> Used
          </span>
        )}
      </div>
    </div>
  );
}

export function CouponsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    loadCoupons();
    // Auto-grant new user coupons if they have none
    checkAndGrantNewUserCoupons();
  }, [isAuthenticated]);

  const loadCoupons = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("user_coupons")
      .select("*")
      .eq("user_email", user?.email)
      .order("created_at", { ascending: false });
    if (data) setCoupons(data as Coupon[]);
    setIsLoading(false);
  };

  const checkAndGrantNewUserCoupons = async () => {
    if (!user?.email) return;
    const { count } = await supabase
      .from("user_coupons")
      .select("id", { count: "exact", head: true })
      .eq("user_email", user.email);
    if (count === 0) {
      // Grant new user coupons
      const expires14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("user_coupons").insert([
        {
          user_email: user.email,
          code: `NEWUSER10-${Date.now()}`,
          type: "percent",
          discount_value: 10,
          max_discount: 10.00,
          min_order: 0.01,
          description: "New User 10% OFF Coupon",
          expires_at: expires14,
        },
        {
          user_email: user.email,
          code: `NEWUSER6-${Date.now()}`,
          type: "percent",
          discount_value: 6,
          max_discount: 6.00,
          min_order: 0.01,
          description: "New User 6% OFF Coupon",
          expires_at: expires14,
        },
      ]);
      loadCoupons();
    }
  };

  const handleUseCoupon = (coupon: Coupon) => {
    // Store selected coupon in sessionStorage and navigate to home
    sessionStorage.setItem("pending_coupon", JSON.stringify(coupon));
    toast.success("Coupon selected! It will be applied at checkout.");
    navigate("/");
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setIsRedeeming(true);
    const { data: adminCode } = await supabase
      .from("admin_redeem_codes")
      .select("*")
      .eq("code", redeemCode.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (!adminCode) {
      toast.error("Invalid or expired redeem code");
      setIsRedeeming(false);
      return;
    }

    if (adminCode.used_count >= adminCode.max_uses) {
      toast.error("This code has reached its usage limit");
      setIsRedeeming(false);
      return;
    }

    // Check if user already used this code
    const { count } = await supabase
      .from("user_coupons")
      .select("id", { count: "exact", head: true })
      .eq("user_email", user?.email)
      .eq("code", redeemCode.trim().toUpperCase());

    if (count && count > 0) {
      toast.error("You already used this code");
      setIsRedeeming(false);
      return;
    }

    const expires = adminCode.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("user_coupons").insert({
      user_email: user?.email,
      code: redeemCode.trim().toUpperCase(),
      type: adminCode.type === "coupon" ? "percent" : adminCode.type,
      discount_value: adminCode.value,
      min_order: 0.01,
      description: `Redeemed: ${redeemCode.trim().toUpperCase()}`,
      expires_at: expires,
    });

    await supabase.from("admin_redeem_codes").update({ used_count: (adminCode.used_count || 0) + 1 }).eq("id", adminCode.id);

    toast.success("Code redeemed successfully!");
    setRedeemCode("");
    loadCoupons();
    setIsRedeeming(false);
  };

  const activeCoupons = coupons.filter((c) => !c.is_used && daysUntil(c.expires_at) > 0);
  const usedExpired = coupons.filter((c) => c.is_used || daysUntil(c.expires_at) === 0);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="hidden lg:block"><DesktopHeader /></div>
      <div className="lg:hidden"><Header showBack title="Coupon" /></div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 lg:pb-8">
        {/* Redeem code */}
        <div className="flex gap-3 mb-5">
          <input
            type="text"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            placeholder="Please enter the redeem code."
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-yellow-400"
          />
          <button
            onClick={handleRedeem}
            disabled={!redeemCode.trim() || isRedeeming}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {isRedeeming ? <Loader2 size={16} className="animate-spin" /> : "Redeem"}
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />)}
          </div>
        ) : (
          <>
            {activeCoupons.length === 0 && usedExpired.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <Tag size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No coupons yet</p>
                <p className="text-gray-400 text-sm mt-1">Register to receive new user coupons</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeCoupons.map((c) => (
                  <CouponCard key={c.id} coupon={c} onUse={handleUseCoupon} />
                ))}
                {usedExpired.length > 0 && (
                  <>
                    <p className="text-sm font-semibold text-gray-400 mt-6 mb-2">Used / Expired</p>
                    {usedExpired.map((c) => (
                      <CouponCard key={c.id} coupon={c} onUse={handleUseCoupon} />
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="lg:hidden"><BottomNav /></div>
    </div>
  );
}
