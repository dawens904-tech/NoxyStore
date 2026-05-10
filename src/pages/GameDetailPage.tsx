import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, Zap, Shield, Clock, ChevronRight, Info, AlertCircle, X, Check, Copy } from "lucide-react";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { FloatingChat } from "@/components/features/FloatingChat";
import { lootbarApi } from "@/lib/lootbar-api";
import { MOCK_GAMES } from "@/constants/mockData";
import type { LootbarGame, SkuItem } from "@/types";
import { useSettingsStore } from "@/stores/settingsStore";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { formatPrice } = useSettingsStore();

  const [game, setGame] = useState<LootbarGame | null>(null);
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedSku, setSelectedSku] = useState<SkuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [markup, setMarkup] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [useShorterInvite, setUseShorterInvite] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    // Track page view
    trackEvent("game_view", { page: `/game/${gameId}`, gameId });

    // Load game
    const foundGame = MOCK_GAMES.find((g) => g.game_id === gameId) || null;
    setGame(foundGame);

    // Load markup setting
    supabase.from("markup_settings").select("markup_percent").eq("id", 1).single().then(({ data }) => {
      if (data) setMarkup(Number(data.markup_percent) || 0);
    });

    // Load SKUs
    lootbarApi.getSkus(gameId).then((data) => {
      setSkus(data);
      if (data.length > 0) {
        const regions = [...new Set(data.map((s) => s.attribute[0]?.value || "global"))];
        setSelectedRegion(regions[0]);
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));

    // Game-specific notice
    setNotice("Americas Area Topup may take 10 minutes. Longer during busy periods.");

    // Load referral code
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user?.email) return;
      supabase.from("referral_codes").select("code, short_code").eq("user_email", user.email).single().then(({ data: ref }) => {
        if (ref) setReferralCode(ref.short_code || ref.code);
      });
    });
  }, [gameId]);

  const regions = useMemo(() => {
    const seen = new Set<string>();
    return skus.filter((s) => {
      const region = s.attribute[0]?.value;
      if (region && !seen.has(region)) { seen.add(region); return true; }
      return false;
    }).map((s) => ({ value: s.attribute[0]?.value, label: s.attribute[0]?.value_text || s.attribute[0]?.value }));
  }, [skus]);

  const filteredSkus = useMemo(() => {
    if (!selectedRegion) return skus;
    return skus.filter((s) => s.attribute[0]?.value === selectedRegion || s.attribute.length === 0);
  }, [skus, selectedRegion]);

  // Apply markup to price
  const applyMarkup = (price: number) => price * (1 + markup / 100);

  const totalPrice = selectedSku ? applyMarkup(selectedSku.price || 0) * quantity : 0;
  const totalSavings = selectedSku ? (selectedSku.discount_amount || 0) * quantity : 0;
  const originalPrice = selectedSku ? (selectedSku.original_price || selectedSku.price || 0) * quantity : 0;

  const handleTopUpNow = () => {
    if (!selectedSku) {
      toast.error("Please select a package first");
      return;
    }
    const extraInfoFields = selectedSku.extra_info || [];
    // Check if UID/extra info is needed
    if (extraInfoFields.length > 0) {
      // Go to verify player page first
      navigate("/verify-player", {
        state: { sku: { ...selectedSku, price: applyMarkup(selectedSku.price || 0) }, game, quantity },
      });
    } else {
      navigate("/checkout", {
        state: { sku: { ...selectedSku, price: applyMarkup(selectedSku.price || 0) }, game, quantity, extraInfo: {} },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="hidden lg:block"><DesktopHeader /></div>
        <div className="bg-dark-header px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => navigate(-1)} className="text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg></button>
          <span className="text-white font-bold">Top-up</span>
        </div>
        <div className="px-4 pt-4 space-y-4 max-w-[1280px] mx-auto">
          <div className="shimmer h-32 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="shimmer h-32 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  // ─── Desktop Layout ────────────────────────────────────────────────────────
  const DesktopLayout = () => (
    <div className="hidden lg:block min-h-screen bg-[#f5f5f5]">
      <DesktopHeader />

      {/* Breadcrumb + trust */}
      <div className="max-w-[1280px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Home</button>
          <ChevronRight size={14} />
          <button onClick={() => navigate("/categories")} className="hover:text-gray-700">Top Up</button>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium">{game?.game_name} Top Up</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-semibold">Excellent</span>
          <div className="flex gap-0.5">
            {Array.from({length:5}).map((_,i)=><div key={i} className="w-5 h-5 bg-green-500 rounded-sm flex items-center justify-center"><Star size={10} fill="white" stroke="none" /></div>)}
          </div>
          <span className="text-sm text-gray-500">44,884 reviews on Trustpilot</span>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 pb-16">
        <div className="flex gap-6">
          {/* Left: Game info + products */}
          <div className="flex-1 min-w-0">
            {/* Game header card */}
            <div className="bg-white rounded-2xl p-6 mb-4 border border-gray-100">
              <div className="flex items-start gap-4">
                <img
                  src={imgError ? "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop" : (game?.game_image || "")}
                  alt={game?.game_name}
                  className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                  onError={() => setImgError(true)}
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-black text-gray-900 mb-1">{game?.game_name}</h1>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-yellow-400 text-black text-xs font-bold px-1.5 py-0.5 rounded">{game?.rating?.toFixed(1)}</span>
                          <div className="flex">{Array.from({length:5}).map((_,i)=><Star key={i} size={14} fill="#FFD200" stroke="none" />)}</div>
                          <span className="text-sm text-gray-400">30,000+ reviews</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm text-gray-500">{game?.sold_count} Sold</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-gray-600"><Zap size={14} className="text-yellow-500" /> Fast</span>
                        <span className="flex items-center gap-1.5 text-gray-600"><Shield size={14} className="text-green-500" /> Safe</span>
                        <span className="flex items-center gap-1.5 text-gray-600"><Clock size={14} className="text-blue-500" /> 24/7</span>
                      </div>
                    </div>

                    {/* Promo banner (top right) */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl px-4 py-3 text-center hidden xl:block">
                      <div className="flex items-center gap-1 justify-center text-orange-600 font-mono text-sm font-bold mb-1">
                        <span>19</span><span>:</span><span>21</span><span>:</span><span>03</span>
                      </div>
                      <p className="text-xs text-gray-700">Invite Friends and Get <span className="text-orange-500 font-bold">3×10% OFF</span></p>
                      <button className="mt-2 bg-orange-400 text-white text-xs font-bold px-4 py-1.5 rounded-xl hover:bg-orange-500">Invite Now</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notice */}
              {notice && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-yellow-600 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">{notice}</p>
                  </div>
                  <button onClick={() => setNotice(null)} className="text-gray-400 hover:text-gray-600 ml-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
            </div>

            {/* Region tabs */}
            {regions.length > 1 && (
              <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {regions.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => { setSelectedRegion(r.value); setSelectedSku(null); }}
                      className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        selectedRegion === r.value
                          ? "border-yellow-400 bg-yellow-50 text-yellow-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SKU grid */}
            <div className="bg-white rounded-2xl p-5 mb-4 border border-gray-100">
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredSkus.map((sku) => {
                  const markedPrice = applyMarkup(sku.price || 0);
                  const savings = sku.discount_amount || 0;
                  const isSelected = selectedSku?.sku_id === sku.sku_id;
                  return (
                    <button
                      key={sku.sku_id}
                      onClick={() => setSelectedSku(sku)}
                      className={`relative flex flex-col bg-white rounded-xl border-2 overflow-hidden transition-all hover:shadow-md text-left ${
                        isSelected ? "border-yellow-400 shadow-md" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {/* SKU image */}
                      <div className="aspect-[4/3] bg-gray-100">
                        <img
                          src={sku.image || game?.game_image}
                          alt={sku.sku_name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=150&fit=crop"; }}
                        />
                      </div>
                      <button className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center">
                        <Info size={10} className="text-gray-500" />
                      </button>

                      <div className="p-2.5">
                        <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 mb-1.5">{sku.sku_name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-orange-500">${markedPrice.toFixed(2)}</span>
                          {savings > 0 && (
                            <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                              -${savings.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {savings > 0 && (
                          <p className="text-[10px] text-gray-400 line-through">${(sku.original_price || sku.price || 0).toFixed(2)}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Top-up instructions */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top-up instructions</h3>
              <h4 className="font-bold text-gray-900 mb-2">{game?.game_name} Top-up Guidance</h4>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Please be sure to fill in the required information accurately to prevent your top-up from being delayed.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Top-up takes about 3–5 minutes. In special cases, the recharge arrival time may be delayed.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <h5 className="font-semibold text-gray-800 text-sm mb-1">Applicable Platform</h5>
                  <p className="text-sm text-gray-500">Mobile game</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 text-sm mb-1">Delivery Method</h5>
                  <p className="text-sm text-gray-500">Direct top-up via API</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Sticky order panel */}
          <div className="w-72 flex-shrink-0">
            <div className="sticky top-20">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 mb-4">Order Information</h3>

                  {/* UID fields for selected SKU */}
                  {selectedSku && selectedSku.extra_info?.map((field) => (
                    <div key={field.name} className="mb-4">
                      <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                        *{field.title}
                      </label>
                      <input
                        type="text"
                        placeholder={field.placeholder || `Please fill in the game ${field.title}`}
                        className="w-full border border-red-300 focus:border-yellow-400 rounded-xl px-3 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-yellow-200 transition-colors"
                        readOnly
                        onClick={handleTopUpNow}
                      />
                      <p className="text-xs text-red-500 mt-1 font-medium">
                        <AlertCircle size={10} className="inline mr-1" />{field.title} is required
                      </p>
                    </div>
                  ))}

                  {!selectedSku && (
                    <div className="bg-gray-50 rounded-xl p-3 text-center text-sm text-gray-500 mb-4">
                      Select a package to continue
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-gray-700">Quantity</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor"><rect width="12" height="2" rx="1" /></svg>
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M7 1a1 1 0 00-2 0v4H1a1 1 0 000 2h4v4a1 1 0 002 0V7h4a1 1 0 000-2H7V1z" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Price</span>
                    <span className="text-xl font-black text-orange-500">
                      {selectedSku ? `$${totalPrice.toFixed(2)}` : "—"}
                    </span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex items-center justify-between mb-3">
                      <button className="text-xs text-orange-500 font-semibold flex items-center gap-0.5">
                        Savings ${totalSavings.toFixed(2)} <ChevronRight size={10} />
                      </button>
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    onClick={handleTopUpNow}
                    disabled={!selectedSku}
                    className={`w-full py-3.5 rounded-xl font-bold text-base transition-all mt-2 ${
                      selectedSku
                        ? "bg-yellow-400 hover:bg-yellow-300 text-black active:scale-[0.99]"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Top-up Now
                  </button>

                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    <Shield size={13} className="text-green-500" />
                    <span className="text-xs text-gray-500">NoxyStore Security Guarantee</span>
                    <span className="text-xs text-gray-400">24/7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FloatingChat />
    </div>
  );

  // ─── Mobile Layout ─────────────────────────────────────────────────────────
  const MobileLayout = () => (
    <div className="lg:hidden bg-white min-h-screen">
      {/* Mobile Header */}
      <div className="bg-[#0a0a0a] sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            </button>
            <span className="text-white font-bold text-base">Top-up</span>
          </div>
          <div className="flex items-center gap-3 text-white/70 text-xs">
            <span className="flex items-center gap-1"><Zap size={12} className="text-yellow-400" /> Fast</span>
            <span className="flex items-center gap-1"><Shield size={12} className="text-green-400" /> Safe</span>
            <span className="flex items-center gap-1"><Clock size={12} className="text-blue-400" /> 24/7</span>
          </div>
        </div>
      </div>

      <div className="pb-40">
        {/* Game info */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img
              src={imgError ? "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80&h=80&fit=crop" : (game?.game_image || "")}
              alt={game?.game_name}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              onError={() => setImgError(true)}
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900">{game?.game_name}</h1>
              <p className="text-sm text-gray-500">{game?.sold_count || "100k+"} Sold</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="bg-yellow-400 text-black text-xs font-bold px-1.5 py-0.5 rounded">{game?.rating?.toFixed(1)}</span>
                <div className="flex">{Array.from({length:5}).map((_,i)=><Star key={i} size={12} fill="#FFD200" stroke="none" />)}</div>
                <span className="text-xs text-gray-400">30,349</span>
              </div>
            </div>
          </div>
          {/* Promo — gift opens Invite Friends modal */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="mt-3 w-full bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl px-3 py-2.5 flex items-center justify-between text-left active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-orange-500 flex-shrink-0"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
              <div>
                <p className="text-xs font-bold text-orange-600">Invite Friends · Get 3×10% OFF</p>
                <p className="text-[11px] text-gray-600">Share to earn discount coupons</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
          </button>

          {notice && (
            <div className="mt-2 border border-gray-200 rounded-xl px-3 py-2.5 flex items-center justify-between">
              <p className="text-xs text-gray-600">{notice}</p>
              <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
            </div>
          )}
        </div>

        {/* Region tabs */}
        {regions.length > 1 && (
          <div className="px-4 pt-3 pb-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {regions.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setSelectedRegion(r.value); setSelectedSku(null); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                    selectedRegion === r.value
                      ? "border-yellow-400 text-yellow-600 bg-yellow-50"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SKU grid */}
        <div className="px-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            {filteredSkus.map((sku) => {
              const markedPrice = applyMarkup(sku.price || 0);
              const savings = sku.discount_amount || 0;
              const isSelected = selectedSku?.sku_id === sku.sku_id;
              return (
                <button
                  key={sku.sku_id}
                  onClick={() => setSelectedSku(sku)}
                  className={`relative flex flex-col bg-white rounded-xl border-2 overflow-hidden text-left transition-all ${
                    isSelected ? "border-yellow-400 shadow-md" : "border-gray-200"
                  }`}
                >
                  <div className="aspect-[4/3] bg-gray-100">
                    <img
                      src={sku.image || game?.game_image}
                      alt={sku.sku_name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=150&fit=crop"; }}
                    />
                  </div>
                  <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center">
                    <Info size={10} className="text-gray-500" />
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 mb-1">{sku.sku_name}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black text-orange-500">${markedPrice.toFixed(2)}</span>
                      {savings > 0 && (
                        <span className="bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">-${savings.toFixed(2)}</span>
                      )}
                    </div>
                    {savings > 0 && <p className="text-[10px] text-gray-400 line-through">${(sku.original_price || sku.price || 0).toFixed(2)}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top-up instructions */}
        <div className="px-4 mt-5">
          <h3 className="text-base font-bold text-gray-900 mb-2">Top-up instructions</h3>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <h4 className="font-bold text-gray-900 mb-2">{game?.game_name} Top-up Guidance</h4>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">Please be sure to fill in the required information accurately to prevent your top-up from being delayed.</p>
            <p className="text-sm text-gray-600 leading-relaxed">Top-up takes about 3–5 minutes. In special cases, the recharge arrival time may be delayed.</p>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-1">Applicable Platform</p>
              <p className="text-sm text-gray-500">Mobile game</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-3 z-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Quantity</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-9 h-9 rounded-xl border border-gray-300 flex items-center justify-center text-gray-600">−</button>
            <span className="text-base font-bold w-6 text-center">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="w-9 h-9 rounded-xl border border-gray-300 flex items-center justify-center text-gray-600">+</button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            {totalSavings > 0 && (
              <button className="flex items-center gap-1 text-orange-500 text-xs font-semibold mb-0.5">
                Savings ${totalSavings.toFixed(2)} <ChevronRight size={12} />
              </button>
            )}
            <p className="text-xl font-bold text-orange-500">
              {selectedSku ? `$${totalPrice.toFixed(2)}` : "—"}
            </p>
          </div>
          <button
            onClick={handleTopUpNow}
            disabled={!selectedSku}
            className={`px-8 py-3 rounded-2xl font-bold text-base transition-all ${
              selectedSku ? "bg-yellow-400 text-black hover:bg-yellow-300" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Top-up Now
          </button>
        </div>
      </div>

      <FloatingChat />

      {/* ── Invite Friends Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-white rounded-t-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setShowInviteModal(false)}><X size={20} className="text-gray-700" /></button>
              <h3 className="font-black text-gray-900">Invite Friends</h3>
              <div className="w-6" />
            </div>

            {/* Reward Claim Progress */}
            <div className="px-5 py-4">
              <p className="text-sm text-gray-500 text-center mb-4">Reward Claim Progress</p>
              <div className="bg-yellow-50 rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-between">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-yellow-400 bg-yellow-50 flex items-center justify-center mb-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" className="w-7 h-7"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7"/><path d="M16 14l2 2 4-4"/></svg>
                      </div>
                      <p className="text-[10px] text-gray-500 mb-0.5">to be claimed</p>
                      <p className="text-sm font-black text-orange-500">10% OFF</p>
                      {i < 2 && <div className="absolute" />}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-sm font-semibold text-gray-700 text-center mb-4">Share to</p>

              {/* Social share */}
              <div className="flex items-center justify-center gap-6 mb-5">
                {[
                  { key: "twitter", label: "X", bg: "#000", icon: <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.843L1.254 2.25H8.08l4.257 5.629L18.244 2.25z"/></svg> },
                  { key: "facebook", label: "Facebook", bg: "#1877F2", icon: <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                  { key: "whatsapp", label: "WhatsApp", bg: "#25D366", icon: <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
                  { key: "discord", label: "Discord", bg: "#5865F2", icon: <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg> },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      const link = useShorterInvite
                        ? `https://noxystore.gg/s/${referralCode}`
                        : `https://noxystore.gg?ref=${referralCode}`;
                      const text = encodeURIComponent(`Get 10% OFF on NoxyStore! ${link}`);
                      const urls: Record<string,string> = {
                        twitter: `https://twitter.com/intent/tweet?text=${text}`,
                        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
                        whatsapp: `https://wa.me/?text=${text}`,
                        discord: `https://discord.com/channels/@me`,
                      };
                      window.open(urls[p.key], "_blank");
                    }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: p.bg }}>{p.icon}</div>
                    <span className="text-xs text-gray-600 font-medium">{p.label}</span>
                  </button>
                ))}
              </div>

              {/* Share link */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-gray-100 rounded-xl px-3 py-3 text-sm text-gray-500 font-mono truncate">
                  {useShorterInvite
                    ? `https://noxystore.gg/s/${referralCode || "..."}`
                    : `https://noxystore.gg?ref=${referralCode || "..."}`
                  }
                </div>
                <button
                  onClick={async () => {
                    const link = useShorterInvite
                      ? `https://noxystore.gg/s/${referralCode}`
                      : `https://noxystore.gg?ref=${referralCode}`;
                    await navigator.clipboard.writeText(link);
                    setInviteCopied(true);
                    setTimeout(() => setInviteCopied(false), 2000);
                  }}
                  className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-3 rounded-xl flex items-center gap-1.5 whitespace-nowrap text-sm"
                >
                  {inviteCopied ? <Check size={14} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
                  Copy Link
                </button>
              </div>

              {/* Shorter link toggle */}
              <button onClick={() => setUseShorterInvite(!useShorterInvite)} className="flex items-center gap-2 text-sm text-gray-500 mb-5">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${useShorterInvite ? "bg-yellow-400 border-yellow-400" : "border-gray-300"}`}>
                  {useShorterInvite && <Check size={11} className="text-black" />}
                </div>
                Share with a shorter link
              </button>

              {/* Rules */}
              <p className="text-sm font-bold text-gray-900 mb-3">Rules:</p>
              <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
                <p>1. After successfully inviting a friend to register on NoxyStore, they will get 2 coupons worth up to 10% off each.</p>
                <p>2. For every 5 invited users who complete an order, you earn a 10% OFF coupon for yourself.</p>
                <p>3. The 3 reward slots above will fill up as your friends complete their first orders. You can keep inviting to earn more rewards!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <DesktopLayout />
      <MobileLayout />
    </>
  );
}
