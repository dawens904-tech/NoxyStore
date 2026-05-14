import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { MobileFooter } from "@/components/layout/MobileFooter";
import {
  Star, Zap, Shield, Clock, ChevronRight, AlertCircle, X, Check,
  ChevronDown, ChevronUp, Info,
} from "lucide-react";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { Header } from "@/components/layout/Header";
import { FloatingChat } from "@/components/features/FloatingChat";
import { lootbarApi } from "@/lib/lootbar-api";
import type { LootbarGame, SkuItem } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useSettingsStore } from "@/stores/settingsStore";
import { CURRENCY_RATES } from "@/constants/translations";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ManualProduct {
  id: string;
  product_name: string;
  photo_url: string | null;
  game_category: string;
  is_active: boolean;
  requires_server: boolean;
  requires_player_id: boolean;
  short_description: string;
  full_description: string;
}

interface ManualRegion {
  id: string;
  region_name: string;
  region_key: string;
  sort_order: number;
}

interface ManualSku {
  id: string;
  sku_name: string;
  original_price: number;
  sale_price: number | null;
  photo_url: string | null;
  region_id: string | null;
  sort_order: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useCurrencyFormat() {
  const { currency } = useSettingsStore();
  return (usd: number | null | undefined): string => {
    if (!usd && usd !== 0) return "";
    const rate = CURRENCY_RATES[currency] ?? 1;
    const converted = usd * rate;
    const sym: Record<string, string> = {
      USD: "$", EUR: "€", GBP: "£", IDR: "Rp", MYR: "RM",
      SGD: "S$", THB: "฿", VND: "₫", PHP: "₱", BRL: "R$",
    };
    const s = sym[currency] ?? "$";
    if (currency === "IDR" || currency === "VND") return `${s}${Math.round(converted).toLocaleString()}`;
    return `${s}${converted.toFixed(2)}`;
  };
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  image, name, price, oldPrice, discount, selected, onClick, fallbackImg,
}: {
  image: string | null;
  name: string;
  price: string;
  oldPrice?: string;
  discount?: number;
  selected: boolean;
  onClick: () => void;
  fallbackImg: string;
}) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col text-left bg-white rounded-2xl border-2 overflow-hidden transition-all duration-150 hover:shadow-md active:scale-[0.98] ${
        selected ? "border-yellow-400 shadow-lg ring-2 ring-yellow-200" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Image */}
      <div className="relative aspect-square w-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <img
          src={imgErr ? fallbackImg : (image || fallbackImg)}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgErr(true)}
        />
        {/* Discount badge */}
        {(discount ?? 0) > 0 && (
          <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">
            -{discount}%
          </div>
        )}
        {/* Selected check */}
        {selected && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow">
            <Check size={11} className="text-black" />
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <p className="text-[12px] font-semibold text-gray-800 leading-snug line-clamp-2 mb-1.5">{name}</p>
        <div>
          <p className="text-[13px] font-black text-orange-500 leading-none">{price}</p>
          {oldPrice && (
            <p className="text-[10px] text-gray-400 line-through mt-0.5 leading-none">{oldPrice}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Server Tabs ──────────────────────────────────────────────────────────────
function ServerTabs({
  regions, selected, onSelect,
}: {
  regions: ManualRegion[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {regions.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.id)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
            selected === r.id
              ? "border-yellow-400 bg-yellow-50 text-yellow-700"
              : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"
          }`}
        >
          {r.region_name}
        </button>
      ))}
    </div>
  );
}

// ─── Lootbar Region Tabs ──────────────────────────────────────────────────────
function LootbarRegionTabs({
  regions, selected, onSelect,
}: {
  regions: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {regions.map((r) => (
        <button
          key={r.value}
          onClick={() => onSelect(r.value)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
            selected === r.value
              ? "border-yellow-400 bg-yellow-50 text-yellow-700"
              : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const fmt = useCurrencyFormat();

  // Game data (could be Lootbar or manual)
  const [game, setGame] = useState<LootbarGame | null>(null);
  const [manualProduct, setManualProduct] = useState<ManualProduct | null>(null);
  const [isManual, setIsManual] = useState(false);

  // Lootbar data
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [lootbarRegions, setLootbarRegions] = useState<{ value: string; label: string }[]>([]);
  const [selectedLootbarRegion, setSelectedLootbarRegion] = useState("");

  // Manual product data
  const [manualRegions, setManualRegions] = useState<ManualRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [manualSkus, setManualSkus] = useState<ManualSku[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [markup, setMarkup] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [extraInfoValues, setExtraInfoValues] = useState<Record<string, string>>({});

  const fallbackImg = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=400&fit=crop";

  useEffect(() => {
    if (!gameId) return;
    trackEvent("game_view", { page: `/game/${gameId}`, gameId });
    setIsLoading(true);
    setSelectedSkuId(null);
    setExtraInfoValues({});

    supabase.from("markup_settings").select("markup_percent").eq("id", 1).single()
      .then(({ data }) => { if (data) setMarkup(Number(data.markup_percent) || 0); });

    // Detect if this is a manual product (UUID format) vs Lootbar numeric ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(gameId ?? "");

    if (isUUID) {
      loadManualProduct(gameId);
    } else {
      loadLootbarGame(gameId);
    }
  }, [gameId]);

  // ─── Manual Product Loader ────────────────────────────────────────────────
  const loadManualProduct = async (id: string) => {
    setIsManual(true);
    const { data: prod } = await supabase
      .from("manual_products")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (!prod) { setIsLoading(false); return; }
    setManualProduct(prod as ManualProduct);

    // Load regions
    const { data: regs } = await supabase
      .from("manual_product_regions")
      .select("*")
      .eq("product_id", id)
      .eq("is_active", true)
      .order("sort_order");

    const regions = (regs as ManualRegion[]) || [];
    setManualRegions(regions);

    // Load SKUs
    const { data: skuData } = await supabase
      .from("manual_skus")
      .select("*")
      .eq("product_id", id)
      .eq("is_active", true)
      .order("sort_order");

    const rawSkus = (skuData as ManualSku[]) || [];
    // Sort: sale price first, then by original price
    rawSkus.sort((a, b) => (a.sale_price ?? a.original_price) - (b.sale_price ?? b.original_price));
    setManualSkus(rawSkus);

    // Auto-select first region
    if (regions.length > 0) setSelectedRegionId(regions[0].id);
    setIsLoading(false);
  };

  // ─── Lootbar Game Loader ──────────────────────────────────────────────────
  const loadLootbarGame = async (id: string) => {
    setIsManual(false);

    // Load game info from cache
    const { data: cached } = await supabase.from("games_cache").select("*").eq("game_id", id).single();
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
      if (cached.short_description) setNotice(cached.short_description);
    }

    // Load SKUs
    lootbarApi.getSkus(id).then((data) => {
      const sorted = [...data].sort((a, b) => (a.price || 0) - (b.price || 0));
      setSkus(sorted);

      // Extract regions from attribute
      const seen = new Set<string>();
      const regs: { value: string; label: string }[] = [];
      sorted.forEach((s) => {
        const region = s.attribute?.[0]?.value;
        if (region && !seen.has(region)) {
          seen.add(region);
          regs.push({ value: region, label: s.attribute[0].value_text || region });
        }
      });
      setLootbarRegions(regs);
      if (regs.length > 0) setSelectedLootbarRegion(regs[0].value);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  };

  // ─── Derived data ─────────────────────────────────────────────────────────
  const filteredLootbarSkus = useMemo(() => {
    if (!selectedLootbarRegion) return skus;
    return skus.filter((s) =>
      s.attribute?.[0]?.value === selectedLootbarRegion || !s.attribute?.length
    );
  }, [skus, selectedLootbarRegion]);

  const filteredManualSkus = useMemo(() => {
    if (!manualRegions.length) return manualSkus;
    return manualSkus.filter((s) => s.region_id === selectedRegionId);
  }, [manualSkus, selectedRegionId, manualRegions]);

  const selectedLootbarSku = skus.find((s) => s.sku_id === selectedSkuId);
  const selectedManualSku = manualSkus.find((s) => s.id === selectedSkuId);

  const applyMarkup = (price: number) => price * (1 + markup / 100);

  const totalPrice = useMemo(() => {
    if (isManual && selectedManualSku) {
      const p = selectedManualSku.sale_price ?? selectedManualSku.original_price;
      return applyMarkup(p) * quantity;
    }
    if (!isManual && selectedLootbarSku) {
      return applyMarkup(selectedLootbarSku.price || 0) * quantity;
    }
    return 0;
  }, [isManual, selectedManualSku, selectedLootbarSku, markup, quantity]);

  const extraInfoFields = useMemo(() => selectedLootbarSku?.extra_info || [], [selectedLootbarSku]);
  const needsVerification = extraInfoFields.length > 0;

  const requiresServer = isManual
    ? (manualProduct?.requires_server ?? false)
    : false; // Lootbar handles regions differently

  const requiresPlayerId = isManual
    ? (manualProduct?.requires_player_id ?? true)
    : needsVerification;

  // ─── Game display info ─────────────────────────────────────────────────────
  const gameName = isManual ? manualProduct?.product_name : game?.game_name;
  const gameImage = isManual ? manualProduct?.photo_url : game?.game_image;
  const gameRating = isManual ? null : game?.rating;
  const gameSoldCount = isManual ? null : game?.sold_count;
  const gameCategory = isManual ? manualProduct?.game_category : game?.category;
  const shortDesc = isManual ? manualProduct?.short_description : null;
  const fullDesc = isManual ? manualProduct?.full_description : null;

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleTopUp = (isMobile = false) => {
    if (!selectedSkuId) { toast.error("Please select a package first"); return; }

    if (isManual && selectedManualSku) {
      const price = applyMarkup(selectedManualSku.sale_price ?? selectedManualSku.original_price);
      const region = manualRegions.find((r) => r.id === selectedRegionId);
      const skuForCheckout = {
        sku_id: selectedManualSku.id,
        sku_name: selectedManualSku.sku_name,
        price,
        original_price: applyMarkup(selectedManualSku.original_price),
        discount_amount: 0,
        attribute: [],
        extra_info: requiresPlayerId ? [{ name: "player_id", title: "Player ID", type: "text", required: true, placeholder: "Enter your Player ID" }] : [],
        image: selectedManualSku.photo_url || manualProduct?.photo_url || null,
      };
      const gameForCheckout = {
        game_id: manualProduct!.id,
        game_name: manualProduct!.product_name,
        game_image: manualProduct!.photo_url || "",
        category: manualProduct!.game_category,
      };

      if (isMobile && requiresPlayerId) {
        navigate("/verify-player", { state: { sku: skuForCheckout, game: gameForCheckout, quantity, region: region?.region_name } });
      } else {
        navigate("/checkout", { state: { sku: skuForCheckout, game: gameForCheckout, quantity, extraInfo: extraInfoValues, region: region?.region_name } });
      }
      return;
    }

    // Lootbar flow
    if (selectedLootbarSku) {
      for (const field of extraInfoFields) {
        if (field.required && !extraInfoValues[field.name]?.trim()) {
          toast.error(`${field.title} is required`);
          return;
        }
      }
      const finalSku = { ...selectedLootbarSku, price: applyMarkup(selectedLootbarSku.price || 0) };
      if (isMobile && needsVerification) {
        navigate("/verify-player", { state: { sku: finalSku, game, quantity } });
      } else {
        navigate("/checkout", { state: { sku: finalSku, game, quantity, extraInfo: extraInfoValues } });
      }
    }
  };

  const ExtraInfoForm = ({ compact = false }: { compact?: boolean }) => (
    <>
      {extraInfoFields.map((field) => (
        <div key={field.name} className={compact ? "mb-3" : "mb-4"}>
          <label className={`block font-semibold text-gray-700 mb-1.5 ${compact ? "text-xs" : "text-sm"}`}>
            {field.required && <span className="text-red-500 mr-0.5">*</span>}
            {field.title}
          </label>
          {field.type === "select" && field.options?.length ? (
            <select
              value={extraInfoValues[field.name] || ""}
              onChange={(e) => setExtraInfoValues((p) => ({ ...p, [field.name]: e.target.value }))}
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
              onChange={(e) => setExtraInfoValues((p) => ({ ...p, [field.name]: e.target.value }))}
              placeholder={field.placeholder || `Enter your ${field.title}`}
              className="w-full border border-gray-300 focus:border-yellow-400 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors rounded-xl"
            />
          )}
        </div>
      ))}
    </>
  );

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isLoading && !game && !manualProduct) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <div className="hidden lg:block"><DesktopHeader /></div>
        <div className="lg:hidden"><Header showBack /></div>
        <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-4">
          <div className="shimmer h-40 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="shimmer rounded-2xl aspect-square" />)}
          </div>
        </div>
      </div>
    );
  }

  // ─── Game Header Block ─────────────────────────────────────────────────────
  const GameHeader = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex items-start gap-4 ${compact ? "pb-0" : ""}`}>
      <img
        src={imgError ? fallbackImg : (gameImage || fallbackImg)}
        alt={gameName || "Game"}
        className={`${compact ? "w-16 h-16" : "w-20 h-20 lg:w-24 lg:h-24"} rounded-2xl object-cover flex-shrink-0 shadow-md`}
        onError={() => setImgError(true)}
      />
      <div className="flex-1 min-w-0">
        <h1 className={`font-black text-gray-900 leading-tight mb-1 ${compact ? "text-base" : "text-xl lg:text-2xl"}`}>
          {gameName}
        </h1>
        {/* Rating & sold count — only real data */}
        {(gameRating != null || gameSoldCount) && (
          <div className="flex items-center gap-2 mb-2">
            {gameRating != null && (
              <>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={compact ? 11 : 13} fill="#FFD200" stroke="none" />
                  ))}
                </div>
                <span className={`font-black text-yellow-600 ${compact ? "text-xs" : "text-sm"}`}>
                  {gameRating.toFixed(1)}
                </span>
              </>
            )}
            {gameSoldCount && (
              <span className={`text-gray-400 ${compact ? "text-[11px]" : "text-xs"}`}>{gameSoldCount}</span>
            )}
          </div>
        )}
        {/* Category badge */}
        {gameCategory && (
          <span className="inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-lg">
            {gameCategory}
          </span>
        )}
      </div>
    </div>
  );

  // ─── Description Block ─────────────────────────────────────────────────────
  const DescriptionBlock = () => {
    if (!shortDesc && !fullDesc) return null;
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-base font-bold text-gray-900 mb-2">About</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {showFullDesc ? (fullDesc || shortDesc) : shortDesc}
        </p>
        {fullDesc && fullDesc !== shortDesc && (
          <button
            onClick={() => setShowFullDesc(!showFullDesc)}
            className="mt-2 text-sm font-semibold text-yellow-600 flex items-center gap-1"
          >
            {showFullDesc ? "Show Less" : "Show All"}
            {showFullDesc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>
    );
  };

  // ─── Trust badges ─────────────────────────────────────────────────────────
  const TrustBadges = () => (
    <div className="flex items-center gap-4 flex-wrap">
      {[
        { icon: <Zap size={14} className="text-yellow-500" />, label: "Fast Delivery" },
        { icon: <Shield size={14} className="text-green-500" />, label: "Secure" },
        { icon: <Clock size={14} className="text-blue-500" />, label: "24/7 Support" },
      ].map((b) => (
        <span key={b.label} className="flex items-center gap-1.5 text-sm text-gray-600">
          {b.icon} {b.label}
        </span>
      ))}
    </div>
  );

  // ─── Desktop Layout ────────────────────────────────────────────────────────
  const DesktopLayout = () => (
    <div className="hidden lg:block min-h-screen bg-[#f5f5f5]">
      <DesktopHeader />

      {/* Breadcrumb */}
      <div className="max-w-[1280px] mx-auto px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/")} className="hover:text-gray-700">Home</button>
        <ChevronRight size={14} />
        <button onClick={() => navigate("/categories")} className="hover:text-gray-700">{gameCategory || "Games"}</button>
        <ChevronRight size={14} />
        <span className="text-gray-800 font-medium">{gameName}</span>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 pb-16">
        <div className="flex gap-6 items-start">

          {/* ── Left content panel ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Game header card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <GameHeader />
              <div className="mt-4">
                <TrustBadges />
              </div>
            </div>

            {/* Notice */}
            {notice && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">{notice}</p>
                </div>
                <button onClick={() => setNotice(null)}><X size={14} className="text-gray-400 hover:text-gray-600" /></button>
              </div>
            )}

            {/* Server / Region tabs */}
            {isManual && manualRegions.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Server</p>
                <ServerTabs
                  regions={manualRegions}
                  selected={selectedRegionId}
                  onSelect={(id) => { setSelectedRegionId(id); setSelectedSkuId(null); }}
                />
              </div>
            )}

            {!isManual && lootbarRegions.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  {skus[0]?.attribute?.[0]?.key_text || "Region"}
                </p>
                <LootbarRegionTabs
                  regions={lootbarRegions}
                  selected={selectedLootbarRegion}
                  onSelect={(v) => { setSelectedLootbarRegion(v); setSelectedSkuId(null); }}
                />
              </div>
            )}

            {/* Product grid — 5 per row on desktop */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm font-bold text-gray-700 mb-4">Select Package</p>
              {isLoading ? (
                <div className="grid grid-cols-5 gap-3">
                  {Array.from({ length: 10 }).map((_, i) => <div key={i} className="shimmer rounded-2xl aspect-square" />)}
                </div>
              ) : isManual ? (
                filteredManualSkus.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No packages available for this server</p>
                ) : (
                  <div className="grid grid-cols-5 gap-3">
                    {filteredManualSkus.map((sku) => {
                      const displayPrice = applyMarkup(sku.sale_price ?? sku.original_price);
                      const oldPrice = sku.sale_price ? applyMarkup(sku.original_price) : null;
                      const discount = sku.sale_price
                        ? Math.round((1 - sku.sale_price / sku.original_price) * 100)
                        : 0;
                      return (
                        <ProductCard
                          key={sku.id}
                          image={sku.photo_url}
                          name={sku.sku_name}
                          price={fmt(displayPrice)}
                          oldPrice={oldPrice ? fmt(oldPrice) : undefined}
                          discount={discount}
                          selected={selectedSkuId === sku.id}
                          onClick={() => { setSelectedSkuId(sku.id); setExtraInfoValues({}); }}
                          fallbackImg={manualProduct?.photo_url || fallbackImg}
                        />
                      );
                    })}
                  </div>
                )
              ) : (
                filteredLootbarSkus.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No packages found</p>
                ) : (
                  <div className="grid grid-cols-5 gap-3">
                    {filteredLootbarSkus.map((sku) => {
                      const markedPrice = applyMarkup(sku.price || 0);
                      const savings = sku.discount_amount || 0;
                      const discountPct = savings > 0 && sku.original_price
                        ? Math.round((savings / sku.original_price) * 100) : 0;
                      return (
                        <ProductCard
                          key={sku.sku_id}
                          image={sku.image}
                          name={sku.sku_name}
                          price={fmt(markedPrice)}
                          oldPrice={savings > 0 ? fmt(sku.original_price || sku.price) : undefined}
                          discount={discountPct}
                          selected={selectedSkuId === sku.sku_id}
                          onClick={() => { setSelectedSkuId(sku.sku_id); setExtraInfoValues({}); }}
                          fallbackImg={game?.game_image || fallbackImg}
                        />
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {/* Description */}
            <DescriptionBlock />

            {/* How to top-up */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">How to Top-up</h3>
              <div className="space-y-4">
                {[
                  { step: 1, title: "Select your package", desc: "Choose the top-up amount that suits you from the list above." },
                  { step: 2, title: "Enter your Player ID", desc: "Enter your Player ID or game account information accurately." },
                  { step: 3, title: "Complete payment", desc: "Choose your payment method and complete the transaction securely." },
                  { step: 4, title: "Receive items", desc: "Your items are delivered automatically, usually within 1–5 minutes." },
                ].map((inst) => (
                  <div key={inst.step} className="flex gap-3">
                    <div className="w-7 h-7 bg-yellow-400 rounded-lg flex items-center justify-center font-black text-sm text-black flex-shrink-0">{inst.step}</div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{inst.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{inst.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Order panel ── */}
          <div className="w-72 flex-shrink-0">
            <div style={{ position: "sticky", top: "70px" } as React.CSSProperties}>
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Player info form */}
                {(selectedSkuId && (extraInfoFields.length > 0 || (isManual && requiresPlayerId))) && (
                  <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                    <h4 className="font-bold text-gray-800 text-sm mb-3">Player Information</h4>
                    {isManual ? (
                      <>
                        <div className="mb-3">
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            <span className="text-red-500 mr-0.5">*</span>Player ID
                          </label>
                          <input
                            type="text"
                            value={extraInfoValues["player_id"] || ""}
                            onChange={(e) => setExtraInfoValues((p) => ({ ...p, player_id: e.target.value }))}
                            placeholder="Enter your Player ID"
                            className="w-full border border-gray-300 focus:border-yellow-400 px-3 py-2.5 text-sm text-gray-900 outline-none rounded-xl"
                          />
                        </div>
                        {requiresServer && (
                          <div className="mb-3">
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Server</label>
                            <p className="text-sm font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded-xl">
                              {manualRegions.find((r) => r.id === selectedRegionId)?.region_name || "—"}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <ExtraInfoForm compact />
                    )}
                  </div>
                )}

                {/* No selection placeholder */}
                {!selectedSkuId && (
                  <div className="px-5 py-6 border-b border-gray-100">
                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-400">Select a package from the left</p>
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Quantity</span>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 border-r border-gray-200">−</button>
                      <span className="text-sm font-bold w-10 text-center">{quantity}</span>
                      <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 border-l border-gray-200">+</button>
                    </div>
                  </div>
                </div>

                {/* Price & CTA */}
                <div className="px-5 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="text-2xl font-black text-orange-500">
                      {selectedSkuId ? fmt(totalPrice) : "—"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleTopUp(false)}
                    disabled={!selectedSkuId}
                    className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${
                      selectedSkuId ? "bg-yellow-400 hover:bg-yellow-300 text-black" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Top-up Now
                  </button>
                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    <Shield size={12} className="text-green-500" />
                    <span className="text-xs text-gray-400">NoxyStore Security Guarantee</span>
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

  // ─── Mobile Layout ─────────────────────────────────────────────────────────
  const MobileLayout = () => (
    <div className="lg:hidden min-h-screen bg-[#f5f5f5]">
      {/* Mobile header — branded with back button */}
      <div className="bg-[#0a0a0a] sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white p-1 -ml-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <button onClick={() => navigate("/")} className="font-black text-base tracking-tight">
          <span className="text-yellow-400">NOXY</span>
          <span className="text-white">STORE</span>
          <span className="text-yellow-400 text-xs">.gg</span>
        </button>
        <div className="flex-1" />
        <span className="text-white/60 text-xs font-medium truncate max-w-[120px]">{gameName}</span>
      </div>

      <div className="pb-44">
        {/* Game banner */}
        <div className="relative h-36 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
          <img
            src={imgError ? fallbackImg : (gameImage || fallbackImg)}
            alt={gameName || "Game"}
            className="w-full h-full object-cover opacity-40"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 flex items-end px-4 pb-4">
            <div className="flex items-end gap-3">
              <img
                src={imgError ? fallbackImg : (gameImage || fallbackImg)}
                alt={gameName || "Game"}
                className="w-16 h-16 rounded-2xl object-cover shadow-lg border-2 border-white/20"
                onError={() => setImgError(true)}
              />
              <div>
                <h1 className="text-white font-black text-lg leading-tight">{gameName}</h1>
                {(gameRating != null || gameSoldCount) && (
                  <div className="flex items-center gap-2 mt-0.5">
                    {gameRating != null && (
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={10} fill="#FFD200" stroke="none" />)}
                      </div>
                    )}
                    {gameSoldCount && <span className="text-white/60 text-xs">{gameSoldCount}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
          {[
            { icon: <Zap size={13} className="text-yellow-500" />, label: "Fast" },
            { icon: <Shield size={13} className="text-green-500" />, label: "Secure" },
            { icon: <Clock size={13} className="text-blue-500" />, label: "24/7 Support" },
          ].map((b) => (
            <span key={b.label} className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-600 font-medium">
              {b.icon} {b.label}
            </span>
          ))}
        </div>

        {/* Notice */}
        {notice && (
          <div className="mx-3 mt-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info size={13} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">{notice}</p>
            </div>
            <button onClick={() => setNotice(null)}><X size={12} className="text-gray-400 ml-2" /></button>
          </div>
        )}

        {/* Server tabs */}
        {isManual && manualRegions.length > 1 && (
          <div className="px-3 pt-4 pb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Server</p>
            <ServerTabs
              regions={manualRegions}
              selected={selectedRegionId}
              onSelect={(id) => { setSelectedRegionId(id); setSelectedSkuId(null); }}
            />
          </div>
        )}

        {!isManual && lootbarRegions.length > 1 && (
          <div className="px-3 pt-4 pb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              {skus[0]?.attribute?.[0]?.key_text || "Region"}
            </p>
            <LootbarRegionTabs
              regions={lootbarRegions}
              selected={selectedLootbarRegion}
              onSelect={(v) => { setSelectedLootbarRegion(v); setSelectedSkuId(null); }}
            />
          </div>
        )}

        {/* Product grid — 2 per row on mobile */}
        <div className="px-3 pt-3">
          <p className="text-sm font-bold text-gray-700 mb-3">Select Package</p>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="shimmer rounded-2xl aspect-square" />)}
            </div>
          ) : isManual ? (
            filteredManualSkus.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No packages available for this server</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredManualSkus.map((sku) => {
                  const displayPrice = applyMarkup(sku.sale_price ?? sku.original_price);
                  const oldPrice = sku.sale_price ? applyMarkup(sku.original_price) : null;
                  const discount = sku.sale_price
                    ? Math.round((1 - sku.sale_price / sku.original_price) * 100)
                    : 0;
                  return (
                    <ProductCard
                      key={sku.id}
                      image={sku.photo_url}
                      name={sku.sku_name}
                      price={fmt(displayPrice)}
                      oldPrice={oldPrice ? fmt(oldPrice) : undefined}
                      discount={discount}
                      selected={selectedSkuId === sku.id}
                      onClick={() => { setSelectedSkuId(sku.id); setExtraInfoValues({}); }}
                      fallbackImg={manualProduct?.photo_url || fallbackImg}
                    />
                  );
                })}
              </div>
            )
          ) : (
            filteredLootbarSkus.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No packages found</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredLootbarSkus.map((sku) => {
                  const markedPrice = applyMarkup(sku.price || 0);
                  const savings = sku.discount_amount || 0;
                  const discountPct = savings > 0 && sku.original_price
                    ? Math.round((savings / sku.original_price) * 100) : 0;
                  return (
                    <ProductCard
                      key={sku.sku_id}
                      image={sku.image}
                      name={sku.sku_name}
                      price={fmt(markedPrice)}
                      oldPrice={savings > 0 ? fmt(sku.original_price || sku.price) : undefined}
                      discount={discountPct}
                      selected={selectedSkuId === sku.sku_id}
                      onClick={() => { setSelectedSkuId(sku.sku_id); setExtraInfoValues({}); }}
                      fallbackImg={game?.game_image || fallbackImg}
                    />
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Short description */}
        {(shortDesc || fullDesc) && (
          <div className="mx-3 mt-4 bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-1.5">About</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              {showFullDesc ? (fullDesc || shortDesc) : shortDesc}
            </p>
            {fullDesc && fullDesc !== shortDesc && (
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="mt-2 text-xs font-semibold text-yellow-600 flex items-center gap-1"
              >
                {showFullDesc ? "Show Less" : "Show All"}
                {showFullDesc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        )}

        <MobileFooter />
        <FloatingChat />
      </div>

      {/* ─── Fixed Bottom CTA ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 z-50"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>

        {/* Player ID input when SKU selected and requires player ID */}
        {selectedSkuId && requiresPlayerId && (
          <div className="mb-2">
            {isManual ? (
              <input
                type="text"
                value={extraInfoValues["player_id"] || ""}
                onChange={(e) => setExtraInfoValues((p) => ({ ...p, player_id: e.target.value }))}
                placeholder="Enter your Player ID"
                className="w-full border border-gray-300 focus:border-yellow-400 px-3 py-2.5 text-sm text-gray-900 outline-none rounded-xl bg-gray-50"
              />
            ) : null}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400 mb-0.5">Total Price</p>
            <p className="text-xl font-black text-orange-500">{selectedSkuId ? fmt(totalPrice) : "—"}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quantity */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50">−</button>
              <span className="text-sm font-bold w-8 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50">+</button>
            </div>
            {/* Top-up button */}
            <button
              onClick={() => handleTopUp(true)}
              disabled={!selectedSkuId}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                selectedSkuId ? "bg-yellow-400 text-black hover:bg-yellow-300" : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {(needsVerification && !isManual) ? "Continue" : "Top-up"}
            </button>
          </div>
        </div>

        {!selectedSkuId && (
          <p className="text-center text-xs text-gray-400 mt-1">Select a package above to continue</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <DesktopLayout />
      <MobileLayout />
    </>
  );
}
