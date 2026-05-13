/**
 * VipBenefitsPage — NoxyStore VIP Benefits (LootBar Style).
 * Each VIP level has its own color theme and 10 benefit photos.
 * V5 = Black/Gold premium theme.
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

// ─── VIP Themes (exactly matching LootBar screenshots) ────────────────────
const VIP_THEMES: Record<number, {
  headerBg: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  subTextColor: string;
  dotColor: string;
  dotBorder: string;
  progressLine: string;
  lockedBadge: string;
  activeDot: string;
  benefitBorder: string;
  benefitBg: string;
  benefitLockedBg: string;
  themeName: string;
}> = {
  1: {
    headerBg: "bg-gradient-to-br from-yellow-200 via-amber-100 to-yellow-50",
    cardBg: "bg-gradient-to-br from-yellow-300 via-amber-200 to-yellow-100",
    cardBorder: "border-yellow-400/50",
    textColor: "text-amber-900",
    subTextColor: "text-amber-700/70",
    dotColor: "bg-amber-400",
    dotBorder: "border-amber-500",
    progressLine: "stroke-amber-300",
    lockedBadge: "bg-amber-700/80",
    activeDot: "bg-amber-600",
    benefitBorder: "border-amber-200",
    benefitBg: "bg-amber-50/30",
    benefitLockedBg: "bg-gray-50",
    themeName: "gold"
  },
  2: {
    headerBg: "bg-gradient-to-br from-lime-300 via-green-200 to-emerald-100",
    cardBg: "bg-gradient-to-br from-lime-400 via-green-300 to-emerald-200",
    cardBorder: "border-green-400/50",
    textColor: "text-green-900",
    subTextColor: "text-green-700/70",
    dotColor: "bg-green-400",
    dotBorder: "border-green-500",
    progressLine: "stroke-green-300",
    lockedBadge: "bg-green-700/80",
    activeDot: "bg-green-600",
    benefitBorder: "border-green-200",
    benefitBg: "bg-green-50/30",
    benefitLockedBg: "bg-gray-50",
    themeName: "green"
  },
  3: {
    headerBg: "bg-gradient-to-br from-blue-300 via-sky-200 to-cyan-100",
    cardBg: "bg-gradient-to-br from-blue-400 via-sky-300 to-cyan-200",
    cardBorder: "border-blue-400/50",
    textColor: "text-blue-900",
    subTextColor: "text-blue-700/70",
    dotColor: "bg-blue-400",
    dotBorder: "border-blue-500",
    progressLine: "stroke-blue-300",
    lockedBadge: "bg-blue-700/80",
    activeDot: "bg-blue-600",
    benefitBorder: "border-blue-200",
    benefitBg: "bg-blue-50/30",
    benefitLockedBg: "bg-gray-50",
    themeName: "blue"
  },
  4: {
    headerBg: "bg-gradient-to-br from-purple-300 via-violet-200 to-fuchsia-100",
    cardBg: "bg-gradient-to-br from-purple-400 via-violet-300 to-fuchsia-200",
    cardBorder: "border-purple-400/50",
    textColor: "text-purple-900",
    subTextColor: "text-purple-700/70",
    dotColor: "bg-purple-400",
    dotBorder: "border-purple-500",
    progressLine: "stroke-purple-300",
    lockedBadge: "bg-purple-700/80",
    activeDot: "bg-purple-600",
    benefitBorder: "border-purple-200",
    benefitBg: "bg-purple-50/30",
    benefitLockedBg: "bg-gray-50",
    themeName: "purple"
  },
  5: {
    // V5 = Black/Gold premium theme (matches last screenshot)
    headerBg: "bg-gradient-to-br from-gray-900 via-gray-800 to-black",
    cardBg: "bg-gradient-to-br from-yellow-600 via-yellow-500 to-amber-400",
    cardBorder: "border-yellow-500/50",
    textColor: "text-yellow-100",
    subTextColor: "text-yellow-200/70",
    dotColor: "bg-yellow-500",
    dotBorder: "border-yellow-400",
    progressLine: "stroke-yellow-600",
    lockedBadge: "bg-yellow-700/80",
    activeDot: "bg-yellow-500",
    benefitBorder: "border-yellow-600/30",
    benefitBg: "bg-yellow-900/10",
    benefitLockedBg: "bg-gray-900/50",
    themeName: "black-gold"
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

// ─── 50 Benefit Photos (10 per VIP level, each with level-specific color) ───
// Replace these URLs with your actual colored images
const BENEFIT_PHOTOS: Record<string, Record<number, string>> = {
  birthday: {
    1: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v1-birthday-gold.png",
    2: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v2-birthday-green.png",
    3: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v3-birthday-blue.png",
    4: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v4-birthday-purple.png",
    5: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v5-birthday-gold.png",
  },
  point_money: {
    1: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v1-points-gold.png",
    2: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v2-points-green.png",
    3: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v3-points-blue.png",
    4: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v4-points-purple.png",
    5: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v5-points-gold.png",
  },
  points_coupon: {
    1: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v1-coupon-gold.png",
    2: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v2-coupon-green.png",
    3: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v3-coupon-blue.png",
    4: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v4-coupon-purple.png",
    5: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v5-coupon-gold.png",
  },
  points_item: {
    1: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v1-item-gold.png",
    2: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v2-item-green.png",
    3: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v3-item-blue.png",
    4: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v4-item-purple.png",
    5: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v5-item-gold.png",
  },
  vip_service: {
    1: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v1-service-gold.png",
    2: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v2-service-green.png",
    3: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v3-service-blue.png",
    4: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v4-service-purple.png",
    5: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v5-service-gold.png",
  },
  fast_delivery: {
    1: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v1-fast-gold.png",
    2: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v2-fast-green.png",
    3: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v3-fast-blue.png",
    4: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v4-fast-purple.png",
    5: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v5-fast-gold.png",
  },
  higher_discount: {
    1: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v1-discount-gold.png",
    2: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v2-discount-green.png",
    3: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v3-discount-blue.png",
    4: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v4-discount-purple.png",
    5: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v5-discount-gold.png",
  },
  more_points: {
    1: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v1-more-gold.png",
    2: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v2-more-green.png",
    3: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v3-more-blue.png",
    4: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v4-more-purple.png",
    5: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v5-more-gold.png",
  },
  exclusive_service: {
    1: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v1-exclusive-gold.png",
    2: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v2-exclusive-green.png",
    3: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v3-exclusive-blue.png",
    4: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v4-exclusive-purple.png",
    5: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v5-exclusive-gold.png",
  },
  priority_delivery: {
    1: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v1-priority-gold.png",
    2: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v2-priority-green.png",
    3: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v3-priority-blue.png",
    4: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v4-priority-purple.png",
    5: "https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/v5-priority-gold.png",
  },
};

// ─── Benefits data ────────────────────────────────────────────────────────
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
    description: "Use your accumulated points as cash at checkout:\n\n• VIP 1 — 100 pts = $1.00\n• VIP 2 — 95 pts = $1.00\n• VIP 3 — 90 pts = $1.00\n• VIP 4 — 85 pts = $1.00\n• VIP 5 — 80 pts = $1.00\n\nHigher VIP level = better conversion rate.",
  },
  {
    id: "points_coupon",
    label: "Points Coupon",
    vipMin: 1,
    description: "Redeem exclusive discount coupons using your points:\n\n• VIP 1 — Coupons up to 5% off\n• VIP 2 — Coupons up to 8% off\n• VIP 3 — Coupons up to 10% off\n• VIP 4 — Coupons up to 15% off\n• VIP 5 — Coupons up to 20% off",
  },
  {
    id: "points_item",
    label: "Points Item",
    vipMin: 1,
    description: "Redeem exclusive in-game items with your points:\n\n• VIP 1 — Basic game passes\n• VIP 2 — Mid-tier items\n• VIP 3 — Premium bundles\n• VIP 4 — Rare limited items\n• VIP 5 — Exclusive special edition packs",
  },
  {
    id: "vip_service",
    label: "VIP Service",
    vipMin: 1,
    description: "Priority customer support:\n\n• VIP 1 — 24h response\n• VIP 2 — 12h response\n• VIP 3 — 6h response\n• VIP 4 — 2h response\n• VIP 5 — Instant + personal manager",
  },
  {
    id: "fast_delivery",
    label: "Fast Delivery",
    vipMin: 1,
    description: "Faster order processing:\n\n• VIP 1 — 3-5 minutes\n• VIP 2 — 2-3 minutes\n• VIP 3 — Under 2 minutes\n• VIP 4 — Under 1 minute\n• VIP 5 — Instant delivery",
  },
  {
    id: "higher_discount",
    label: "Higher Discount",
    vipMin: 2,
    description: "Extra base discount on all purchases:\n\n• VIP 2 — Extra 1% off\n• VIP 3 — Extra 2% off\n• VIP 4 — Extra 3% off\n• VIP 5 — Extra 5% off",
  },
  {
    id: "more_points",
    label: "More Points",
    vipMin: 3,
    description: "Bonus points multiplier:\n\n• VIP 3 — 1.2× multiplier\n• VIP 4 — 1.5× multiplier\n• VIP 5 — 2.0× multiplier (double points!)",
  },
  {
    id: "exclusive_service",
    label: "Exclusive Service",
    vipMin: 4,
    description: "Premium concierge experience:\n\n• VIP 4 — Dedicated agent\n• VIP 5 — White-glove service + senior support",
  },
  {
    id: "priority_delivery",
    label: "Priority Delivery",
    vipMin: 4,
    description: "Highest priority processing:\n\n• VIP 4 — Jump to front of queue\n• VIP 5 — Guaranteed fastest SLA + 5% compensation if >5min",
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
  const theme = VIP_THEMES[activeVipCard] || VIP_THEMES[1];
  const isV5 = activeVipCard === 5;

  const validUntil = joinDate
    ? new Date(joinDate.getTime() + 90 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const validityStr = validUntil.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ─── Get benefit photo for current VIP theme ──────────────────────────────
  const getBenefitPhoto = (benefitId: string) => {
    return BENEFIT_PHOTOS[benefitId]?.[activeVipCard] || BENEFIT_PHOTOS[benefitId]?.[1] || "";
  };

  // ─── VIP Card ──────────────────────────────────────────────────────────────
  const VipCard = ({ level }: { level: number }) => {
    const t = VIP_THEMES[level] || VIP_THEMES[1];
    const isActive = level === vipLevel;
    const isLocked = level > vipLevel;
    const levelPointsNeeded = Math.max(0, getPointsForNextLevel(points) - points);

    return (
      <div className={`relative rounded-2xl p-5 min-w-[260px] border ${t.cardBorder} transition-all shadow-lg ${t.cardBg}`}>
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -right-2 -top-2 w-16 h-16 rounded-full bg-white/10" />
          <div className="absolute right-4 bottom-4 w-24 h-24 opacity-10">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M50 10 L60 40 L90 40 L65 60 L75 90 L50 70 L25 90 L35 60 L10 40 L40 40 Z" fill="white" />
            </svg>
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className={`text-3xl font-black italic ${isV5 ? "text-white" : "text-white/90"}`} style={{ fontFamily: 'serif' }}>VIP {level}</p>
              {isLocked ? (
                <div className="flex items-center gap-1 mt-1">
                  <Lock size={11} className={isV5 ? "text-yellow-300/60" : "text-white/60"} />
                  <p className={`text-xs font-semibold ${isV5 ? "text-yellow-200/70" : "text-white/70"}`}>Locked</p>
                </div>
              ) : (
                <p className={`text-xs font-medium mt-1 ${isV5 ? "text-yellow-100/80" : "text-white/80"}`}>
                  {level < 5 ? `Earn ${levelPointsNeeded} more points to upgrade to VIP ${level + 1}!` : "Maximum VIP level achieved!"}
                </p>
              )}
              {!isLocked && level < 5 && (
                <div className="mt-2 w-full bg-black/20 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all ${isV5 ? "bg-yellow-400" : "bg-white/80"}`}
                    style={{ width: `${Math.min(100, (points / nextLevelPoints) * 100)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 mb-0.5 justify-end">
                <p className={`text-[10px] font-semibold ${isV5 ? "text-yellow-200/70" : "text-white/70"}`}>Validity</p>
                <button onClick={() => setValidityModal(true)}>
                  <Info size={11} className={isV5 ? "text-yellow-300/60" : "text-white/60"} />
                </button>
              </div>
              <p className={`text-xs font-bold ${isV5 ? "text-yellow-100" : "text-white"}`}>{validityStr}</p>
              {!isLocked && (
                <button
                  onClick={() => setBenefitModal({ benefit: BENEFITS[0] })}
                  className={`mt-2 text-xs font-bold px-4 py-2 rounded-full transition-colors ${isV5 ? "bg-black/80 text-yellow-300 hover:bg-black" : "bg-black/80 text-white hover:bg-black"}`}
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
        <path d="M 30 45 Q 90 15 150 35 Q 210 55 270 25" fill="none" className={theme.progressLine} strokeWidth="1.5" />
      </svg>
      {[1, 2, 3, 4, 5].map((level) => {
        const isReached = level <= vipLevel;
        const isCurrent = level === vipLevel;
        const lvlTheme = VIP_THEMES[level];
        return (
          <button key={level} onClick={() => setActiveVipCard(level)} className="flex flex-col items-center relative z-10" style={{ flex: 1 }}>
            <div className={`w-3 h-3 rounded-full border-2 transition-all ${isCurrent ? `${lvlTheme.activeDot} border-white scale-150 shadow-lg` : isReached ? `${lvlTheme.dotColor} border-white` : isV5 ? "bg-gray-700 border-gray-600" : "bg-white/30 border-white/50"}`} />
            <span className={`text-xs font-bold mt-1.5 ${isCurrent ? (isV5 ? "text-yellow-400" : "text-gray-900") : isReached ? (isV5 ? "text-yellow-300/80" : "text-gray-700") : isV5 ? "text-gray-600" : "text-gray-400"}`}>V{level}</span>
          </button>
        );
      })}
    </div>
  );

  // ─── Benefit card for mobile grid ──────────────────────────────────────────
  const BenefitCard = ({ benefit }: { benefit: typeof BENEFITS[0] }) => {
    const isLocked = benefit.vipMin > vipLevel;
    const photoUrl = getBenefitPhoto(benefit.id);

    return (
      <button
        onClick={() => setBenefitModal({ benefit })}
        className={`relative border rounded-xl p-4 flex items-center justify-between text-left transition-all hover:shadow-md ${isLocked ? `${theme.benefitLockedBg} border-gray-200` : `${theme.benefitBg} ${theme.benefitBorder}`}`}
      >
        {isLocked && (
          <div className={`absolute top-2 left-2 ${theme.lockedBadge} text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5`}>
            <Lock size={8} /> V{benefit.vipMin}
          </div>
        )}
        <span className={`text-sm font-semibold ${isLocked ? "text-gray-400 mt-4" : isV5 ? "text-gray-200" : "text-gray-800"}`}>{benefit.label}</span>
        <img 
          src={photoUrl} 
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
    const photoUrl = getBenefitPhoto(benefit.id);

    return (
      <button
        onClick={() => setBenefitModal({ benefit })}
        className={`relative border rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-all hover:shadow-md ${isLocked ? `${theme.benefitLockedBg} border-gray-200` : `${theme.benefitBg} ${theme.benefitBorder}`}`}
      >
        {isLocked && (
          <div className={`absolute top-2 left-2 ${theme.lockedBadge} text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5`}>
            <Lock size={8} /> V{benefit.vipMin}
          </div>
        )}
        <img 
          src={photoUrl} 
          alt={benefit.label}
          className={`w-14 h-14 object-contain ${isLocked ? "grayscale opacity-40" : ""}`}
          onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/56?text=?"; }}
        />
        <span className={`text-xs font-semibold ${isLocked ? "text-gray-400" : isV5 ? "text-gray-300" : "text-gray-800"}`}>{benefit.label}</span>
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
    <div className={`hidden lg:block min-h-screen ${isV5 ? "bg-gray-950" : "bg-[#f5f5f5]"}`}>
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
          <div className={`rounded-lg border overflow-hidden ${isV5 ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"}`}>
            <div className="px-8 py-6">
              <h2 className={`text-xl font-bold mb-6 ${isV5 ? "text-white" : "text-gray-900"}`}>NoxyStore VIP Benefits</h2>

              {/* VIP progress header */}
              <div className={`relative ${theme.headerBg} rounded-2xl p-6 mb-6 overflow-hidden`}>
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/10" />
                  <div className="absolute right-20 top-10 w-24 h-24 rounded-full bg-white/5" />
                  <div className="absolute left-10 bottom-0 w-32 h-32 rounded-full bg-white/5" />
                </div>

                <div className="relative z-10">
                  {/* Avatar + Username */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="relative mb-2">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-2 ${isV5 ? "bg-gray-700 text-yellow-300 border-yellow-500/50" : "bg-gray-400/80 text-white border-white/50"}`}>
                        {user?.nickname?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 text-[10px] font-black px-2 py-0.5 rounded border ${isV5 ? "bg-yellow-600 text-black border-yellow-400" : "bg-black/70 text-white border-white/50"}`}>
                        V{vipLevel}
                      </div>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                        <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                          <path d="M10 0L12.5 6H19L14 10L16 16L10 12L4 16L6 10L1 6H7.5L10 0Z" fill={isV5 ? "#FCD34D" : "white"} fillOpacity="0.8"/>
                        </svg>
                      </div>
                    </div>
                    <p className={`font-bold text-lg ${isV5 ? "text-yellow-100" : "text-gray-900"}`}>{user?.nickname || user?.email?.split("@")[0]}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center justify-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map(l => {
                      const lvlTheme = VIP_THEMES[l];
                      const isReached = l <= vipLevel;
                      const isCurrent = l === vipLevel;
                      return (
                        <button key={l} onClick={() => setActiveVipCard(l)} className="flex flex-col items-center gap-1 transition-all mx-2">
                          <div className={`w-3 h-3 rounded-full border-2 transition-all ${isCurrent ? `${lvlTheme.activeDot} border-white scale-125 shadow-lg` : isReached ? `${lvlTheme.dotColor} border-white` : isV5 ? "bg-gray-700 border-gray-600" : "bg-white/50 border-white/50"}`} />
                          <span className={`text-xs font-bold ${isCurrent ? (isV5 ? "text-yellow-400" : "text-gray-900") : isReached ? (isV5 ? "text-yellow-300/80" : "text-gray-700") : isV5 ? "text-gray-600" : "text-gray-400"}`}>V{l}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* VIP Card */}
                  <VipCard level={activeVipCard} />
                </div>
              </div>

              {/* Benefits grid */}
              <p className={`text-base font-bold text-center mb-1 ${isV5 ? "text-white" : "text-gray-900"}`}>NoxyStore VIP Benefits</p>
              <p className={`text-xs text-center mb-5 ${isV5 ? "text-gray-400" : "text-gray-400"}`}>— Upgrade to unlock more benefits —</p>
              <div className="grid grid-cols-4 gap-3 mb-6">
                {BENEFITS.map(b => <BenefitCardDesktop key={b.id} benefit={b} />)}
              </div>

              {/* FAQ */}
              <div className={`border rounded-xl overflow-hidden ${isV5 ? "border-gray-800 bg-gray-900" : "border-gray-100 bg-white"}`}>
                <p className={`text-base font-bold text-center py-4 border-b ${isV5 ? "text-white border-gray-800" : "text-gray-900 border-gray-100"}`}>NoxyStore VIP Membership Level FAQ</p>
                <div className="divide-y divide-gray-100">
                  {FAQ_ITEMS.map((item, idx) => (
                    <div key={idx}>
                      <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between px-6 py-4 text-left">
                        <span className={`text-sm font-medium ${isV5 ? "text-gray-300" : "text-gray-800"}`}>{item.q}</span>
                        <ChevronDown size={16} className={`transition-transform flex-shrink-0 ml-2 ${openFaq === idx ? "rotate-180" : ""} ${isV5 ? "text-gray-500" : "text-gray-400"}`} />
                      </button>
                      {openFaq === idx && (
                        <div className="px-6 pb-4 -mt-2">
                          <p className={`text-sm leading-relaxed whitespace-pre-line ${isV5 ? "text-gray-400" : "text-gray-600"}`}>{item.a}</p>
                          {item.hasCheckLevel && (
                            <button onClick={() => navigate("/points")} className={`mt-3 text-sm font-bold px-6 py-2.5 rounded-xl ${isV5 ? "bg-yellow-600 text-black" : "bg-black text-white"}`}>Check my level</button>
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
    <div className={`lg:hidden min-h-screen pb-20 ${isV5 ? "bg-gray-950" : "bg-[#f2f2f7]"}`}>
      {/* Mobile header */}
      <div className={`sticky top-0 z-40 flex items-center justify-between px-4 py-3 ${isV5 ? "bg-gray-900 border-b border-gray-800" : "bg-black"}`}>
        <button onClick={() => navigate(-1)} className={isV5 ? "text-yellow-400" : "text-white"}><ArrowLeft size={20} /></button>
        <p className={`font-bold ${isV5 ? "text-yellow-100" : "text-white"}`}>NoxyStore VIP Benefits</p>
        <div className="w-8" />
      </div>

      {/* VIP gradient header */}
      <div className={`relative ${theme.headerBg} overflow-hidden`}>
        <div className="absolute inset-0 opacity-40">
          <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute right-10 top-10 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute left-0 bottom-0 w-32 h-32 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10 px-4 pt-6 pb-4">
          {/* Avatar + Username */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative mb-2">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-2 ${isV5 ? "bg-gray-700 text-yellow-300 border-yellow-500/50" : "bg-gray-400/80 text-white border-white/50"}`}>
                {user?.nickname?.[0]?.toUpperCase() || "U"}
              </div>
              <div className={`absolute -bottom-1 -right-1 text-[10px] font-black px-2 py-0.5 rounded border ${isV5 ? "bg-yellow-600 text-black border-yellow-400" : "bg-black/70 text-white border-white/50"}`}>
                V{vipLevel}
              </div>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                  <path d="M10 0L12.5 6H19L14 10L16 16L10 12L4 16L6 10L1 6H7.5L10 0Z" fill={isV5 ? "#FCD34D" : "white"} fillOpacity="0.8"/>
                </svg>
              </div>
            </div>
            <p className={`font-bold text-base ${isV5 ? "text-yellow-100" : "text-gray-900"}`}>{user?.nickname || user?.email?.split("@")[0]}</p>
          </div>

          <VipProgressBar />

          <div className="mx-2 mb-2">
            <VipCard level={activeVipCard} />
          </div>
        </div>
      </div>

      {/* Benefits grid */}
      <div className={`mt-2 px-4 py-5 ${isV5 ? "bg-gray-900 border-t border-gray-800" : "bg-white"}`}>
        <p className={`text-base font-bold text-center mb-1 ${isV5 ? "text-white" : "text-gray-900"}`}>NoxyStore VIP Benefits</p>
        <p className={`text-xs text-center mb-5 ${isV5 ? "text-gray-500" : "text-gray-400"}`}>— Upgrade to unlock more benefits —</p>
        <div className="grid grid-cols-2 gap-3">
          {BENEFITS.map(b => <BenefitCard key={b.id} benefit={b} />)}
        </div>
      </div>

      {/* FAQ */}
      <div className={`px-4 py-5 mx-4 mb-6 rounded-xl border mt-2 ${isV5 ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
        <p className={`text-base font-bold text-center mb-4 ${isV5 ? "text-white" : "text-gray-900"}`}>NoxyStore VIP Membership Level FAQ</p>
        <div className="space-y-0 divide-y divide-gray-100">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx}>
              <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between py-4 text-left">
                <span className={`text-sm font-medium ${isV5 ? "text-gray-300" : "text-gray-800"}`}>{item.q}</span>
                <ChevronDown size={16} className={`transition-transform flex-shrink-0 ml-2 ${openFaq === idx ? "rotate-180" : ""} ${isV5 ? "text-gray-500" : "text-gray-400"}`} />
              </button>
              {openFaq === idx && (
                <div className="pb-4 -mt-2">
                  <p className={`text-sm leading-relaxed whitespace-pre-line ${isV5 ? "text-gray-400" : "text-gray-600"}`}>{item.a}</p>
                  {item.hasCheckLevel && (
                    <button onClick={() => navigate("/points")} className={`mt-3 w-full text-sm font-bold py-3 rounded-xl ${isV5 ? "bg-yellow-600 text-black" : "bg-black text-white"}`}>Check my level</button>
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
          <div className="absolute inset-0 bg-black/60" />
          <div className={`relative w-full max-w-md rounded-t-3xl lg:rounded-2xl shadow-2xl overflow-hidden z-10 ${isV5 ? "bg-gray-900 border border-gray-800" : "bg-white"}`} onClick={e => e.stopPropagation()}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isV5 ? "border-gray-800 bg-gray-900" : "border-gray-100 bg-gray-50"}`}>
              <button onClick={() => setBenefitModal({ benefit: null })}><X size={20} className={isV5 ? "text-gray-400" : "text-gray-700"} /></button>
              <p className={`font-bold ${isV5 ? "text-white" : "text-gray-900"}`}>{benefitModal.benefit.label}</p>
              <div className="w-6" />
            </div>
            <div className="px-6 py-8 text-center">
              {/* Benefit photo - shows color of ACTIVE VIP card, not user level */}
              <div className="flex justify-center mb-5">
                <img
                  src={getBenefitPhoto(benefitModal.benefit.id)}
                  alt={benefitModal.benefit.label}
                  className={`w-24 h-24 rounded-2xl object-cover ${
                    benefitModal.benefit.vipMin > vipLevel
                      ? "grayscale opacity-40 border-2 border-gray-600"
                      : isV5 ? "border-2 border-yellow-600/50" : "border-2 border-gray-200"
                  }`}
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/96?text=?"; }}
                />
              </div>
              <p className={`text-base leading-relaxed mb-6 whitespace-pre-line text-left ${isV5 ? "text-gray-300" : "text-gray-700"}`}>{benefitModal.benefit.description}</p>
              {benefitModal.benefit.vipMin > vipLevel ? (
                <div>
                  <div className={`rounded-xl px-4 py-3 mb-4 ${isV5 ? "bg-gray-800" : "bg-gray-100"}`}>
                    <p className={`text-sm ${isV5 ? "text-gray-400" : "text-gray-600"}`}>Requires <span className={`font-bold ${isV5 ? "text-yellow-400" : "text-gray-900"}`}>VIP {benefitModal.benefit.vipMin}</span> to unlock</p>
                  </div>
                  <button onClick={() => { setBenefitModal({ benefit: null }); navigate("/points"); }} className={`w-full font-bold py-3 rounded-xl text-sm ${isV5 ? "bg-yellow-600 text-black" : "bg-black text-white"}`}>
                    Upgrade to unlock
                  </button>
                </div>
              ) : (
                <div>
                  <div className={`border rounded-xl px-4 py-3 mb-4 flex items-center gap-2 justify-center ${isV5 ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200"}`}>
                    <Check size={16} className="text-green-500" />
                    <p className={`text-sm font-semibold ${isV5 ? "text-green-400" : "text-green-700"}`}>Active — Your VIP {vipLevel} status</p>
                  </div>
                  {benefitModal.benefit.type === "birthday" && (
                    <p className={`text-xs mb-3 ${isV5 ? "text-gray-500" : "text-gray-500"}`}>Birthday gifts are automatically sent on the day registered in your account settings.</p>
                  )}
                  <button onClick={() => setBenefitModal({ benefit: null })} className={`w-full font-bold py-3 rounded-xl text-sm ${isV5 ? "bg-yellow-600 text-black" : "bg-black text-white"}`}>Got it</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Validity Modal ───────────────────────────────────────────────── */}
      {validityModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => setValidityModal(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className={`relative w-full max-w-md rounded-t-3xl lg:rounded-2xl shadow-2xl z-10 ${isV5 ? "bg-gray-900 border border-gray-800" : "bg-white"}`} onClick={e => e.stopPropagation()}>
            <div className={`px-5 py-4 flex items-center justify-between border-b ${isV5 ? "border-gray-800" : "border-gray-100"}`}>
              <button onClick={() => setValidityModal(false)}><X size={20} className={isV5 ? "text-gray-400" : "text-gray-700"} /></button>
              <p className={`font-bold ${isV5 ? "text-white" : "text-gray-900"}`}>Validity Rules</p>
              <div className="w-6" />
            </div>
            <div className="px-5 py-6">
              <p className={`text-sm leading-relaxed mb-4 ${isV5 ? "text-gray-300" : "text-gray-700"}`}>
                Your VIP membership validity is calculated from the date of your last qualifying transaction. To maintain VIP status:
              </p>
              <ul className={`space-y-2 text-sm list-disc pl-4 ${isV5 ? "text-gray-400" : "text-gray-600"}`}>
                <li>Complete at least 1 order every 3 months</li>
                <li>Maintain the minimum points for your VIP level</li>
                <li>Validity automatically extends with each qualifying order</li>
              </ul>
              <div className={`border rounded-xl px-4 py-3 mt-4 ${isV5 ? "bg-yellow-900/30 border-yellow-700" : "bg-amber-50 border-amber-200"}`}>
                <p className={`text-sm font-semibold ${isV5 ? "text-yellow-400" : "text-amber-800"}`}>Your current validity: {validityStr}</p>
              </div>
            </div>
            <div className="px-5 pb-6">
              <button onClick={() => { setValidityModal(false); navigate("/"); }} className={`w-full font-bold py-3 rounded-xl text-sm ${isV5 ? "bg-yellow-600 text-black" : "bg-black text-white"}`}>
                Go spend &amp; extend validity
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
