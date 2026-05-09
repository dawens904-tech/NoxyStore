import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import couponChest from "@/assets/coupon-chest.png";
import coupon10off from "@/assets/coupon-10off.png";
import coupon6off from "@/assets/coupon-6off.png";

const MODAL_KEY = "noxy_coupon_modal_dismissed";
const COOLDOWN_DAYS = 3;

function getCountdownToMidnight() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return { h, m, s };
}

interface NewUserCouponModalProps {
  isAuthenticated: boolean;
}

export function NewUserCouponModal({ isAuthenticated }: NewUserCouponModalProps) {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState(getCountdownToMidnight());

  // Check if we should show modal
  useEffect(() => {
    if (isAuthenticated) return;
    const stored = localStorage.getItem(MODAL_KEY);
    if (stored) {
      const dismissedAt = parseInt(stored, 10);
      const elapsed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (elapsed < COOLDOWN_DAYS) return;
    }
    // Show after 1.5s delay
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Countdown timer
  useEffect(() => {
    if (!show) return;
    const interval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : getCountdownToMidnight()));
    }, 1000);
    return () => clearInterval(interval);
  }, [show]);

  const dismiss = useCallback(() => {
    localStorage.setItem(MODAL_KEY, String(Date.now()));
    setShow(false);
  }, []);

  const handleCollect = () => {
    dismiss();
    navigate("/login");
  };

  if (!show) return null;

  const { h, m, s } = formatTime(countdown);

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm mx-4 mb-4 sm:mb-0">
        {/* Chest image floating at top-right */}
        <div className="absolute -top-20 -right-2 w-44 h-36 pointer-events-none z-20">
          <img src={couponChest} alt="Reward chest" className="w-full h-full object-contain drop-shadow-2xl" />
        </div>

        {/* Main card */}
        <div className="bg-[#FEF3C7] rounded-3xl overflow-hidden shadow-2xl pt-4 pb-0">
          {/* Coupons */}
          <div className="px-4 space-y-3 pb-4">
            {/* 10% Coupon */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-yellow-100">
              <div className="flex items-center gap-3 p-4 pb-3">
                <img src={coupon10off} alt="10% OFF" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-orange-500 font-black text-xl leading-none">10% OFF <span className="text-sm font-semibold">(Max: $10.00)</span></p>
                  <p className="text-gray-500 text-xs mt-1">Valid for orders over $0.01</p>
                  <p className="text-gray-900 font-bold text-sm mt-0.5">New User 10% OFF Coupon</p>
                </div>
              </div>
              <div className="border-t border-dashed border-yellow-200 mx-4" />
              <div className="px-4 py-2.5 flex items-center justify-between">
                <p className="text-gray-400 text-sm">Expires in 14 days</p>
                <div className="w-6 h-6 bg-[#FEF3C7] rounded-full border border-yellow-200" />
              </div>
            </div>

            {/* 6% Coupon */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-yellow-100">
              <div className="flex items-center gap-3 p-4 pb-3">
                <img src={coupon6off} alt="6% OFF" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-orange-500 font-black text-xl leading-none">6% OFF <span className="text-sm font-semibold">(Max: $6.00)</span></p>
                  <p className="text-gray-500 text-xs mt-1">Valid for orders over $0.01</p>
                  <p className="text-gray-900 font-bold text-sm mt-0.5">New User 6% OFF Coupon</p>
                </div>
              </div>
              <div className="border-t border-dashed border-yellow-200 mx-4" />
              <div className="px-4 py-2.5 flex items-center justify-between">
                <p className="text-gray-400 text-sm">Expires in 14 days</p>
                <div className="w-6 h-6 bg-[#FEF3C7] rounded-full border border-yellow-200" />
              </div>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-3 py-3 bg-white/60">
            <span className="text-gray-600 text-sm font-medium">Countdown</span>
            {[
              { val: String(h).padStart(2, "0"), label: "h" },
              { val: String(m).padStart(2, "0"), label: "m" },
              { val: String(s).padStart(2, "0"), label: "s" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <span className="text-gray-700 font-bold text-lg">:</span>}
                <div className="bg-gray-900 text-white font-black text-lg w-10 h-9 rounded-lg flex items-center justify-center tabular-nums">
                  {item.val}
                </div>
              </div>
            ))}
          </div>

          {/* Sign up text */}
          <p className="text-center text-gray-600 text-sm py-2 font-medium">Sign up to get Coupon</p>

          {/* Collect button */}
          <button
            onClick={handleCollect}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-black text-base py-5 transition-colors flex items-center justify-center gap-3"
          >
            COLLECT COUPON
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-11 h-11 bg-white/20 border-2 border-white/40 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
