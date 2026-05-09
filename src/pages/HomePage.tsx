import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
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
import {
  Wallet,
  Coins,
  Gift,
  KeyRound,
  Swords,
} from "lucide-react";
import { BANNER_IMAGES } from "@/constants/mockData";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

interface HomeSection {
  id: string;
  section_name: string;
  section_key: string;
  sort_order: number;
  is_active: boolean;
  game_ids: string[];
}

// Desktop Hero Banner
function DesktopHeroBanner() {
  const [current, setCurrent] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const timer = setInterval(() => setCurrent((c) => (c + 1) % BANNER_IMAGES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-80 overflow-hidden bg-gray-900 rounded-2xl mx-auto">
      {/* Prev/Next arrows */}
      <button
        onClick={() => setCurrent((c) => (c - 1 + BANNER_IMAGES.length) % BANNER_IMAGES.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button
        onClick={() => setCurrent((c) => (c + 1) % BANNER_IMAGES.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
      </button>

      {BANNER_IMAGES.map((banner, idx) => {
        const src = imgErrors[banner.id] ? banner.fallback : banner.image;
        return (
          <div key={banner.id} className={`absolute inset-0 transition-opacity duration-700 ${idx === current ? "opacity-100" : "opacity-0"}`}>
            <img
              src={src}
              alt={banner.title}
              className="w-full h-full object-cover"
              onError={() => setImgErrors((p) => ({ ...p, [banner.id]: true }))}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
            <div className="absolute left-10 bottom-10 text-white">
              <p className="text-yellow-400 text-sm font-bold uppercase tracking-widest mb-1">{banner.subtitle}</p>
              <h2 className="text-3xl font-black">{banner.title}</h2>
            </div>
          </div>
        );
      })}

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {BANNER_IMAGES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`h-1.5 rounded-full transition-all ${idx === current ? "bg-yellow-400 w-6" : "bg-white/50 w-3"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [games, setGames] = useState<LootbarGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sections, setSections] = useState<HomeSection[]>([]);

  useEffect(() => {
    trackEvent("page_view", { page: "/" });
    lootbarApi.getGames().then((data) => {
      setGames(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
    // Load home sections from DB
    supabase.from("home_sections").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => { if (data) setSections(data as HomeSection[]); });
  }, []);

  // Build section game lists from DB config
  const getSectionGames = (section: HomeSection): LootbarGame[] => {
    if (section.game_ids.length === 0) return [];
    return section.game_ids
      .map((id) => games.find((g) => g.game_id === id))
      .filter(Boolean) as LootbarGame[];
  };

  const hotGames = games.filter((g) => g.is_hot).slice(0, 6);
  const discountGames = games.filter((g) => g.discount && g.discount > 0);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <DesktopHeader />
      </div>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <Header showMenu />
      </div>

      {/* ── Desktop Layout ── */}
      <div className="hidden lg:block">
        <div className="max-w-[1280px] mx-auto px-6 py-6 space-y-8">
          {/* Desktop Hero */}
          <DesktopHeroBanner />

         {/* Desktop Category Icons */}
<div className="flex items-center justify-center gap-10 py-2">
  {[
    {
      label: t("topUp"),
      icon: <Wallet size={28} strokeWidth={2.3} />,
      color: "bg-orange-500",
      filter: "Top Up",
    },
    {
      label: t("gameCoins"),
      icon: <Coins size={28} strokeWidth={2.3} />,
      color: "bg-yellow-500",
      filter: "Game Coins",
    },
    {
      label: t("giftCard"),
      icon: <Gift size={28} strokeWidth={2.3} />,
      color: "bg-pink-500",
      filter: "Gift Card",
    },
    {
      label: t("gameKeys"),
      icon: <KeyRound size={28} strokeWidth={2.3} />,
      color: "bg-purple-600",
      filter: "Game Keys",
      hot: true,
    },
    {
      label: t("gameItems"),
      icon: <Swords size={28} strokeWidth={2.3} />,
      color: "bg-sky-500",
      filter: "Game Items",
    },
  ].map((cat) => (
    <button
      key={cat.label}
      onClick={() =>
        navigate(`/categories?filter=${encodeURIComponent(cat.filter)}`)
      }
      className="flex flex-col items-center gap-2 group"
    >
      <div className="relative">
        <div
          className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center text-white shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}
        >
          {cat.icon}
        </div>

        {cat.hot && (
          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
            HOT
          </span>
        )}
      </div>

      <span className="text-sm font-semibold text-gray-700 transition-colors group-hover:text-black">
        {cat.label}
      </span>
    </button>
  ))}

            {/* 24/7 support button */}
            <button className="flex flex-col items-center gap-2 ml-8">
              <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all">
                <span className="text-2xl">🎧</span>
              </div>
              <span className="text-xs font-semibold text-gray-600">24/7</span>
            </button>
          </div>

          {/* Hot Selling Games */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">{t("hotSellingGames")}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Safe and always at the affordable price</p>
              </div>
              <button
                onClick={() => navigate("/categories")}
                className="flex items-center gap-1 text-sm text-gray-600 font-semibold border border-gray-200 bg-white rounded-xl px-3 py-1.5 hover:bg-gray-50"
              >
                All ({games.length}) <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-4 lg:grid-cols-7 gap-4">
              {isLoading
                ? Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="shimmer rounded-2xl aspect-square" />
                  ))
                : hotGames.concat(games.slice(0, 7 - hotGames.length)).slice(0, 7).map((game) => (
                    <GameCard key={game.game_id} game={game} size="sm" />
                  ))}
            </div>
          </div>

          {/* Discount Games Row */}
          {discountGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-gray-900">🔥 {t("discount")} Deals</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Limited time offers</p>
                </div>
                <button onClick={() => navigate("/categories")} className="text-sm text-gray-500 font-medium hover:text-gray-700">
                  All ({discountGames.length}) →
                </button>
              </div>
              <div className="grid grid-cols-4 lg:grid-cols-7 gap-4">
                {discountGames.slice(0, 7).map((game) => (
                  <GameCard key={game.game_id} game={game} size="sm" />
                ))}
              </div>
            </div>
          )}

          {/* Dynamic sections from DB */}
          {sections.map((sec) => {
            const secGames = getSectionGames(sec);
            if (secGames.length === 0) return null;
            return (
              <div key={sec.id}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black text-gray-900">{sec.section_name}</h2>
                </div>
                <div className="grid grid-cols-4 lg:grid-cols-7 gap-4">
                  {secGames.slice(0, 7).map((game) => (
                    <GameCard key={game.game_id} game={game} size="sm" />
                  ))}
                </div>
              </div>
            );
          })}

          {/* All Games Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900">{t("allGames")}</h2>
              <button onClick={() => navigate("/games")} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                {t("viewAll")} ({games.length}) →
              </button>
            </div>
            <div className="grid grid-cols-4 lg:grid-cols-7 gap-4">
              {isLoading
                ? Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="shimmer rounded-2xl aspect-square" />
                  ))
                : games.slice(0, 14).map((game) => (
                    <GameCard key={game.game_id} game={game} size="sm" />
                  ))}
            </div>
            {games.length > 14 && (
              <button
                onClick={() => navigate("/games")}
                className="w-full mt-4 py-3 text-sm font-semibold text-gray-600 bg-white rounded-2xl border border-gray-200 hover:bg-gray-50"
              >
                View more ({games.length - 14} more games) ↓
              </button>
            )}
          </div>

          {/* Why NoxyStore — Desktop */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 text-white">
            <h3 className="text-2xl font-black mb-6 text-center">{t("whyChooseUs")}</h3>
            <div className="grid grid-cols-4 gap-6">
              {[
                { icon: "⚡", label: t("fast"), desc: "3-5 min top-up" },
                { icon: "🛡️", label: t("safe"), desc: "Verified reseller" },
                { icon: "💰", label: t("bestPrice"), desc: "Up to 30% off" },
                { icon: "🌍", label: t("support247"), desc: "Always online" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 bg-white/10 rounded-2xl p-5">
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <p className="font-bold">{item.label}</p>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center pt-4 pb-8 border-t border-gray-200">
            <p className="text-sm text-gray-400">© 2025 NoxyStore.com · Powered by Lootbar Reseller Network</p>
            <div className="flex justify-center gap-6 mt-3">
              {["Privacy Policy", "Terms of Service", "About Us", "Help Center"].map((link) => (
                <button key={link} className="text-sm text-gray-400 hover:text-gray-600">{link}</button>
              ))}
            </div>
          </footer>
        </div>
      </div>

      {/* ── Mobile Layout ── */}
      <div className="lg:hidden pb-20">
        {/* Mobile Search */}
        <div className="px-3 pt-3 pb-3">
          <button
            onClick={() => navigate("/categories")}
            className="w-full flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3 text-gray-400 text-sm"
          >
            <Search size={16} />
            <span>{t("searchGames")}</span>
          </button>
        </div>

        <HeroBanner />

        <div className="mt-5 mb-2">
          <CategoryIcons />
        </div>

        <div className="mt-5 px-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="section-title">{t("hotSellingGames")}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Safe and always at the affordable price</p>
            </div>
            <button onClick={() => navigate("/categories")} className="flex items-center gap-1 text-xs text-gray-500 font-medium">
              All ({games.length}) <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {isLoading ? <GameCardSkeleton count={6} /> : hotGames.map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
          </div>
        </div>

        {discountGames.length > 0 && (
          <div className="mt-6 px-3">
            <h2 className="section-title mb-3">🔥 {t("discount")} Deals</h2>
            <div className="grid grid-cols-3 gap-3">
              {discountGames.map((game) => <GameCard key={game.game_id} game={game} size="sm" />)}
            </div>
          </div>
        )}

        <div className="mt-6 px-3">
          <h2 className="section-title mb-3">{t("allGames")}</h2>
          <div className="space-y-2">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-3">
                    <div className="shimmer w-14 h-14 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="shimmer h-4 w-2/3 rounded" />
                      <div className="shimmer h-3 w-1/3 rounded" />
                    </div>
                  </div>
                ))
              : games.slice(0, 8).map((game) => <GameCard key={game.game_id} game={game} size="lg" />)}
          </div>
          {games.length > 8 && (
            <button onClick={() => navigate("/categories")} className="w-full mt-3 py-3 text-sm font-semibold text-gray-600 bg-white rounded-2xl border border-gray-200">
              {t("viewAll")} {games.length} Games
            </button>
          )}
        </div>

        <div className="mt-6 mx-3 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
          <h3 className="font-bold text-base mb-3">{t("whyChooseUs")}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "⚡", label: t("fast"), desc: "3-5 min top-up" },
              { icon: "🛡️", label: t("safe"), desc: "Verified reseller" },
              { icon: "💰", label: t("bestPrice"), desc: "Up to 30% off" },
              { icon: "🌍", label: t("support247"), desc: "Always online" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[10px] text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="mt-6 px-3 pb-4 text-center">
          <p className="text-xs text-gray-400">© 2025 NoxyStore.com · Powered by Lootbar Reseller Network</p>
        </footer>

        <FloatingChat />
        <BottomNav />
      </div>
    </div>
  );
}
after you login remove the top message 🎁 Exclusive For New Registered Users! Sign up to get Coupons and Update DesktopHeader to show the logged-in user's avatar and nickname dropdown (with links to account, orders, logout) instead of the Sign In button when the user is authenticated via Google OAuth or any provider.
