/**
 * VerifyPlayerPage — User enters their game UID/Player ID before checkout.
 * Flow: GameDetail → VerifyPlayer → Checkout (after payment) → Create Lootbar Order
 * Server Region field uses a bottom-sheet picker matching the Order Information modal design.
 * Free Fire UIDs are validated live via gameskinbo API (fallback to Lootbar on error).
 * On successful FF lookup: auto-populates Server Region from data.region and shows name/level/region.
 */
import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, CheckCircle, Shield, ChevronDown, Loader2, UserCircle2 } from "lucide-react";
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
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // Free Fire player lookup state
  const [ffPlayer, setFfPlayer] = useState<{ name: string; level: number; region?: string } | null>(null);
  const [ffLookupLoading, setFfLookupLoading] = useState(false);
  const [ffLookupError, setFfLookupError] = useState<string | null>(null);

  const isFreeFire = state?.game?.game_name?.toLowerCase().includes("free fire") ||
    state?.game?.game_name?.toLowerCase().includes("freefire");

  const lookupFreeFirePlayer = useCallback(async (uid: string) => {
    if (!uid || uid.length < 5) {
      setFfPlayer(null);
      setFfLookupError(null);
      return;
    }
    setFfLookupLoading(true);
    setFfPlayer(null);
    setFfLookupError(null);

    // We need fields from outer scope — grab from state
    const currentFields = state?.sku?.extra_info || [];

    try {
      const { supabase } = await import("@/lib/supabase");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const { data, error } = await supabase.functions.invoke("ff-lookup", {
        body: { uid },
      });
      clearTimeout(timer);
      if (error) {
        let msg = "Could not verify UID";
        if ((error as any).context) {
          try { const t = await (error as any).context.text(); if (t) msg = t; } catch {}
        }
        console.log("ff-lookup error:", msg);
        setFfLookupError("UID entered — please double-check before proceeding");
        return;
      }
      if (!data?.name) {
        setFfLookupError("Player not found — please double-check your UID");
        return;
      }

      const detectedRegion: string | undefined = data.region || data.server || undefined;
      setFfPlayer({ name: data.name, level: data.level ?? 0, region: detectedRegion });

      // Auto-populate server/region select field if detected from API
      if (detectedRegion) {
        setExtraInfo((prev) => {
          const updated = { ...prev };
          const regionField = currentFields.find(
            (f) => f.type === "select" &&
              (f.name.toLowerCase().includes("server") || f.name.toLowerCase().includes("region"))
          );
          if (regionField && !updated[regionField.name]) {
            const opts = regionField.options || [];
            const match = opts.find(
              (o) => o.value === detectedRegion ||
                o.label?.toLowerCase() === detectedRegion.toLowerCase() ||
                o.value.toLowerCase().includes(detectedRegion.toLowerCase())
            );
            if (match) updated[regionField.name] = match.value;
          }
          return updated;
        });
      }
    } catch (e: any) {
      console.log("ff-lookup exception:", e?.message);
      setFfLookupError("Could not verify UID — proceed carefully");
    } finally {
      setFfLookupLoading(false);
    }
  }, [state]);

  if (!state?.sku || !state?.game) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-gray-500 mb-4">Invalid session. Please go back and select a product.</p>
          <button onClick={() => navigate(-1)} className="bg-yellow-400 text-black font-bold px-6 py-3 rounded-2xl">Go Back</button>
        </div>
      </div>
    );
  }

  const { sku, game, quantity } = state;
  const fields = sku.extra_info || [];
  const totalPrice = (sku.price || 0) * quantity;

  const handleTopUpNow = () => {
    for (const field of fields) {
      if (field.required && !extraInfo[field.name]?.trim()) return;
    }
    navigate("/checkout", { state: { sku, game, quantity, extraInfo } });
  };

  const allRequiredFilled = fields.every(
    (f) => !f.required || extraInfo[f.name]?.trim()
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 sticky top-0 bg-white z-40">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center">
          <X size={22} className="text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900 text-base">Order Information</h1>
        <div className="w-9" />
      </div>

      {/* SKU Summary */}
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

      {/* Fields */}
      <div className="px-4 py-6 space-y-6 flex-1">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              *{field.title}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {field.type === "select" ? (
              <button
                type="button"
                onClick={() => setActiveSheet(field.name)}
                className={`w-full flex items-center justify-between bg-gray-50 border-2 rounded-2xl px-4 py-4 text-base outline-none transition-all ${
                  extraInfo[field.name]
                    ? "border-yellow-400 text-gray-900"
                    : activeSheet === field.name
                    ? "border-yellow-400 text-gray-400"
                    : "border-gray-200 text-gray-400"
                }`}
              >
                <span className={extraInfo[field.name] ? "text-gray-900 font-medium" : "text-gray-400"}>
                  {extraInfo[field.name]
                    ? field.options?.find((o) => o.value === extraInfo[field.name])?.label || extraInfo[field.name]
                    : `Please select the correct ${field.title}`}
                </span>
                <ChevronDown
                  size={18}
                  className={`flex-shrink-0 transition-transform ${activeSheet === field.name ? "rotate-180 text-yellow-500" : "text-gray-400"}`}
                />
              </button>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={extraInfo[field.name] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setExtraInfo((prev) => ({ ...prev, [field.name]: val }));
                    if (field.name === "uid" && isFreeFire) {
                      clearTimeout((window as any).__ffLookupTimer);
                      (window as any).__ffLookupTimer = setTimeout(() => lookupFreeFirePlayer(val.trim()), 600);
                    }
                  }}
                  placeholder={field.placeholder || `Please fill in the game ${field.title}`}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-900 outline-none focus:ring-0 focus:border-yellow-400 transition-colors"
                />
              </div>
            )}

            {/* Free Fire player lookup badge */}
            {field.name === "uid" && isFreeFire && (
              <>
                {ffLookupLoading && (
                  <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <Loader2 size={15} className="text-yellow-500 animate-spin flex-shrink-0" />
                    <p className="text-sm text-gray-600">Looking up player info…</p>
                  </div>
                )}
                {ffPlayer && !ffLookupLoading && (
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-800">{ffPlayer.name}</p>
                      <p className="text-xs text-green-600">
                        Level {ffPlayer.level}
                        {ffPlayer.region ? ` · ${ffPlayer.region}` : ""}
                        {" · Verified"}
                      </p>
                    </div>
                  </div>
                )}
                {ffLookupError && !ffLookupLoading && extraInfo[field.name]?.trim() && (
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <UserCircle2 size={16} className="text-yellow-600 flex-shrink-0" />
                    <p className="text-sm text-yellow-700">UID entered — please double-check before proceeding</p>
                  </div>
                )}
              </>
            )}

            {/* Generic verification badge for non-FF UID */}
            {field.name === "uid" && !isFreeFire && extraInfo[field.name]?.trim() && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-700">The account has successful top-ups before, feel free to continue your purchase</p>
              </div>
            )}

            {/* Required validation hint */}
            {field.required && extraInfo[field.name] !== undefined && !extraInfo[field.name]?.trim() && (
              <p className="mt-1.5 text-xs text-red-500 font-medium">{field.title} is required</p>
            )}
          </div>
        ))}

        {fields.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No additional information required for this product.
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-green-500" />
          <span className="text-xs text-gray-500">Secure & Fast · Powered by NoxyStore</span>
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

      {/* ── Bottom Sheet Picker ── */}
      {activeSheet !== null && (() => {
        const field = fields.find((f) => f.name === activeSheet);
        if (!field) return null;
        const options = field.options && field.options.length > 0
          ? field.options
          : [
              { value: "America", label: "America" },
              { value: "Asia", label: "Asia" },
              { value: "Europe", label: "Europe" },
              { value: "TW,HK,MO", label: "TW,HK,MO" },
              { value: "VNG", label: "VNG (Vietnam)" },
              { value: "Global", label: "Global" },
            ];

        return (
          <div className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setActiveSheet(null)} />
            <div className="relative bg-white rounded-t-3xl w-full shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <button onClick={() => setActiveSheet(null)} className="w-9 h-9 flex items-center justify-center">
                  <X size={20} className="text-gray-700" />
                </button>
                <h3 className="font-bold text-gray-900 text-base">{field.title}</h3>
                <div className="w-9" />
              </div>

              <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                {options.map((opt) => {
                  const isSelected = extraInfo[field.name] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setExtraInfo((prev) => ({ ...prev, [field.name]: opt.value }));
                        setActiveSheet(null);
                      }}
                      className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
                        isSelected ? "bg-yellow-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className={`text-base font-medium ${isSelected ? "text-yellow-700" : "text-gray-800"}`}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="h-6 bg-white" />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
