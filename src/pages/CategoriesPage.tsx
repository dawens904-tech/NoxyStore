import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, MessageCircle } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { lootbarApi } from "@/lib/lootbar-api";
import { useTranslation } from "@/hooks/useTranslation";
import type { LootbarGame } from "@/types";
import { CATEGORIES } from "@/constants/mockData";

type SortMode = "recommended" | "latest";

export function CategoriesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter") || "All";

  const [games, setGames] = useState<LootbarGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(initialFilter);
  const [sortMode, setSortMode] = useState<SortMode>("recommended");

  useEffect(() => {
    lootbarApi.getGames().then((data) => {
      setGames(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const filtered = games.filter((g) => {
    const matchCat = activeCategory === "All" || g.category === activeCategory;
    const matchSearch = !search || g.game_name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === "latest") return b.game_id.localeCompare(a.game_id);
    return (b.is_hot ? 1 : 0) - (a.is_hot ? 1 : 0);
  });

  const categoryCounts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === "All"
      ? games.length
      : games.filter((g) => g.category === cat).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white">
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <DesktopHeader />
      </div>

      {/* Mobile + Desktop inner container */}
      <div className="max-w-2xl lg:max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-gray-100 lg:top-0">
        {/* Mobile back */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-gray-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="font-bold text-gray-900 text-base flex items-center gap-1">
            {activeCategory}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
          </h1>
        </div>
        {/* Desktop title */}
        <div className="hidden lg:flex items-center gap-4 px-6 py-4">
          <h1 className="text-2xl font-black text-gray-900">{t("categories")}</h1>
          <span className="text-gray-400 font-medium">/ {activeCategory}</span>
        </div>

        {/* Search */}
        <div className="px-4 lg:px-6 pb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchGames")}
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-2 px-4 lg:px-6 pb-3 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                activeCategory === cat
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat} ({categoryCounts[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Sort + Total */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-2.5 border-b border-gray-50">
        <p className="text-sm text-gray-500">Total {sorted.length} items</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSortMode("recommended")}
            className={`text-sm font-semibold ${sortMode === "recommended" ? "text-blue-500" : "text-gray-400"}`}
          >
            Recommended
          </button>
          <button
            onClick={() => setSortMode("latest")}
            className={`text-sm font-semibold ${sortMode === "latest" ? "text-blue-500" : "text-gray-400"}`}
          >
            Latest
          </button>
        </div>
      </div>

      {/* Games Grid */}
      <div className="px-4 lg:px-6 pt-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shimmer h-32 rounded-xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="text-5xl mb-4">🎮</div>
            <p className="text-base font-medium text-gray-500">No products found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
            {sorted.map((game) => (
              <button
                key={game.game_id}
                onClick={() => navigate(`/game/${game.game_id}`)}
                className="flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
              >
                <div className="relative aspect-video bg-gray-100">
                  <img
                    src={game.game_image}
                    alt={game.game_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&h=200&fit=crop";
                    }}
                  />
                  {game.discount && game.discount > 0 ? (
                    <div className="absolute top-2 left-2 bg-discount text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      -{game.discount}%
                    </div>
                  ) : null}
                  {game.is_hot && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                      HOT
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{game.game_name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{game.category}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-yellow-500">★</span>
                    <span className="text-xs font-semibold text-gray-700">{game.rating?.toFixed(1)}</span>
                    <span className="text-[10px] text-gray-400">| {game.sold_count} Sold</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Chat */}
      <div className="fixed bottom-20 right-4 z-40">
        <button className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg relative">
          <MessageCircle size={22} className="text-white" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        </button>
      </div>

      <BottomNav />
      </div>
    </div>
  );
}
add real mobile header and make this page more stable more clean
