/**
 * VipBenefitsPage — NoxyStore VIP Benefits.
 * Each VIP tier has a unique photo placeholder + colors.
 * No emoji icons — all SVG/lucide.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, X, ChevronDown, Info, ChevronRight,
  Gift, Coins, Ticket, ShoppingBag, Crown, Zap,
  Tag, TrendingUp, Star, Rocket, Lock, Check
} from "lucide-react";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import vip1Bg from "@/assets/vip1-bg.jpg";
import vip2Bg from "@/assets/vip2-bg.jpg";
import vip3Bg from "@/assets/vip3-bg.jpg";
import vip4Bg from "@/assets/vip4-bg.jpg";
import vip5Bg from "@/assets/vip5-bg.jpg";

// VIP level visual configs
const VIP_META: Record<number, {
  name: string; tagline: string;
  gradient: string; headerGrad: string;
  badgeBg: string; badgeText: string;
  photo: string;
  textColor: string;
}> = {
  1: {
    name: "Silver", tagline: "Your journey begins here",
    gradient: "from-slate-400 to-slate-600",
    headerGrad: "from-slate-200 via-slate-100 to-gray-50",
    badgeBg: "bg-slate-500", badgeText: "text-white",
    photo: vip1Bg,
    textColor: "text-slate-800",
  },
  2: {
    name: "Gold", tagline: "Unlock extra savings",
    gradient: "from-amber-400 to-yellow-600",
    headerGrad: "from-amber-200 via-yellow-100 to-amber-50",
    badgeBg: "bg-amber-500", badgeText: "text-white",
    photo: vip2Bg,
    textColor: "text-amber-900",
  },
  3: {
    name: "Emerald", tagline: "More points, more power",
    gradient: "from-emerald-400 to-green-600",
    headerGrad: "from-emerald-200 via-green-100 to-emerald-50",
    badgeBg: "bg-emerald-600", badgeText: "text-white",
    photo: vip3Bg,
    textColor: "text-emerald-900",
  },
  4: {
    name: "Diamond", tagline: "Exclusive concierge service",
    gradient: "from-violet-500 to-purple-700",
    headerGrad: "from-violet-200 via-purple-100 to-violet-50",
    badgeBg: "bg-violet-600", badgeText: "text-white",
    photo: vip4Bg,
    textColor: "text-violet-900",
  },
  5: {
    name: "Legendary", tagline: "The ultimate NoxyStore experience",
    gradient: "from-red-500 to-rose-800",
    headerGrad: "from-red-200 via-rose-100 to-red-50",
    badgeBg: "bg-red-700", badgeText: "text-white",
    photo: vip5Bg,
    textColor: "text-red-900",
  },
};

function getVipLevel(points: number) {
  if (points >= 3000) return 5;
  if (points >= 1000) return 4;
  if (points >= 500) return 3;
  if (points >= 300) return 2;
  return 1;
}

function getNextThreshold(points: number) {
  if (points >= 3000) return 3000;
  if (points >= 1000) return 3000;
  if (points >= 500) return 1000;
  if (points >= 300) return 500;
  return 300;
}

const BENEFIT_ICON_MAP: Record<string, React.ReactNode> = {
  birthday:          <Gift size={24} />,
  point_money:       <Coins size={24} />,
  points_coupon:     <Ticket size={24} />,
  points_item:       <ShoppingBag size={24} />,
  vip_service:       <Crown size={24} />,
  fast_delivery:     <Zap size={24} />,
  higher_discount:   <Tag size={24} />,
  more_points:       <TrendingUp size={24} />,
  exclusive_service: <Star size={24} />,
  priority_delivery: <Rocket size={24} />,
};

const BENEFITS = [
  { id: "birthday", label: "Birthday Gift", vipMin: 1, description: "Receive birthday gifts automatically on your registered birthday:\n\n• VIP 1 — 5% discount coupon + 50 points\n• VIP 2 — 8% discount coupon + 80 points\n• VIP 3 — 10% discount coupon + 120 points\n• VIP 4 — 15% discount coupon + 200 points\n• VIP 5 — 20% discount coupon + 500 points\n\nGifts are sent on your birthday date. Set your birthday in Account Settings to activate.", type: "birthday" },
  { id: "point_money", label: "Point as Money", vipMin: 1, description: "Use your accumulated points as cash at checkout:\n\n• VIP 1 — 100 pts = $1.00\n• VIP 2 — 95 pts = $1.00\n• VIP 3 — 90 pts = $1.00\n• VIP 4 — 85 pts = $1.00\n• VIP 5 — 80 pts = $1.00\n\nHigher VIP level = better conversion rate." },
  { id: "points_coupon", label: "Points Coupon", vipMin: 1, description: "Redeem exclusive discount coupons using your points:\n\n• VIP 1 — Coupons up to 5% off\n• VIP 2 — Coupons up to 8% off\n• VIP 3 — Coupons up to 10% off\n• VIP 4 — Coupons up to 15% off\n• VIP 5 — Coupons up to 20% off" },
  { id: "points_item", label: "Points Item", vipMin: 1, description: "Redeem exclusive in-game items with your points:\n\n• VIP 1 — Basic game passes and starter items\n• VIP 2 — Mid-tier game items and subscriptions\n• VIP 3 — Premium game bundles\n• VIP 4 — Rare limited items and exclusive bundles\n• VIP 5 — All items + exclusive NoxyStore special edition packs" },
  { id: "vip_service", label: "VIP Service", vipMin: 1, description: "Priority customer support based on VIP level:\n\n• VIP 1 — Standard support, 24h response\n• VIP 2 — Priority queue, 12h response\n• VIP 3 — VIP queue, 6h response\n• VIP 4 — Dedicated agent, 2h response\n• VIP 5 — Instant response + personal account manager" },
  { id: "fast_delivery", label: "Fast Delivery", vipMin: 1, description: "Faster order processing for all VIP members:\n\n• VIP 1 — Standard processing, 3-5 minutes\n• VIP 2 — Priority processing, 2-3 minutes\n• VIP 3 — Fast lane, under 2 minutes\n• VIP 4 — Express lane, under 1 minute\n• VIP 5 — Instant delivery with real-time tracking" },
  { id: "higher_discount", label: "Higher Discount", vipMin: 2, description: "Extra base discount applied to all purchases:\n\n• VIP 2 — Extra 1% off all orders\n• VIP 3 — Extra 2% off all orders\n• VIP 4 — Extra 3% off all orders\n• VIP 5 — Extra 5% off all orders\n\nStacks with sale prices, coupons, and seasonal promotions." },
  { id: "more_points", label: "More Points", vipMin: 3, description: "Earn bonus points multiplier on every purchase:\n\n• VIP 3 — 1.2× point multiplier\n• VIP 4 — 1.5× point multiplier\n• VIP 5 — 2.0× point multiplier (double points!)" },
  { id: "exclusive_service", label: "Exclusive Service", vipMin: 4, description: "Premium concierge experience for top-tier members:\n\n• VIP 4 — Dedicated support agent + concierge top-up assistance\n• VIP 5 — White-glove service with direct senior support line\n\nIncludes: Priority dispute resolution, exclusive order assistance, early access to new games." },
  { id: "priority_delivery", label: "Priority Delivery", vipMin: 4, description: "Highest priority order processing in the queue:\n\n• VIP 4 — Orders jump to front of processing queue\n• VIP 5 — Guaranteed fastest delivery SLA\n\nVIP 5 Guarantee: If your order takes more than 5 minutes, you automatically receive a 5% compensation coupon." },
];

const FAQ_ITEMS = [
  { q: "NoxyStore Membership Level", a: "The membership levels of NoxyStore are divided into VIP1–VIP5.\n\nEach VIP level requires a successful transaction within the last 3 months:\n\nVIP1: Successfully complete 1 order\nVIP2: Accumulate at least 300 points\nVIP3: Accumulate at least 500 points\nVIP4: Accumulate at least 1000 points\nVIP5: Accumulate at least 3000 points", hasCheckLevel: true },
  { q: "NoxyStore Membership Upgrade/Downgrade Rules", a: "VIP membership is evaluated monthly. If your points fall below the threshold for your current VIP level during any 3-month period, your level may be downgraded at the next evaluation cycle.\n\nUpgrading happens automatically when you meet the requirements for the next level — no manual action needed." },
  { q: "NoxyStore Membership Validity Rules", a: "VIP status is valid for 3 months from the date of your last qualifying transaction.\n\nTo maintain your VIP status:\n• Complete at least 1 order every 3 months\n• Maintain the minimum points for your current level\n• Validity automatically extends with each qualifying order" },
  { q: "NoxyStore Membership FAQ", a: "Q: Can I lose my VIP status?\nA: Yes, if you do not complete a transaction within 3 months or fall below the minimum points for your level.\n\nQ: Are points transferable?\nA: No, points are non-transferable and tied to your account.\n\nQ: When do my points expire?\nA: Points do not expire as long as your account remains active with at least one order every 6 months." },
];

// ── Real metallic VIP badge SVG ─────────────────────────────────────────────
function VipBadge({ level, size = 28 }: { level: number; size?: number }) {
  const colors: Record<number, { outer: string; inner: string; text: string }> = {
    1: { outer: "#94a3b8", inner: "#cbd5e1", text: "#334155" },
    2: { outer: "#f59e0b", inner: "#fcd34d", text: "#78350f" },
    3: { outer: "#10b981", inner: "#6ee7b7", text: "#064e3b" },
    4: { outer: "#8b5cf6", inner: "#c4b5fd", text: "#4c1d95" },
    5: { outer: "#dc2626", inner: "#fca5a5", text: "#450a0a" },
  };
  const c = colors[level] || colors[1];
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id={`vbg${level}`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={c.inner} />
          <stop offset="100%" stopColor={c.outer} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="8" fill={`url(#vbg${level})`} />
      <rect x="2" y="2" width="36" height="36" rx="8" fill="none" stroke={c.outer} strokeWidth="2" />
      <text x="20" y="15" textAnchor="middle" fill={c.text} fontWeight="900" fontSize="7" fontFamily="system-ui">V{level}</text>
      <text x="20" y="27" textAnchor="middle" fill={c.text} fontWeight="700" fontSize="5.5" fontFamily="system-ui">
        {["SILVER","GOLD","EMERALD","DIAMOND","LEGENDARY"][level - 1]}
      </text>
    </svg>
  );
}

export function VipBenefitsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [points, setPoints] = useState(0);
  const [joinDate, setJoinDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [benefitModal, setBenefitModal] = useState<typeof BENEFITS[0] | null>(null);
  const [validityModal, setValidityModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeVip, setActiveVip] = useState(1);

  useEffect(() => {
    if (!isAuthenticated || !user?.email) { setIsLoading(false); return; }
    supabase.from("orders").select("price, created_at").eq("user_email", user.email).eq("state", 2)
      .then(({ data }) => {
        if (data) {
          const total = data.reduce((acc, o) => acc + Math.floor(o.price || 0), 0);
          setPoints(total);
          if (data.length > 0) {
            const oldest = [...data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
            setJoinDate(new Date(oldest.created_at));
          }
        }
        setIsLoading(false);
      });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.created_at) setJoinDate(new Date(data.user.created_at));
    });
  }, [user, isAuthenticated]);

  const vipLevel = getVipLevel(points);
  const nextThreshold = getNextThreshold(points);
  const pointsNeeded = Math.max(0, nextThreshold - points);
  const meta = VIP_META[activeVip] || VIP_META[1];

  const validUntil = joinDate
    ? new Date(joinDate.getTime() + 90 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const validityStr = validUntil.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ── VIP tier card ──────────────────────────────────────────────────────────
  const VipTierCard = ({ level }: { level: number }) => {
    const m = VIP_META[level] || VIP_META[1];
    const isUser = level === vipLevel;
    const isLocked = level > vipLevel;
    return (
      <div className={`relative rounded-2xl overflow-hidden border-2 transition-all ${isUser ? "border-yellow-400 shadow-lg" : "border-white/20"}`}
        style={{ minWidth: 240 }}>
        {/* Background photo */}
        <img src={m.photo} alt={`VIP ${level}`} className="absolute inset-0 w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-gradient-to-b ${isLocked ? "from-black/70 to-black/80" : "from-black/40 to-black/60"}`} />
        <div className="relative z-10 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <VipBadge level={level} size={36} />
              <div>
                <p className="text-white font-black text-lg">VIP {level}</p>
                <p className="text-white/70 text-xs font-medium">{m.name}</p>
              </div>
            </div>
            {isLocked && (
              <div className="flex items-center gap-1 bg-black/40 rounded-lg px-2 py-1">
                <Lock size={11} className="text-white/60" />
                <span className="text-white/60 text-[10px] font-semibold">Locked</span>
              </div>
            )}
          </div>
          <p className="text-white/80 text-xs leading-relaxed mb-3">{m.tagline}</p>
          {isUser && !isLocked && (
            <div className="flex items-center justify-between">
              <button onClick={() => setValidityModal(true)} className="flex items-center gap-1 text-white/60 text-[11px]">
                <Info size={11} />
                <span>Valid until {validityStr}</span>
              </button>
            </div>
          )}
          {isUser && level < 5 && (
            <div className="mt-2">
              <p className="text-white/60 text-[11px] mb-1">{pointsNeeded} pts to VIP {level + 1}</p>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.min(100, (points / nextThreshold) * 100)}%` }} />
              </div>
            </div>
          )}
          {isLocked && (
            <button onClick={() => { setBenefitModal(null); navigate("/points"); }}
              className="mt-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-xl border border-white/20 transition-colors">
              Upgrade to Unlock
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Benefit card ───────────────────────────────────────────────────────────
  const BenefitCard = ({ benefit }: { benefit: typeof BENEFITS[0] }) => {
    const isLocked = benefit.vipMin > vipLevel;
    return (
      <button onClick={() => setBenefitModal(benefit)}
        className={`relative border rounded-xl p-4 flex items-center justify-between text-left transition-all hover:shadow-md ${isLocked ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white"}`}>
        {isLocked && (
          <div className="absolute top-2 left-2 bg-gray-200 text-gray-600 text-[9px] font-black px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
            <Lock size={8} /> V{benefit.vipMin}
          </div>
        )}
        <span className={`text-sm font-semibold ${isLocked ? "text-gray-400 mt-4" : "text-gray-800"}`}>{benefit.label}</span>
        <span className={`ml-2 flex-shrink-0 ${isLocked ? "text-gray-300" : "text-gray-600"}`}>{BENEFIT_ICON_MAP[benefit.id]}</span>
      </button>
    );
  };

  const BenefitCardDesktop = ({ benefit }: { benefit: typeof BENEFITS[0] }) => {
    const isLocked = benefit.vipMin > vipLevel;
    return (
      <button onClick={() => setBenefitModal(benefit)}
        className={`relative border rounded-xl p-4 flex flex-col items-start gap-2 text-left transition-all hover:shadow-md ${isLocked ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white"}`}>
        {isLocked && <div className="bg-gray-200 text-gray-600 text-[9px] font-black px-1.5 py-0.5 rounded-sm flex items-center gap-0.5"><Lock size={8} /> V{benefit.vipMin}</div>}
        <span className={isLocked ? "text-gray-300" : "text-gray-600"}>{BENEFIT_ICON_MAP[benefit.id]}</span>
        <span className={`text-xs font-semibold ${isLocked ? "text-gray-400" : "text-gray-800"}`}>{benefit.label}</span>
      </button>
    );
  };

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <div className="w-60 flex-shrink-0">
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white text-lg font-bold">
              {user?.nickname?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="absolute -bottom-1 -right-1"><VipBadge level={vipLevel} size={22} /></div>
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
            <p className="text-base font-bold text-gray-900 flex items-center gap-1"><span className="text-yellow-500">●</span> {points}</p>
            <p className="text-xs text-gray-500">Points</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {[
          { label: "Buy History", path: "/account" },
          { label: "Coupon", path: "/account", badge: "1397" },
          { label: "Settings", path: "/account" },
          { label: "Help Center", path: "/support" },
          { label: "Feedback", path: "/feedback" },
          { label: "Invite for Coupons", path: "/invite" },
          { label: "Affiliate Program", path: "/affiliate", highlight: true },
        ].map((item: any) => (
          <button key={item.label} onClick={() => navigate(item.path)}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${item.highlight ? "text-yellow-600" : "text-gray-700 hover:bg-gray-50"}`}>
            <span>{item.label}</span>
            {item.badge && <span className="text-gray-400 text-xs">{item.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Desktop ────────────────────────────────────────────────────────────────
  const DesktopLayout = () => (
    <div className="hidden lg:block min-h-screen bg-[#f5f5f5]">
      <DesktopHeader />
      <div className="max-w-[1280px] mx-auto px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Home</button>
          <ChevronRight size={14} />
          <button onClick={() => navigate("/account")} className="hover:text-gray-700">Account</button>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium">VIP Benefits</span>
        </div>
      </div>
      <div className="max-w-[1280px] mx-auto px-6 pb-12 flex gap-6 items-start">
        <Sidebar />
        <div className="flex-1">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-8 py-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">NoxyStore VIP Benefits</h2>

              {/* VIP tier selector + active card */}
              <div className="mb-6">
                <div className="flex gap-2 mb-4">
                  {[1,2,3,4,5].map(l => (
                    <button key={l} onClick={() => setActiveVip(l)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeVip === l ? "border-yellow-400 bg-yellow-50 text-yellow-700" : l <= vipLevel ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50" : "border-gray-100 bg-gray-50 text-gray-400"}`}>
                      V{l}
                    </button>
                  ))}
                </div>
                <VipTierCard level={activeVip} />
              </div>

              {/* Benefits grid */}
              <p className="text-base font-bold text-center text-gray-900 mb-1">NoxyStore VIP Benefits</p>
              <p className="text-xs text-gray-400 text-center mb-5">— Upgrade to unlock more benefits —</p>
              <div className="grid grid-cols-4 gap-3 mb-6">
                {BENEFITS.map(b => <BenefitCardDesktop key={b.id} benefit={b} />)}
              </div>

              {/* FAQ */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <p className="text-base font-bold text-center text-gray-900 py-4 border-b border-gray-100">NoxyStore VIP Membership Level FAQ</p>
                <div className="divide-y divide-gray-100">
                  {FAQ_ITEMS.map((item, idx) => (
                    <div key={idx}>
                      <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between px-6 py-4 text-left">
                        <span className="text-sm font-medium text-gray-800">{item.q}</span>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${openFaq === idx ? "rotate-180" : ""}`} />
                      </button>
                      {openFaq === idx && (
                        <div className="px-6 pb-4 -mt-2">
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.a}</p>
                          {item.hasCheckLevel && (
                            <button onClick={() => navigate("/points")} className="mt-3 bg-black text-white text-sm font-bold px-6 py-2.5 rounded-xl">Check my level</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Mobile ─────────────────────────────────────────────────────────────────
  const MobileLayout = () => (
    <div className="lg:hidden min-h-screen bg-[#f2f2f7] pb-20">
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3" style={{ background: `linear-gradient(to right, ${VIP_META[vipLevel]?.gradient || "#334155"})`.replace("from-","").replace("to-","") }}>
        <div className={`absolute inset-0 bg-gradient-to-r ${VIP_META[activeVip]?.gradient || "from-slate-500 to-slate-700"}`} />
        <div className="relative z-10 flex items-center justify-between w-full">
          <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={20} /></button>
          <p className="text-white font-bold">NoxyStore VIP Benefits</p>
          <div className="w-8" />
        </div>
      </div>

      {/* VIP tier selector */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-2">
          {[1,2,3,4,5].map(l => (
            <button key={l} onClick={() => setActiveVip(l)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${activeVip === l ? "border-yellow-400 bg-yellow-50 text-yellow-700" : l <= vipLevel ? "border-gray-200 bg-white text-gray-700" : "border-gray-100 bg-gray-50 text-gray-400"}`}>
              V{l}
            </button>
          ))}
        </div>
      </div>

      {/* Active VIP card */}
      <div className="px-4 pb-4">
        <VipTierCard level={activeVip} />
      </div>

      {/* Benefits grid */}
      <div className="bg-white mx-0 px-4 py-5 mt-2">
        <p className="text-base font-bold text-center text-gray-900 mb-1">NoxyStore VIP Benefits</p>
        <p className="text-xs text-gray-400 text-center mb-5">— Upgrade to unlock more benefits —</p>
        <div className="grid grid-cols-2 gap-3">
          {BENEFITS.map(b => <BenefitCard key={b.id} benefit={b} />)}
        </div>
      </div>

      {/* FAQ */}
      <div className="px-4 py-5 bg-white mx-4 mb-6 rounded-xl border border-gray-100 mt-2">
        <p className="text-base font-bold text-center text-gray-900 mb-4">NoxyStore VIP Membership Level FAQ</p>
        <div className="space-y-0 divide-y divide-gray-100">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx}>
              <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between py-4 text-left">
                <span className="text-sm font-medium text-gray-800">{item.q}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${openFaq === idx ? "rotate-180" : ""}`} />
              </button>
              {openFaq === idx && (
                <div className="pb-4 -mt-2">
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.a}</p>
                  {item.hasCheckLevel && (
                    <button onClick={() => navigate("/points")} className="mt-3 w-full bg-black text-white text-sm font-bold py-3 rounded-xl">Check my level</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );

  return (
    <>
      <DesktopLayout />
      <MobileLayout />

      {/* Benefit Detail Modal */}
      {benefitModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => setBenefitModal(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl lg:rounded-2xl shadow-2xl overflow-hidden z-10" onClick={e => e.stopPropagation()}>
            <div className="bg-amber-50 px-5 py-4 border-b border-amber-100 flex items-center justify-between">
              <button onClick={() => setBenefitModal(null)}><X size={20} className="text-gray-700" /></button>
              <p className="font-bold text-gray-900">{benefitModal.label}</p>
              <div className="w-6" />
            </div>
            <div className="px-6 py-8 text-center">
              <div className={`flex justify-center mb-5 ${benefitModal.vipMin > vipLevel ? "text-gray-300" : "text-yellow-500"}`}>
                <span className="w-16 h-16 flex items-center justify-center rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="scale-150">{BENEFIT_ICON_MAP[benefitModal.id]}</span>
                </span>
              </div>
              <p className="text-base text-gray-700 leading-relaxed mb-6 whitespace-pre-line text-left">{benefitModal.description}</p>
              {benefitModal.vipMin > vipLevel ? (
                <div>
                  <div className="bg-gray-100 rounded-xl px-4 py-3 mb-4">
                    <p className="text-sm text-gray-600">Requires <span className="font-bold text-gray-900">VIP {benefitModal.vipMin}</span> to unlock</p>
                  </div>
                  <button onClick={() => { setBenefitModal(null); navigate("/points"); }} className="w-full bg-black text-white font-bold py-3 rounded-xl text-sm">Upgrade to unlock</button>
                </div>
              ) : (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 justify-center">
                    <Check size={16} className="text-green-500" />
                    <p className="text-sm text-green-700 font-semibold">Active — Your VIP {vipLevel} status</p>
                  </div>
                  <button onClick={() => setBenefitModal(null)} className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl text-sm">Got it</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validity Modal */}
      {validityModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => setValidityModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl lg:rounded-2xl shadow-2xl z-10" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <button onClick={() => setValidityModal(false)}><X size={20} className="text-gray-700" /></button>
              <p className="font-bold text-gray-900">Validity Rules</p>
              <div className="w-6" />
            </div>
            <div className="px-5 py-6">
              <p className="text-sm text-gray-700 leading-relaxed mb-4">Your VIP membership validity is calculated from the date of your last qualifying transaction.</p>
              <ul className="space-y-2 text-sm text-gray-600 list-disc pl-4">
                <li>Complete at least 1 order every 3 months</li>
                <li>Maintain the minimum points for your VIP level</li>
                <li>Validity automatically extends with each qualifying order</li>
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4">
                <p className="text-sm font-semibold text-amber-800">Your current validity: {validityStr}</p>
              </div>
            </div>
            <div className="px-5 pb-6">
              <button onClick={() => { setValidityModal(false); navigate("/"); }} className="w-full bg-black text-white font-bold py-3 rounded-xl text-sm">Go spend &amp; extend validity</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
