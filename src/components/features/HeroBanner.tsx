import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";



interface DBBanner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link: string;
}

export function HeroBanner() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [banners, setBanners] = useState<DBBanner[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase
      .from("home_banners")
      .select("id, title, subtitle, image_url, link")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) setBanners(data as DBBanner[]);
        setIsLoaded(true);
      });
  }, []);

  const items = banners;

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    const timer = setInterval(next, 3500);
    return () => clearInterval(timer);
  }, [next]);

  // Don't render until loaded; hide if no banners in DB
  if (!isLoaded) {
    return <div className="mx-3 rounded-2xl h-44 bg-gray-200 animate-pulse" />;
  }
  if (items.length === 0) return null;

  return (
    <div className="relative mx-3 rounded-2xl overflow-hidden h-44 bg-gray-900">
      {items.map((banner, idx) => {
        const hasError = imgErrors[banner.id];
        const src = hasError ? banner.image_url : banner.image_url;

        return (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-700 ${idx === current ? "opacity-100" : "opacity-0"}`}
            onClick={() => banner.link && banner.link !== "/" && navigate(banner.link)}
            style={{ cursor: banner.link && banner.link !== "/" ? "pointer" : "default" }}
          >
            <img
              src={src}
              alt={banner.title}
              className="w-full h-full object-cover"
              onError={() => setImgErrors((p) => ({ ...p, [banner.id]: true }))}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-0.5">{banner.subtitle}</p>
              <h3 className="text-base font-bold leading-snug">{banner.title}</h3>
            </div>
          </div>
        );
      })}

      {/* Navigation dots */}
      <div className="absolute bottom-3 right-4 flex gap-1.5 items-center z-10">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`banner-dot ${idx === current ? "active" : ""}`}
            aria-label={`Banner ${idx + 1}`}
          />
        ))}
      </div>

      {/* Swipe indicators (prev/next) */}
      <button
        onClick={() => setCurrent((c) => (c - 1 + items.length) % items.length)}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 rounded-full flex items-center justify-center z-10"
        aria-label="Previous"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button
        onClick={() => setCurrent((c) => (c + 1) % items.length)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 rounded-full flex items-center justify-center z-10"
        aria-label="Next"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>
  );
}
