/**
 * VipBenefitsPage — NoxyStore VIP Benefits (Redesigned like LootBar).
 * Shows VIP progress (V1-V5), benefit grid with photos, and FAQ accordions.
 * VIP level determined by completed orders points.
 * Desktop: sidebar layout. Mobile: gradient header + grid.
 * No emojis — all icons are SVG/lucide.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, X, ChevronDown, Info, ChevronRight,
  Lock, Check
} from "lucide-react";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

// ─── VIP level colors (matching LootBar screenshots) ──────────────────────
const VIP_COLORS: Record<number, { 
  bg: string; 
  card: string; 
  text: string; 
  accent: string;
  headerBg: string;
  cardBg: string;
  progressDot: string;
  progressLine: string;
}> = {
  1: { 
    bg: "from-yellow-400 via-yellow-300 to-amber-200", 
    card: "bg-gradient-to-br from-yellow-400/90 to-amber-300/90", 
    text: "text-amber-900", 
    accent: "#D97706",
    headerBg: "bg-gradient-to-br from-yellow-300 via-yellow-200 to-amber-100",
    cardBg: "bg-gradient-to-br from-yellow-400 to-amber-300",
    progressDot: "bg-yellow-500",
    progressLine: "#FCD34D"
  },
  2: { 
    bg: "from-lime-400 via-green-300 to-emerald-200", 
    card: "bg-gradient-to-br from-lime-400/90 to-emerald-300/90", 
    text: "text-green-900", 
    accent: "#059669",
    headerBg: "bg-gradient-to-br from-lime-300 via-green-200 to-emerald-100",
    cardBg: "bg-gradient-to-br from-lime-400 to-emerald-300",
    progressDot: "bg-green-500",
    progressLine: "#86EFAC"
  },
  3: { 
    bg: "from-blue-400 via-blue-300 to-sky-200", 
    card: "bg-gradient-to-br from-blue-400/90 to-sky-300/90", 
    text: "text-blue-900", 
    accent: "#2563EB",
    headerBg: "bg-gradient-to-br from-blue-300 via-blue-200 to-sky-100",
    cardBg: "bg-gradient-to-br from-blue-400 to-sky-300",
    progressDot: "bg-blue-500",
    progressLine: "#93C5FD"
  },
  4: { 
    bg: "from-purple-400 via-purple-300 to-violet-200", 
    card: "bg-gradient-to-br from-purple-400/90 to-violet-300/90", 
    text: "text-purple-900", 
    accent: "#7C3AED",
    headerBg: "bg-gradient-to-br from-purple-300 via-purple-200 to-violet-100",
    cardBg: "bg-gradient-to-br from-purple-400 to-violet-300",
    progressDot: "bg-purple-500",
    progressLine: "#C4B5FD"
  },
  5: { 
    bg: "from-red-400 via-red-300 to-rose-200", 
    card: "bg-gradient-to-br from-red-400/90 to-rose-300/90", 
    text: "text-red-900", 
    accent: "#DC2626",
    headerBg: "bg-gradient-to-br from-red-300 via-red-200 to-rose-100",
    cardBg: "bg-gradient-to-br from-red-400 to-rose-300",
    progressDot: "bg-red-500",
    progressLine: "#FCA5A5"
  },
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

// ─── Fake benefit photos (replace with real images) ───────────────────────
const BENEFIT_PHOTOS: Record<string, string> = {
  birthday:          "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop",
  point_money:       "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&h=200&fit=crop",
  points_coupon:     "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=200&h=200&fit=crop",
  points_item:       "https://images.unsplash.com/photo-1560419015-7c425b20b244?w=200&h=200&fit=crop",
  vip_service:       "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&h=200&fit=crop",
  fast_delivery:     "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&h=200&fit=crop",
  higher_discount:   "https://images.unsplash.com/photo-1556438064-2d7646166914?w=200&h=200&fit=crop",
  more_points:       "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=200&h=200&fit=crop",
  exclusive_service: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=200&h=200&fit=crop",
  priority_delivery: "https://images.unsplash.com/photo-1616578492901-befd2b52f6c0?w=200&h=200&fit=crop",
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
    const levelPointsNeeded = Math.max(0, getPointsForNextLevel(points) - points);

    return (
      <div className={`relative rounded-2xl p-5 min-w-[260px] border border-white/30 transition-all shadow-lg ${c.cardBg}`}>
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -right-2 -top-2 w-16 h-16 rounded-full bg-white/10" />
          <div className="absolute right-4 bottom-4 w-24 h-24 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M50 10 L60 40 L90 40 L65 60 L75 90 L50 70 L25 90 L35 60 L10 40 L40 40 Z" fill="white" />
            </svg>
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-3xl font-black italic text-white/90" style={{ fontFamily: 'serif' }}>VIP {level}</p>
              {isLocked ? (
                <div className="flex items-center gap-1 mt-1">
                  <Lock size={11} className="text-white/60" />
                  <p className="text-xs font-semibold text-white/70">Locked</p>
                </div>
              ) : (
                <p className="text-xs font-medium mt-1 text-white/80">
                  {level < 5 ? `Earn ${levelPointsNeeded} more points to upgrade to VIP ${level + 1}!` : "Maximum VIP level achieved!"}
                </p>
              )}
              {!isLocked && level < 5 && (
                <div className="mt-2 w-full bg-black/20 rounded-full h-1">
                  <div 
                    className="bg-white/80 h-1 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, (points / nextLevelPoints) * 100)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 mb-0.5 justify-end">
                <p className="text-[10px] font-semibold text-white/70">Validity</p>
                <button onClick={() => setValidityModal(true)}>
                  <Info size={11} className="text-white/60" />
                </button>
              </div>
              <p className="text-xs font-bold text-white">{validityStr}</p>
              {!isLocked && (
                <button
                  onClick={() => setBenefitModal({ benefit: BENEFITS[0] })}
                  className="mt-2 bg-black/80 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-black transition-colors"
                >
                  Details
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Progress Bar ──────────────────────────────────────────────────────────
  const VipProgressBar = () => (
    <div className="relative flex items-center justify-center py-6 px-4">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
        <path d="M 30 45 Q 90 15 150 35 Q 210 55 270 25" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      </svg>
      {[1, 2, 3, 4, 5].map((level) => {
        const isReached = level <= vipLevel;
        const isCurrent = level === vipLevel;
        const levelColor = VIP_COLORS[level];
        return (
          <button key={level} onClick={() => setActiveVipCard(level)} className="flex flex-col items-center relative z-10" style={{ flex: 1 }}>
            <div className={`w-3 h-3 rounded-full border-2 transition-all ${isCurrent ? "bg-white border-white scale-150 shadow-lg" : isReached ? `${levelColor.progressDot} border-white` : "bg-white/30 border-white/50"}`} />
            <span className={`text-xs font-bold mt-1.5 ${isCurrent ? "text-white" : isReached ? "text-white/80" : "text-white/50"}`}>V{level}</span>
          </button>
        );
      })}
    </div>
  );

  // ─── Benefit card for mobile grid ──────────────────────────────────────────
  const BenefitCard = ({ benefit }: { benefit: typeof BENEFITS[0] }) => {
    const isLocked = benefit.vipMin > vipLevel;
    return (
      <button
        onClick={() => setBenefitModal({ benefit })}
        className={`relative border rounded-xl p-4 flex items-center justify-between text-left transition-all hover:shadow-md ${isLocked ? "border-gray-200 bg-gray-50/80" : "border-gray-200 bg-white"}`}
      >
        {isLocked && (
          <div className="absolute top-2 left-2 bg-gray-500/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Lock size={8} /> V{benefit.vipMin}
          </div>
        )}
        <span className={`text-sm font-semibold ${isLocked ? "text-gray-400 mt-4" : "text-gray-800"}`}>{benefit.label}</span>
        <img 
          src={BENEFIT_PHOTOS[benefit.id]} 
          alt={benefit.label}
          className={`w-12 h-12 object-contain flex-shrink-0 ${isLocked ? "grayscale opacity-40" : ""}`}
          onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/48?text=?"; }}
        />
      </button>
    );
  };

  // ─── Desktop benefit card (vertical) ──────────────────────────────────────
  const BenefitCardDesktop = ({ benefit }: { benefit: typeof BENEFITS[0] }) => {
    const isLocked = benefit.vipMin > vipLevel;
    return (
      <button
        onClick={() => setBenefitModal({ benefit })}
        className={`relative border rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-all hover:shadow-md ${isLocked ? "border-gray-200 bg-gray-50/80" : "border-gray-200 bg-white"}`}
      >
        {isLocked && (
          <div className="absolute top-2 left-2 bg-gray-500/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Lock size={8} /> V{benefit.vipMin}
          </div>
        )}
        <img 
          src={BENEFIT_PHOTOS[benefit.id]} 
          alt={benefit.label}
          className={`w-14 h-14 object-contain ${isLocked ? "grayscale opacity-40" : ""}`}
          onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/56?text=?"; }}
        />
        <span className={`text-xs font-semibold ${isLocked ? "text-gray-400" : "text-gray-800"}`}>{benefit.label}</span>
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

              {/* VIP progress header - Redesigned like LootBar */}
              <div className={`relative ${colors.headerBg} rounded-2xl p-6 mb-6 overflow-hidden`}>
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/20" />
                  <div className="absolute right-20 top-10 w-24 h-24 rounded-full bg-white/10" />
                  <div className="absolute left-10 bottom-0 w-32 h-32 rounded-full bg-white/10" />
                </div>

                <div className="relative z-10">
                  {/* Avatar + Username */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="relative mb-2">
                      <div className="w-16 h-16 rounded-full bg-gray-400/80 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/50">
                        {user?.nickname?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-black/70 text-white text-[10px] font-black px-2 py-0.5 rounded border border-white/50">
                        V{vipLevel}
                      </div>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                        <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                          <path d="M10 0L12.5 6H19L14 10L16 16L10 12L4 16L6 10L1 6H7.5L10 0Z" fill="white" fillOpacity="0.8"/>
                        </svg>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900 text-lg">{user?.nickname || user?.email?.split("@")[0]}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center justify-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map(l => {
                      const lvlColors = VIP_COLORS[l];
                      const isReached = l <= vipLevel;
                      const isCurrent = l === vipLevel;
                      return (
                        <button key={l} onClick={() => setActiveVipCard(l)} className="flex flex-col items-center gap-1 transition-all mx-2">
                          <div className={`w-3 h-3 rounded-full border-2 transition-all ${isCurrent ? "bg-gray-800 border-gray-800 scale-125 shadow-lg" : isReached ? `${lvlColors.progressDot} border-white` : "bg-white/50 border-white/50"}`} />
                          <span className={`text-xs font-bold ${isCurrent ? "text-gray-900" : isReached ? "text-gray-700" : "text-gray-400"}`}>V{l}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* VIP Card */}
                  <VipCard level={activeVipCard} />
                </div>
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

      {/* VIP gradient header - Redesigned like LootBar */}
      <div className={`relative ${colors.headerBg} overflow-hidden`}>
        <div className="absolute inset-0 opacity-40">
          <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/20" />
          <div className="absolute right-10 top-10 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute left-0 bottom-0 w-32 h-32 rounded-full bg-white/10" />
        </div>

        <div className="relative z-10 px-4 pt-6 pb-4">
          {/* Avatar + Username */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative mb-2">
              <div className="w-16 h-16 rounded-full bg-gray-400/80 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/50">
                {user?.nickname?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-black/70 text-white text-[10px] font-black px-2 py-0.5 rounded border border-white/50">
                V{vipLevel}
              </div>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                  <path d="M10 0L12.5 6H19L14 10L16 16L10 12L4 16L6 10L1 6H7.5L10 0Z" fill="white" fillOpacity="0.8"/>
                </svg>
              </div>
            </div>
            <p className="font-bold text-gray-900 text-base">{user?.nickname || user?.email?.split("@")[0]}</p>
          </div>

          <VipProgressBar />

          <div className="mx-2 mb-2">
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
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <button onClick={() => setBenefitModal({ benefit: null })}><X size={20} className="text-gray-700" /></button>
              <p className="font-bold text-gray-900">{benefitModal.benefit.label}</p>
              <div className="w-6" />
            </div>
            <div className="px-6 py-8 text-center">
              {/* Benefit photo */}
              <div className="flex justify-center mb-5">
                <img
                  src={BENEFIT_PHOTOS[benefitModal.benefit.id]}
                  alt={benefitModal.benefit.label}
                  className={`w-24 h-24 rounded-2xl object-cover ${
                    benefitModal.benefit.vipMin > vipLevel
                      ? "grayscale opacity-40 border-2 border-gray-200"
                      : "border-2 border-gray-200"
                  }`}
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/96?text=?"; }}
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
                  <button onClick={() => setBenefitModal({ benefit: null })} className="w-full bg-black text-white font-bold py-3 rounded-xl text-sm">Got it</button>
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
