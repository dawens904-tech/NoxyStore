import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  BarChart3, Package, MessageSquare, Percent, Gift, Image,
  Grid, List, UserPlus, Tag, BarChart2, Zap, Shield,
  Home, LogOut, Plus, Moon, Sun, ChevronLeft, Users
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";

interface AdminNavItem {
  key: string;
  path: string;
  icon: any;
  label: string;
  badge?: number;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [darkMode, setDarkMode] = useState(true);
  const [chatBadge, setChatBadge] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/login");
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const loadBadge = async () => {
      const { data } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("status", "waiting");
      if (data) setChatBadge(data.length);
    };
    loadBadge();
    const interval = setInterval(loadBadge, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems: AdminNavItem[] = [
    { key: "dashboard", path: "/admin", icon: BarChart3, label: "Dashboard" },
    { key: "orders", path: "/admin/orders", icon: Package, label: "Orders" },
    { key: "livechat", path: "/admin/livechat", icon: MessageSquare, label: "Live Chat", badge: chatBadge },
    { key: "markup", path: "/admin/markup", icon: Percent, label: "Markup / Pricing" },
    { key: "coupons", path: "/admin/coupons", icon: Gift, label: "Coupon Codes" },
    { key: "banners", path: "/admin/banners", icon: Image, label: "Home Banners" },
    { key: "products", path: "/admin/products", icon: Grid, label: "Product Management" },
    { key: "add-product", path: "/admin/add-product", icon: Plus, label: "Add Product" },
    { key: "sections", path: "/admin/sections", icon: List, label: "Home Sections" },
    { key: "roles", path: "/admin/roles", icon: UserPlus, label: "Roles & Invite" },
    { key: "categories", path: "/admin/categories", icon: Tag, label: "Game Categories" },
    { key: "analytics", path: "/admin/analytics", icon: BarChart2, label: "Analytics" },
    { key: "api", path: "/admin/api-status", icon: Zap, label: "API Status" },
    { key: "group-chat", path: "/admin/group-chat", icon: Users, label: "Group Chat" },
  ];

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
        {/* Top Bar */}
        <div className="bg-[#1a1a1a] border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-400 hover:text-white p-1.5"
            >
              <ChevronLeft size={18} className={`transition-transform ${sidebarOpen ? "" : "rotate-180"}`} />
            </button>
            <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white p-1 hidden lg:flex">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-yellow-400 rounded-lg flex items-center justify-center">
                <Shield size={14} className="text-black" />
              </div>
              <span className="font-black text-white text-sm">
                NoxyStore <span className="text-yellow-400">Admin</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-lg"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-black text-xs font-black">
                {user?.nickname?.[0]?.toUpperCase() || "A"}
              </div>
              <span className="text-white text-xs font-medium hidden sm:block">{user?.nickname}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 relative">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Sidebar */}
          <div className={`
            fixed lg:sticky top-14 h-[calc(100vh-56px)] w-56 bg-[#151515] border-r border-white/10
            flex flex-col py-4 z-40 transition-transform duration-300
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}>
            <nav className="space-y-0.5 px-3 flex-1 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive(item.path)
                      ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>
            <div className="px-3 pb-2 border-t border-white/10 pt-3 space-y-1">
              <Link
                to="/"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <Home size={16} /> Go to Store
              </Link>
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-all"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4 lg:p-6 overflow-auto min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-black text-white">{title}</h1>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
