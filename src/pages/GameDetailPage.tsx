
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { MobileFooter } from "@/components/layout/MobileFooter";
import { Star, Zap, Shield, Clock, ChevronRight, Info, AlertCircle, X, Check } from "lucide-react";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { FloatingChat } from "@/components/features/FloatingChat";
import { lootbarApi } from "@/lib/lootbar-api";
import type { LootbarGame, SkuItem } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const [game, setGame] = useState<LootbarGame | null>(null);
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedSku, setSelectedSku] = useState<SkuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [markup, setMarkup] = useState(0);
  const [notice, setNotice] = useState<string | null>("Americas Area Topup may take 10 minutes. Longer during busy periods.");
  const [instructions, setInstructions] = useState<Array<{ step: number; title: string; description: string; image?: string }>>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [useShorterInvite, setUseShorterInvite] = useState(true);
  // Dynamic extra_info values from user input
  const [extraInfoValues, setExtraInfoValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!gameId) return;
    trackEvent("game_view", { page: `/game/${gameId}`, gameId });
    setIsLoading(true);
    setSelectedSku(null);
    setExtraInfoValues({});

    // Load markup
    supabase.from("markup_settings").select("markup_percent").eq("id", 1).single()
      .then(({ data }) => { if (data) setMarkup(Number(data.markup_percent) || 0); });

    // Load referral code
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user?.email) return;
      supabase.from("referral_codes").select("code, short_code").eq("user_email", data.user.email).single()
        .then(({ data: ref }) => { if (ref) setReferralCode(ref.short_code || ref.code); });
    });

    // Fetch top-up instructions from Lootbar via proxy
    supabase.functions.invoke("lootbar-proxy", {
      body: { action: "game_guide", game_id: gameId }
    }).then(({ data }) => {
      if (data?.guide && Array.isArray(data.guide) && data.guide.length > 0) {
        setInstructions(data.guide.map((g: any, i: number) => ({
          step: i + 1,
          title: g.title || `Step ${i + 1}`,
          description: g.content || g.description || "",
          image: g.image || g.img || undefined,
        })));
      }
    }).catch(() => {});

    // Fetch game info from cache first (real image + metadata)
    supabase.from("games_cache").select("*").eq("game_id", gameId).single()
      .then(({ data: cached }) => {
        if (cached) {
          setGame({
            game_id: cached.game_id,
            game_name: cached.game_name,
            game_image: cached.game_image || "",
            category: cached.category || "Top Up",
            rating: cached.rating ?? 5.0,
            sold_count: cached.sold_count || "100k+ Sold",
            is_hot: cached.is_hot ?? false,
            discount: cached.discount ?? 0,
            min_price: cached.min_price ?? null,
          });
        }
      });

    // Fetch SKUs
    lootbarApi.getSkus(gameId).then((data) => {
      setSkus(data);
      if (data.length > 0) {
        // Determine unique regions from attribute[0]
        const firstRegion = data[0]?.attribute?.[0]?.value || "global";
        setSelectedRegion(firstRegion);
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [gameId]);

  // Compute unique regions from SKU attributes
  const regions = useMemo(() => {
    const seen = new Set<string>();
    return skus.filter((s) => {
      const region = s.attribute?.[0]?.value;
      if (!region) return false;
      if (seen.has(region)) return false;
      seen.add(region);
      return true;
    }).map((s) => ({
      value: s.attribute[0].value,
      label: s.attribute[0].value_text || s.attribute[0].value,
    }));
  }, [skus]);

  // SKUs filtered by selected region
  const filteredSkus = useMemo(() => {
    if (!selectedRegion) return skus;
    return skus.filter((s) =>
      s.attribute?.[0]?.value === selectedRegion || s.attribute?.length === 0
    );
  }, [skus, selectedRegion]);

  // Extra info fields for the selected SKU
  const extraInfoFields = useMemo(() => selectedSku?.extra_info || [], [selectedSku]);

  const applyMarkup = (price: number) => price * (1 + markup / 100);
  const totalPrice = selectedSku ? applyMarkup(selectedSku.price || 0) * quantity : 0;
  const totalSavings = selectedSku ? (selectedSku.discount_amount || 0) * quantity : 0;

  const handleTopUpNow = () => {
    if (!selectedSku) { toast.error("Please select a package first"); return; }

    // Validate required extra_info fields
    for (const field of extraInfoFields) {
      if (field.required && !extraInfoValues[field.name]?.trim()) {
        toast.error(`${field.title} is required`);
        return;
      }
    }

    const finalSku = { ...selectedSku, price: applyMarkup(selectedSku.price || 0) };
    // Always go through VerifyPlayerPage when the SKU has required extra_info fields
    if (extraInfoFields.length > 0) {
      navigate("/verify-player", { state: { sku: finalSku, game, quantity } });
    } else {
      navigate("/checkout", { state: { sku: finalSku, game, quantity, extraInfo: extraInfoValues } });
    }
  };

  const setFieldValue = (name: string, value: string) => {
    setExtraInfoValues((prev) => ({ ...prev, [name]: value }));
  };

  // ─── Order Panel (shared between desktop right-side and mobile bottom) ──────
  const ExtraInfoForm = ({ compact = false }: { compact?: boolean }) => (
    <>
      {extraInfoFields.map((field) => (
        <div key={field.name} className={compact ? "mb-3" : "mb-4"}>
          <label className={`block font-semibold text-gray-700 mb-1.5 ${compact ? "text-xs" : "text-sm"}`}>
            {field.required && <span className="text-red-500 mr-0.5">*</span>}
            {field.title}
          </label>
          {field.type === "select" && field.options && field.options.length > 0 ? (
            <select
              value={extraInfoValues[field.name] || ""}
              onChange={(e) => setFieldValue(field.name, e.target.value)}
              className="w-full border border-gray-300 focus:border-yellow-400 px-3 py-2.5 text-sm text-gray-900 outline-none bg-white"
              style={{borderRadius:0}}
            >
              <option value="">Please select {field.title}</option>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={extraInfoValues[field.name] || ""}
              onChange={(e) => setFieldValue(field.name, e.target.value)}
              placeholder={field.placeholder || `Please enter your ${field.title}`}
              className="w-full border border-gray-300 focus:border-yellow-400 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors"
              style={{borderRadius:0}}
            />
          )}
        </div>
      ))}
    </>
  );

  if (isLoading && !game) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <div className="hidden lg:block"><DesktopHeader /></div>
        <div className="bg-[#0a0a0a] px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => navigate(-1)} className="text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <span className="text-white font-bold">Top-up</span>
        </div>
        <div className="px-4 pt-4 space-y-4 max-w-[1280px] mx-auto">
          <div className="shimmer h-40 rounded-2xl" />
          <div className="shimmer h-12 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmer h-36 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  // ─── Desktop Layout ─────────────────────────────────────────────────────────
  const DesktopLayout = () => (
    <div className="hidden lg:block min-h-screen bg-[#f5f5f5]">
      <DesktopHeader />

      {/* Breadcrumb */}
      <div className="max-w-[1280px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Home</button>
          <ChevronRight size={14} />
          <button onClick={() => navigate("/categories")} className="hover:text-gray-700">Top Up</button>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium">{game?.game_name} Top Up</span>
        </div>
        <a
          href="https://www.trustpilot.com/review/noxystore.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:opacity-75 transition-opacity cursor-pointer"
        >
          <span className="text-sm text-gray-600 font-semibold">Excellent</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-5 h-5 bg-green-500 rounded-sm flex items-center justify-center">
                <Star size={10} fill="white" stroke="none" />
              </div>
            ))}
          </div>
          <span className="text-sm text-gray-500">44,884 reviews on Trustpilot</span>
        </a>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 pb-16">
        <div className="flex gap-6 items-start">
          {/* Left: Game info + SKU grid — scrollable, thin light scrollbar */}
          <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: "calc(100vh - 130px)", scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
            {/* Game header card */}
            <div className="bg-white p-6 mb-4 border border-gray-100">
              <div className="flex items-start gap-5">
                {/* Real game image from cache */}
                <img
                  src={imgError ? "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop" : (game?.game_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop")}
                  alt={game?.game_name}
                  className="w-24 h-24 object-cover flex-shrink-0"
                  onError={() => setImgError(true)}
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-black text-gray-900 mb-1">{game?.game_name} Top Up</h1>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-yellow-400 text-black text-xs font-bold px-1.5 py-0.5">{(game?.rating ?? 5.0).toFixed(1)}</span>
                          <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="#FFD200" stroke="none" />)}</div>
                          <span className="text-sm text-gray-400">30,000+ reviews</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm text-gray-500">{game?.sold_count}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-gray-600"><Zap size={14} className="text-yellow-500" /> Fast</span>
                        <span className="flex items-center gap-1.5 text-gray-600"><Shield size={14} className="text-green-500" /> Safe</span>
                        <span className="flex items-center gap-1.5 text-gray-600"><Clock size={14} className="text-blue-500" /> 24/7</span>
                      </div>
                    </div>
                    {/* Promo invite card */}
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 px-4 py-3 text-center hidden xl:block flex-shrink-0">
                      <p className="text-xs text-gray-700">Invite Friends & Get</p>
                      <p className="text-orange-500 font-black text-lg">3×10% OFF</p>
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="mt-1.5 bg-orange-400 text-white text-xs font-bold px-4 py-1.5 hover:bg-orange-500"
                      >
                        Invite Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>


            </div>

            {/* Notice banner — above region tabs */}
            {notice && (
              <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">{notice}</p>
                </div>
                <button onClick={() => setNotice(null)} className="text-gray-400 hover:text-gray-600 ml-2">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Region / Server tabs — real data from SKU attributes */}
            {regions.length > 1 && (
              <div className="bg-white px-5 py-4 mb-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {skus[0]?.attribute?.[0]?.key_text || "Server Region"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {regions.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => { setSelectedRegion(r.value); setSelectedSku(null); setExtraInfoValues({}); }}
                      className={`px-4 py-2 border text-sm font-semibold transition-all ${
                        selectedRegion === r.value
                          ? "border-yellow-400 bg-yellow-50 text-yellow-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                      }`}
                      style={{borderRadius:0}}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SKU grid — card style matching Lootbar */}
            <div className="bg-white p-5 mb-4 border border-gray-100">
              {isLoading ? (
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmer h-36 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredSkus.map((sku) => {
                    const markedPrice = applyMarkup(sku.price || 0);
                    const savings = sku.discount_amount || 0;
                    const isSelected = selectedSku?.sku_id === sku.sku_id;
                    return (
                      <button
                        key={sku.sku_id}
                        onClick={() => { setSelectedSku(sku); setExtraInfoValues({}); }}
                        className={`relative flex flex-col bg-white border-2 overflow-hidden transition-all hover:shadow-md text-left ${
                          isSelected ? "border-yellow-400 shadow-md" : "border-gray-200 hover:border-gray-300"
                        }`}
                        style={{borderRadius:0}}
                      >
                        {/* SKU image */}
                        <div className="aspect-[4/3] bg-gray-100 relative">
                          <img
                            src={sku.image || game?.game_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=150&fit=crop"}
                            alt={sku.sku_name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=150&fit=crop"; }}
                          />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-yellow-400 flex items-center justify-center shadow-sm">
                              <Check size={11} className="text-black" />
                            </div>
                          )}
                          {savings > 0 && (
                            <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5">
                              -{savings.toFixed(0)}%
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 mb-1.5">{sku.sku_name}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-orange-500">${markedPrice.toFixed(2)}</span>
                            {savings > 0 && (
                              <span className="text-[10px] text-gray-400 line-through">${(sku.original_price || sku.price || 0).toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top-up instructions — real data from Lootbar API */}
            <div className="bg-white p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top-up Instructions</h3>

              {/* Static info grid */}
              <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-gray-100">
                {[
                  { label: "Category", value: game?.category || "Top Up" },
                  { label: "Delivery Method", value: "Direct top-up via API" },
                  { label: "Processing Time", value: "3–5 minutes" },
                  { label: "Security", value: "NoxyStore Guarantee" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">{item.label}</p>
                    <p className="text-sm text-gray-800 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Dynamic steps — from Lootbar API or fallback defaults */}
              <div className="space-y-5">
                {(instructions.length > 0 ? instructions : [
                  { step: 1, title: "Select your package", description: "Choose the top-up amount that suits you from the list above.", image: undefined },
                  { step: 2, title: "Fill in your player information", description: "Enter your Player ID or UID accurately. Double-check before proceeding.", image: game?.game_image || undefined },
                  { step: 3, title: "Complete your payment", description: "Choose a payment method and complete the transaction securely.", image: undefined },
                  { step: 4, title: "Receive your items", description: "Top-up is processed automatically. Items arrive within 3–5 minutes.", image: undefined },
                ]).map((inst) => (
                  <div key={inst.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 bg-yellow-400 flex items-center justify-center font-black text-sm text-black">
                      {inst.step}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm mb-1">{inst.title}</p>
                      {inst.description && (
                        <p className="text-sm text-gray-600 leading-relaxed">{inst.description}</p>
                      )}
                      {inst.image && (
                        <img
                          src={inst.image}
                          alt={inst.title}
                          className="mt-2 max-w-xs object-cover border border-gray-100"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Fixed order panel — pinned to viewport, never scrolls */}
          <div className="w-72 flex-shrink-0">
            <div style={{ position: "sticky", top: "70px", maxHeight: "calc(100vh - 90px)", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" } as React.CSSProperties}>
            <div className="border border-gray-200 shadow-sm bg-white">

              {/* Order Information Section */}
              <div className="px-5 pt-5 pb-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4">Order Information</h3>
                {selectedSku ? (
                  <ExtraInfoForm />
                ) : (
                  <div className="bg-gray-50 p-3 text-center text-sm text-gray-400 border border-dashed border-gray-200">
                    ← Select a package
                  </div>
                )}
              </div>

              {/* Quantity Section — separated */}
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Quantity</span>
                  <div className="flex items-center border border-gray-300">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 border-r border-gray-300"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold w-10 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 border-l border-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Price + CTA Section */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500">Price</span>
                  <span className="text-xl font-black text-orange-500">
                    {selectedSku ? `$${totalPrice.toFixed(2)}` : "—"}
                  </span>
                </div>
                {totalSavings > 0 && (
                  <p className="text-xs text-orange-500 text-right mb-2 font-semibold">
                    Savings ${totalSavings.toFixed(2)}
                  </p>
                )}
                <button
                  onClick={handleTopUpNow}
                  disabled={!selectedSku}
                  className={`w-full py-3.5 font-bold text-base transition-all mt-3 ${
                    selectedSku
                      ? "bg-yellow-400 hover:bg-yellow-300 text-black"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  style={{borderRadius:0}}
                >
                  Top-up Now
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <Shield size={13} className="text-green-500" />
                  <span className="text-xs text-gray-500">NoxyStore Security Guarantee</span>
                </div>
              </div>

            </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <FloatingChat />
    </div>
  );

  // ─── Mobile Layout ──────────────────────────────────────────────────────────
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
            <span className="flex items-center gap-1"><Zap size={12} className="text-yellow-400" />Fast</span>
            <span className="flex items-center gap-1"><Shield size={12} className="text-green-400" />Safe</span>
            <span className="flex items-center gap-1"><Clock size={12} className="text-blue-400" />24/7</span>
          </div>
        </div>
      </div>

      <div className="pb-52">
        {/* Game info */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img
              src={imgError ? "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80&h=80&fit=crop" : (game?.game_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80&h=80&fit=crop")}
              alt={game?.game_name}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0 shadow-sm"
              onError={() => setImgError(true)}
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900">{game?.game_name}</h1>
              <p className="text-sm text-gray-500">{game?.sold_count}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="bg-yellow-400 text-black text-xs font-bold px-1.5 py-0.5 rounded">{(game?.rating ?? 5.0).toFixed(1)}</span>
                <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} fill="#FFD200" stroke="none" />)}</div>
              </div>
            </div>
          </div>

          {/* Invite promo */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="mt-3 w-full bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl px-3 py-2.5 flex items-center justify-between text-left active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-orange-500 flex-shrink-0"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
              <div>
                <p className="text-xs font-bold text-orange-600">Invite Friends · Get 3×10% OFF</p>
                <p className="text-[11px] text-gray-600">Share to earn discount coupons</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
          </button>

          {notice && (
            <div className="mt-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center justify-between">
              <p className="text-xs text-amber-700">{notice}</p>
              <button onClick={() => setNotice(null)}><X size={12} className="text-gray-400" /></button>
            </div>
          )}
        </div>

        {/* Region tabs */}
        {regions.length > 1 && (
          <div className="px-4 pt-3 pb-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {skus[0]?.attribute?.[0]?.key_text || "Server Region"}
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {regions.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setSelectedRegion(r.value); setSelectedSku(null); setExtraInfoValues({}); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                    selectedRegion === r.value
                      ? "border-yellow-400 text-yellow-600 bg-yellow-50"
                      : "border-gray-200 text-gray-600 bg-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SKU grid */}
        <div className="px-4 pt-3">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="shimmer h-36 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredSkus.map((sku) => {
                const markedPrice = applyMarkup(sku.price || 0);
                const savings = sku.discount_amount || 0;
                const isSelected = selectedSku?.sku_id === sku.sku_id;
                return (
                  <button
                    key={sku.sku_id}
                    onClick={() => { setSelectedSku(sku); setExtraInfoValues({}); }}
                    className={`relative flex flex-col bg-white rounded-xl border-2 overflow-hidden text-left transition-all ${
                      isSelected ? "border-yellow-400 shadow-md" : "border-gray-200"
                    }`}
                  >
                    <div className="aspect-[4/3] bg-gray-100 relative">
                      <img
                        src={sku.image || game?.game_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=150&fit=crop"}
                        alt={sku.sku_name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=150&fit=crop"; }}
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                          <Check size={10} className="text-black" />
                        </div>
                      )}
                      {savings > 0 && (
                        <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">
                          -{savings.toFixed(0)}%
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 mb-1">{sku.sku_name}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-black text-orange-500">${markedPrice.toFixed(2)}</span>
                        {savings > 0 && <span className="text-[10px] text-gray-400 line-through">${(sku.original_price || sku.price || 0).toFixed(2)}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Top-up instructions */}
        <div className="px-4 mt-5">
          <h3 className="text-base font-bold text-gray-900 mb-2">Top-up Instructions</h3>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
            <p className="text-sm text-gray-600 leading-relaxed">
              Please fill in the required information accurately. Top-up takes 3–5 minutes.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
              <div><p className="text-xs text-gray-500 uppercase font-semibold mb-0.5">Category</p><p className="text-sm font-medium">{game?.category || "Top Up"}</p></div>
              <div><p className="text-xs text-gray-500 uppercase font-semibold mb-0.5">Delivery</p><p className="text-sm font-medium">Direct API</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-safe z-50" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        {/* Extra info fields shown in bottom panel when SKU selected */}
        {selectedSku && extraInfoFields.length > 0 && (
          <div className="mb-3 space-y-2">
            <ExtraInfoForm compact />
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Quantity</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-xl border border-gray-300 flex items-center justify-center text-gray-600">−</button>
            <span className="text-base font-bold w-6 text-center">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-xl border border-gray-300 flex items-center justify-center text-gray-600">+</button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            {totalSavings > 0 && <p className="text-xs text-orange-500 font-semibold mb-0.5">Savings ${totalSavings.toFixed(2)}</p>}
            <p className="text-xl font-black text-orange-500">{selectedSku ? `$${totalPrice.toFixed(2)}` : "—"}</p>
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

      <MobileFooter />
      <FloatingChat />

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-white rounded-t-3xl w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setShowInviteModal(false)}><X size={20} className="text-gray-700" /></button>
              <h3 className="font-black text-gray-900">Invite Friends</h3>
              <div className="w-6" />
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-center gap-6 mb-5">
                {[
                  { key: "twitter", label: "X", bg: "#000", icon: <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.843L1.254 2.25H8.08l4.257 5.629L18.244 2.25z"/></svg> },
                  { key: "whatsapp", label: "WhatsApp", bg: "#25D366", icon: <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
                  { key: "facebook", label: "Facebook", bg: "#1877F2", icon: <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                ].map((p) => (
                  <button key={p.key} className="flex flex-col items-center gap-1.5"
                    onClick={() => {
                      const link = useShorterInvite ? `https://noxystore.gg/s/${referralCode}` : `https://noxystore.gg?ref=${referralCode}`;
                      const text = encodeURIComponent(`Get 10% OFF on NoxyStore! ${link}`);
                      const urls: Record<string, string> = {
                        twitter: `https://twitter.com/intent/tweet?text=${text}`,
                        whatsapp: `https://wa.me/?text=${text}`,
                        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
                      };
                      window.open(urls[p.key], "_blank");
                    }}
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: p.bg }}>{p.icon}</div>
                    <span className="text-xs text-gray-600 font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-gray-100 rounded-xl px-3 py-3 text-sm text-gray-500 font-mono truncate">
                  {useShorterInvite ? `noxystore.gg/s/${referralCode || "..."}` : `noxystore.gg?ref=${referralCode || "..."}`}
                </div>
                <button
                  onClick={async () => {
                    const link = useShorterInvite ? `https://noxystore.gg/s/${referralCode}` : `https://noxystore.gg?ref=${referralCode}`;
                    await navigator.clipboard.writeText(link);
                    setInviteCopied(true);
                    setTimeout(() => setInviteCopied(false), 2000);
                  }}
                  className="bg-yellow-400 text-black font-bold px-4 py-3 rounded-xl flex items-center gap-1.5 whitespace-nowrap text-sm"
                >
                  {inviteCopied ? <Check size={14} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>}
                  Copy
                </button>
              </div>
              <button onClick={() => setUseShorterInvite(!useShorterInvite)} className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${useShorterInvite ? "bg-yellow-400 border-yellow-400" : "border-gray-300"}`}>
                  {useShorterInvite && <Check size={11} className="text-black" />}
                </div>
                Share with a shorter link
              </button>
              <p className="text-sm font-bold text-gray-900 mb-2">Rules:</p>
              <div className="space-y-1.5 text-sm text-gray-600">
                <p>1. Invite a friend to register and they get 2 coupons worth up to 10% off each.</p>
                <p>2. For every 5 friends who complete an order, you earn a 10% OFF coupon.</p>
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
add store header an dwe appear and fixed all must clear price 
