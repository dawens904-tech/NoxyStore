import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { MobileFooter } from "@/components/layout/MobileFooter";
import { Star, Zap, Shield, Clock, ChevronRight, Info, AlertCircle, X, Check, ChevronDown } from "lucide-react";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { Header } from "@/components/layout/Header";
import { FloatingChat } from "@/components/features/FloatingChat";
import { lootbarApi } from "@/lib/lootbar-api";
import type { LootbarGame, SkuItem } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ── Country flag + name map ──────────────────────────────────────────────────
const COUNTRY_FLAG: Record<string, string> = {
  "United States": "🇺🇸", "US": "🇺🇸",
  "Turkey": "🇹🇷", "TR": "🇹🇷",
  "United Kingdom": "🇬🇧", "UK": "🇬🇧", "GB": "🇬🇧",
  "France": "🇫🇷", "FR": "🇫🇷",
  "Japan": "🇯🇵", "JP": "🇯🇵",
  "Germany": "🇩🇪", "DE": "🇩🇪",
  "Brazil": "🇧🇷", "BR": "🇧🇷",
  "Australia": "🇦🇺", "AU": "🇦🇺",
  "Canada": "🇨🇦", "CA": "🇨🇦",
  "Italy": "🇮🇹", "IT": "🇮🇹",
  "Spain": "🇪🇸", "ES": "🇪🇸",
  "Russia": "🇷🇺", "RU": "🇷🇺",
  "South Korea": "🇰🇷", "KR": "🇰🇷",
  "China": "🇨🇳", "CN": "🇨🇳",
  "Mexico": "🇲🇽", "MX": "🇲🇽",
  "India": "🇮🇳", "IN": "🇮🇳",
  "Indonesia": "🇮🇩", "ID": "🇮🇩",
  "Malaysia": "🇲🇾", "MY": "🇲🇾",
  "Singapore": "🇸🇬", "SG": "🇸🇬",
  "Thailand": "🇹🇭", "TH": "🇹🇭",
  "Vietnam": "🇻🇳", "VN": "🇻🇳",
  "Philippines": "🇵🇭", "PH": "🇵🇭",
  "Saudi Arabia": "🇸🇦", "SA": "🇸🇦",
  "UAE": "🇦🇪", "AE": "🇦🇪",
  "Egypt": "🇪🇬", "EG": "🇪🇬",
  "Hong Kong": "🇭🇰", "HK": "🇭🇰",
  "Taiwan": "🇹🇼", "TW": "🇹🇼",
  "Pakistan": "🇵🇰", "PK": "🇵🇰",
  "Argentina": "🇦🇷", "AR": "🇦🇷",
  "Poland": "🇵🇱", "PL": "🇵🇱",
  "Netherlands": "🇳🇱", "NL": "🇳🇱",
  "Sweden": "🇸🇪", "SE": "🇸🇪",
  "Norway": "🇳🇴", "NO": "🇳🇴",
  "Denmark": "🇩🇰", "DK": "🇩🇰",
  "Finland": "🇫🇮", "FI": "🇫🇮",
  "Switzerland": "🇨🇭", "CH": "🇨🇭",
  "Austria": "🇦🇹", "AT": "🇦🇹",
  "Belgium": "🇧🇪", "BE": "🇧🇪",
  "Portugal": "🇵🇹", "PT": "🇵🇹",
  "Czech Republic": "🇨🇿", "CZ": "🇨🇿",
  "Romania": "🇷🇴", "RO": "🇷🇴",
  "Hungary": "🇭🇺", "HU": "🇭🇺",
  "Greece": "🇬🇷", "GR": "🇬🇷",
  "Israel": "🇮🇱", "IL": "🇮🇱",
  "South Africa": "🇿🇦", "ZA": "🇿🇦",
  "Global": "🌐", "ROW": "🌐", "GLOBAL": "🌐",
  "Europe": "🇪🇺", "EU": "🇪🇺",
  "America": "🌎", "Americas": "🌎",
  "Asia": "🌏",
  "TW,HK,MO": "🇹🇼",
  "VNG": "🇻🇳",
  "Middle East": "🌍",
};

function getFlag(region: string): string {
  return COUNTRY_FLAG[region] || "🌐";
}

// ── Region Dropdown (mobile bottom-sheet / desktop dropdown) ─────────────────
function RegionDropdown({
  regions,
  selected,
  onSelect,
}: {
  regions: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = regions.find((r) => r.value === selected)?.label || selected;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-gray-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{getFlag(selectedLabel)}</span>
          <span className="text-sm font-semibold text-gray-800">{selectedLabel}</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
          {regions.map((r) => {
            const isSelected = r.value === selected;
            return (
              <button
                key={r.value}
                onClick={() => { onSelect(r.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${isSelected ? "bg-yellow-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl leading-none">{getFlag(r.label)}</span>
                  <span className={`text-sm font-medium ${isSelected ? "text-yellow-700 font-semibold" : "text-gray-800"}`}>{r.label}</span>
                </div>
                {isSelected && (
                  <Check size={16} className="text-yellow-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Mobile Region Bottom Sheet ────────────────────────────────────────────────
function RegionSheet({
  regions,
  selected,
  onSelect,
  onClose,
}: {
  regions: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const selectedLabel = regions.find((r) => r.value === selected)?.label || selected;
  const [search, setSearch] = useState("");
  const filtered = regions.filter((r) => r.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl w-full shadow-2xl overflow-hidden" style={{ maxHeight: "75vh" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button onClick={onClose}><X size={20} className="text-gray-700" /></button>
          <h3 className="font-bold text-gray-900 text-base">{selectedLabel}</h3>
          <div className="w-8" />
        </div>
        <div className="px-4 py-2 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search region…"
            className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none text-gray-800"
            autoFocus
          />
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "calc(75vh - 130px)" }}>
          <div className="divide-y divide-gray-100">
            {filtered.map((r) => {
              const isSel = r.value === selected;
              return (
                <button
                  key={r.value}
                  onClick={() => { onSelect(r.value); onClose(); }}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${isSel ? "bg-yellow-50" : "hover:bg-gray-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl leading-none">{getFlag(r.label)}</span>
                    <span className={`text-base font-medium ${isSel ? "text-yellow-700" : "text-gray-800"}`}>{r.label}</span>
                  </div>
                  {isSel && <Check size={18} className="text-yellow-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="h-6 bg-white" />
      </div>
    </div>
  );
}

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
  const [extraInfoValues, setExtraInfoValues] = useState<Record<string, string>>({});
  const [showRegionSheet, setShowRegionSheet] = useState(false);

  // Detect if this is a gift card product
  const isGiftCard = useMemo(() =>
    game?.category?.toLowerCase().includes("gift") ||
    game?.game_name?.toLowerCase().includes("gift") ||
    game?.game_name?.toLowerCase().includes("card") ||
    game?.game_name?.toLowerCase().includes("itunes") ||
    game?.game_name?.toLowerCase().includes("google play") ||
    game?.game_name?.toLowerCase().includes("amazon") ||
    game?.game_name?.toLowerCase().includes("tiktok"),
  [game]);

  useEffect(() => {
    if (!gameId) return;
    trackEvent("game_view", { page: `/game/${gameId}`, gameId });
    setIsLoading(true);
    setSelectedSku(null);
    setExtraInfoValues({});

    supabase.from("markup_settings").select("markup_percent").eq("id", 1).single()
      .then(({ data }) => { if (data) setMarkup(Number(data.markup_percent) || 0); });

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user?.email) return;
      supabase.from("referral_codes").select("code, short_code").eq("user_email", data.user.email).single()
        .then(({ data: ref }) => { if (ref) setReferralCode(ref.short_code || ref.code); });
    });

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

    lootbarApi.getSkus(gameId).then((data) => {
      setSkus(data);
      if (data.length > 0) {
        const firstRegion = data[0]?.attribute?.[0]?.value || "global";
        setSelectedRegion(firstRegion);
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [gameId]);

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

  const filteredSkus = useMemo(() => {
    if (!selectedRegion) return skus;
    return skus.filter((s) =>
      s.attribute?.[0]?.value === selectedRegion || s.attribute?.length === 0
    );
  }, [skus, selectedRegion]);

  const extraInfoFields = useMemo(() => selectedSku?.extra_info || [], [selectedSku]);

  const applyMarkup = (price: number) => price * (1 + markup / 100);
  const totalPrice = selectedSku ? applyMarkup(selectedSku.price || 0) * quantity : 0;
  const totalSavings = selectedSku ? (selectedSku.discount_amount || 0) * quantity : 0;

  // Determine if this product needs player verification (has extra_info fields)
  const needsVerification = extraInfoFields.length > 0;

  const handleTopUpNow = () => {
    if (!selectedSku) { toast.error("Please select a package first"); return; }
    for (const field of extraInfoFields) {
      if (field.required && !extraInfoValues[field.name]?.trim()) {
        toast.error(`${field.title} is required`);
        return;
      }
    }
    const finalSku = { ...selectedSku, price: applyMarkup(selectedSku.price || 0) };
    if (needsVerification) {
      navigate("/verify-player", { state: { sku: finalSku, game, quantity } });
    } else {
      navigate("/checkout", { state: { sku: finalSku, game, quantity, extraInfo: extraInfoValues } });
    }
  };

  // Mobile: auto-navigate when SKU selected for products needing verification
  const handleMobileSkuSelect = (sku: SkuItem) => {
    setSelectedSku(sku);
    setExtraInfoValues({});
    // If product needs no verification, stay on page (user taps Top-up Now)
    // If product needs verification, auto-navigate to verify page
    if ((sku.extra_info || []).length > 0) {
      const finalSku = { ...sku, price: applyMarkup(sku.price || 0) };
      navigate("/verify-player", { state: { sku: finalSku, game, quantity } });
    }
  };

  const setFieldValue = (name: string, value: string) => {
    setExtraInfoValues((prev) => ({ ...prev, [name]: value }));
  };

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
              className="w-full border border-gray-300 focus:border-yellow-400 px-3 py-2.5 text-sm text-gray-900 outline-none bg-white rounded-xl"
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
              className="w-full border border-gray-300 focus:border-yellow-400 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors rounded-xl"
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
        <div className="lg:hidden sticky top-0 z-40 bg-[#0a0a0a] px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <span className="text-white font-bold text-sm">Top-up</span>
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

      <div className="max-w-[1280px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Home</button>
          <ChevronRight size={14} />
          <button onClick={() => navigate("/categories")} className="hover:text-gray-700">{game?.category || "Top Up"}</button>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium">{game?.game_name}</span>
        </div>
        <a
          href="https://www.trustpilot.com/review/noxystore.com"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 hover:opacity-75 transition-opacity"
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
          {/* Left panel */}
          <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: "calc(100vh - 130px)", scrollbarWidth: "none" } as React.CSSProperties}>
            {/* Game header */}
            <div className="bg-white p-6 mb-4 border border-gray-100 rounded-xl">
              <div className="flex items-start gap-5">
                <img
                  src={imgError ? "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop" : (game?.game_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop")}
                  alt={game?.game_name}
                  className="w-24 h-24 rounded-2xl object-cover flex-shrink-0"
                  onError={() => setImgError(true)}
                />
                <div className="flex-1">
                  <h1 className="text-2xl font-black text-gray-900 mb-1">{game?.game_name}</h1>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-yellow-400 text-black text-xs font-bold px-1.5 py-0.5 rounded">{(game?.rating ?? 5.0).toFixed(1)}</span>
                    <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="#FFD200" stroke="none" />)}</div>
                    <span className="text-sm text-gray-400">346 reviews</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">{game?.sold_count}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {["7-Day After-Sales Guarantee", "Safe and Fast Top-Up", "24/7 Customer Service"].map((tag) => (
                      <span key={tag} className="border border-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-gray-600"><Zap size={14} className="text-yellow-500" /> Fast</span>
                    <span className="flex items-center gap-1.5 text-gray-600"><Shield size={14} className="text-green-500" /> Safe</span>
                    <span className="flex items-center gap-1.5 text-gray-600"><Clock size={14} className="text-blue-500" /> 24/7</span>
                  </div>
                </div>
              </div>

              {/* Gift card notice */}
              {isGiftCard && selectedRegion && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 font-medium">
                    ONLY for {regions.find(r => r.value === selectedRegion)?.label || selectedRegion} account registered users. Non-Returnable and Non-Refundable.
                  </p>
                </div>
              )}
            </div>

            {notice && (
              <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center justify-between mb-4 rounded-xl">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">{notice}</p>
                </div>
                <button onClick={() => setNotice(null)} className="text-gray-400 hover:text-gray-600 ml-2"><X size={14} /></button>
              </div>
            )}

            {/* Region selector — dropdown with flags for gift cards, tabs for others */}
            {regions.length > 1 && (
              <div className="bg-white px-5 py-4 mb-4 border border-gray-100 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {skus[0]?.attribute?.[0]?.key_text || "Region"}
                </p>
                {isGiftCard ? (
                  <RegionDropdown
                    regions={regions}
                    selected={selectedRegion}
                    onSelect={(v) => { setSelectedRegion(v); setSelectedSku(null); setExtraInfoValues({}); }}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {regions.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => { setSelectedRegion(r.value); setSelectedSku(null); setExtraInfoValues({}); }}
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
                )}
              </div>
            )}

            {/* SKU grid */}
            <div className="bg-white p-5 mb-4 border border-gray-100 rounded-xl">
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
                        className={`relative flex flex-col bg-white border-2 overflow-hidden transition-all hover:shadow-md text-left rounded-xl ${
                          isSelected ? "border-yellow-400 shadow-md" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="aspect-[4/3] bg-gradient-to-b from-blue-100 to-purple-100 relative">
                          <img
                            src={sku.image || game?.game_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=150&fit=crop"}
                            alt={sku.sku_name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=150&fit=crop"; }}
                          />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
                              <Check size={11} className="text-black" />
                            </div>
                          )}
                          {savings > 0 && (
                            <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              -{savings.toFixed(0)}%
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 mb-1.5">{sku.sku_name}</p>
                          <p className="text-sm font-black text-orange-500">${markedPrice.toFixed(2)}</p>
                          {savings > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-gray-400 line-through">${(sku.original_price || sku.price || 0).toFixed(2)}</span>
                              <span className="bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">-${savings.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-white p-6 border border-gray-100 rounded-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top-up Instructions</h3>
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
              <div className="space-y-5">
                {(instructions.length > 0 ? instructions : [
                  { step: 1, title: "Select your package", description: "Choose the top-up amount that suits you from the list above.", image: undefined },
                  { step: 2, title: "Fill in your player information", description: "Enter your Player ID or UID accurately. Double-check before proceeding.", image: undefined },
                  { step: 3, title: "Complete your payment", description: "Choose a payment method and complete the transaction securely.", image: undefined },
                  { step: 4, title: "Receive your items", description: "Top-up is processed automatically. Items arrive within 3–5 minutes.", image: undefined },
                ]).map((inst) => (
                  <div key={inst.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 bg-yellow-400 rounded-lg flex items-center justify-center font-black text-sm text-black">{inst.step}</div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm mb-1">{inst.title}</p>
                      {inst.description && <p className="text-sm text-gray-600 leading-relaxed">{inst.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Order panel */}
          <div className="w-72 flex-shrink-0">
            <div style={{ position: "sticky", top: "70px", maxHeight: "calc(100vh - 90px)", overflowY: "auto" } as React.CSSProperties}>
              <div className="border border-gray-200 shadow-sm bg-white rounded-xl overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4">Order Information</h3>
                  {selectedSku ? (
                    <ExtraInfoForm />
                  ) : (
                    <div className="bg-gray-50 p-3 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
                      ← Select a package
                    </div>
                  )}
                </div>
                <div className="px-5 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Quantity</span>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 border-r border-gray-300">−</button>
                      <span className="text-sm font-bold w-10 text-center">{quantity}</span>
                      <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 border-l border-gray-300">+</button>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Price</span>
                    <span className="text-xl font-black text-orange-500">{selectedSku ? `$${totalPrice.toFixed(2)}` : "—"}</span>
                  </div>
                  {totalSavings > 0 && (
                    <p className="text-xs text-orange-500 text-right mb-2 font-semibold">Savings ${totalSavings.toFixed(2)}</p>
                  )}
                  <button
                    onClick={handleTopUpNow}
                    disabled={!selectedSku}
                    className={`w-full py-3.5 font-bold text-base transition-all mt-3 rounded-xl ${selectedSku ? "bg-yellow-400 hover:bg-yellow-300 text-black" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
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
      {/* Mobile Header — real NoxyStore header */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-400 rounded flex items-center justify-center flex-shrink-0">
                <Zap size={13} className="text-black" />
              </div>
              <span className="text-white font-black text-sm tracking-tight">Noxy<span className="text-yellow-400">Store</span></span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a href="https://www.trustpilot.com/review/noxystore.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5">
              <div className="flex gap-0.5">{Array.from({length:5}).map((_,i) => <div key={i} className="w-3 h-3 bg-green-500 rounded-sm flex items-center justify-center"><Star size={7} fill="white" stroke="none" /></div>)}</div>
              <span className="text-white text-[11px] font-semibold">4.9</span>
            </a>
          </div>
        </div>
      </div>

      <div className="pb-52">
        {/* Game info */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={imgError ? "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80&h=80&fit=crop" : (game?.game_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80&h=80&fit=crop")}
              alt={game?.game_name}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0 shadow-sm"
              onError={() => setImgError(true)}
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{game?.game_name}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="bg-yellow-400 text-black text-xs font-bold px-1.5 py-0.5 rounded">{(game?.rating ?? 5.0).toFixed(1)}</span>
                <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} fill="#FFD200" stroke="none" />)}</div>
                <span className="text-xs text-gray-400">346</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{game?.sold_count}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {["7-Day After-Sales Guarantee", "Safe and Fast Top-Up", "24/7 Customer Service"].map((tag) => (
              <span key={tag} className="border border-gray-200 text-gray-600 text-[11px] px-2.5 py-1 rounded-full">{tag}</span>
            ))}
          </div>

          {/* Gift card notice */}
          {isGiftCard && selectedRegion && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
              <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                ONLY for {regions.find(r => r.value === selectedRegion)?.label || selectedRegion} accounts. Non-Returnable and Non-Refundable.
              </p>
            </div>
          )}
        </div>

        {notice && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center justify-between">
            <p className="text-xs text-amber-700 leading-relaxed">{notice}</p>
            <button onClick={() => setNotice(null)}><X size={12} className="text-gray-400 flex-shrink-0 ml-2" /></button>
          </div>
        )}

        {/* Region selector */}
        {regions.length > 1 && (
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            {isGiftCard ? (
              <button
                onClick={() => setShowRegionSheet(true)}
                className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{getFlag(regions.find(r => r.value === selectedRegion)?.label || selectedRegion)}</span>
                  <span className="text-sm font-semibold text-gray-800">{regions.find(r => r.value === selectedRegion)?.label || selectedRegion}</span>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            ) : (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {skus[0]?.attribute?.[0]?.key_text || "Region"}
                </p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {regions.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => { setSelectedRegion(r.value); setSelectedSku(null); setExtraInfoValues({}); }}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        selectedRegion === r.value ? "border-yellow-400 text-yellow-600 bg-yellow-50" : "border-gray-200 text-gray-600 bg-white"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                    onClick={() => handleMobileSkuSelect(sku)}
                    className={`relative flex flex-col bg-white rounded-xl border-2 overflow-hidden text-left transition-all ${isSelected ? "border-yellow-400 shadow-md" : "border-gray-200"}`}
                  >
                    <div className="aspect-[4/3] bg-gradient-to-b from-blue-100 to-purple-100 relative">
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
                        <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">-{savings.toFixed(0)}%</div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 mb-1">{sku.sku_name}</p>
                      <p className="text-sm font-black text-orange-500">${markedPrice.toFixed(2)}</p>
                      {savings > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-gray-400 line-through">${(sku.original_price || sku.price || 0).toFixed(2)}</span>
                          <span className="bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">-${savings.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-safe z-50" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
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
            {totalSavings > 0 && (
              <p className="text-xs text-orange-500 font-semibold flex items-center gap-1">
                Savings ${totalSavings.toFixed(2)} <ChevronRight size={12} />
              </p>
            )}
            <p className="text-xl font-black text-orange-500">{selectedSku ? `$${totalPrice.toFixed(2)}` : "—"}</p>
          </div>
          <button
            onClick={handleTopUpNow}
            disabled={!selectedSku}
            className={`px-8 py-3 rounded-2xl font-bold text-base transition-all ${selectedSku ? "bg-yellow-400 text-black hover:bg-yellow-300" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          >
            {needsVerification ? "Continue" : "Top-up Now"}
          </button>
        </div>
        {!selectedSku && (
          <p className="text-center text-xs text-gray-400 mt-1.5">Select a package above to continue</p>
        )}
      </div>

      <MobileFooter />
      <FloatingChat />

      {/* Region bottom sheet for gift cards */}
      {showRegionSheet && (
        <RegionSheet
          regions={regions}
          selected={selectedRegion}
          onSelect={(v) => { setSelectedRegion(v); setSelectedSku(null); setExtraInfoValues({}); }}
          onClose={() => setShowRegionSheet(false)}
        />
      )}

      {/* Invite Modal */}
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
                  className="bg-yellow-400 text-black font-bold px-4 py-3 rounded-xl flex items-center gap-1.5 text-sm"
                >
                  {inviteCopied ? <Check size={14} /> : "Copy"}
                </button>
              </div>
              <button onClick={() => setUseShorterInvite(!useShorterInvite)} className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${useShorterInvite ? "bg-yellow-400 border-yellow-400" : "border-gray-300"}`}>
                  {useShorterInvite && <Check size={11} className="text-black" />}
                </div>
                Share with a shorter link
              </button>
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

