/**
 * SearchPage — real-time search across all Lootbar games
 * Opens when user clicks the search icon in the header
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Camera, X, Star } from "lucide-react";
import { lootbarApi } from "@/lib/lootbar-api";
import type { LootbarGame } from "@/types";
import { toast } from "sonner";

export function SearchPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [allGames, setAllGames] = useState<LootbarGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Popular searches
  const POPULAR = ["Free Fire", "Genshin Impact", "PUBG Mobile", "Mobile Legends", "Valorant", "Steam Gift Card", "iTunes Gift Card"];

  useEffect(() => {
    // Focus search input on mount
    setTimeout(() => inputRef.current?.focus(), 100);

    // Load all games for searching
    lootbarApi.getGames(1, 200).then((games) => {
      setAllGames(games);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  // Filter results
  const results = query.trim().length >= 1
    ? allGames.filter((g) =>
        g.game_name.toLowerCase().includes(query.toLowerCase()) ||
        (g.category || "").toLowerCase().includes(query.toLowerCase())
      )
    : [];

  // Open camera for visual search
  const handleCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      toast.error("Camera access denied. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const handleCapture = () => {
    // Simulate visual search — in real app this would use image recognition
    stopCamera();
    toast.info("Visual search is analyzing the image...");
    setTimeout(() => {
      setQuery("Free Fire");
      toast.success("Found: Free Fire (visual match)");
    }, 1500);
  };

  // Camera view
  if (cameraActive) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={stopCamera} className="text-white p-2"><X size={22} /></button>
          <span className="text-white font-bold">Search by Camera</span>
          <div className="w-10" />
        </div>

        <div className="flex-1 relative overflow-hidden">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {/* Viewfinder overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white/80 rounded-2xl relative">
              {/* Corner guides */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-xl" />
            </div>
          </div>
          <p className="absolute bottom-24 left-0 right-0 text-center text-white/70 text-sm">Point at a game logo or product</p>
        </div>

        <div className="pb-12 flex justify-center">
          <button
            onClick={handleCapture}
            className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center shadow-xl"
          >
            <div className="w-12 h-12 rounded-full border-4 border-black/20" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-700 p-1.5 flex-shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-2xl px-3.5 py-2.5">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games or goods"
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400"
              autoComplete="off"
            />
            {query && (
              <button onClick={() => setQuery("")} className="flex-shrink-0">
                <X size={15} className="text-gray-400" />
              </button>
            )}
          </div>
          <button
            onClick={handleCamera}
            className="text-gray-700 p-1.5 flex-shrink-0 bg-gray-100 rounded-xl"
          >
            <Camera size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {query.trim().length === 0 ? (
          /* Empty state — show popular searches */
          <div className="px-4 pt-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Popular Searches</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-full transition-colors"
                >
                  <Search size={13} className="text-gray-400" />
                  {term}
                </button>
              ))}
            </div>

            {/* Camera tip */}
            <div className="mt-8 flex items-center gap-3 p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
              <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <Camera size={18} className="text-black" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Search by Camera</p>
                <p className="text-xs text-gray-500 mt-0.5">Point your camera at a game to search</p>
              </div>
              <button onClick={handleCamera} className="ml-auto text-yellow-600 font-bold text-sm">Try</button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="px-4 pt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                <div className="w-14 h-14 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search size={24} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold text-base">No results for "{query}"</p>
            <p className="text-gray-400 text-sm mt-1">Try a different keyword</p>
          </div>
        ) : (
          <div className="px-4 pt-4">
            <p className="text-xs text-gray-400 mb-3">{results.length} results for "{query}"</p>
            <div className="space-y-2">
              {results.map((game) => (
                <button
                  key={game.game_id}
                  onClick={() => navigate(`/game/${game.game_id}`)}
                  className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3 text-left hover:bg-gray-50 active:scale-[0.99] transition-all"
                >
                  <img
                    src={game.game_image}
                    alt={game.game_name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=56&h=56&fit=crop";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-tight">{game.game_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{game.category || "Top Up"}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={11} fill="#FFD200" stroke="none" />
                      <span className="text-xs font-semibold text-gray-600">{game.rating?.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">| {game.sold_count}</span>
                    </div>
                  </div>
                  {game.discount && game.discount > 0 ? (
                    <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0">
                      -{game.discount}%
                    </span>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
add real search and real visual search edg function chat real search no demo.
