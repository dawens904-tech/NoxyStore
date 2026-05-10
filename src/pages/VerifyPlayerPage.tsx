/**
 * VerifyPlayerPage — User enters their game UID/Player ID before checkout.
 * Flow: GameDetail → VerifyPlayer → Checkout (after payment) → Create Lootbar Order
 */
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, CheckCircle, Loader2, Shield } from "lucide-react";
import type { LootbarGame, SkuItem } from "@/types";

interface LocationState {
  sku: SkuItem;
  game: LootbarGame;
  quantity: number;
}

export function VerifyPlayerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [extraInfo, setExtraInfo] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState(false);

  if (!state?.sku || !state?.game) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-gray-500 mb-4">Invalid session. Please go back and select a product.</p>
          <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
        </div>
      </div>
    );
  }

  const { sku, game, quantity } = state;
  const fields = sku.extra_info || [];
  const totalPrice = (sku.price || 0) * quantity;
  const savings = (sku.discount_amount || 0) * quantity;

  const handleTopUpNow = () => {
    // Validate required fields
    for (const field of fields) {
      if (field.required && !extraInfo[field.name]?.trim()) {
        return;
      }
    }
    navigate("/checkout", { state: { sku, game, quantity, extraInfo } });
  };

  const allRequiredFilled = fields.every(
    (f) => !f.required || extraInfo[f.name]?.trim()
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 sticky top-0 bg-white z-40">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center">
          <X size={22} className="text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900 text-base">Order Information</h1>
        <div className="w-9" />
      </div>

      {/* SKU Summary (small, at top) */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <img
          src={sku.image || game.game_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80&h=80&fit=crop"}
          alt={sku.sku_name}
          className="w-14 h-14 rounded-xl object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80&h=80&fit=crop"; }}
        />
        <div>
          <p className="font-bold text-gray-900 text-sm">{sku.sku_name}</p>
          <p className="text-xs text-gray-500">{game.game_name}</p>
          <p className="text-sm font-bold text-orange-500 mt-0.5">${totalPrice.toFixed(2)}</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-5">
        {/* Extra Info Fields */}
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              *{field.title}
            </label>
            {field.type === "select" ? (
              <div className="relative">
                <select
                  value={extraInfo[field.name] || ""}
                  onChange={(e) => setExtraInfo((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-900 outline-none focus:ring-2 focus:ring-yellow-400 appearance-none"
                >
                  <option value="">Select {field.title}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={extraInfo[field.name] || ""}
                  onChange={(e) => setExtraInfo((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  placeholder={field.placeholder || `Please fill in the game ${field.title}`}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-900 outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            )}

            {/* Verification badge when UID is filled */}
            {field.name === "uid" && extraInfo[field.name]?.trim() && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-700">The account has successful top-ups before, feel free to continue your purchase</p>
              </div>
            )}
            {field.required && !extraInfo[field.name]?.trim() && extraInfo[field.name] !== undefined && (
              <p className="mt-1.5 text-xs text-red-500 font-medium">{field.title} is required</p>
            )}
          </div>
        ))}
      </div>

      {/* Spacer to push button to bottom */}
      <div className="flex-1" />

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-green-500" />
          <span className="text-xs text-gray-500">Secure & Fast • Powered by NoxyStore</span>
        </div>
        <button
          onClick={handleTopUpNow}
          disabled={!allRequiredFilled}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            allRequiredFilled
              ? "bg-yellow-400 text-black hover:bg-yellow-300 active:scale-[0.99]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Top-up Now
        </button>
      </div>
    </div>
  );
}
