import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Menu, X, User, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageCurrencyModal } from "@/components/ui/LanguageCurrencyModal";

interface HeaderProps {
  showMenu?: boolean;
  title?: string;
  showBack?: boolean;
}

export function Header({ showMenu, title, showBack }: HeaderProps) {
  const navigate = useNavigate();
  const { language, currency } = useSettingsStore();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const [showLangModal, setShowLangModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <LanguageCurrencyModal isOpen={showLangModal} onClose={() => setShowLangModal(false)} />

      <header className="bg-[#0a0a0a] px-4 py-0 sticky top-0 z-40 shadow-md">
        {/* Top row: logo + right actions */}
        <div className="flex items-center justify-between h-12">
          {/* Left: back / menu / spacer */}
          {showBack ? (
            <button onClick={() => navigate(-1)} className="text-white p-1 -ml-1 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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

          {/* Logo / Title */}
          {title ? (
            <h1 className="text-white font-bold text-sm">{title}</h1>
          ) : (
            <button onClick={() => navigate("/")} className="font-black text-lg tracking-tight">
              <span className="text-yellow-400">NOXY</span>
              <span className="text-white">STORE</span>
              <span className="text-yellow-400 text-xs">.gg</span>
            </button>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate("/search")} className="text-white p-2">
              <Search size={19} />
            </button>

            {/* Lang/Currency or login */}
            {isAuthenticated ? (
              <button onClick={() => navigate("/account")} className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-black font-black text-sm ml-1">
                {user?.nickname?.[0]?.toUpperCase() ?? "U"}
              </button>
            ) : (
              <button
                onClick={() => setShowLangModal(true)}
                className="flex items-center gap-1 bg-white/15 text-white text-[11px] font-bold px-2 py-1.5 rounded-lg ml-1"
              >
                {language.toUpperCase()}/{currency}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Slide-in menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="relative w-[280px] bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Menu header */}
            <div className="bg-[#0a0a0a] px-5 py-4 flex items-center justify-between">
              <button onClick={() => navigate("/")} className="font-black text-xl">
                <span className="text-yellow-400">NOXY</span>
                <span className="text-white">STORE</span>
              </button>
              <button onClick={() => setMenuOpen(false)} className="text-white/60">
                <X size={20} />
              </button>
            </div>

            {/* User info */}
            {isAuthenticated ? (
              <button
                onClick={() => { navigate("/account"); setMenuOpen(false); }}
                className="flex items-center gap-3 px-5 py-4 bg-yellow-50 border-b border-yellow-100"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-black text-base flex-shrink-0">
                  {user?.nickname?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{user?.nickname}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => { navigate("/login"); setMenuOpen(false); }}
                className="flex items-center gap-3 px-5 py-4 bg-yellow-50 border-b border-yellow-100"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-gray-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-900 text-sm">Sign in / Register</p>
                  <p className="text-xs text-gray-500">Get exclusive deals</p>
                </div>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </button>
            )}

            {/* Nav links */}
            <nav className="flex-1 py-2 overflow-y-auto">
              {[
                { label: t("home"), path: "/", icon: "🏠" },
                { label: t("games"), path: "/categories", icon: "🎮" },
                { label: t("myOrders"), path: isAuthenticated ? "/account" : "/login", icon: "📦" },
                { label: "Balance & Wallet", path: "/balance", icon: "💳" },
                { label: "Coupons", path: "/coupons", icon: "🎟" },
                { label: "Invite Friends", path: "/invite", icon: "👥" },
                { label: t("helpCenter"), path: "/support", icon: "💬" },
                { label: "About NoxyStore", path: "/about-us", icon: "ℹ️" },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-gray-800 font-medium hover:bg-gray-50 border-b border-gray-100 text-sm"
                >
                  <span className="w-6 text-base">{item.icon}</span>
                  {item.label}
                  <ChevronRight size={14} className="ml-auto text-gray-300" />
                </button>
              ))}
            </nav>

            {/* Lang/Currency at bottom */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => { setShowLangModal(true); setMenuOpen(false); }}
                className="w-full flex items-center justify-between bg-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700"
              >
                <span>Language & Currency</span>
                <span className="text-gray-500 text-xs font-bold">{language.toUpperCase()} / {currency}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
