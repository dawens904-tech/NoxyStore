import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Menu, X, User, ChevronRight, Home, Gamepad2, Newspaper, Download } from "lucide-react";
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

      <header className="bg-[#0a0a0a] px-4 py-0 fixed top-0 left-0 right-0 z-40 shadow-md">
        {/* Top row: [left: back/menu + logo] [right: actions] */}
        <div className="flex items-center justify-between h-12">
          {/* Left: back/menu button + logo side by side */}
          <div className="flex items-center gap-2">
            {showBack ? (
              <button onClick={() => navigate(-1)} className="text-white p-1 -ml-1 flex items-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
              </button>
            ) : showMenu ? (
              <button onClick={() => setMenuOpen(!menuOpen)} className="text-white p-1 -ml-1">
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            ) : null}

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
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate("/search")} className="text-white p-2">
              <Search size={19} />
            </button>

            {/* Currency toggle — always visible */}
            <button
              onClick={() => setShowLangModal(true)}
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold px-2.5 py-1.5 transition-colors"
            >
              {currency}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-in menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="relative w-[280px] bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* User info header */}
            {isAuthenticated ? (
              <button
                onClick={() => { navigate("/account"); setMenuOpen(false); }}
                className="flex items-center gap-3 px-5 py-5 hover:bg-gray-50 transition-colors"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {user?.nickname?.[0]?.toUpperCase() ?? ""}
                  </div>
                )}
                <span className="flex-1 text-left font-medium text-gray-900 text-sm truncate">
                  {user?.nickname || user?.email?.split("@")[0] || "User"}
                </span>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => { navigate("/login"); setMenuOpen(false); }}
                className="flex items-center gap-3 px-5 py-5 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  U
                </div>
                <span className="flex-1 text-left font-medium text-gray-900 text-sm">
                  Sign in / Register
                </span>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </button>
            )}

            {/* Divider */}
            <div className="mx-5 h-px bg-gray-200" />

            {/* Nav links */}
            <nav className="flex-1 py-2 overflow-y-auto">
              <button
                onClick={() => { navigate("/"); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-gray-800 font-medium hover:bg-gray-50 text-sm transition-colors"
              >
                <Home size={18} className="text-gray-500" />
                Home
              </button>

              <button
                onClick={() => { navigate("/categories"); setMenuOpen(false); }}
                className="w-full flex items-center justify-between px-5 py-3.5 text-gray-800 font-medium hover:bg-gray-50 text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Gamepad2 size={18} className="text-gray-500" />
                  Games
                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </button>

              <button
                onClick={() => { navigate("/about"); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-gray-800 font-medium hover:bg-gray-50 text-sm transition-colors"
              >
                <Newspaper size={18} className="text-gray-500" />
                Blog
              </button>
            </nav>

            {/* Download App section */}
            <div className="px-5 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Download App</p>
              <button className="flex items-center gap-2 bg-black rounded-lg px-3 py-2 hover:bg-gray-900 transition-colors">
                <Download size={16} className="text-white" />
                <div className="text-left">
                  <p className="text-[9px] text-gray-400 leading-tight">GET IT ON</p>
                  <p className="text-xs text-white font-semibold leading-tight">Google Play</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Spacer to offset fixed header height */}
      <div className="h-12" />
    </>
  );
}
