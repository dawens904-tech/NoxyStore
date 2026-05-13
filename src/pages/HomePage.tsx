import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, KeyRound } from "lucide-react";
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
import { BANNER_IMAGES } from "@/constants/mockData";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import { NewUserCouponModal } from "@/components/features/NewUserCouponModal";
import { useAuthStore } from "@/stores/authStore";
import { Footer } from "@/components/layout/Footer";
import { MobileFooter } from "@/components/layout/MobileFooter";
import gameKeysBg from "@/assets/game-keys-bg.jpg";

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
    const timer = setInterval(() => setCurrent((c) => (c + 1) % items.length), 4000);
    return () => clearInterval(timer);
  }, [items.length]);

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

// Popular Game Key Card (large horizontal card style)
function GameKeyCard({ game }: { game: LootbarGame }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(`/game/${game.game_id}`)}
      className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden text-left hover:shadow-lg transition-all hover:-translate-y-0.5 group">
      <div className="aspect-[3/4] relative overflow-hidden bg-gray-100">
        <img
          src={game.game_image || `https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&h=400&fit=crop&q=80`}
          alt={game.game_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&h=400&fit=crop`; }}
        />
        {(game.discount ?? 0) > 0 && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-lg">-{game.discount}%</div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{game.game_name}</p>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-4 h-4 bg-gray-800 rounded-sm flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3"><path d="M3 3h18v18H3V3zm16.525 13.707c-.131-.821-.666-1.511-2.252-2.155-.552-.259-1.165-.438-1.349-.854-.068-.248-.078-.382-.034-.529.113-.484.687-.629 1.137-.495.293.09.563.315.732.676.775-.507.775-.507 1.316-.844-.203-.314-.304-.451-.439-.586-.473-.528-1.103-.798-2.126-.775l-.528.067c-.507.124-.991.395-1.283.754-.855 1.030-.607 2.830.802 3.575 1.12.525 2.519.643 2.715 1.179.18.635-.511.839-1.135.756-.63-.094-.984-.459-1.226-.932l-1.33.793c.259.498.894 1.305 1.946 1.45l.814-.013c.529-.058 1.046-.305 1.350-.683.339-.41.378-.968.299-1.540zM8.556 9h-1.11l-1.86 4.666h1.107l.365-.886h1.836l.353.886h1.133L8.556 9zm-.588 2.742l.571-1.57.571 1.57H7.968z"/></svg>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">Steam Key</span>
        </div>
        {game.min_price && (
          <p className="text-orange-500 font-black text-base">${Number(game.min_price).toFixed(2)}</p>
        )}
      </div>
    </button>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [games, setGames] = useState<LootbarGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [dynamicBanners, setDynamicBanners] = useState<Array<{ id: string; title: string; subtitle: string; image_url: string; link: string; sort_order: number }>>([]);

  // Row expansion state — each section shows 3 items (1 row), +3 per "View more"
  const [hotRows, setHotRows] = useState(1);
  const [discountRows, setDiscountRows] = useState(1);
  const [newRows, setNewRows] = useState(1);
  const [giftRows, setGiftRows] = useState(1);
  const [keyRows, setKeyRows] = useState(1);

  const COLS = 3; // mobile columns per row

  useEffect(() => {
    trackEvent("page_view", { page: "/" });
    lootbarApi.getGames().then((data) => {
      setGames(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
    supabase.from("home_sections").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => { if (data) setSections(data as HomeSection[]); });
    supabase.from("home_banners").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => { if (data) setDynamicBanners(data); });
  }, []);

  const getSectionGames = (section: HomeSection): LootbarGame[] => {
    if (section.game_ids.length === 0) return [];
    return section.game_ids.map((id) => games.find((g) => g.game_id === id)).filter(Boolean) as LootbarGame[];
  };

  const hotGames = games.filter((g) => g.is_hot).slice(0, 9);
  const discountGames = games.filter((g) => g.discount && g.discount > 0).slice(0, 9);
  const newGames = [...games].reverse().slice(0, 9);
  const giftCardGames = games.filter((g) =>
    g.category?.toLowerCase().includes("gift") ||
    g.game_name?.toLowerCase().includes("gift") ||
    g.game_name?.toLowerCase().includes("card")
  ).slice(0, 9);
  const gameKeyGames = games.filter((g) =>
    g.category?.toLowerCase().includes("key") ||
    g.game_name?.toLowerCase().includes("steam") ||
    g.game_name?.toLowerCase().includes("key") ||
    g.game_name?.toLowerCase().includes("pc")
  ).slice(0, 9);

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
              <span className="text-xs font-semibold text-gray-600">24/7</span>
            </button>
          </div>

          {/* Hot Selling Games */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div><h2 className="text-xl font-black text-gray-900">{t("hotSellingGames")}</h2><p className="text-sm text-gray-500 mt-0.5">Safe and always at the affordable price</p></div>
              <button onClick={() => navigate("/categories")} className="flex items-center gap-1 text-sm text-gray-600 font-semibold border border-gray-200 bg-white rounded-xl px-3 py-1.5 hover:bg-gray-50">All ({games.length}) <ChevronRight size={14} /></button>
            </div>
            <div className="grid grid-cols-7 gap-4">
              {isLoading ? Array.from({ length: 7 }).map((_, i) => <div key={i} className="shimmer rounded-2xl aspect-square" />)
                : hotGames.concat(games.slice(0, 7 - hotGames.length)).slice(0, 7).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
            </div>
          </div>

          {/* Popular Game Key — desktop */}
          {(gameKeyGames.length > 0 || !isLoading) && (
            <div className="rounded-2xl overflow-hidden relative" style={{ background: `url(${gameKeysBg}) center/cover no-repeat` }}>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-800/70 to-transparent" />
              <div className="relative z-10 px-8 py-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-black text-white">Popular Game Key</h2>
                    <p className="text-sm text-blue-200 mt-0.5">Enjoy playing the most fun games</p>
                  </div>
                  <button onClick={() => navigate("/categories?filter=Game+Keys")}
                    className="flex items-center gap-1 text-sm text-white font-semibold bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 hover:bg-white/20">
                    All ({gameKeyGames.length}) <ChevronRight size={14} />
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
                            <span className="text-[10px] text-gray-500">Steam Key</span>
                          </div>
                          {game.min_price && <p className="text-orange-500 font-black text-sm">${Number(game.min_price).toFixed(2)}</p>}
                        </div>
                      </button>
                    ))}
                  {/* View All card */}
                  <button onClick={() => navigate("/categories?filter=Game+Keys")}
                    className="flex-shrink-0 w-44 flex flex-col items-center justify-center bg-yellow-400/90 rounded-xl p-4 hover:bg-yellow-400 transition-colors text-center">
                    <KeyRound size={36} className="text-black mb-3" />
                    <p className="font-black text-black text-sm">Game Keys</p>
                    <div className="mt-3 border border-black/20 rounded-lg px-4 py-2 text-xs font-bold text-black">
                      View All ({gameKeyGames.length})
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {discountGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div><h2 className="text-xl font-black text-gray-900">{t("discount")} Deals</h2><p className="text-sm text-gray-500 mt-0.5">Limited time offers</p></div>
                <button onClick={() => navigate("/categories")} className="text-sm text-gray-500 font-medium hover:text-gray-700">All ({discountGames.length}) →</button>
              </div>
              <div className="grid grid-cols-7 gap-4">
                {discountGames.slice(0, 7).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
              </div>
            </div>
          )}

          {newGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div><h2 className="text-xl font-black text-gray-900">New Games</h2><p className="text-sm text-gray-500 mt-0.5">Latest arrivals on NoxyStore</p></div>
                <button onClick={() => navigate("/categories")} className="flex items-center gap-1 text-sm text-gray-600 font-semibold border border-gray-200 bg-white rounded-xl px-3 py-1.5 hover:bg-gray-50">All <ChevronRight size={14} /></button>
              </div>
              <div className="grid grid-cols-7 gap-4">
                {newGames.slice(0,7).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
              </div>
            </div>
          )}

          {giftCardGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div><h2 className="text-xl font-black text-gray-900">Trending Gift Cards</h2><p className="text-sm text-gray-500 mt-0.5">Top gift cards at the best prices</p></div>
                <button onClick={() => navigate("/categories?filter=Gift+Card")} className="flex items-center gap-1 text-sm text-gray-600 font-semibold border border-gray-200 bg-white rounded-xl px-3 py-1.5 hover:bg-gray-50">All ({giftCardGames.length}) <ChevronRight size={14} /></button>
              </div>
              <div className="grid grid-cols-7 gap-4">
                {giftCardGames.slice(0,7).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
              </div>
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

        {/* Hot Selling — 3 cols, 1 row = 3 items, view more adds 1 row */}
        <div className="mt-5 px-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="section-title">{t("hotSellingGames")}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Safe and always at the affordable price</p>
            </div>
            <button onClick={() => navigate("/categories")} className="flex items-center gap-1 text-xs text-gray-500 font-medium">All ({games.length}) <ChevronRight size={14} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {isLoading
              ? <GameCardSkeleton count={hotRows * COLS} />
              : hotGames.concat(games.slice(0, hotRows * COLS - hotGames.length)).slice(0, hotRows * COLS).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
          </div>
          {hotGames.length > hotRows * COLS ? (
            <button onClick={() => setHotRows((r) => r + 1)} className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 bg-white rounded-xl border border-gray-200 flex items-center justify-center gap-1">
              View more <ChevronRight size={14} />
            </button>
          ) : hotRows > 1 ? (
            <button onClick={() => setHotRows(1)} className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 bg-white rounded-xl border border-gray-200">Show Less ▲</button>
          ) : null}
        </div>

        {/* Popular Game Key — with blue bg photo */}
        {(gameKeyGames.length > 0 || !isLoading) && (
          <div className="mt-6 mx-3 rounded-2xl overflow-hidden relative" style={{ background: `url(${gameKeysBg}) center/cover no-repeat` }}>
            <div className="absolute inset-0 bg-blue-900/80" />
            <div className="relative z-10 px-4 py-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-black text-white">Popular Game Key</h2>
                  <p className="text-xs text-blue-200 mt-0.5">Enjoy playing the most fun games</p>
                </div>
                <button onClick={() => navigate("/categories?filter=Game+Keys")} className="text-xs text-white font-semibold bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 flex items-center gap-1">
                  All ({gameKeyGames.length}) <ChevronRight size={12} />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                {isLoading
                  ? Array.from({length: 4}).map((_,i) => <div key={i} className="shimmer flex-shrink-0 w-28 h-44 rounded-xl" />)
                  : gameKeyGames.slice(0, 6).map((game) => (
                    <button key={game.game_id} onClick={() => navigate(`/game/${game.game_id}`)}
                      className="flex-shrink-0 w-28 flex flex-col bg-white rounded-xl overflow-hidden text-left hover:shadow-md transition-all">
                      <div className="h-32 bg-gray-200 relative overflow-hidden">
                        <img src={game.game_image || `https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&h=200&fit=crop`} alt={game.game_name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&h=200&fit=crop`; }} />
                        {(game.discount ?? 0) > 0 && <div className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">-{game.discount}%</div>}
                      </div>
                      <div className="p-2">
                        <p className="text-[11px] font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{game.game_name}</p>
                        <p className="text-[10px] text-gray-500">Steam Key</p>
                        {game.min_price && <p className="text-orange-500 font-black text-xs mt-0.5">${Number(game.min_price).toFixed(2)}</p>}
                      </div>
                    </button>
                  ))}
                {/* View All tile */}
                <button onClick={() => navigate("/categories?filter=Game+Keys")}
                  className="flex-shrink-0 w-28 flex flex-col items-center justify-center bg-yellow-400/90 rounded-xl p-3 hover:bg-yellow-400 transition-colors text-center h-44">
                  <KeyRound size={24} className="text-black mb-2" />
                  <p className="font-black text-black text-[11px]">View All</p>
                  <p className="text-black/70 text-[10px] mt-0.5">({gameKeyGames.length})</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Discount Deals */}
        {discountGames.length > 0 && (
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">{t("discount")} Deals</h2>
              <button onClick={() => navigate("/categories")} className="flex items-center gap-1 text-xs text-gray-500 font-medium">All <ChevronRight size={12} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {discountGames.slice(0, discountRows * COLS).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
            </div>
            {discountGames.length > discountRows * COLS ? (
              <button onClick={() => setDiscountRows((r) => r + 1)} className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 bg-white rounded-xl border border-gray-200 flex items-center justify-center gap-1">View more <ChevronRight size={14} /></button>
            ) : discountRows > 1 ? (
              <button onClick={() => setDiscountRows(1)} className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 bg-white rounded-xl border border-gray-200">Show Less ▲</button>
            ) : null}
          </div>
        )}

        {/* New Games */}
        {newGames.length > 0 && (
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">New Games</h2>
              <button onClick={() => navigate("/categories")} className="flex items-center gap-1 text-xs text-gray-500 font-medium">All <ChevronRight size={12} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {newGames.slice(0, newRows * COLS).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
            </div>
            {newGames.length > newRows * COLS ? (
              <button onClick={() => setNewRows((r) => r + 1)} className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 bg-white rounded-xl border border-gray-200 flex items-center justify-center gap-1">View more <ChevronRight size={14} /></button>
            ) : newRows > 1 ? (
              <button onClick={() => setNewRows(1)} className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 bg-white rounded-xl border border-gray-200">Show Less ▲</button>
            ) : null}
          </div>
        )}

        {/* Trending Gift Cards */}
        {giftCardGames.length > 0 && (
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Trending Gift Cards</h2>
              <button onClick={() => navigate("/categories?filter=Gift+Card")} className="flex items-center gap-1 text-xs text-gray-500 font-medium">All <ChevronRight size={12} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {giftCardGames.slice(0, giftRows * COLS).map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
            </div>
            {giftCardGames.length > giftRows * COLS ? (
              <button onClick={() => setGiftRows((r) => r + 1)} className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 bg-white rounded-xl border border-gray-200 flex items-center justify-center gap-1">View more <ChevronRight size={14} /></button>
            ) : giftRows > 1 ? (
              <button onClick={() => setGiftRows(1)} className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 bg-white rounded-xl border border-gray-200">Show Less ▲</button>
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
