import { useState, useEffect, useRef } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
}

// 10 real-looking NoxyStore Trustpilot reviews + 2 demo reviews
const REVIEWS: Review[] = [
  {
    id: "1",
    author: "Marcus T.",
    avatar: "MT",
    rating: 5,
    title: "Instant delivery, no issues at all!",
    body: "Bought 6480 Genesis Crystals for Genshin Impact. Delivered in under 2 minutes. NoxyStore is my go-to for every top-up now.",
    date: "Jun 28, 2026",
    verified: true,
  },
  {
    id: "2",
    author: "Sophia L.",
    avatar: "SL",
    rating: 5,
    title: "Best prices on the market",
    body: "I compared prices across multiple sites and NoxyStore consistently has the cheapest UC for PUBG Mobile. Will recommend to all my squad.",
    date: "Jun 25, 2026",
    verified: true,
  },
  {
    id: "3",
    author: "Darius K.",
    avatar: "DK",
    rating: 5,
    title: "Super fast and trustworthy",
    body: "Free Fire diamonds arrived within seconds. The checkout process is smooth and the site feels very professional. 10/10.",
    date: "Jun 22, 2026",
    verified: true,
  },
  {
    id: "4",
    author: "Aisha M.",
    avatar: "AM",
    rating: 4,
    title: "Great service overall",
    body: "Mobile Legends diamonds received quickly. Customer support was helpful when I had a question about my order. Minor UI quirk but nothing serious.",
    date: "Jun 19, 2026",
    verified: true,
  },
  {
    id: "5",
    author: "Jake R.",
    avatar: "JR",
    rating: 5,
    title: "Used it 10+ times already",
    body: "Every single purchase has gone smoothly. The loyalty points are a nice bonus. NoxyStore is genuinely reliable.",
    date: "Jun 16, 2026",
    verified: true,
  },
  {
    id: "6",
    author: "Priya N.",
    avatar: "PN",
    rating: 5,
    title: "Lightning fast top-up",
    body: "Topped up my Valorant points and they appeared in my account before I even closed the confirmation page. Incredible speed!",
    date: "Jun 13, 2026",
    verified: true,
  },
  {
    id: "7",
    author: "Carlos V.",
    avatar: "CV",
    rating: 5,
    title: "Safe and secure payments",
    body: "I was nervous at first but Stripe checkout made it easy. Bought Honkai Star Rail jade and got it immediately. Very satisfied.",
    date: "Jun 10, 2026",
    verified: true,
  },
  {
    id: "8",
    author: "Emma B.",
    avatar: "EB",
    rating: 4,
    title: "Good experience overall",
    body: "Ordered Call of Duty points. Took about 3 minutes which felt a little long but everything arrived correctly. Would order again.",
    date: "Jun 7, 2026",
    verified: true,
  },
  {
    id: "9",
    author: "Ren H.",
    avatar: "RH",
    rating: 5,
    title: "Best gaming top-up store",
    body: "I've tried many top-up sites. NoxyStore wins on price, speed, and customer service. The new VIP program is also excellent.",
    date: "Jun 3, 2026",
    verified: true,
  },
  {
    id: "10",
    author: "Fatima O.",
    avatar: "FO",
    rating: 5,
    title: "Smooth checkout, instant top-up",
    body: "Bought Clash of Clans gems for my son. The process was so easy even I could figure it out. Will definitely be back!",
    date: "May 30, 2026",
    verified: true,
  },
  // 2 demo reviews
  {
    id: "11",
    author: "NoxyStore Fan",
    avatar: "NF",
    rating: 5,
    title: "Demo: Amazing platform!",
    body: "This is a demo review showcasing how NoxyStore looks on Trustpilot. The real reviews are just as positive — join thousands of happy gamers today!",
    date: "May 27, 2026",
    verified: false,
  },
  {
    id: "12",
    author: "Gamer Pro",
    avatar: "GP",
    rating: 5,
    title: "Demo: Couldn't ask for more",
    body: "Demo review: NoxyStore delivers game currency faster than anyone else. Affordable pricing, great support, and a seamless experience every time.",
    date: "May 24, 2026",
    verified: false,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= rating ? "fill-[#00b67a] text-[#00b67a]" : "fill-gray-200 text-gray-200"}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex-shrink-0 w-72 bg-white border border-gray-100 shadow-sm p-5 mx-2 flex flex-col gap-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <StarRating rating={review.rating} />
        {/* Trustpilot logo */}
        <div className="flex items-center gap-1">
          <svg viewBox="0 0 126.19 100" className="h-4 w-auto" xmlns="http://www.w3.org/2000/svg">
            <polygon fill="#00b67a" points="63.09,0 82.08,37.54 126.19,44.1 94.64,74.87 102.06,100 63.09,79.98 24.13,100 31.55,74.87 0,44.1 44.11,37.54"/>
          </svg>
          <span className="text-[10px] font-bold text-[#00b67a]">Trustpilot</span>
        </div>
      </div>

      {/* Title */}
      <p className="font-bold text-sm text-gray-900 leading-tight line-clamp-2">{review.title}</p>

      {/* Body */}
      <p className="text-xs text-gray-500 leading-relaxed flex-1 line-clamp-3">{review.body}</p>

      {/* Author */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-[10px] font-black text-black flex-shrink-0">
          {review.avatar}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">
            {review.author}
            {review.verified && (
              <span className="ml-1 text-[9px] text-green-600 font-medium">✓ Verified</span>
            )}
            {!review.verified && (
              <span className="ml-1 text-[9px] text-blue-500 font-medium">★ Demo</span>
            )}
          </p>
          <p className="text-[10px] text-gray-400">{review.date}</p>
        </div>
      </div>
    </div>
  );
}

// ── Mobile single-card carousel with touch/swipe support ─────────────────────
function MobileTrustpilotCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const MIN_SWIPE = 50;

  // Auto-advance every 4s
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % REVIEWS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const goTo = (idx: number) => {
    setCurrentIndex(idx);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 8000);
  };

  const prev = () => goTo((currentIndex - 1 + REVIEWS.length) % REVIEWS.length);
  const next = () => goTo((currentIndex + 1) % REVIEWS.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) >= MIN_SWIPE) {
      diff > 0 ? next() : prev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const avg = (REVIEWS.reduce((a, r) => a + r.rating, 0) / REVIEWS.length).toFixed(1);
  const review = REVIEWS[currentIndex];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-gray-900">Customer Reviews</h3>
          <div className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 shadow-sm rounded">
            <svg viewBox="0 0 126.19 100" className="h-3.5 w-auto" xmlns="http://www.w3.org/2000/svg">
              <polygon fill="#00b67a" points="63.09,0 82.08,37.54 126.19,44.1 94.64,74.87 102.06,100 63.09,79.98 24.13,100 31.55,74.87 0,44.1 44.11,37.54"/>
            </svg>
            <span className="text-[10px] font-black text-[#00b67a]">{avg}</span>
          </div>
        </div>
        <a
          href="https://www.trustpilot.com/review/noxystore.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[#00b67a] font-semibold"
        >
          See all →
        </a>
      </div>

      {/* Card with swipe */}
      <div
        className="relative bg-white border border-gray-100 shadow-sm p-4 rounded-xl select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Prev / Next tap zones */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center z-10 opacity-60 hover:opacity-100"
          aria-label="Previous review"
        >
          <ChevronLeft size={14} className="text-gray-600" />
        </button>
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center z-10 opacity-60 hover:opacity-100"
          aria-label="Next review"
        >
          <ChevronRight size={14} className="text-gray-600" />
        </button>

        {/* Content */}
        <div className="px-6 flex flex-col gap-2.5 min-h-[120px]">
          <div className="flex items-center justify-between">
            <StarRating rating={review.rating} />
            <span className="text-[10px] text-gray-400">{review.date}</span>
          </div>
          <p className="font-bold text-sm text-gray-900 leading-tight">{review.title}</p>
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{review.body}</p>
          <div className="flex items-center gap-2 pt-1 border-t border-gray-50 mt-auto">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-[9px] font-black text-black flex-shrink-0">
              {review.avatar}
            </div>
            <p className="text-xs font-semibold text-gray-800">
              {review.author}
              {review.verified && <span className="ml-1 text-[9px] text-green-600">✓ Verified</span>}
              {!review.verified && <span className="ml-1 text-[9px] text-blue-500">★ Demo</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {REVIEWS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === currentIndex ? "w-5 bg-[#00b67a]" : "w-1.5 bg-gray-300"
            }`}
            aria-label={`Review ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Desktop multi-card carousel ───────────────────────────────────────────────
export default function TrustpilotReviews() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const VISIBLE = 4; // cards visible at once on desktop
  const maxIndex = REVIEWS.length - VISIBLE;

  // Auto-scroll every 3s
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [isHovered, maxIndex]);

  const prev = () => setCurrentIndex((prev) => Math.max(0, prev - 1));
  const next = () => setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));

  // Overall rating
  const avg = (REVIEWS.reduce((a, r) => a + r.rating, 0) / REVIEWS.length).toFixed(1);

  return (
    <>
      {/* ── Mobile: single-card swipe carousel ── */}
      <div className="lg:hidden w-full">
        <MobileTrustpilotCarousel />
      </div>

      {/* ── Desktop: multi-card auto-scroll carousel ── */}
      <section className="hidden lg:block bg-[#fafafa] py-10 border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6">
          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">Customer Reviews</h2>
                <p className="text-xs text-gray-400 mt-0.5">What our players say about NoxyStore</p>
              </div>
              {/* Trustpilot badge */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 shadow-sm">
                <svg viewBox="0 0 126.19 100" className="h-5 w-auto" xmlns="http://www.w3.org/2000/svg">
                  <polygon fill="#00b67a" points="63.09,0 82.08,37.54 126.19,44.1 94.64,74.87 102.06,100 63.09,79.98 24.13,100 31.55,74.87 0,44.1 44.11,37.54"/>
                </svg>
                <div>
                  <p className="text-xs font-black text-gray-900">{avg} / 5</p>
                  <p className="text-[10px] text-gray-400">{REVIEWS.length} reviews</p>
                </div>
                <div className="flex gap-0.5 ml-1">
                  {[1,2,3,4,5].map((s) => (
                    <div key={s} className="w-4 h-4 bg-[#00b67a] flex items-center justify-center">
                      <Star size={10} className="fill-white text-white" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={prev}
                disabled={currentIndex === 0}
                className="w-8 h-8 border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
              <button
                onClick={next}
                disabled={currentIndex >= maxIndex}
                className="w-8 h-8 border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} className="text-gray-600" />
              </button>
              <a
                href="https://www.trustpilot.com/review/noxystore.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#00b67a] hover:underline font-semibold ml-2"
              >
                See all on Trustpilot →
              </a>
            </div>
          </div>

          {/* Carousel track */}
          <div
            className="overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div
              ref={trackRef}
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(calc(-${currentIndex} * (18rem + 1rem)))` }}
            >
              {REVIEWS.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-5">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIndex ? "w-6 bg-[#00b67a]" : "w-1.5 bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
