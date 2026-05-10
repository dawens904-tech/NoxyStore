/**
 * All Games Page — displays every game from Lootbar API with debounced search and filter
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, ArrowLeft, SlidersHorizontal, X } from "lucide-react";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { lootbarApi } from "@/lib/lootbar-api";
import type { LootbarGame } from "@/types";
import { CATEGORIES } from "@/constants/mockData";

type SortOption = "default" | "rating" | "discount";

export function AllGamesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [games, setGames] = useState<LootbarGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "");
  const [activeCategory, setActiveCategory] = useState(searchParams.get("filter") || "All");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [showFilter, setShowFilter] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setVisibleCount(24); // reset pagination on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    lootbarApi.getGames(1, 200).then((data) => {
      setGames(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const filtered = games.filter((g) => {
    const matchCat = activeCategory === "All" || g.category === activeCategory;
    const matchSearch = !debouncedSearch || g.game_name.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
    if (sortBy === "discount") return (b.discount || 0) - (a.discount || 0);
    return 0;
  });

  const visible = sorted.slice(0, visibleCount);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setVisibleCount(24);
  };

  const clearSearch = () => {
    setSearchInput("");
    setDebouncedSearch("");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="hidden lg:block"><DesktopHeader /></div>

      {/* Mobile header */}
      <div className="lg:hidden bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-gray-900 text-base flex-1">All Games</h1>
          <button onClick={() => setShowFilter(!showFilter)} className={`p-2 rounded-xl ${showFilter ? "bg-yellow-400" : "bg-gray-100"}`}>
            <SlidersHorizontal size={16} className={showFilter ? "text-black" : "text-gray-600"} />
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search games..."
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400"
            />
            {searchInput && (
              <button onClick={clearSearch} className="p-0.5">
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${activeCategory === cat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Mobile sort filter */}
        {showFilter && (
          <div className="px-4 pb-3 border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Sort by</p>
            <div className="flex gap-2">
              {([["default", "Default"], ["rating", "Top Rated"], ["discount", "Best Discount"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSortBy(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${sortBy === val ? "bg-yellow-400 text-black" : "bg-gray-100 text-gray-600"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-[1280px] mx-auto px-4 lg:px-6 pb-20 pt-4">
        {/* Desktop search + filters */}
        <div className="hidden lg:flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-black text-gray-900">All Games</h1>
          <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 max-w-md">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search games..."
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
            />
            {searchInput && (
              <button onClick={clearSearch}><X size={14} className="text-gray-400" /></button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${activeCategory === cat ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Desktop sort */}
          <div className="flex gap-2 ml-auto flex-shrink-0">
            {([["default", "Default"], ["rating", "Top Rated"], ["discount", "Best Discount"]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${sortBy === val ? "bg-yellow-400 text-black" : "bg-white border border-gray-200 text-gray-600"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {debouncedSearch ? `${sorted.length} results for "${debouncedSearch}"` : `${sorted.length} games found`}
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="shimmer h-40 rounded-2xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <Search size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No games found</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search term or category</p>
            <button onClick={clearSearch} className="mt-4 text-yellow-600 font-semibold text-sm">Clear search</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
              {visible.map((game) => (
                <button
                  key={game.game_id}
                  onClick={() => navigate(`/game/${game.game_id}`)}
                  className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.99] text-left"
                >
                  <div className="relative aspect-square bg-gray-100">
                    <img
                      src={game.game_image}
                      alt={game.game_name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop"; }}
                    />
                    {game.discount && game.discount > 0 ? (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">-{game.discount}%</div>
                    ) : null}
                    {game.is_hot && <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">HOT</div>}
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-xs font-bold text-gray-900 line-clamp-1">{game.game_name}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-yellow-500">★</span>
                      <span className="text-[10px] font-semibold text-gray-600">{game.rating?.toFixed(1)}</span>
                      <span className="text-[9px] text-gray-400">| {game.sold_count}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {visibleCount < sorted.length && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setVisibleCount((c) => c + 24)}
                  className="bg-white border border-gray-200 rounded-2xl px-8 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  View more ({sorted.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
add real edit photo product fix it.
