// GameCard component — supports sm, md, lg sizes + desktop
// Real data from games_cache: rating, sold_count, is_hot, discount, min_price
import { Star, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { LootbarGame } from "@/types";

interface GameCardProps {
  game: LootbarGame;
  size?: "sm" | "md" | "lg";
}

const PLACEHOLDER = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop";

function formatSoldCount(sold: string | undefined | null): string {
  if (!sold) return "";
  if (sold.toLowerCase().includes("sold")) return sold;
  return `${sold} Sold`;
}

export function GameCard({ game, size = "md" }: GameCardProps) {
  const navigate = useNavigate();
  const imgSrc = game.game_image && game.game_image.trim() ? game.game_image : PLACEHOLDER;
  const rating = game.rating ?? 5.0;
  const soldText = formatSoldCount(game.sold_count);
  const hasDiscount = game.discount && game.discount > 0;
  const isHot = game.is_hot ?? false;
  const minPrice = game.min_price;

  const handleClick = () => navigate(`/game/${game.game_id}`);

  if (size === "sm") {
    return (
      <button onClick={handleClick} className="game-card flex flex-col w-full text-left">
        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-200">
          <img
            src={imgSrc}
            alt={game.game_name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER;
            }}
          />
          {/* Discount badge */}
          {hasDiscount && (
            <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none">
              -{game.discount}%
            </div>
          )}
          {/* HOT badge (only if no discount) */}
          {isHot && !hasDiscount && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none">
              <Flame size={8} />HOT
            </div>
          )}
          {/* Dark gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="mt-1.5 px-0.5">
          <h3 className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-2">
            {game.game_name}
          </h3>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <Star size={10} fill="#FFD200" stroke="none" />
            <span className="text-[11px] font-semibold text-gray-700">{rating.toFixed(1)}</span>
            {soldText && (
              <span className="text-[10px] text-gray-400 truncate">{soldText}</span>
            )}
          </div>
          {/* Price pill */}
          {minPrice != null && minPrice > 0 && (
            <div className="mt-1">
              <span className="text-[11px] font-black text-orange-500">From ${minPrice.toFixed(2)}</span>
            </div>
          )}
        </div>
      </button>
    );
  }

  // List item style (lg)
  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 w-full bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.99]"
    >
      <div className="relative flex-shrink-0">
        <img
          src={imgSrc}
          alt={game.game_name}
          className="w-14 h-14 rounded-xl object-cover bg-gray-100"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = PLACEHOLDER;
          }}
        />
        {hasDiscount && (
          <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-md leading-none">
            -{game.discount}%
          </div>
        )}
        {isHot && !hasDiscount && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-md flex items-center gap-0.5 leading-none">
            <Flame size={8} />HOT
          </div>
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <h3 className="text-sm font-bold text-gray-900 truncate">{game.game_name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{game.category || "Top Up"}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Star size={11} fill="#FFD200" stroke="none" />
          <span className="text-xs font-semibold text-gray-700">{rating.toFixed(1)}</span>
          {soldText && <span className="text-xs text-gray-400">· {soldText}</span>}
          {minPrice != null && minPrice > 0 && (
            <span className="text-xs font-black text-orange-500">· From ${minPrice.toFixed(2)}</span>
          )}
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}

// Grid of skeleton loading cards
export function GameCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col">
          <div className="shimmer aspect-square w-full rounded-xl" />
          <div className="mt-2 space-y-1.5">
            <div className="shimmer h-4 w-3/4 rounded" />
            <div className="shimmer h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}
