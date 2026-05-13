/**
 * VipBenefitsPage — NoxyStore VIP Benefits.
 * Shows VIP progress (V1-V5), benefit grid, and FAQ accordions.
 * VIP level determined by completed orders points.
 * Desktop: sidebar layout. Mobile: gradient header + grid.
 * No emojis — all icons are SVG/lucide.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, X, ChevronDown, Info, ChevronRight,
  Lock, Check, Star
} from "lucide-react";
import vip1bg from "@/assets/vip1-bg.jpg";
import vip2bg from "@/assets/vip2-bg.jpg";
import vip3bg from "@/assets/vip3-bg.jpg";
import vip4bg from "@/assets/vip4-bg.jpg";
import vip5bg from "@/assets/vip5-bg.jpg";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

// VIP level colors
const VIP_COLORS: Record<number, { bg: string; card: string; text: string; accent: string }> = {
  1: { bg: "from-yellow-200 via-yellow-100 to-amber-50", card: "bg-gradient-to-br from-yellow-300/80 to-amber-200/80", text: "text-amber-900", accent: "#D97706" },
  2: { bg: "from-green-200 via-green-100 to-emerald-50", card: "bg-gradient-to-br from-green-300/80 to-emerald-200/80", text: "text-green-900", accent: "#059669" },
  3: { bg: "from-blue-200 via-blue-100 to-sky-50", card: "bg-gradient-to-br from-blue-300/80 to-sky-200/80", text: "text-blue-900", accent: "#2563EB" },
  4: { bg: "from-purple-200 via-purple-100 to-violet-50", card: "bg-gradient-to-br from-purple-300/80 to-violet-200/80", text: "text-purple-900", accent: "#7C3AED" },
  5: { bg: "from-red-200 via-red-100 to-rose-50", card: "bg-gradient-to-br from-red-300/80 to-rose-200/80", text: "text-red-900", accent: "#DC2626" },
};

function getVipLevel(points: number) {
  if (points >= 3000) return 5;
  if (points >= 1000) return 4;
  if (points >= 500) return 3;
  if (points >= 300) return 2;
  return 1;
}

function getPointsForNextLevel(points: number) {
  if (points >= 3000) return 3000;
  if (points >= 1000) return 3000;
  if (points >= 500) return 1000;
  if (points >= 300) return 500;
  return 300;
}

// ─── VIP level background photos ──────────────────────────────────────────
const VIP_BG_MAP: Record<number, string> = {
  1: vip1bg,
  2: vip2bg,
  3: vip3bg,
  4: vip4bg,
  5: vip5bg,
};

// ─── Benefit placeholder photos (replace with real images when ready) ──────
const BENEFIT_PHOTO_MAP: Record<string, string> = {
  birthday:          "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=160&h=120&fit=crop",
  point_money:       "https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=160&h=120&fit=crop",
  points_coupon:     "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=160&h=120&fit=crop",
  points_item:       "https://images.unsplash.com/photo-1560419015-7c425b20b244?w=160&h=120&fit=crop",
  vip_service:       "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=160&h=120&fit=crop",
  fast_delivery:     "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=160&h=120&fit=crop",
  higher_discount:   "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=160&h=120&fit=crop",
  more_points:       "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=160&h=120&fit=crop",
  exclusive_service: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=160&h=120&fit=crop",
  priority_delivery: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=160&h=120&fit=crop",
};

// ─── Benefits data — detailed V1-V5 descriptions ──────────────────────────
const BENEFITS = [
  {
    id: "birthday",
    label: "Birthday Gift",
    vipMin: 1,
    type: "birthday",
    description: "Receive birthday gifts automatically on your registered birthday:\n\n• VIP 1 — 5% discount coupon + 50 points\n• VIP 2 — 8% discount coupon + 80 points\n• VIP 3 — 10% discount coupon + 120 points\n• VIP 4 — 15% discount coupon + 200 points\n• VIP 5 — 20% discount coupon + 500 points\n\nGifts are sent on your birthday date. Set your birthday in Account Settings to activate.",
  },
  {
    id: "point_money",
    label: "Point as Money",
    vipMin: 1,
    description: "Use your accumulated points as cash at checkout:\n\n• VIP 1 — 100 pts = $1.00\n• VIP 2 — 95 pts = $1.00\n• VIP 3 — 90 pts = $1.00\n• VIP 4 — 85 pts = $1.00\n• VIP 5 — 80 pts = $1.00\n\nHigher VIP level = better conversion rate. Points can be applied at checkout alongside coupons.",
  },
  {
    id: "points_coupon",
    label: "Points Coupon",
    vipMin: 1,
    description: "Redeem exclusive discount coupons using your points:\n\n• VIP 1 — Coupons up to 5% off\n• VIP 2 — Coupons up to 8% off\n• VIP 3 — Coupons up to 10% off\n• VIP 4 — Coupons up to 15% off\n• VIP 5 — Coupons up to 20% off\n\nNew coupon options added regularly in the Points → Redeem section.",
  },
  {
    id: "points_item",
    label: "Points Item",
    vipMin: 1,
    description: "Redeem exclusive in-game items with your points:\n\n• VIP 1 — Basic game passes and starter items\n• VIP 2 — Mid-tier game items and subscriptions\n• VIP 3 — Premium game bundles (Welkin Moon, etc.)\n• VIP 4 — Rare limited items and exclusive bundles\n• VIP 5 — All items + exclusive NoxyStore special edition packs\n\nNew items rotate every 30 days.",
  },
  {
    id: "vip_service",
    label: "VIP Service",
    vipMin: 1,
    description: "Priority customer support based on VIP level:\n\n• VIP 1 — Standard support, 24h response\n• VIP 2 — Priority queue, 12h response\n• VIP 3 — VIP queue, 6h response\n• VIP 4 — Dedicated agent, 2h response\n• VIP 5 — Instant response + personal account manager\n\nAll VIP members get access to the VIP chat channel.",
  },
  {
    id: "fast_delivery",
    label: "Fast Delivery",
    vipMin: 1,
    description: "Faster order processing for all VIP members:\n\n• VIP 1 — Standard processing, 3-5 minutes\n• VIP 2 — Priority processing, 2-3 minutes\n• VIP 3 — Fast lane, under 2 minutes\n• VIP 4 — Express lane, under 1 minute\n• VIP 5 — Instant delivery with real-time tracking\n\nAll delivery times guaranteed during normal operation hours.",
  },
  {
    id: "higher_discount",
    label: "Higher Discount",
    vipMin: 2,
    description: "Extra base discount applied to all purchases:\n\n• VIP 2 — Extra 1% off all orders\n• VIP 3 — Extra 2% off all orders\n• VIP 4 — Extra 3% off all orders\n• VIP 5 — Extra 5% off all orders\n\nStacks with sale prices, coupons, and seasonal promotions. The more you grow, the more you save.",
  },
  {
    id: "more_points",
    label: "More Points",
    vipMin: 3,
    description: "Earn bonus points multiplier on every purchase:\n\n• VIP 3 — 1.2× point multiplier\n• VIP 4 — 1.5× point multiplier\n• VIP 5 — 2.0× point multiplier (double points!)\n\nMultiplier applies to all qualifying orders. The higher your VIP, the faster you accumulate rewards and maintain your level.",
  },
  {
    id: "exclusive_service",
    label: "Exclusive Service",
    vipMin: 4,
    description: "Premium concierge experience for top-tier members:\n\n• VIP 4 — Dedicated support agent + concierge top-up assistance\n• VIP 5 — White-glove service with direct senior support line\n\nIncludes: Priority dispute resolution, exclusive order assistance, early access to new games, and invitations to NoxyStore VIP-only events and promotions.",
  },
  {
    id: "priority_delivery",
    label: "Priority Delivery",
    vipMin: 4,
    description: "Highest priority order processing in the queue:\n\n• VIP 4 — Orders jump to front of processing queue\n• VIP 5 — Guaranteed fastest delivery SLA\n\nVIP 5 Guarantee: If your order takes more than 5 minutes to complete, you automatically receive a 5% compensation coupon. Your satisfaction is our top priority.",
  },
];

const FAQ_ITEMS = [
  {
    q: "NoxyStore Membership Level",
    a: "The membership levels of NoxyStore are divided into VIP1, VIP2, VIP3, VIP4, VIP5 — 5 levels.\n\nEach VIP level requires a successful transaction within the last 3 months:\n\nVIP1: Successfully complete 1 order\nVIP2: Accumulate at least 300 points\nVIP3: Accumulate at least 500 points\nVIP4: Accumulate at least 1000 points\nVIP5: Accumulate at least 3000 points\n\nSpecial Note: Points include those earned from spending and from point tasks.",
    hasCheckLevel: true,
  },
  {
    q: "NoxyStore Membership Upgrade/Downgrade Rules",
    a: "VIP membership is evaluated monthly. If your points fall below the threshold for your current VIP level during any 3-month period, your level may be downgraded at the next evaluation cycle.\n\nUpgrading happens automatically when you meet the requirements for the next level — no manual action needed.",
  },
  {
    q: "NoxyStore Membership Validity Rules",
    a: "VIP status is valid for 3 months from the date of your last qualifying transaction.\n\nTo maintain your VIP status:\n• Complete at least 1 order every 3 months\n• Maintain the minimum points for your current level\n• Validity automatically extends with each qualifying order",
  },
  {
    q: "NoxyStore Membership FAQ",
    a: "Q: Can I lose my VIP status?\nA: Yes, if you do not complete a transaction within 3 months or fall below the minimum points for your level.\n\nQ: Are points transferable?\nA: No, points are non-transferable and tied to your account.\n\nQ: When do my points expire?\nA: Points do not expire as long as your account remains active with at least one order every 6 months.",
  },
];

interface BenefitModalState { benefit: typeof BENEFITS[0] | null; }

export function VipBenefitsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [points, setPoints] = useState(0);
  const [joinDate, setJoinDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [benefitModal, setBenefitModal] = useState<BenefitModalState>({ benefit: null });
  const [validityModal, setValidityModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeVipCard, setActiveVipCard] = useState(1);

  useEffect(() => {
    if (!isAuthenticated || !user?.email) { setIsLoading(false); return; }
    supabase
      .from("orders")
      .select("price, created_at")
      .eq("user_email", user.email)
      .eq("state", 2)
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
  const nextLevelPoints = getPointsForNextLevel(points);
  const pointsNeeded = Math.max(0, nextLevelPoints - points);
  const colors = VIP_COLORS[activeVipCard] || VIP_COLORS[1];

  const validUntil = joinDate
    ? new Date(joinDate.getTime() + 90 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const validityStr = validUntil.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ─── VIP Card ──────────────────────────────────────────────────────────────
  const VipCard = ({ level }: { level: number }) => {
    const c = VIP_COLORS[level] || VIP_COLORS[1];
    const isActive = level === vipLevel;
    const isLocked = level > vipLevel;
    const bgPhoto = VIP_BG_MAP[level];
    return (
      <div className={`relative rounded-2xl p-5 min-w-[260px] border-2 transition-all overflow-hidden ${isActive ? "border-yellow-400 shadow-lg" : "border-transparent"} ${c.card}`}>
        {/* VIP level background photo */}
        {bgPhoto && (
          <div className="absolute inset-0 pointer-events-none">
            <img src={bgPhoto} alt="" className="w-full h-full object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
          </div>
        )}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -right-2 -top-2 w-16 h-16 rounded-full bg-white/10" />
        </div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className={`text-2xl font-black italic ${c.text}`}>VIP {level}</p>
              {isLocked ? (
                <div className="flex items-center gap-1 mt-1">
                  <Lock size={11} className={`${c.text} opacity-60`} />
                  <p className={`text-xs font-semibold ${c.text} opacity-70`}>Locked</p>
                </div>
              ) : (
                <p className={`text-xs font-medium mt-1 ${c.text} opacity-80`}>
                  {level < 5 ? `Earn ${pointsNeeded} more points to upgrade to VIP ${level + 1}!` : "Maximum VIP level achieved!"}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 mb-0.5">
                <p className={`text-[10px] font-semibold ${c.text} opacity-70`}>Validity</p>
                <button onClick={() => setValidityModal(true)}>
                  <Info size={11} className={`${c.text} opacity-60`} />
                </button>
              </div>
              <p className={`text-xs font-bold ${c.text}`}>{validityStr}</p>
            </div>
          </div>
          {!isLocked && (
            <button
              onClick={() => setBenefitModal({ benefit: BENEFITS[0] })}
              className="bg-black text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              Details
            </button>
          )}
        </div>
      </div>
    );
  };

  // ─── Progress Bar ──────────────────────────────────────────────────────────
  const VipProgressBar = () => (
    <div className="relative flex items-center justify-center py-4">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
        <path d="M 20 40 Q 75 10 150 30 Q 225 50 280 20" fill="none" stroke="#d1d5db" strokeWidth="1.5" />
      </svg>
      {[1, 2, 3, 4, 5].map((level) => {
        const isReached = level <= vipLevel;
        const isCurrent = level === vipLevel;
        return (
          <button key={level} onClick={() => setActiveVipCard(level)} className="flex flex-col items-center relative z-10" style={{ flex: 1 }}>
            <div className={`w-3 h-3 rounded-full border-2 transition-all ${isCurrent ? "bg-black border-black scale-150" : isReached ? "bg-yellow-400 border-yellow-500" : "bg-white border-gray-300"}`} />
            <span className={`text-xs font-bold mt-1.5 ${isCurrent ? "text-gray-900" : "text-gray-400"}`}>V{level}</span>
          </button>
        );
      })}
    </div>
  );

  // ─── Benefit card for mobile grid ──────────────────────────────────────────
  const BenefitCard = ({ benefit }: { benefit: typeof BENEFITS[0] }) => {
    const isLocked = benefit.vipMin > vipLevel;
    const photo = BENEFIT_PHOTO_MAP[benefit.id];
    return (
      <button
        onClick={() => setBenefitModal({ benefit })}
        className={`relative border rounded-xl overflow-hidden text-left transition-all hover:shadow-md ${isLocked ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white"}`}
      >
        {/* Benefit photo */}
        <div className="relative h-24 w-full bg-gray-100 overflow-hidden">
          <img
            src={photo}
            alt={benefit.label}
            className={`w-full h-full object-cover ${isLocked ? "grayscale opacity-50" : ""}`}
            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=160&h=100&fit=crop"; }}
          />
          {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/50 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                <Lock size={8} /> V{benefit.vipMin}
              </div>
            </div>
          )}
        </div>
        <div className="px-3 py-2.5">
          <span className={`text-xs font-semibold ${isLocked ? "text-gray-400" : "text-gray-800"}`}>{benefit.label}</span>
        </div>
      </button>
    );
  };

  // ─── Desktop benefit card (vertical) ──────────────────────────────────────
  const BenefitCardDesktop = ({ benefit }: { benefit: typeof BENEFITS[0] }) => {
    const isLocked = benefit.vipMin > vipLevel;
    const photo = BENEFIT_PHOTO_MAP[benefit.id];
    return (
      <button
        onClick={() => setBenefitModal({ benefit })}
        className={`relative border rounded-xl overflow-hidden flex flex-col text-left transition-all hover:shadow-md ${isLocked ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white"}`}
      >
        {/* Benefit photo */}
        <div className="relative h-20 w-full bg-gray-100 overflow-hidden">
          <img
            src={photo}
            alt={benefit.label}
            className={`w-full h-full object-cover ${isLocked ? "grayscale opacity-50" : ""}`}
            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=160&h=80&fit=crop"; }}
          />
          {isLocked && (
            <div className="absolute top-1.5 left-1.5 bg-black/50 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
              <Lock size={8} /> V{benefit.vipMin}
            </div>
          )}
        </div>
        <div className="px-3 py-2.5">
          <span className={`text-xs font-semibold ${isLocked ? "text-gray-400" : "text-gray-800"}`}>{benefit.label}</span>
        </div>
      </button>
    );
  };

  // ─── Sidebar ───────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <div className="w-60 flex-shrink-0">
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white text-lg font-bold">
              {user?.nickname?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm border border-white">V{vipLevel}</div>
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
          <button key={item.label} onClick={() => navigate(item.path)} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${item.highlight ? "text-yellow-600" : "text-gray-700 hover:bg-gray-50"}`}>
            <span>{item.label}</span>
            {item.badge && <span className="text-gray-400 text-xs">{item.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Desktop Layout ────────────────────────────────────────────────────────
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
              {/* VIP progress header */}
              <div className={`relative bg-gradient-to-br ${colors.bg} rounded-2xl p-6 mb-6 overflow-hidden`}>
                <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white/20 -translate-y-8 translate-x-8" />
                <div className="relative z-10 flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gray-400 flex items-center justify-center text-white text-xl font-bold">
                      {user?.nickname?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm border border-white">V{vipLevel}</div>
                  </div>
                  <p className={`font-bold ${colors.text} text-base`}>{user?.nickname || user?.email?.split("@")[0]}</p>
                  <div className="flex-1 flex items-center gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map(l => (
                      <button key={l} onClick={() => setActiveVipCard(l)} className="flex flex-col items-center gap-1 transition-all">
                        <div className={`w-3 h-3 rounded-full border-2 ${l === vipLevel ? "bg-black border-black scale-125" : l < vipLevel ? "bg-yellow-400 border-yellow-500" : "bg-white border-gray-300"}`} />
                        <span className={`text-xs ${l === vipLevel ? "font-bold text-gray-900" : "text-gray-400"}`}>V{l}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <VipCard level={activeVipCard} />
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

  // ─── Mobile Layout ─────────────────────────────────────────────────────────
  const MobileLayout = () => (
    <div className="lg:hidden min-h-screen bg-[#f2f2f7] pb-20">
      {/* Mobile header */}
      <div className="bg-black sticky top-0 z-40 flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={20} /></button>
        <p className="text-white font-bold">NoxyStore VIP Benefits</p>
        <div className="w-8" />
      </div>

      {/* VIP gradient header */}
      <div className={`relative bg-gradient-to-br ${colors.bg} overflow-hidden`}>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/30" />
          <div className="absolute right-10 top-10 w-24 h-24 rounded-full bg-white/20" />
        </div>
        <div className="relative z-10 px-4 pt-6 pb-2">
          <div className="flex flex-col items-center mb-4">
            <div className="relative mb-2">
              <div className="w-14 h-14 rounded-full bg-gray-400 flex items-center justify-center text-white text-xl font-bold">
                {user?.nickname?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-sm border border-white">V{vipLevel}</div>
            </div>
            <p className={`font-bold ${colors.text} text-sm`}>{user?.nickname || user?.email?.split("@")[0]}</p>
          </div>
          <VipProgressBar />
          <div className="mx-2 mb-4">
            <VipCard level={activeVipCard} />
          </div>
        </div>
      </div>

      {/* Benefits grid */}
      <div className="bg-white mt-2 px-4 py-5">
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

      {/* ─── Benefit Detail Modal ─────────────────────────────────────────── */}
      {benefitModal.benefit && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => setBenefitModal({ benefit: null })}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl lg:rounded-2xl shadow-2xl overflow-hidden z-10" onClick={e => e.stopPropagation()}>
            <div className="bg-amber-50 px-5 py-4 border-b border-amber-100 flex items-center justify-between">
              <button onClick={() => setBenefitModal({ benefit: null })}><X size={20} className="text-gray-700" /></button>
              <p className="font-bold text-gray-900">{benefitModal.benefit.label}</p>
              <div className="w-6" />
            </div>
            <div className="px-6 py-8 text-center">
              {/* Benefit photo — replace with real image when ready */}
              <div className="flex justify-center mb-5">
                <img
                  src={`https://images.unsplash.com/photo-${
                    ["1542751371-adc38448a05e","1511512578047-dfb367046420","1493711662062-fa541adb3fc8",
                     "1560419015-7c425b20b244","1538481199705-c710c4e965fc","1550745165-9bc0b252726f",
                     "1556438064-2d7646166914","1485827404703-89b55fcc595e","1614680376408-81e91ffe3db7",
                     "1616578492901-befd2b52f6c0"
                    ][BENEFITS.findIndex(b => b.id === benefitModal.benefit!.id) % 10]
                  }?w=200&h=200&fit=crop`}
                  alt={benefitModal.benefit.label}
                  className={`w-24 h-24 rounded-2xl object-cover ${
                    benefitModal.benefit.vipMin > vipLevel
                      ? "grayscale opacity-40 border-2 border-gray-200"
                      : "border-2 border-yellow-300"
                  }`}
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop"; }}
                />
              </div>
              <p className="text-base text-gray-700 leading-relaxed mb-6 whitespace-pre-line text-left">{benefitModal.benefit.description}</p>
              {benefitModal.benefit.vipMin > vipLevel ? (
                <div>
                  <div className="bg-gray-100 rounded-xl px-4 py-3 mb-4">
                    <p className="text-sm text-gray-600">Requires <span className="font-bold text-gray-900">VIP {benefitModal.benefit.vipMin}</span> to unlock</p>
                  </div>
                  <button onClick={() => { setBenefitModal({ benefit: null }); navigate("/points"); }} className="w-full bg-black text-white font-bold py-3 rounded-xl text-sm">
                    Upgrade to unlock
                  </button>
                </div>
              ) : (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 justify-center">
                    <Check size={16} className="text-green-500" />
                    <p className="text-sm text-green-700 font-semibold">Active — Your VIP {vipLevel} status</p>
                  </div>
                  {benefitModal.benefit.type === "birthday" && (
                    <p className="text-xs text-gray-500 mb-3">Birthday gifts are automatically sent on the day registered in your account settings.</p>
                  )}
                  <button onClick={() => setBenefitModal({ benefit: null })} className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl text-sm">Got it</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Validity Modal ───────────────────────────────────────────────── */}
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
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                Your VIP membership validity is calculated from the date of your last qualifying transaction. To maintain VIP status:
              </p>
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
              <button onClick={() => { setValidityModal(false); navigate("/"); }} className="w-full bg-black text-white font-bold py-3 rounded-xl text-sm">
                Go spend &amp; extend validity
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
