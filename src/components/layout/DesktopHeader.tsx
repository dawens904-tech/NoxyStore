import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, X, ChevronDown, Mail } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageCurrencyModal } from "@/components/ui/LanguageCurrencyModal";
import { supabase } from "@/lib/supabase";

interface DesktopHeaderProps {
  showLoginModal?: () => void;
}

// Popular games from games_cache for the dropdown
function GamesDropdown({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [popularGames, setPopularGames] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("games_cache").select("game_id, game_name, game_image").limit(16).then(({ data }) => {
      if (data) setPopularGames(data);
    });
  }, []);

  const allGamesList = [
    "007 First Light", "2XKO", "7 Days to Die Steam", "Genshin Impact",
    "Mobile Legends: Bang Bang", "GODDESS OF VICTORY: NIKKE", "Honkai: Star Rail",
    "FC 26", "Free Fire", "PUBG MOBILE",
  ];

  return (
    <div className="fixed left-0 right-0 z-[9999]" style={{ top: 56 }} onClick={onClose}>
      <div className="bg-[#1a1a1a] border-t border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="max-w-[1280px] mx-auto px-6 py-6 flex gap-8">
          {/* Popular Games */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-orange-500 text-base">🔥</span>
              <h3 className="text-white font-bold text-sm">Popular Games</h3>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {popularGames.slice(0, 8).map(game => (
                <button key={game.game_id} onClick={() => { navigate(`/game/${game.game_id}`); onClose(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-left transition-colors group">
                  <img src={game.game_image || `https://images.unsplash.com/photo-1542751371-adc38448a05e?w=32&h=32&fit=crop`}
                    alt={game.game_name}
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1542751371-adc38448a05e?w=32&h=32&fit=crop`; }} />
                  <span className="text-gray-300 text-sm group-hover:text-white font-medium truncate">{game.game_name}</span>
                </button>
              ))}
              {popularGames.slice(8, 16).map(game => (
                <button key={game.game_id} onClick={() => { navigate(`/game/${game.game_id}`); onClose(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-left transition-colors group">
                  <img src={game.game_image || `https://images.unsplash.com/photo-1542751371-adc38448a05e?w=32&h=32&fit=crop`}
                    alt={game.game_name}
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1542751371-adc38448a05e?w=32&h=32&fit=crop`; }} />
                  <span className="text-gray-300 text-sm group-hover:text-white font-medium truncate">{game.game_name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-gray-700" />

          {/* All Games */}
          <div className="w-56">
            <button onClick={() => { navigate("/categories"); onClose(); }}
              className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 grid grid-cols-2 gap-0.5">
                  {[1,2,3,4].map(i => <div key={i} className="bg-gray-500 rounded-sm" />)}
                </div>
                <h3 className="text-white font-bold text-sm">All Games</h3>
              </div>
              <ChevronDown size={14} className="text-gray-400 -rotate-90" />
            </button>
            <div className="space-y-1">
              {allGamesList.map(name => (
                <button key={name} onClick={() => { navigate(`/categories?q=${encodeURIComponent(name)}`); onClose(); }}
                  className="w-full text-left px-2 py-1.5 text-gray-400 hover:text-white text-sm transition-colors">
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Help Center Dropdown
function HelpDropdown({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="fixed left-0 right-0 z-[9999]" style={{ top: 56 }} onClick={onClose}>
      <div className="bg-[#1a1a1a] border-t border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="max-w-[1280px] mx-auto px-6 py-4">
          <div className="w-52">
            {[
              { label: "NoxyStore FAQs", path: "/support" },
              { label: "Feedback", path: "/feedback" },
            ].map(item => (
              <button key={item.label} onClick={() => { navigate(item.path); onClose(); }}
                className="w-full flex items-center justify-between px-3 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-colors group">
                <span>{item.label}</span>
                <ChevronDown size={14} className="text-gray-500 -rotate-90 group-hover:text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// User Dropdown (photo 10)
function UserDropdown({ user, onClose, onLogout }: { user: any; onClose: () => void; onLogout: () => void }) {
  const navigate = useNavigate();
  const items = [
    { icon: "🛍️", label: "Buy History", path: "/account", section: "buyHistory" },
    { icon: "🎟️", label: "Coupon", path: "/coupons" },
    { icon: "⚙️", label: "Settings", path: "/account", section: "settings" },
    { icon: "❓", label: "Help Center", path: "/support" },
    { icon: "💬", label: "Feedback", path: "/feedback" },
    { icon: "🎁", label: "Invite for Coupons", path: "/invite", sub: "Unlock rich coupon rewards", orange: true },
    { icon: "💰", label: "Affiliate Program", path: "/affiliate", sub: "Earn up to 10% money", orange: true },
  ];

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-white shadow-2xl border border-gray-100 z-50 overflow-hidden">
      {/* User info header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {user?.nickname?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{user?.nickname || user?.email?.split("@")[0]}</p>
            <button onClick={() => { navigate("/vip"); onClose(); }} className="text-xs text-gray-500 flex items-center gap-1 hover:text-yellow-600 mt-0.5">
              Check VIP Benefits <span className="w-2 h-2 bg-red-500 rounded-full" /> <ChevronDown size={10} className="-rotate-90" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
          <button onClick={() => { navigate("/balance"); onClose(); }} className="flex-1 text-center hover:opacity-80">
            <p className="text-base font-bold text-gray-900">${(user?.balance ?? 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500">Balance</p>
          </button>
          <div className="h-8 w-px bg-gray-200" />
          <button onClick={() => { navigate("/points"); onClose(); }} className="flex-1 text-center hover:opacity-80">
            <p className="text-base font-bold text-gray-900 flex items-center justify-center gap-1">
              <span className="text-yellow-500 text-sm">●</span> {user?.points ?? 0}
              <span className="text-[9px] bg-red-500 text-white font-bold px-1 py-0.5 rounded ml-0.5">NEW</span>
            </p>
            <p className="text-xs text-gray-500">Points</p>
          </button>
        </div>
      </div>

      {/* Nav items */}
      <div>
        {items.map(item => (
          <button key={item.label} onClick={() => { navigate(item.path); onClose(); }}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-base">{item.icon}</span>
              <div className="text-left">
                <p className={`text-sm font-medium ${item.orange ? "text-orange-500" : "text-gray-800"}`}>{item.label}</p>
                {item.sub && <p className="text-xs text-orange-400">{item.sub}</p>}
              </div>
            </div>
            <ChevronDown size={14} className="text-gray-400 -rotate-90" />
          </button>
        ))}
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-500 transition-colors">
          <span className="text-base">🚪</span>
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
}

// Notifications Page Panel (photo 8)
function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"trade" | "news" | "system">("trade");
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="fixed inset-0 z-[9998]" onClick={onClose}>
      <div className="absolute right-0 bg-white border border-gray-100 shadow-2xl overflow-hidden"
        style={{ top: 56, right: 0, width: 680, maxHeight: "calc(100vh - 56px)" }}
        onClick={e => e.stopPropagation()}>
        {/* Push notification banner */}
        {!dismissed && (
          <div className="flex items-center justify-between px-4 py-3 bg-yellow-50 border-b border-yellow-100">
            <span className="text-sm text-gray-700">Turn on push notifications to receive the order progress and seller messages</span>
            <div className="flex items-center gap-2 ml-3">
              <button className="bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold px-3 py-1.5 rounded transition-colors whitespace-nowrap">Turn On</button>
              <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
          </div>
        )}

        <div className="flex" style={{ minHeight: 400 }}>
          {/* Left sidebar */}
          <div className="w-52 border-r border-gray-100 py-3">
            <button onClick={() => {}} className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-50 border-l-4 border-l-yellow-400 text-left">
              <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-base flex-shrink-0">N</div>
              <span className="text-sm font-semibold text-gray-900">Notification</span>
            </button>
            <button onClick={() => { navigate("/support/group"); onClose(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors">
              <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-yellow-400 font-bold text-base flex-shrink-0">G</div>
              <span className="text-sm font-medium text-gray-700">Game Kingdom</span>
            </button>
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col">
            {/* Sub tabs */}
            <div className="flex border-b border-gray-100 px-4">
              {[
                { key: "trade" as const, label: "Trade Messages" },
                { key: "news" as const, label: "New Game News" },
                { key: "system" as const, label: "System messages" },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-3 text-sm font-medium relative mr-4 transition-colors ${activeTab === tab.key ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                  {tab.label}
                  {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 rounded-full" />}
                </button>
              ))}
            </div>

            {/* Empty state */}
            <div className="flex-1 flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 mb-4 opacity-30">
                <svg viewBox="0 0 80 80" className="w-full h-full">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#9ca3af" strokeWidth="3" strokeDasharray="6 4"/>
                  <path d="M25 40 Q40 25 55 40 Q40 55 25 40Z" fill="#e5e7eb"/>
                </svg>
              </div>
              <p className="text-gray-400 text-sm font-medium">No data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesktopHeader({ showLoginModal }: DesktopHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { language, currency } = useSettingsStore();
  const { t } = useTranslation();
  const [showLangModal, setShowLangModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showGamesMenu, setShowGamesMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const gamesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const helpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll unread messages every 30 seconds
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .neq("sender", "user")
        .eq("is_read", false)
        .or(`user_email.eq.${user.email},user_id.eq.${user.id}`);
      if (count !== null) setUnreadCount(count);
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const langDisplay = language.toUpperCase().slice(0, 2);
  const currDisplay = currency;

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const handleGamesEnter = () => {
    if (gamesTimerRef.current) clearTimeout(gamesTimerRef.current);
    setShowGamesMenu(true);
    setShowHelpMenu(false);
  };
  const handleGamesLeave = () => {
    gamesTimerRef.current = setTimeout(() => setShowGamesMenu(false), 150);
  };
  const handleHelpEnter = () => {
    if (helpTimerRef.current) clearTimeout(helpTimerRef.current);
    setShowHelpMenu(true);
    setShowGamesMenu(false);
  };
  const handleHelpLeave = () => {
    helpTimerRef.current = setTimeout(() => setShowHelpMenu(false), 150);
  };

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    navigate("/");
  };

  // close menus when navigating away
  useEffect(() => {
    setShowGamesMenu(false);
    setShowHelpMenu(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <LanguageCurrencyModal isOpen={showLangModal} onClose={() => setShowLangModal(false)} />

      {/* Sticky header */}
      <header className="bg-[#0a0a0a] sticky top-0 z-50 shadow-lg" style={{ height: 56 }}>
        <div className="max-w-[1280px] mx-auto px-6 flex items-center h-full gap-8">
          {/* Logo */}
          <button onClick={() => navigate("/")} className="flex-shrink-0 flex items-center gap-1">
            <span className="font-black text-2xl tracking-tight leading-none">
              <span className="text-yellow-400">NOXY</span>
              <span className="text-white">STORE</span>
              <span className="text-yellow-400 text-sm">.gg</span>
            </span>
          </button>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {/* Home */}
            <button onClick={() => navigate("/")}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${isActive("/") && location.pathname === "/" ? "text-yellow-400" : "text-gray-300 hover:text-white"}`}>
              {t("home")}
            </button>

            {/* Games with dropdown */}
            <div className="relative" onMouseEnter={handleGamesEnter} onMouseLeave={handleGamesLeave}>
              <button className={`flex items-center gap-1 px-4 py-2 text-sm font-semibold transition-colors ${showGamesMenu ? "text-yellow-400" : "text-gray-300 hover:text-white"}`}>
                {t("games")} <ChevronDown size={14} className={`transition-transform ${showGamesMenu ? "rotate-180" : ""}`} />
              </button>
              {showGamesMenu && (
                <div onMouseEnter={handleGamesEnter} onMouseLeave={handleGamesLeave}>
                  <GamesDropdown onClose={() => setShowGamesMenu(false)} />
                </div>
              )}
            </div>

            {/* Blog */}
            <button onClick={() => navigate("/about")}
              className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors">
              Blog
            </button>

            {/* Help Center with dropdown */}
            <div className="relative" onMouseEnter={handleHelpEnter} onMouseLeave={handleHelpLeave}>
              <button className={`flex items-center gap-1 px-4 py-2 text-sm font-semibold transition-colors ${showHelpMenu ? "text-yellow-400" : "text-gray-300 hover:text-white"}`}>
                {t("helpCenter")} <ChevronDown size={14} className={`transition-transform ${showHelpMenu ? "rotate-180" : ""}`} />
              </button>
              {showHelpMenu && (
                <div onMouseEnter={handleHelpEnter} onMouseLeave={handleHelpLeave}>
                  <HelpDropdown onClose={() => setShowHelpMenu(false)} />
                </div>
              )}
            </div>
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search */}
          <div className="flex items-center">
            {searchOpen ? (
              <div className="flex items-center bg-white/10 rounded px-3 py-1.5 gap-2 w-52">
                <Search size={15} className="text-gray-400 flex-shrink-0" />
                <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { navigate(`/categories?q=${encodeURIComponent(searchQuery)}`); setSearchOpen(false); setSearchQuery(""); }
                    if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
                  }}
                  placeholder={t("searchGames")}
                  className="bg-transparent text-white placeholder-gray-400 text-sm outline-none flex-1" />
                <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                  <X size={13} className="text-gray-400 hover:text-white" />
                </button>
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="p-2 text-gray-400 hover:text-white transition-colors">
                <Search size={20} />
              </button>
            )}
          </div>

          {/* Language/Currency */}
          <button onClick={() => setShowLangModal(true)}
            className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-gray-700 text-white text-sm font-semibold px-3 py-1.5 rounded transition-colors whitespace-nowrap">
            {langDisplay} / {currDisplay}
          </button>

          {/* Mail/Notifications icon → navigate to /messages */}
          {isAuthenticated && (
            <div className="relative">
              <button onClick={() => navigate("/messages")}
                className="relative p-2 text-gray-400 hover:text-white transition-colors">
                <Mail size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-0.5">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {unreadCount === 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
              </button>
            </div>
          )}

          {/* Auth */}
          {isAuthenticated ? (
            <div className="relative">
              <button onClick={() => navigate("/account")}
                className="flex items-center gap-2 group">
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {user?.nickname?.[0]?.toUpperCase() ?? "U"}
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0a0a0a]" />
                </div>
              </button>
            </div>
          ) : (
            <button onClick={() => navigate("/login")}
              className="flex items-center gap-2 border border-gray-600 hover:border-yellow-400 bg-transparent hover:bg-yellow-400/10 text-gray-300 hover:text-white px-3 py-1.5 rounded transition-all group">
              <div className="w-6 h-6 rounded-full flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <span className="text-sm font-semibold whitespace-nowrap">{t("loginSignup")}</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
}


