import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, TrendingUp, Package, DollarSign, Users, Activity,
  Shield, Zap, BarChart3, Settings, LogOut, Home, List, Percent,
  Grid, UserPlus, Tag, Monitor, Smartphone, Tablet, BarChart2,
  Eye, Save, X, Check, Plus, Trash2, Edit2, MessageSquare, Send
} from "lucide-react";
import { lootbarApi } from "@/lib/lootbar-api";
import { useAuthStore } from "@/stores/authStore";
import { ORDER_STATE_MAP } from "@/types";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { supabase } from "@/lib/supabase";
import { getAnalytics } from "@/lib/analytics";
import { MOCK_GAMES, CATEGORIES } from "@/constants/mockData";
import { toast } from "sonner";

type AdminSection = "dashboard" | "orders" | "api" | "markup" | "sections" | "roles" | "categories" | "analytics" | "livechat";

interface HomeSection {
  id: string;
  section_name: string;
  section_key: string;
  sort_order: number;
  is_active: boolean;
  game_ids: string[];
}

interface UserRole {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface AnalyticsData {
  totalVisits: number;
  uniqueSessions: number;
  deviceCounts: Record<string, number>;
  topPages: { page: string; count: number }[];
  topGames: { gameId: string; count: number }[];
  dailyData: { date: string; count: number }[];
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, orders, isAuthenticated, logout } = useAuthStore();
  const [balance, setBalance] = useState<string>("—");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  // Markup state
  const [markup, setMarkup] = useState(0);
  const [markupInput, setMarkupInput] = useState("0");
  const [isSavingMarkup, setIsSavingMarkup] = useState(false);

  // Sections state
  const [homeSections, setHomeSections] = useState<HomeSection[]>([]);
  const [editingSection, setEditingSection] = useState<HomeSection | null>(null);
  const [newSectionName, setNewSectionName] = useState("");

  // Roles state
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isInviting, setIsInviting] = useState(false);

  // Categories state
  const [gameOverrides, setGameOverrides] = useState<Record<string, string>>({});
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  // Live chat
  const [chatSessions, setChatSessions] = useState<Array<{ id: string; user_email: string; status: string; updated_at: string }>>([]);
  const [activeChatSession, setActiveChatSession] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; content: string; image_url?: string; created_at: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Analytics
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/login");
      return;
    }
    fetchBalance();
    checkApiStatus();
    loadMarkup();
    loadSections();
    loadRoles();
    loadGameOverrides();
    loadChatSessions();
  }, []);

  // Poll chat sessions every 5 seconds
  useEffect(() => {
    const interval = setInterval(loadChatSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Poll active chat messages every 3 seconds
  useEffect(() => {
    if (!activeChatSession) return;
    const interval = setInterval(() => loadChatMessages(activeChatSession), 3000);
    return () => clearInterval(interval);
  }, [activeChatSession]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (section === "analytics") loadAnalytics();
  }, [section, analyticsDays]);

  const fetchBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const bal = await lootbarApi.getBalance();
      setBalance(bal);
    } catch { toast.error("Failed to fetch balance"); }
    finally { setIsLoadingBalance(false); }
  };

  const checkApiStatus = async () => {
    try { await lootbarApi.getGames(1, 1); setApiConnected(true); }
    catch { setApiConnected(false); }
  };

  const loadMarkup = async () => {
    const { data } = await supabase.from("markup_settings").select("markup_percent").eq("id", 1).single();
    if (data) { setMarkup(Number(data.markup_percent)); setMarkupInput(String(data.markup_percent)); }
  };

  const saveMarkup = async () => {
    const val = parseFloat(markupInput);
    if (isNaN(val) || val < 0 || val > 100) { toast.error("Markup must be 0–100%"); return; }
    setIsSavingMarkup(true);
    const { error } = await supabase.from("markup_settings").upsert({ id: 1, markup_percent: val, updated_at: new Date().toISOString() });
    setIsSavingMarkup(false);
    if (error) { toast.error("Failed to save markup"); return; }
    setMarkup(val);
    toast.success(`Markup set to ${val}%`);
  };

  const loadSections = async () => {
    const { data } = await supabase.from("home_sections").select("*").order("sort_order");
    if (data) setHomeSections(data as HomeSection[]);
  };

  const saveSection = async (sec: HomeSection) => {
    const { error } = await supabase.from("home_sections").upsert({
      id: sec.id,
      section_name: sec.section_name,
      section_key: sec.section_key,
      sort_order: sec.sort_order,
      is_active: sec.is_active,
      game_ids: sec.game_ids,
      updated_at: new Date().toISOString(),
    });
    if (error) { toast.error("Failed to save section"); return; }
    toast.success("Section saved!");
    setEditingSection(null);
    loadSections();
  };

  const createSection = async () => {
    if (!newSectionName.trim()) return;
    const key = newSectionName.toLowerCase().replace(/\s+/g, "_");
    const { error } = await supabase.from("home_sections").insert({
      section_name: newSectionName,
      section_key: key,
      sort_order: homeSections.length + 1,
      is_active: true,
      game_ids: [],
    });
    if (error) { toast.error("Failed to create section"); return; }
    setNewSectionName("");
    toast.success("Section created!");
    loadSections();
  };

  const deleteSection = async (id: string) => {
    await supabase.from("home_sections").delete().eq("id", id);
    toast.success("Section deleted");
    loadSections();
  };

  const loadRoles = async () => {
    const { data } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
    if (data) setRoles(data as UserRole[]);
  };

  const inviteUser = async () => {
    if (!inviteEmail.trim()) { toast.error("Enter an email"); return; }
    setIsInviting(true);
    const { error } = await supabase.from("user_roles").upsert({
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      invited_by: user?.id,
      is_active: true,
      updated_at: new Date().toISOString(),
    });
    setIsInviting(false);
    if (error) { toast.error("Failed to invite user: " + error.message); return; }
    setInviteEmail("");
    toast.success(`${inviteEmail} invited as ${inviteRole}`);
    loadRoles();
  };

  const updateRole = async (id: string, newRole: string) => {
    await supabase.from("user_roles").update({ role: newRole, updated_at: new Date().toISOString() }).eq("id", id);
    toast.success("Role updated");
    loadRoles();
  };

  const toggleRoleActive = async (id: string, current: boolean) => {
    await supabase.from("user_roles").update({ is_active: !current }).eq("id", id);
    toast.success(`Role ${!current ? "activated" : "deactivated"}`);
    loadRoles();
  };

  const loadGameOverrides = async () => {
    const { data } = await supabase.from("game_overrides").select("*");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((r: { game_id: string; category_override?: string }) => { if (r.category_override) map[r.game_id] = r.category_override; });
      setGameOverrides(map);
    }
  };

  const saveGameOverride = async (gameId: string, category: string) => {
    setIsSavingCategories(true);
    await supabase.from("game_overrides").upsert({
      game_id: gameId,
      category_override: category,
      updated_at: new Date().toISOString(),
    });
    setIsSavingCategories(false);
    toast.success("Category updated!");
    loadGameOverrides();
  };

  const loadChatSessions = async () => {
    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .in("status", ["waiting", "live", "ai"])
      .order("updated_at", { ascending: false });
    if (data) setChatSessions(data);
  };

  const loadChatMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (data) setChatMessages(data);
  };

  const joinChatSession = async (sessionId: string) => {
    setActiveChatSession(sessionId);
    await supabase.from("chat_sessions").update({
      status: "live",
      admin_email: user?.email,
      admin_joined_at: new Date().toISOString(),
    }).eq("id", sessionId);
    await loadChatMessages(sessionId);
    // Send admin joined message
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      sender: "admin",
      content: "A support agent has joined the chat. How can I help you?",
    });
    await loadChatMessages(sessionId);
    toast.success("Joined chat session");
  };

  const sendAdminMessage = async () => {
    if (!chatInput.trim() || !activeChatSession || isSendingChat) return;
    setIsSendingChat(true);
    const text = chatInput.trim();
    setChatInput("");
    await supabase.from("chat_messages").insert({
      session_id: activeChatSession,
      sender: "admin",
      content: text,
    });
    await loadChatMessages(activeChatSession);
    setIsSendingChat(false);
  };

  const closeChatSession = async (sessionId: string) => {
    await supabase.from("chat_sessions").update({
      status: "ai",
      closed_at: new Date().toISOString(),
    }).eq("id", sessionId);
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      sender: "ai",
      content: "The support agent has closed this chat. AI support is now available. Is there anything else I can help you with?",
    });
    setActiveChatSession(null);
    setChatMessages([]);
    loadChatSessions();
    toast.success("Chat closed — AI support restored");
  };

  const loadAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const data = await getAnalytics(analyticsDays);
      setAnalyticsData(data);
    } catch { toast.error("Failed to load analytics"); }
    finally { setIsLoadingAnalytics(false); }
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.price, 0);
  const successOrders = orders.filter((o) => o.state === 2).length;
  const pendingOrders = orders.filter((o) => o.state === 1).length;

  const sidebarItems: { key: AdminSection; icon: typeof BarChart3; label: string; badge?: number }[] = [
    { key: "dashboard", icon: BarChart3, label: "Dashboard" },
    { key: "orders", icon: Package, label: "Orders" },
    { key: "livechat", icon: MessageSquare, label: "Live Chat", badge: chatSessions.filter(s => s.status === "waiting").length },
    { key: "markup", icon: Percent, label: "Markup / Pricing" },
    { key: "sections", icon: Grid, label: "Home Sections" },
    { key: "roles", icon: UserPlus, label: "Roles & Invite" },
    { key: "categories", icon: Tag, label: "Game Categories" },
    { key: "analytics", icon: BarChart2, label: "Analytics" },
    { key: "api", icon: Zap, label: "API Status" },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#1a1a1a] border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white p-1"><ArrowLeft size={18} /></button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-yellow-400 rounded-lg flex items-center justify-center"><Shield size={14} className="text-black" /></div>
            <span className="font-black text-white text-sm">NoxyStore <span className="text-yellow-400">Admin</span></span>
          </div>
          <span className="text-gray-600 text-xs font-mono hidden lg:block">/secure-dashboard-92x2011</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            apiConnected === true ? "bg-green-900/50 text-green-400" : apiConnected === false ? "bg-red-900/50 text-red-400" : "bg-gray-800 text-gray-400"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${apiConnected === true ? "bg-green-400" : apiConnected === false ? "bg-red-400" : "bg-gray-400"}`} />
            {apiConnected === true ? "API Live" : apiConnected === false ? "API Offline" : "Checking..."}
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5">
            <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-black text-xs font-bold">
              {user?.nickname?.[0]?.toUpperCase()}
            </div>
            <span className="text-white text-xs font-medium hidden lg:block">{user?.nickname}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-56 bg-[#151515] border-r border-white/10 flex flex-col py-4 sticky top-14 h-[calc(100vh-56px)] hidden lg:flex">
          <nav className="space-y-1 px-3 flex-1">
            {sidebarItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  section === item.key
                    ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon size={17} />
                {item.label}
                {item.badge && item.badge > 0 ? (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{item.badge}</span>
                ) : null}
              </button>
            ))}
          </nav>
          <div className="px-3 pb-2 border-t border-white/10 pt-3 space-y-1">
            <button onClick={() => navigate("/")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-white hover:bg-white/5 transition-all">
              <Home size={17} /> Go to Store
            </button>
            <button onClick={() => { logout(); navigate("/"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-all">
              <LogOut size={17} /> Logout
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto">

          {/* ── DASHBOARD ── */}
          {section === "dashboard" && (
            <div className="space-y-6 max-w-5xl">
              <h1 className="text-2xl font-black text-white">Dashboard</h1>
              {/* Balance */}
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-black">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold opacity-70">Lootbar Reseller Balance</p>
                  <button onClick={fetchBalance} disabled={isLoadingBalance} className="bg-black/10 rounded-full p-1.5 hover:bg-black/20">
                    <RefreshCw size={14} className={isLoadingBalance ? "animate-spin" : ""} />
                  </button>
                </div>
                <p className="text-5xl font-black">${isLoadingBalance ? "—" : parseFloat(balance || "0").toFixed(2)}</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs opacity-60">Markup: {markup}%</p>
                  <span className="bg-black/10 rounded-full px-2.5 py-0.5 text-xs font-semibold">USD</span>
                </div>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: DollarSign, label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
                  { icon: Package, label: "Total Orders", value: String(orders.length), color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
                  { icon: TrendingUp, label: "Successful", value: String(successOrders), color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
                  { icon: Activity, label: "Pending", value: String(pendingOrders), color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
                ].map((s) => (
                  <div key={s.label} className={`bg-[#1a1a1a] border ${s.border} rounded-2xl p-5`}>
                    <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                      <s.icon size={20} className={s.color} />
                    </div>
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Recent orders */}
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white">Recent Orders</h3>
                  <button onClick={() => setSection("orders")} className="text-xs text-yellow-400">View All</button>
                </div>
                {orders.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 6).map((order) => {
                      const si = ORDER_STATE_MAP[order.state] || ORDER_STATE_MAP[1];
                      return (
                        <div key={order.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                          <div>
                            <p className="text-sm font-semibold text-white">{order.game_name}</p>
                            <p className="text-xs text-gray-500 font-mono">{order.reference_id || order.order_id}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${si.color} ${si.bg}`}>{si.label}</span>
                            <p className="text-sm font-bold text-white">${order.price.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MARKUP ── */}
          {section === "markup" && (
            <div className="space-y-6 max-w-2xl">
              <h1 className="text-2xl font-black text-white">Markup & Pricing</h1>

              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-2">Global Price Markup</h3>
                <p className="text-sm text-gray-400 mb-4">All Lootbar prices will be multiplied by (1 + markup%). Customer sees marked-up price. Profit is tracked per order.</p>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Markup Percentage (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={markupInput}
                        onChange={(e) => setMarkupInput(e.target.value)}
                        className="w-32 bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-3 text-lg font-bold outline-none focus:border-yellow-400"
                      />
                      <span className="text-white text-2xl font-bold">%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Example: $10.00 base price</p>
                    <p className="text-lg font-bold text-yellow-400">${(10 * (1 + parseFloat(markupInput || "0") / 100)).toFixed(2)} customer price</p>
                    <p className="text-xs text-green-400">+${(10 * parseFloat(markupInput || "0") / 100).toFixed(2)} profit</p>
                  </div>
                </div>

                <button
                  onClick={saveMarkup}
                  disabled={isSavingMarkup}
                  className="flex items-center gap-2 bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-300 transition-colors"
                >
                  {isSavingMarkup ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Markup
                </button>
              </div>

              {/* Profit summary */}
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4">Profit Tracking</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, color: "text-yellow-400" },
                    { label: "Est. Base Cost", value: `$${(totalRevenue / (1 + markup / 100)).toFixed(2)}`, color: "text-gray-300" },
                    { label: "Est. Profit", value: `$${(totalRevenue - totalRevenue / (1 + markup / 100)).toFixed(2)}`, color: "text-green-400" },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/5 rounded-xl p-4 text-center">
                      <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── HOME SECTIONS ── */}
          {section === "sections" && (
            <div className="space-y-6 max-w-3xl">
              <h1 className="text-2xl font-black text-white">Home Sections</h1>
              <p className="text-gray-400 text-sm">Configure which games appear in each home page section. Games assigned to a section only appear there.</p>

              {/* Create section */}
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                <h3 className="font-bold text-white mb-3">Create New Section</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Section name (e.g. Featured Games)"
                    className="flex-1 bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400"
                  />
                  <button onClick={createSection} className="bg-yellow-400 text-black font-bold px-5 py-3 rounded-xl hover:bg-yellow-300 flex items-center gap-2">
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>

              {/* Sections list */}
              {homeSections.map((sec) => (
                <div key={sec.id} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white">{sec.section_name}</h3>
                      <p className="text-xs text-gray-500 font-mono">key: {sec.section_key}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => supabase.from("home_sections").update({ is_active: !sec.is_active }).eq("id", sec.id).then(loadSections)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${sec.is_active ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-500"}`}
                      >
                        {sec.is_active ? "Active" : "Inactive"}
                      </button>
                      <button onClick={() => setEditingSection(editingSection?.id === sec.id ? null : sec)} className="p-2 text-gray-400 hover:text-white">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => deleteSection(sec.id)} className="p-2 text-red-500 hover:text-red-400">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-3">{sec.game_ids.length} games assigned</p>

                  {editingSection?.id === sec.id && (
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-sm font-semibold text-gray-300 mb-3">Select games for this section:</p>
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {MOCK_GAMES.map((game) => {
                          const isIn = editingSection.game_ids.includes(game.game_id);
                          return (
                            <button
                              key={game.game_id}
                              onClick={() => {
                                const newIds = isIn
                                  ? editingSection.game_ids.filter((id) => id !== game.game_id)
                                  : [...editingSection.game_ids, game.game_id];
                                setEditingSection({ ...editingSection, game_ids: newIds });
                              }}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-sm transition-all ${
                                isIn ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-300" : "border-white/10 text-gray-400 hover:border-white/20"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${isIn ? "bg-yellow-400" : "bg-white/10"}`}>
                                {isIn && <Check size={10} className="text-black" />}
                              </div>
                              <span className="truncate">{game.game_name}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button onClick={() => saveSection(editingSection)} className="bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-300 flex items-center gap-2 text-sm">
                          <Save size={14} /> Save Section
                        </button>
                        <button onClick={() => setEditingSection(null)} className="bg-white/10 text-white font-semibold px-5 py-2.5 rounded-xl text-sm">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── ROLES ── */}
          {section === "roles" && (
            <div className="space-y-6 max-w-3xl">
              <h1 className="text-2xl font-black text-white">Roles & Invite</h1>
              <p className="text-gray-400 text-sm">Invite users by email and assign roles. Roles take effect on next login.</p>

              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                <h3 className="font-bold text-white mb-4">Invite User</h3>
                <div className="flex gap-3 flex-wrap">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@email.com"
                    className="flex-1 min-w-48 bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={inviteUser}
                    disabled={isInviting}
                    className="bg-yellow-400 text-black font-bold px-5 py-3 rounded-xl hover:bg-yellow-300 flex items-center gap-2"
                  >
                    {isInviting ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    Invite
                  </button>
                </div>
              </div>

              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="font-bold text-white">User Roles ({roles.length})</h3>
                </div>
                {roles.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">No users invited yet</p>
                ) : (
                  <div className="divide-y divide-white/5">
                    {roles.map((role) => (
                      <div key={role.id} className="px-5 py-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{role.email}</p>
                          <p className="text-xs text-gray-500">{new Date(role.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={role.role}
                            onChange={(e) => updateRole(role.id, e.target.value)}
                            className="bg-[#0f0f0f] border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => toggleRoleActive(role.id, role.is_active)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${role.is_active ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}
                          >
                            {role.is_active ? "Active" : "Locked"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CATEGORIES ── */}
          {section === "categories" && (
            <div className="space-y-6 max-w-3xl">
              <h1 className="text-2xl font-black text-white">Game Categories</h1>
              <p className="text-gray-400 text-sm">Override the default category for each game. Changes affect filtering and home sections.</p>

              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="divide-y divide-white/5">
                  {MOCK_GAMES.map((game) => (
                    <div key={game.game_id} className="px-5 py-4 flex items-center gap-4">
                      <img
                        src={game.game_image}
                        alt={game.game_name}
                        className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=40&h=40&fit=crop"; }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{game.game_name}</p>
                        <p className="text-xs text-gray-500">ID: {game.game_id} | Default: {game.category}</p>
                      </div>
                      <select
                        value={gameOverrides[game.game_id] || game.category || "Top Up"}
                        onChange={(e) => saveGameOverride(game.game_id, e.target.value)}
                        className="bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400"
                      >
                        {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {section === "analytics" && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-white">Analytics</h1>
                <div className="flex items-center gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setAnalyticsDays(d)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-semibold ${analyticsDays === d ? "bg-yellow-400 text-black" : "bg-white/10 text-gray-300"}`}
                    >
                      {d}d
                    </button>
                  ))}
                  <button onClick={loadAnalytics} disabled={isLoadingAnalytics} className="p-2 text-gray-400 hover:text-white">
                    <RefreshCw size={16} className={isLoadingAnalytics ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {isLoadingAnalytics ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-[#1a1a1a] rounded-2xl h-32 animate-pulse" />)}
                </div>
              ) : analyticsData ? (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { icon: Eye, label: "Total Visits", value: String(analyticsData.totalVisits), color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
                      { icon: Users, label: "Unique Sessions", value: String(analyticsData.uniqueSessions), color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
                      { icon: Monitor, label: "Desktop", value: String(analyticsData.deviceCounts.desktop || 0), color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
                      { icon: Smartphone, label: "Mobile", value: String(analyticsData.deviceCounts.mobile || 0), color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
                    ].map((s) => (
                      <div key={s.label} className={`bg-[#1a1a1a] border ${s.border} rounded-2xl p-5`}>
                        <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                          <s.icon size={20} className={s.color} />
                        </div>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Daily chart */}
                  {analyticsData.dailyData.length > 0 && (
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                      <h3 className="font-bold text-white mb-4">Daily Visits (Last {analyticsDays} days)</h3>
                      <div className="flex items-end gap-1 h-32">
                        {analyticsData.dailyData.map((d) => {
                          const maxCount = Math.max(...analyticsData.dailyData.map((x) => x.count), 1);
                          const height = (d.count / maxCount) * 100;
                          return (
                            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full bg-yellow-400/20 rounded-t relative" style={{ height: `${height}%` }}>
                                <div className="absolute inset-0 bg-yellow-400 rounded-t opacity-80" />
                              </div>
                              <span className="text-[9px] text-gray-600 truncate w-full text-center">{d.date.slice(5)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Top pages */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                      <h3 className="font-bold text-white mb-4">Top Pages</h3>
                      <div className="space-y-2">
                        {analyticsData.topPages.slice(0, 8).map((p) => (
                          <div key={p.page} className="flex items-center justify-between">
                            <span className="text-sm text-gray-300 font-mono truncate flex-1">{p.page || "/"}</span>
                            <span className="text-sm font-bold text-yellow-400 ml-3">{p.count}</span>
                          </div>
                        ))}
                        {analyticsData.topPages.length === 0 && <p className="text-gray-500 text-sm">No page data yet</p>}
                      </div>
                    </div>

                    {/* Top games */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                      <h3 className="font-bold text-white mb-4">Top Viewed Games</h3>
                      <div className="space-y-2">
                        {analyticsData.topGames.slice(0, 8).map((g) => {
                          const game = MOCK_GAMES.find((m) => m.game_id === g.gameId);
                          return (
                            <div key={g.gameId} className="flex items-center justify-between">
                              <span className="text-sm text-gray-300 truncate flex-1">{game?.game_name || g.gameId}</span>
                              <span className="text-sm font-bold text-yellow-400 ml-3">{g.count} views</span>
                            </div>
                          );
                        })}
                        {analyticsData.topGames.length === 0 && <p className="text-gray-500 text-sm">No game view data yet</p>}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-12 text-center">
                  <BarChart2 size={48} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Click refresh to load analytics data</p>
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS ── */}
          {section === "orders" && (
            <div className="space-y-4 max-w-5xl">
              <h1 className="text-2xl font-black text-white">All Orders</h1>
              {orders.length === 0 ? (
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-12 text-center">
                  <Package size={48} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No orders yet</p>
                </div>
              ) : (
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10">
                      <tr className="text-gray-500 text-xs uppercase tracking-wide">
                        {["Game", "SKU", "Price", "Status", "Date"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {orders.map((order) => {
                        const si = ORDER_STATE_MAP[order.state] || ORDER_STATE_MAP[1];
                        return (
                          <tr key={order.id} className="hover:bg-white/3 transition-colors">
                            <td className="px-4 py-3 font-semibold text-white">{order.game_name}</td>
                            <td className="px-4 py-3 text-gray-400">{order.sku_name}</td>
                            <td className="px-4 py-3 font-bold text-yellow-400">${order.price.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${si.color} ${si.bg}`}>{si.label}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{new Date(order.created_at).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── LIVE CHAT ── */}
          {section === "livechat" && (
            <div className="space-y-4 max-w-5xl">
              <h1 className="text-2xl font-black text-white">Live Chat Management</h1>
              <p className="text-gray-400 text-sm">Manage user support sessions. Join a session to chat directly — AI is disabled while you're active. Close when done to restore AI.</p>

              <div className="flex gap-4">
                {/* Session list */}
                <div className="w-72 flex-shrink-0 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-white text-sm">Sessions</h3>
                    <button onClick={loadChatSessions} className="text-gray-400 hover:text-white"><RefreshCw size={14} /></button>
                  </div>
                  {chatSessions.length === 0 ? (
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 text-center">
                      <MessageSquare size={24} className="text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500 text-xs">No active sessions</p>
                    </div>
                  ) : (
                    chatSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => {
                          setSection("livechat");
                          if (activeChatSession !== session.id) joinChatSession(session.id);
                          else setActiveChatSession(session.id);
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          activeChatSession === session.id
                            ? "border-yellow-400/50 bg-yellow-400/10"
                            : session.status === "waiting"
                            ? "border-orange-400/50 bg-orange-400/5"
                            : "border-white/10 bg-[#1a1a1a]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white truncate">{session.user_email || "Guest"}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            session.status === "waiting" ? "bg-orange-500/30 text-orange-400" :
                            session.status === "live" ? "bg-green-500/30 text-green-400" :
                            "bg-gray-500/30 text-gray-400"
                          }`}>
                            {session.status === "waiting" ? "WAITING" : session.status === "live" ? "LIVE" : "AI"}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500">{session.id.slice(0, 20)}...</p>
                        <p className="text-[10px] text-gray-600 mt-1">{new Date(session.updated_at).toLocaleTimeString()}</p>
                      </button>
                    ))
                  )}
                </div>

                {/* Chat panel */}
                {activeChatSession ? (
                  <div className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-2xl flex flex-col" style={{ height: "600px" }}>
                    {/* Chat header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {chatSessions.find(s => s.id === activeChatSession)?.user_email || "Unknown User"}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono">{activeChatSession}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => closeChatSession(activeChatSession)}
                          className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl px-3 py-1.5 text-xs font-semibold hover:bg-red-500/30 transition-colors"
                        >
                          Close Chat
                        </button>
                        <button onClick={() => { setActiveChatSession(null); setChatMessages([]); }} className="text-gray-500 hover:text-white">
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                            msg.sender === "admin"
                              ? "bg-yellow-400 text-black"
                              : msg.sender === "ai"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-white/10 text-white"
                          }`}>
                            {msg.image_url ? (
                              <img src={msg.image_url} alt="attachment" className="rounded-xl max-w-full" />
                            ) : (
                              msg.content
                            )}
                            <p className={`text-[10px] mt-1 ${
                              msg.sender === "admin" ? "text-black/50" : "text-gray-500"
                            }`}>
                              {msg.sender === "admin" ? "You" : msg.sender === "ai" ? "AI" : "User"} · {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Input */}
                    <div className="px-4 py-3 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendAdminMessage())}
                          placeholder="Type a reply..."
                          className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 placeholder-gray-600"
                        />
                        <button
                          onClick={sendAdminMessage}
                          disabled={!chatInput.trim() || isSendingChat}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            chatInput.trim() ? "bg-yellow-400 hover:bg-yellow-300" : "bg-white/10"
                          }`}
                        >
                          <Send size={16} className={chatInput.trim() ? "text-black" : "text-gray-600"} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-2xl flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare size={48} className="text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-500 font-semibold">Select a session to chat</p>
                      <p className="text-gray-600 text-xs mt-1">Click a session from the left to join</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── API STATUS ── */}
          {section === "api" && (
            <div className="space-y-6 max-w-3xl">
              <h1 className="text-2xl font-black text-white">API Status</h1>
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4">Lootbar API Connection</h3>
                <div className="space-y-4">
                  {[
                    { label: "Base URL", value: "https://api.lootbar.gg", status: true },
                    { label: "Backend Proxy", value: "Edge Function: lootbar-proxy", status: apiConnected !== false },
                    { label: "Token Storage", value: "Supabase DB (lootbar_tokens)", status: true },
                    { label: "Webhook URL", value: "Edge Function: lootbar-notify", status: true },
                    { label: "Auth Method", value: "Authorization: PS {token}", status: true },
                    { label: "Auto-Refresh", value: "Refreshes 5 min before expiry", status: true },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">{item.value}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${item.status ? "bg-green-400" : "bg-red-400"}`} />
                        <span className={`text-xs font-semibold ${item.status ? "text-green-400" : "text-red-400"}`}>{item.status ? "OK" : "Error"}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex gap-3">
                  <button onClick={checkApiStatus} className="flex items-center gap-2 bg-yellow-400 text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-yellow-300">
                    <Zap size={14} /> Re-check API
                  </button>
                  <button onClick={fetchBalance} className="flex items-center gap-2 bg-white/10 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-white/15">
                    <RefreshCw size={14} /> Refresh Balance
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
