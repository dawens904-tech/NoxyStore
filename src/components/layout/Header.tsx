import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Menu, X, ShoppingCart } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageCurrencyModal } from "@/components/ui/LanguageCurrencyModal";
import { useCartStore } from "@/stores/cartStore";

interface HeaderProps {
  showMenu?: boolean;
  title?: string;
  showBack?: boolean;
}

export function Header({ showMenu, title, showBack }: HeaderProps) {
  const navigate = useNavigate();
  const { language, currency } = useSettingsStore();
  const { t } = useTranslation();
  const { items } = useCartStore();
  const [showLangModal, setShowLangModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <LanguageCurrencyModal isOpen={showLangModal} onClose={() => setShowLangModal(false)} />

      <header className="bg-[#0a0a0a] px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          {showBack ? (
            <button onClick={() => navigate(-1)} className="text-white p-1 -ml-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
          ) : showMenu ? (
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-white p-1 -ml-1">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          ) : (
            <div className="w-8" />
          )}

          {title ? (
            <h1 className="text-white font-bold text-base">{title}</h1>
          ) : (
            <button onClick={() => navigate("/")} className="font-black text-lg tracking-tight">
              <span className="text-yellow-400">NOXY</span>
              <span className="text-white">STORE</span>
              <span className="text-yellow-400 text-xs">.gg</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/search")}
              className="text-white p-1"
            >
              <Search size={20} />
            </button>

            <button
              onClick={() => setShowLangModal(true)}
              className="flex items-center gap-1 bg-white/15 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg"
            >
              {language.toUpperCase()} / {currency}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-in menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="relative w-72 bg-white h-full shadow-xl flex flex-col">
            <div className="bg-[#0a0a0a] px-5 py-4">
              <span className="font-black text-xl">
                <span className="text-yellow-400">NOXY</span>
                <span className="text-white">STORE</span>
              </span>
            </div>
            <nav className="flex-1 py-4">
              {[
                { label: t("home"), path: "/" },
                { label: t("games"), path: "/categories" },
                { label: t("myAccount"), path: "/account" },
                { label: t("helpCenter"), path: "/help" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { navigate(item.path); setMenuOpen(false); }}
                  className="w-full text-left px-5 py-3.5 text-gray-800 font-medium hover:bg-gray-50 border-b border-gray-100"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
