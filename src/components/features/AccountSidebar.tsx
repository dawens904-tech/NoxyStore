/**
 * AccountSidebar — Shared desktop sidebar used across Account, Balance, Points, VipBenefits pages.
 * Pass `activePage` to highlight the current section.
 * Auto-fetches real wallet balance and points from wallet_transactions on mount.
 */
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";

type ActivePage = "buyHistory" | "coupon" | "settings" | "balance" | "points" | "vip" | "invite" | "affiliate" | "feedback" | "helpCenter";

interface AccountSidebarProps {
  activePage: ActivePage;
  /** Override balance display (e.g. from BalancePage's live fetch) */
  balanceOverride?: number;
  /** Override points display (e.g. from PointsPage's live fetch) */
  pointsOverride?: number;
  className?: string;
}

const NAV_ITEMS: { label: string; path: string; key: ActivePage; highlight?: boolean }[] = [
  { label: "Buy History", path: "/buy-history", key: "buyHistory" },
  { label: "Coupon", path: "/coupons", key: "coupon" },
  { label: "Settings", path: "/account", key: "settings" },
  { label: "Help Center", path: "/support", key: "helpCenter" },
  { label: "Feedback", path: "/feedback", key: "feedback" },
  { label: "Invite for Coupons", path: "/invite", key: "invite" },
  { label: "Affiliate Program", path: "/affiliate", key: "affiliate", highlight: true },
];

export function AccountSidebar({ activePage, balanceOverride, pointsOverride, className = "" }: AccountSidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [fetchedBalance, setFetchedBalance] = useState<number | null>(null);
  const [fetchedPoints, setFetchedPoints] = useState<number | null>(null);

  // Auto-fetch real wallet balance and points from wallet_transactions
  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from("wallet_transactions")
      .select("type, amount, status")
      .eq("user_email", user.email)
      .eq("status", "completed")
      .then(({ data }) => {
        if (!data) return;
        // Balance calculation
        if (balanceOverride === undefined) {
          const CREDIT = ["topup", "refund", "bonus"];
          const DEBIT  = ["purchase", "withdraw"];
          const bal = data.reduce((acc, tx) => {
            if (CREDIT.includes(tx.type)) return acc + Math.abs(tx.amount);
            if (DEBIT.includes(tx.type))  return acc - Math.abs(tx.amount);
            return acc;
          }, 0);
          setFetchedBalance(Math.max(0, parseFloat(bal.toFixed(2))));
        }
        // Points calculation
        if (pointsOverride === undefined) {
          const pts = data.reduce((acc, tx) => {
            if (tx.type === "points_earned")   return acc + Math.abs(tx.amount);
            if (tx.type === "points_redeemed") return acc - Math.abs(tx.amount);
            return acc;
          }, 0);
          setFetchedPoints(Math.max(0, Math.round(pts)));
        }
      });
  }, [user?.email, balanceOverride, pointsOverride]);

  const displayBalance = balanceOverride !== undefined
    ? balanceOverride
    : (fetchedBalance !== null ? fetchedBalance : (user?.balance ?? 0));
  const displayPoints = pointsOverride !== undefined
    ? pointsOverride
    : (fetchedPoints !== null ? fetchedPoints : (user?.points ?? 0));

  return (
    <div className={`w-72 flex-shrink-0 ${className}`}>
      {/* User card */}
      <div className="bg-white shadow-sm p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          {user?.avatar ? (
            <img src={user.avatar} alt="avatar" className="w-14 h-14 rounded-full object-cover border-2 border-gray-100" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {user?.nickname?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900 text-sm">{user?.nickname || user?.email?.split("@")[0]}</p>
            <button
              onClick={() => navigate("/vip")}
              className="text-xs text-yellow-600 font-medium flex items-center gap-1 hover:underline"
            >
              Check VIP Benefits <ChevronRight size={12} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 py-3 border-y border-gray-100">
          <button onClick={() => navigate("/balance")} className="hover:opacity-80 transition-opacity text-left">
            <p className="text-lg font-bold text-gray-900">${displayBalance.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Balance</p>
          </button>
          <div className="h-8 w-px bg-gray-200" />
          <button onClick={() => navigate("/points")} className="hover:opacity-80 transition-opacity text-left">
            <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
              <span className="text-yellow-500">●</span> {displayPoints}
              <span className="text-[9px] bg-red-500 text-white font-bold px-1 py-0.5 rounded ml-0.5">NEW</span>
            </p>
            <p className="text-xs text-gray-500">Points</p>
          </button>
        </div>
      </div>

      {/* Nav list */}
      <div className="bg-white shadow-sm overflow-hidden">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${
              activePage === item.key
                ? "bg-yellow-50 text-yellow-700 border-l-4 border-l-yellow-400"
                : item.highlight
                ? "text-yellow-500 hover:bg-yellow-50"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span>{item.label}</span>
            <ChevronRight size={14} className="text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
}


