import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, KeyRound, Star } from "lucide-react";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { HeroBanner } from "@/components/features/HeroBanner";
import { CategoryIcons } from "@/components/features/CategoryIcons";
import { GameCard, GameCardSkeleton } from "@/components/features/GameCard";
import { FloatingChat } from "@/components/features/FloatingChat";
import { lootbarApi } from "@/lib/lootbar-api";
import { useTranslation } from "@/hooks/useTranslation";
import type { LootbarGame } from "@/types";
import { Wallet, Coins, Gift, Swords } from "lucide-react";
const BANNER_IMAGES: Array<{ id: string; title: string; subtitle: string; image_url: string; image: string; link: string; fallback: string }> = [];
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import { NewUserCouponModal } from "@/components/features/NewUserCouponModal";
import { useAuthStore } from "@/stores/authStore";
import { Footer } from "@/components/layout/Footer";
import { MobileFooter } from "@/components/layout/MobileFooter";
import gameKeysBg from "@/assets/game-keys-bg.jpg";
import { useSettingsStore } from "@/stores/settingsStore";
import { CURRENCY_RATES } from "@/constants/translations";

interface HomeSection {
  id: string;
  section_name: string;
  section_key: string;
  sort_order: number;
  is_active: boolean;
  game_ids: string[];
}

// Desktop Hero Banner
function DesktopHeroBanner({ banners }: { banners: typeof BANNER_IMAGES }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const items = banners.length > 0 ? banners : BANNER_IMAGES;

  useEffect(() => {
    if (items.length === 0) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % items.length), 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="relative w-full h-80 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl mx-auto flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-black text-yellow-400 opacity-20 mb-2">NOXYSTORE</div>
          <p className="text-gray-500 text-sm">Add banners from the admin panel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-80 overflow-hidden bg-gray-900 rounded-2xl mx-auto">
      <button onClick={() => setCurrent((c) => (c - 1 + items.length) % items.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button onClick={() => setCurrent((c) => (c + 1) % items.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
      </button>
      {items.map((banner, idx) => {
        const src = imgErrors[(banner as any).id || idx] ? ((banner as any).fallback || banner.image_url || banner.image) : ((banner as any).image_url || (banner as any).image);
        return (
          <div key={(banner as any).id || idx} className={`absolute inset-0 transition-opacity duration-700 ${idx === current ? "opacity-100" : "opacity-0"}`}
            onClick={() => (banner as any).link && navigate((banner as any).link)}
            style={{ cursor: (banner as any).link && (banner as any).link !== "/" ? "pointer" : "default" }}>
            <img src={src} alt={banner.title} className="w-full h-full object-cover"
              onError={() => setImgErrors((p) => ({ ...p, [(banner as any).id || idx]: true }))} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
            <div className="absolute left-10 bottom-10 text-white">
              <p className="text-yellow-400 text-sm font-bold uppercase tracking-widest mb-1">{banner.subtitle}</p>
              <h2 className="text-3xl font-black">{banner.title}</h2>
            </div>
          </div>
        );
      })}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {items.map((_, idx) => (
          <button key={idx} onClick={() => setCurrent(idx)} className={`h-1.5 rounded-full transition-all ${idx === current ? "bg-yellow-400 w-6" : "bg-white/50 w-3"}`} />
        ))}
      </div>
    </div>
  );
}

// Mobile Game Card - styled like LootBar photo 1
function MobileGameCard({ game }: { game: LootbarGame }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currency } = useSettingsStore();

  const formatPrice = (usdPrice: number | null | undefined): string => {
    if (!usdPrice) return "";
    const rate = CURRENCY_RATES[currency] ?? 1;
    const converted = usdPrice * rate;
    const symbols: Record<string, string> = {
      USD: "$", EUR: "€", GBP: "£", IDR: "Rp", MYR: "RM",
      SGD: "S$", THB: "฿", VND: "₫", PHP: "₱", BRL: "R$",
    };
    const sym = symbols[currency] ?? "$";
    if (currency === "IDR" || currency === "VND") {
      return `${sym}${Math.round(converted).toLocaleString()}`;
    }
    return `${sym}${converted.toFixed(2)}`;
  };

  return (
    <button 
      onClick={() => navigate(`/game/${game.game_id}`)}
      className="flex flex-col text-left w-full"
    >
      {/* Image Container */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 mb-2">
        <img 
          src={game.game_image || `https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&h=300&fit=crop`} 
          alt={game.game_name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&h=300&fit=crop`; }}
        />
        {/* Discount Badge */}
        {(game.discount ?? 0) > 0 && (
          <div className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
            -{game.discount}%
          </div>
        )}
      </div>

      {/* Game Info */}
      <h3 className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-1 mb-1">
        {game.game_name}
      </h3>

      {/* Rating & Sold — real data only */}
      {(game.rating != null || game.sold_count) && (
        <div className="flex items-center gap-1.5">
          {game.rating != null && (
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-[11px] font-bold text-yellow-500">{game.rating.toFixed(1)}</span>
            </div>
          )}
          {game.rating != null && game.sold_count && <span className="text-[10px] text-gray-400">|</span>}
          {game.sold_count && <span className="text-[10px] text-gray-400">{game.sold_count}</span>}
        </div>
      )}
    </button>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { currency } = useSettingsStore();
  const [games, setGames] = useState<LootbarGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [dynamicBanners, setDynamicBanners] = useState<Array<{ id: string; title: string; subtitle: string; image_url: string; link: string; sort_order: number }>>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);

  // Mobile row expansion state — 3 cols, 3 lines initially
  const [hotRows, setHotRows] = useState(3);
  const [discountRows, setDiscountRows] = useState(3);
  const [newRows, setNewRows] = useState(3);
  const [giftRows, setGiftRows] = useState(3);

  // Desktop row expansion state — 7 cols, 2 rows initially
  const [hotDesktopRows, setHotDesktopRows] = useState(2);
  const [discountDesktopRows, setDiscountDesktopRows] = useState(2);
  const [newDesktopRows, setNewDesktopRows] = useState(2);
  const [giftDesktopRows, setGiftDesktopRows] = useState(2);
  const DESKTOP_COLS = 7;

  const COLS = 3;
  const INITIAL_LINES = 3;
  const LINES_PER_CLICK = 3;

  // Currency formatting helper
  const formatPrice = (usdPrice: number | null | undefined): string => {
    if (!usdPrice) return "";
    const rate = CURRENCY_RATES[currency] ?? 1;
    const converted = usdPrice * rate;
    const symbols: Record<string, string> = {
      USD: "$", EUR: "€", GBP: "£", IDR: "Rp", MYR: "RM",
      SGD: "S$", THB: "฿", VND: "₫", PHP: "₱", BRL: "R$",
    };
    const sym = symbols[currency] ?? "$";
    if (currency === "IDR" || currency === "VND") {
      return `${sym}${Math.round(converted).toLocaleString()}`;
    }
    return `${sym}${converted.toFixed(2)}`;
  };

  useEffect(() => {
    trackEvent("page_view", { page: "/" });
    lootbarApi.getGames().then((data) => {
      setGames(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
    supabase.from("home_sections").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => { if (data) setSections(data as HomeSection[]); });
    supabase.from("home_banners").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => { if (data) setDynamicBanners(data); setIsLoadingBanners(false); })
      .catch(() => setIsLoadingBanners(false));
  }, []);

  const getSectionGames = (section: HomeSection): LootbarGame[] => {
    if (section.game_ids.length === 0) return [];
    return section.game_ids.map((id) => games.find((g) => g.game_id === id)).filter(Boolean) as LootbarGame[];
  };

  const hotGames = games.filter((g) => g.is_hot);
  const discountGames = games.filter((g) => g.discount && g.discount > 0);
  const newGames = [...games].reverse();
  const giftCardGames = games.filter((g) =>
    g.category?.toLowerCase().includes("gift") ||
    g.game_name?.toLowerCase().includes("gift") ||
    g.game_name?.toLowerCase().includes("card")
  );
  const gameKeyGames = games.filter((g) =>
    g.category?.toLowerCase().includes("key") ||
    g.game_name?.toLowerCase().includes("steam") ||
    g.game_name?.toLowerCase().includes("key") ||
    g.game_name?.toLowerCase().includes("pc")
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="hidden lg:block"><DesktopHeader /></div>
      <div className="lg:hidden"><Header showMenu /></div>

      {/* ── Desktop Layout ── */}
      <div className="hidden lg:block">
        <div className="max-w-[1280px] mx-auto px-6 py-6 space-y-8">
          <DesktopHeroBanner banners={dynamicBanners} />

          {/* Desktop Category Icons */}
          <div className="flex items-center justify-center gap-10 py-2">
            {[
              { label: t("topUp"), icon: <Wallet size={28} strokeWidth={2.3} />, color: "bg-orange-500", filter: "Top Up" },
              { label: t("gameCoins"), icon: <Coins size={28} strokeWidth={2.3} />, color: "bg-yellow-500", filter: "Game Coins" },
              { label: t("giftCard"), icon: <Gift size={28} strokeWidth={2.3} />, color: "bg-pink-500", filter: "Gift Card" },
              { label: t("gameKeys"), icon: <KeyRound size={28} strokeWidth={2.3} />, color: "bg-purple-600", filter: "Game Keys", hot: true },
              { label: t("gameItems"), icon: <Swords size={28} strokeWidth={2.3} />, color: "bg-sky-500", filter: "Game Items" },
            ].map((cat) => (
              <button key={cat.label} onClick={() => navigate(`/categories?filter=${encodeURIComponent(cat.filter)}`)} className="flex flex-col items-center gap-2 group">
                <div className="relative">
                  <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center text-white shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}>{cat.icon}</div>
                  {cat.hot && <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">HOT</span>}
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-black">{cat.label}</span>
              </button>
            ))}
            <button onClick={() => navigate("/support")} className="flex flex-col items-center gap-2 ml-8">
              <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-black"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
              </div>
              <span className="text-xs font-semibold text-gray-600">{t("support24")}</span>
            </button>
          </div>

          {/* Hot Selling Games */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">{t("hotSellingGames")}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{t("safeAffordablePrice")}</p>
              </div>
              <button onClick={() => navigate("/categories")} className="flex items-center gap-1 text-sm text-gray-600 font-semibold border border-gray-200 bg-white rounded-xl px-3 py-1.5 hover:bg-gray-50">
                {t("all")} ({games.length}) <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-4">
              {isLoading ? Array.from({ length: hotDesktopRows * DESKTOP_COLS }).map((_, i) => <div key={i} className="shimmer rounded-2xl aspect-square" />)
                : hotGames.concat(games.filter(g => !g.is_hot)).slice(0, hotDesktopRows * DESKTOP_COLS).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
            </div>
            {!isLoading && hotGames.concat(games.filter(g => !g.is_hot)).length > hotDesktopRows * DESKTOP_COLS ? (
              <button onClick={() => setHotDesktopRows(r => r + 2)} className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors">
                View More <ChevronRight size={14} />
              </button>
            ) : !isLoading && hotDesktopRows > 2 ? (
              <button onClick={() => setHotDesktopRows(2)} className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors">
                Show Less <ChevronRight size={14} className="rotate-180" />
              </button>
            ) : null}
          </div>

          {/* Popular Game Key — desktop */}
          {(gameKeyGames.length > 0 || !isLoading) && (
            <div className="rounded-2xl overflow-hidden relative" style={{ background: `url(${gameKeysBg}) center/cover no-repeat` }}>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-800/70 to-transparent" />
              <div className="relative z-10 px-8 py-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-black text-white">{t("popularGameKey")}</h2>
                    <p className="text-sm text-blue-200 mt-0.5">{t("enjoyPlayingGames")}</p>
                  </div>
                  <button onClick={() => navigate("/categories?filter=Game+Keys")}
                    className="flex items-center gap-1 text-sm text-white font-semibold bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 hover:bg-white/20">
                    {t("all")} ({gameKeyGames.length}) <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {isLoading ? Array.from({length:4}).map((_,i) => <div key={i} className="shimmer w-44 h-64 rounded-xl flex-shrink-0" />)
                    : gameKeyGames.slice(0, 5).map((game) => (
                      <button key={game.game_id} onClick={() => navigate(`/game/${game.game_id}`)}
                        className="flex-shrink-0 w-44 flex flex-col bg-white rounded-xl overflow-hidden text-left hover:shadow-xl hover:-translate-y-1 transition-all group">
                        <div className="h-40 bg-gray-200 relative overflow-hidden">
                          <img src={game.game_image || `https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=180&h=160&fit=crop`} alt={game.game_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=180&h=160&fit=crop`; }} />
                          {(game.discount ?? 0) > 0 && <div className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">-{game.discount}%</div>}
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{game.game_name}</p>
                          <div className="flex items-center gap-1 mb-1">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-gray-600"><path d="M3 3h18v18H3V3zm16.525 13.707c-.131-.821-.666-1.511-2.252-2.155-.552-.259-1.165-.438-1.349-.854-.068-.248-.078-.382-.034-.529.113-.484.687-.629 1.137-.495.293.09.563.315.732.676.775-.507.775-.507 1.316-.844-.203-.314-.304-.451-.439-.586-.473-.528-1.103-.798-2.126-.775l-.528.067c-.507.124-.991.395-1.283.754-.855 1.030-.607 2.830.802 3.575 1.12.525 2.519.643 2.715 1.179.18.635-.511.839-1.135.756-.63-.094-.984-.459-1.226-.932l-1.33.793c.259.498.894 1.305 1.946 1.45l.814-.013c.529-.058 1.046-.305 1.350-.683.339-.41.378-.968.299-1.540zM8.556 9h-1.11l-1.86 4.666h1.107l.365-.886h1.836l.353.886h1.133L8.556 9zm-.588 2.742l.571-1.57.571 1.57H7.968z"/></svg>
                            <span className="text-[10px] text-gray-500">{t("steamKey")}</span>
                          </div>
                          {game.min_price && (
                            <p className="text-orange-500 font-black text-sm">{formatPrice(Number(game.min_price))}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  {/* View All card */}
                  <button onClick={() => navigate("/categories?filter=Game+Keys")}
                    className="flex-shrink-0 w-44 flex flex-col items-center justify-center bg-yellow-400/90 rounded-xl p-4 hover:bg-yellow-400 transition-colors text-center">
                    <KeyRound size={36} className="text-black mb-3" />
                    <p className="font-black text-black text-sm">{t("gameKeys")}</p>
                    <div className="mt-3 border border-black/20 rounded-lg px-4 py-2 text-xs font-bold text-black">
                      {t("viewAll")} ({gameKeyGames.length})
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {discountGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-gray-900">{t("discountDeals")}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{t("limitedTimeOffers")}</p>
                </div>
                <button onClick={() => navigate("/categories")} className="text-sm text-gray-500 font-medium hover:text-gray-700">
                  {t("all")} ({discountGames.length}) →
                </button>
              </div>
              <div className="grid grid-cols-7 gap-4">
                {discountGames.slice(0, discountDesktopRows * DESKTOP_COLS).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
              </div>
              {discountGames.length > discountDesktopRows * DESKTOP_COLS ? (
                <button onClick={() => setDiscountDesktopRows(r => r + 2)} className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors">
                  View More <ChevronRight size={14} />
                </button>
              ) : discountDesktopRows > 2 ? (
                <button onClick={() => setDiscountDesktopRows(2)} className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors">
                  Show Less <ChevronRight size={14} className="rotate-180" />
                </button>
              ) : null}
            </div>
          )}

          {newGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-gray-900">{t("newGames")}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{t("latestArrivals")}</p>
                </div>
                <button onClick={() => navigate("/categories")} className="flex items-center gap-1 text-sm text-gray-600 font-semibold border border-gray-200 bg-white rounded-xl px-3 py-1.5 hover:bg-gray-50">
                  {t("all")} <ChevronRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-4">
                {newGames.slice(0, newDesktopRows * DESKTOP_COLS).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
              </div>
              {newGames.length > newDesktopRows * DESKTOP_COLS ? (
                <button onClick={() => setNewDesktopRows(r => r + 2)} className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors">
                  View More <ChevronRight size={14} />
                </button>
              ) : newDesktopRows > 2 ? (
                <button onClick={() => setNewDesktopRows(2)} className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors">
                  Show Less <ChevronRight size={14} className="rotate-180" />
                </button>
              ) : null}
            </div>
          )}

          {giftCardGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-gray-900">{t("trendingGiftCards")}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{t("topGiftCards")}</p>
                </div>
                <button onClick={() => navigate("/categories?filter=Gift+Card")} className="flex items-center gap-1 text-sm text-gray-600 font-semibold border border-gray-200 bg-white rounded-xl px-3 py-1.5 hover:bg-gray-50">
                  {t("all")} ({giftCardGames.length}) <ChevronRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-4">
                {giftCardGames.slice(0, giftDesktopRows * DESKTOP_COLS).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
              </div>
              {giftCardGames.length > giftDesktopRows * DESKTOP_COLS ? (
                <button onClick={() => setGiftDesktopRows(r => r + 2)} className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors">
                  View More <ChevronRight size={14} />
                </button>
              ) : giftDesktopRows > 2 ? (
                <button onClick={() => setGiftDesktopRows(2)} className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors">
                  Show Less <ChevronRight size={14} className="rotate-180" />
                </button>
              ) : null}
            </div>
          )}

          {sections.map((sec) => {
            const secGames = getSectionGames(sec);
            if (secGames.length === 0) return null;
            return (
              <div key={sec.id}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black text-gray-900">{sec.section_name}</h2>
                </div>
                <div className="grid grid-cols-7 gap-4">
                  {secGames.slice(0, 7).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
                </div>
              </div>
            );
          })}

          <Footer />
        </div>
      </div>

      <NewUserCouponModal isAuthenticated={isAuthenticated} />

      {/* ── Mobile Layout ── */}
      <div className="lg:hidden pb-20">
        {/* Mobile Search */}
        <div className="px-3 pt-3 pb-3">
          <button onClick={() => navigate("/categories")} className="w-full flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3 text-gray-400 text-sm">
            <Search size={16} /><span>{t("searchGames")}</span>
          </button>
        </div>

        <HeroBanner />
        <div className="mt-5 mb-2"><CategoryIcons /></div>

        {/* HOT SELLING TOP-UP GAMES */}
        <div className="mt-5 px-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-black text-gray-900">{t("hotSellingGames")}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t("safeAffordablePrice")}</p>
            </div>
            <button onClick={() => navigate("/categories")} className="flex items-center gap-1 text-xs text-gray-500 font-medium">
              {t("all")} ({games.length}) <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {isLoading
              ? Array.from({ length: hotRows * COLS }).map((_, i) => (
                  <div key={i} className="shimmer rounded-xl aspect-square" />
                ))
              : hotGames
                  .concat(games.filter(g => !g.is_hot))
                  .slice(0, hotRows * COLS)
                  .map((game) => <MobileGameCard key={game.game_id} game={game} />)
            }
          </div>

          {hotGames.concat(games.filter(g => !g.is_hot)).length > hotRows * COLS ? (
            <button 
              onClick={() => setHotRows((r) => r + LINES_PER_CLICK)} 
              className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors"
            >
              {t("viewMore")} <ChevronRight size={14} />
            </button>
          ) : hotRows > INITIAL_LINES ? (
            <button 
              onClick={() => setHotRows(INITIAL_LINES)} 
              className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors"
            >
              {t("showLess")} <ChevronRight size={14} className="rotate-180" />
            </button>
          ) : null}
        </div>

        {/* POPULAR GAME KEY */}
        {(gameKeyGames.length > 0 || !isLoading) && (
          <div className="mt-6 mx-3 rounded-2xl overflow-hidden relative" style={{ background: `url(${gameKeysBg}) center/cover no-repeat` }}>
            <div className="absolute inset-0 bg-blue-900/80" />
            <div className="relative z-10 px-4 py-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-black text-white">{t("popularGameKey")}</h2>
                  <p className="text-xs text-blue-200 mt-0.5">{t("enjoyPlayingGames")}</p>
                </div>
                <button onClick={() => navigate("/categories?filter=Game+Keys")} className="text-xs text-white font-semibold bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 flex items-center gap-1">
                  {t("all")} ({gameKeyGames.length}) <ChevronRight size={12} />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                {isLoading
                  ? Array.from({length: 4}).map((_,i) => <div key={i} className="shimmer flex-shrink-0 w-28 h-44 rounded-xl" />)
                  : gameKeyGames.slice(0, 10).map((game) => (
                    <button key={game.game_id} onClick={() => navigate(`/game/${game.game_id}`)}
                      className="flex-shrink-0 w-24 flex flex-col bg-white rounded-xl overflow-hidden text-left hover:shadow-md transition-all">
                      <div className="h-24 bg-gray-200 relative overflow-hidden">
                        <img src={game.game_image || `https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&h=200&fit=crop`} alt={game.game_name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&h=200&fit=crop`; }} />
                        {(game.discount ?? 0) > 0 && <div className="absolute top-1 right-1 bg-orange-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">-{game.discount}%</div>}
                      </div>
                      <div className="p-1.5">
                        <p className="text-[10px] font-bold text-gray-900 line-clamp-2 leading-tight mb-0.5">{game.game_name}</p>
                        <p className="text-[9px] text-gray-400">{t("steamKey")}</p>
                        {game.min_price && (
                          <p className="text-orange-500 font-black text-[10px] mt-0.5">{formatPrice(Number(game.min_price))}</p>
                        )}
                      </div>
                    </button>
                  ))}
                <button onClick={() => navigate("/categories?filter=Game+Keys")}
                  className="flex-shrink-0 w-24 flex flex-col items-center justify-center bg-yellow-400/90 rounded-xl p-2 hover:bg-yellow-400 transition-colors text-center h-36">
                  <KeyRound size={20} className="text-black mb-1.5" />
                  <p className="font-black text-black text-[10px]">{t("viewAll")}</p>
                  <p className="text-black/70 text-[9px] mt-0.5">({gameKeyGames.length})</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DISCOUNT DEALS */}
        {discountGames.length > 0 && (
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-black text-gray-900">{t("discountDeals")}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{t("limitedTimeOffers")}</p>
              </div>
              <button onClick={() => navigate("/categories")} className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                {t("all")} <ChevronRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {discountGames.slice(0, discountRows * COLS).map((game) => <MobileGameCard key={game.game_id} game={game} />)}
            </div>
            {discountGames.length > discountRows * COLS ? (
              <button 
                onClick={() => setDiscountRows((r) => r + LINES_PER_CLICK)} 
                className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors"
              >
                {t("viewMore")} <ChevronRight size={14} />
              </button>
            ) : discountRows > INITIAL_LINES ? (
              <button 
                onClick={() => setDiscountRows(INITIAL_LINES)} 
                className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors"
              >
                {t("showLess")} <ChevronRight size={14} className="rotate-180" />
              </button>
            ) : null}
          </div>
        )}

        {/* NEW GAMES */}
        {newGames.length > 0 && (
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-black text-gray-900">{t("newGames")}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{t("latestArrivals")}</p>
              </div>
              <button onClick={() => navigate("/categories")} className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                {t("all")} <ChevronRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {newGames.slice(0, newRows * COLS).map((game) => <MobileGameCard key={game.game_id} game={game} />)}
            </div>
            {newGames.length > newRows * COLS ? (
              <button 
                onClick={() => setNewRows((r) => r + LINES_PER_CLICK)} 
                className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors"
              >
                {t("viewMore")} <ChevronRight size={14} />
              </button>
            ) : newRows > INITIAL_LINES ? (
              <button 
                onClick={() => setNewRows(INITIAL_LINES)} 
                className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors"
              >
                {t("showLess")} <ChevronRight size={14} className="rotate-180" />
              </button>
            ) : null}
          </div>
        )}

        {/* TRENDING GIFT CARDS */}
        {giftCardGames.length > 0 && (
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-black text-gray-900">{t("trendingGiftCards")}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{t("topGiftCards")}</p>
              </div>
              <button onClick={() => navigate("/categories?filter=Gift+Card")} className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                {t("all")} <ChevronRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {giftCardGames.slice(0, giftRows * COLS).map((game) => <MobileGameCard key={game.game_id} game={game} />)}
            </div>
            {giftCardGames.length > giftRows * COLS ? (
              <button 
                onClick={() => setGiftRows((r) => r + LINES_PER_CLICK)} 
                className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors"
              >
                {t("viewMore")} <ChevronRight size={14} />
              </button>
            ) : giftRows > INITIAL_LINES ? (
              <button 
                onClick={() => setGiftRows(INITIAL_LINES)} 
                className="w-full mt-4 py-2 text-sm font-semibold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-700 transition-colors"
              >
                {t("showLess")} <ChevronRight size={14} className="rotate-180" />
              </button>
            ) : null}
          </div>
        )}

        <MobileFooter />
        <FloatingChat />
        <BottomNav />
      </div>
    </div>
  );
}
