import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Search, Bell, ChevronDown, Menu, X, ShoppingCart } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageCurrencyModal } from "@/components/ui/LanguageCurrencyModal";
import { useCartStore } from "@/stores/cartStore";

interface DesktopHeaderProps {
  showLoginModal?: () => void;
}

export function DesktopHeader({ showLoginModal }: DesktopHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { language, currency } = useSettingsStore();
  const { t } = useTranslation();
  const { items } = useCartStore();
  const [showLangModal, setShowLangModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showGamesMenu, setShowGamesMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const langDisplay = language.toUpperCase();
  const currDisplay = currency;

  const navLinks = [
    { label: t("home"), path: "/" },
    { label: t("games"), path: "/categories", hasDropdown: true },
    { label: t("blog"), path: "/blog" },
    { label: t("helpCenter"), path: "/help" },
  ];

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <>
      <LanguageCurrencyModal isOpen={showLangModal} onClose={() => setShowLangModal(false)} />

      {/* Top announcement banner — only shown to guests */}
      {!isAuthenticated && (
        <div className="bg-[#fff9e6] border-b border-yellow-100 py-2 px-4 text-center text-sm">
          <span className="text-gray-700">🎁 {t("exclusiveForNewUsers")} </span>
          <button
            onClick={() => navigate("/login")}
            className="text-yellow-600 font-semibold hover:text-yellow-700 underline"
          >
            {t("signupForCoupons")}
          </button>
        </div>
      )}

      {/* Main nav bar */}
      <header className="bg-[#0a0a0a] sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center h-14 gap-6">
          {/* Logo */}
          <button onClick={() => navigate("/")} className="flex-shrink-0">
            <span className="font-black text-xl tracking-tight">
              <span className="text-yellow-400">NOXY</span>
              <span className="text-white">STORE</span>
              <span className="text-yellow-400 text-sm">.gg</span>
            </span>
          </button>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-1 ml-2">
            {navLinks.map((link) => (
              <div key={link.label} className="relative group">
                <button
                  onClick={() => navigate(link.path)}
                  onMouseEnter={() => link.hasDropdown && setShowGamesMenu(true)}
                  onMouseLeave={() => link.hasDropdown && setShowGamesMenu(false)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive(link.path)
                      ? "text-yellow-400"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {link.label}
                  {link.hasDropdown && <ChevronDown size={14} className="opacity-60" />}
                </button>

                {link.hasDropdown && showGamesMenu && (
                  <div
                    className="absolute left-0 top-full pt-1 z-50"
                    onMouseEnter={() => setShowGamesMenu(true)}
                    onMouseLeave={() => setShowGamesMenu(false)}
                  >
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 py-2 w-48">
                      {["Top Up", "Game Coins", "Gift Card", "Game Keys", "Game Items"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            navigate(`/categories?filter=${encodeURIComponent(cat)}`);
                            setShowGamesMenu(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 transition-colors"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search */}
          <div className="hidden lg:flex items-center">
            {searchOpen ? (
              <div className="flex items-center bg-white/10 rounded-xl px-3 py-1.5 gap-2">
                <Search size={16} className="text-gray-400" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      navigate(`/categories?q=${encodeURIComponent(searchQuery)}`);
                      setSearchOpen(false);
                    }
                    if (e.key === "Escape") setSearchOpen(false);
                  }}
                  placeholder={t("searchGames")}
                  className="bg-transparent text-white placeholder-gray-400 text-sm outline-none w-48"
                />
                <button onClick={() => setSearchOpen(false)}>
                  <X size={14} className="text-gray-400 hover:text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Search size={20} />
              </button>
            )}
          </div>

          {/* Language/Currency toggle */}
          <button
            onClick={() => setShowLangModal(true)}
            className="hidden lg:flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            {langDisplay} / {currDisplay}
          </button>

          {/* Cart icon (mobile) */}
          <button
            onClick={() => navigate("/cart")}
            className="relative p-2 text-gray-400 hover:text-white transition-colors lg:block"
          >
            <ShoppingCart size={20} />
            {items.length > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-yellow-400 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {items.length}
              </span>
            )}
          </button>

          {/* Notifications (logged in) */}
          {isAuthenticated && (
            <button className="hidden lg:flex p-2 text-gray-400 hover:text-white transition-colors">
              <Bell size={20} />
            </button>
          )}

          {/* Auth section */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-bold text-sm">
                  {user?.nickname?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="hidden lg:block text-gray-300 text-sm font-medium group-hover:text-white">
                  {user?.nickname}
                </span>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-bold text-gray-900 text-sm">{user?.nickname}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    {[
                      { label: t("myAccount"), path: "/account" },
                      { label: t("buyHistory"), path: "/account" },
                      { label: t("settings"), path: "/account" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => { navigate(item.path); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {item.label}
                      </button>
                    ))}
                    {user?.role === "admin" && (
                      <button
                        onClick={() => { navigate("/secure-dashboard-92x2011"); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-yellow-600 font-semibold hover:bg-yellow-50"
                      >
                        {t("adminDashboard")}
                      </button>
                    )}
                    <div className="border-t border-gray-100 mt-1">
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                      >
                        {t("logout")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              {t("loginSignup")}
            </button>
          )}
        </div>
      </header>
    </>
  );
}
