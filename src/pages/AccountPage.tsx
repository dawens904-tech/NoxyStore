import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings, Globe, HelpCircle, MessageSquare, MessageCircle, Gift, DollarSign, User,
  ChevronRight, LogOut, LayoutDashboard, Package, Wallet, Tag, Users, Camera, ShoppingBag, Key, X, Loader2
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { Header } from "@/components/layout/Header";
import { AgeRangeModal } from "@/components/features/AgeRangeModal";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTranslation } from "@/hooks/useTranslation";
import { ORDER_STATE_MAP } from "@/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type AccountTab = "overview" | "orders" | "profile" | "activity";
type DesktopSection = "buyHistory" | "coupon" | "settings" | "helpCenter" | "feedback" | "invite" | "earn";

// ─── Birthday Picker Modal ────────────────────────────────────────────────────
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

function BirthdayModal({ onClose, onSave, current }: { onClose: () => void; onSave: (val: string) => void; current: string }) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(current ? parseInt(current.split("-")[0]) - 1 : today.getMonth());
  const [selectedDay, setSelectedDay] = useState(current ? parseInt(current.split("-")[1]) : today.getDate());
  const daysInMonth = new Date(today.getFullYear(), selectedMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <button onClick={onClose}><X size={22} className="text-gray-700" /></button>
          <h2 className="font-bold text-gray-900">Birthday</h2>
          <div className="w-8" />
        </div>
        <div className="flex gap-0 h-52 overflow-hidden relative">
          {/* Center highlight */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-12 bg-gray-100 z-0 pointer-events-none" />
          {/* Month column */}
          <div className="flex-1 overflow-y-auto scrollbar-hide snap-y snap-mandatory" style={{ scrollSnapType: "y mandatory" }}>
            {MONTHS.map((m, i) => (
              <div
                key={m}
                onClick={() => setSelectedMonth(i)}
                className={`h-12 flex items-center justify-center cursor-pointer snap-center transition-all ${
                  i === selectedMonth ? "text-gray-900 font-bold text-base" : "text-gray-400 text-sm"
                }`}
              >
                {m}
              </div>
            ))}
          </div>
          {/* Day column */}
          <div className="w-24 overflow-y-auto scrollbar-hide snap-y snap-mandatory" style={{ scrollSnapType: "y mandatory" }}>
            {days.map((d) => (
              <div
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`h-12 flex items-center justify-center cursor-pointer snap-center transition-all ${
                  d === selectedDay ? "text-gray-900 font-bold text-base" : "text-gray-400 text-sm"
                }`}
              >
                {d}
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-5">
          <button
            onClick={() => onSave(`${String(selectedMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`)}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 rounded-2xl"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bind Email Modal ─────────────────────────────────────────────────────────
function BindEmailModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleSend = async () => {
    if (!email.trim()) { toast.error("Enter your email"); return; }
    setIsSending(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
    setIsSending(false);
    if (error) { toast.error(error.message); return; }
    setStep("otp");
    setCountdown(60);
    toast.success("Verification code sent!");
  };

  const handleVerify = async () => {
    if (!otp.trim()) { toast.error("Enter the code"); return; }
    setIsVerifying(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: "email" });
    setIsVerifying(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Email linked successfully!");
    onSuccess(email.trim());
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <button onClick={onClose}><X size={20} className="text-gray-700" /></button>
        <h2 className="font-bold text-gray-900 flex-1 text-center">Binding Email</h2>
        <div className="w-8" />
      </div>

      <div className="flex-1 px-4 py-6 space-y-4 bg-gray-50">
        <p className="text-sm text-gray-700 font-medium">Please enter your email</p>

        <div className="bg-white rounded-xl px-4 py-3.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your Email"
            className="w-full bg-transparent text-sm text-gray-800 outline-none"
            disabled={step === "otp"}
          />
        </div>

        {step === "otp" && (
          <div className="bg-white rounded-xl px-4 py-3.5 flex items-center justify-between">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Verification code"
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none"
              maxLength={6}
            />
            <button
              onClick={handleSend}
              disabled={countdown > 0}
              className={`text-sm font-semibold ${countdown > 0 ? "text-gray-400" : "text-yellow-600"}`}
            >
              {countdown > 0 ? `${countdown}s` : "Send"}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 leading-relaxed">
          Please verify your Email address before trading, we'll send you trade related messages and other important notifications via Email.
        </p>
      </div>

      <div className="px-4 pb-8 pt-4">
        <button
          onClick={step === "email" ? handleSend : handleVerify}
          disabled={isSending || isVerifying}
          className={`w-full font-bold py-4 rounded-2xl transition-colors ${
            email.trim() ? "bg-yellow-400 hover:bg-yellow-300 text-black" : "bg-yellow-200 text-yellow-600"
          }`}
        >
          {(isSending || isVerifying) ? <Loader2 className="animate-spin mx-auto" size={20} /> : step === "email" ? "Send" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ─── Binding Email Prompt Modal ───────────────────────────────────────────────
function BindEmailPrompt({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
        <div className="flex items-start gap-3 mb-4">
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
          <h3 className="font-bold text-gray-900 text-lg leading-tight flex-1">Binding Email</h3>
        </div>
        <p className="text-gray-600 text-center text-sm mb-6">
          For your account security, please bind your email address first and then set your login password.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-2xl py-3 font-semibold text-gray-700">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-yellow-400 rounded-2xl py-3 font-bold text-black">Confirm</button>
        </div>
      </div>
    </div>
  );
}

export function AccountPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, orders } = useAuthStore();
  const { t } = useTranslation();
  const { currency, language } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<AccountTab>("overview");
  const [desktopSection, setDesktopSection] = useState<DesktopSection>("settings");
  const [showAgeRange, setShowAgeRange] = useState(false);
  const [ageRange, setAgeRange] = useState("");
  const [showBirthday, setShowBirthday] = useState(false);
  const [birthday, setBirthday] = useState("");
  const [showBindEmail, setShowBindEmail] = useState(false);
  const [showBindEmailPrompt, setShowBindEmailPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<"password" | "passkey" | null>(null);

  // Detect if user has email (email auth) or only OAuth (no email)
  const hasEmail = !!(user?.email && user.email.includes("@"));
  // If user logged in via OAuth, email might be present but password might not be set
  // We check user_metadata to see if they have a password set
  const [hasPassword, setHasPassword] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const identities = data.user.identities || [];
        const hasEmailIdentity = identities.some(id => id.provider === "email");
        setHasPassword(hasEmailIdentity && !!(data.user.user_metadata?.username));
      }
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handlePasswordAction = () => {
    if (!hasEmail) {
      setShowBindEmailPrompt(true);
      setPendingAction("password");
    } else {
      navigate("/login");
    }
  };

  const handlePasskeyAction = () => {
    if (!hasEmail) {
      setShowBindEmailPrompt(true);
      setPendingAction("passkey");
    } else {
      navigate("/passkeys");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f8f8]">
        <div className="hidden lg:block"><DesktopHeader /></div>
        <div className="lg:hidden"><Header showMenu /></div>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <User size={40} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg mb-6">{t("login")} to view your account</p>
          <button onClick={() => navigate("/login")} className="btn-primary px-12">{t("loginSignup")}</button>
        </div>
        <div className="lg:hidden"><BottomNav /></div>
      </div>
    );
  }

  // Settings rows for desktop
  const settingsRows = [
    {
      label: "Avatar",
      value: null,
      render: () => (
        <div className="relative group cursor-pointer ml-auto mr-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
            {user?.nickname?.[0]?.toUpperCase()}
          </div>
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={14} className="text-white" />
          </div>
        </div>
      ),
    },
    { label: "Nickname", value: user?.nickname, action: "Modify" },
    {
      label: "Birthday",
      value: birthday || "Fill in birthday info, don't miss the surprise",
      valueClass: birthday ? "text-gray-800" : "text-gray-400 text-sm",
      action: "Set",
      onAction: () => setShowBirthday(true),
    },
    {
      label: "Age Range",
      value: ageRange || (
        <span className="text-sm text-gray-400">You need to set your age in accordance with NoxyStore's User Agreement.</span>
      ),
      action: ageRange ? "Change" : "Set",
      onAction: () => setShowAgeRange(true),
    },
    {
      label: "Email",
      value: hasEmail ? user?.email?.replace(/(.{3}).*(@)/, "$1***$2") : null,
      action: hasEmail ? null : "Connect",
      onAction: hasEmail ? undefined : () => setShowBindEmail(true),
      valuePlaceholder: hasEmail ? undefined : "Connect",
    },
    {
      label: "Password",
      value: hasPassword ? "already set" : null,
      action: hasPassword ? "Change" : "Go to set up",
      onAction: handlePasswordAction,
    },
    {
      label: "Passkey",
      value: null,
      action: "Manage",
      onAction: handlePasskeyAction,
    },
  ];

  // ─── Desktop Layout ───────────────────────────────────────────────────────
  const DesktopAccountContent = () => (
    <div className="hidden lg:block min-h-screen bg-[#f5f5f5]">
      <DesktopHeader />
      <div className="max-w-[1280px] mx-auto px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Home</button>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium">{t("settings")}</span>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 pb-12">
        <div className="flex gap-6">
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                    {user?.nickname?.[0]?.toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                    <span className="text-black text-[8px] font-bold">V1</span>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{user?.nickname}</p>
                  <button className="text-xs text-yellow-600 font-medium flex items-center gap-1">
                    Check VIP Benefits <ChevronRight size={12} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 py-3 border-y border-gray-100">
                <button onClick={() => navigate("/balance")} className="hover:opacity-80 transition-opacity">
                  <p className="text-lg font-bold text-gray-900">${user?.balance?.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{t("balance")}</p>
                </button>
                <div className="h-8 w-px bg-gray-200" />
                <div>
                  <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
                    <span className="text-yellow-500">●</span> {user?.points ?? 39}
                  </p>
                  <p className="text-xs text-gray-500">{t("points")}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {[
                { key: "buyHistory" as DesktopSection, icon: ShoppingBag, label: t("buyHistory") },
                { key: "coupon" as DesktopSection, icon: Tag, label: t("coupons"), badge: "1397", path: "/coupons" },
                { key: "settings" as DesktopSection, icon: Settings, label: t("settings") },
                { key: "helpCenter" as DesktopSection, icon: HelpCircle, label: t("helpCenter") },
                { key: "feedback" as DesktopSection, icon: MessageSquare, label: "Feedback" },
                { key: "invite" as DesktopSection, icon: Gift, label: t("inviteForCoupons"), dot: true, path: "/invite" },
                { key: "earn" as DesktopSection, icon: DollarSign, label: t("affiliateProgram"), highlight: true, path: "/invite" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    if (item.key === "feedback") { navigate("/feedback"); return; }
                    if (item.key === "helpCenter") { navigate("/support"); return; }
                    if ((item as any).path) { navigate((item as any).path); return; }
                    setDesktopSection(item.key);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${
                    desktopSection === item.key ? "bg-yellow-50 text-yellow-700 border-l-4 border-l-yellow-400" : item.highlight ? "text-yellow-500 hover:bg-yellow-50" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={18} className={item.highlight ? "text-yellow-500" : "text-gray-400"} />
                    {item.label}
                  </span>
                  <span className="flex items-center gap-2">
                    {(item as any).badge && <span className="text-gray-500 text-xs">{(item as any).badge}</span>}
                    {(item as any).dot && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm p-8">
              {desktopSection === "settings" && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{t("accountInfo")}</h2>
                  <div className="space-y-0">
                    {settingsRows.map((row) => (
                      <div key={row.label} className="flex items-center gap-6 py-4 border-b border-gray-100 last:border-0">
                        <span className="w-36 text-sm text-gray-500 flex-shrink-0">{row.label}</span>
                        <div className="flex-1">
                          {row.render ? row.render() : (
                            <p className={`text-sm ${(row as any).valueClass || "text-gray-800"}`}>
                              {typeof row.value === "string" ? row.value : row.value}
                            </p>
                          )}
                        </div>
                        {row.action && (
                          <button
                            onClick={(row as any).onAction}
                            className="text-sm text-gray-400 hover:text-gray-600 flex-shrink-0 flex items-center gap-1"
                          >
                            {row.action}
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {desktopSection === "buyHistory" && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{t("buyHistory")}</h2>
                  {orders.length === 0 ? (
                    <div className="text-center py-16">
                      <Package size={48} className="text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-500">{t("noOrdersYet")}</p>
                      <button onClick={() => navigate("/")} className="btn-primary mt-4 px-8">{t("browseGames")}</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => {
                        const stateInfo = ORDER_STATE_MAP[order.state] || ORDER_STATE_MAP[1];
                        return (
                          <div key={order.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{order.game_name}</p>
                              <p className="text-sm text-gray-500">{order.sku_name}</p>
                              <p className="text-xs text-gray-400 font-mono mt-1">{order.order_id}</p>
                            </div>
                            <span className={`tag-badge ${stateInfo.color} ${stateInfo.bg}`}>{stateInfo.label}</span>
                            <p className="font-bold text-gray-900">${order.price.toFixed(2)}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {(desktopSection === "coupon" || desktopSection === "invite" || desktopSection === "earn") && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">Coming Soon</p>
                  <p className="text-sm text-gray-400 mt-1">This feature is under development</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-4">
              {user?.role === "admin" && (
                <button
                  onClick={() => navigate("/secure-dashboard-92x2011")}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2"
                >
                  <LayoutDashboard size={18} />
                  {t("adminDashboard")}
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex-1 bg-white text-red-500 border border-red-200 rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:bg-red-50"
              >
                <LogOut size={18} />
                {t("logout")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Mobile Layout ────────────────────────────────────────────────────────
  const MobileAccountContent = () => (
    <div className="lg:hidden bg-[#f8f8f8] min-h-screen pb-20">
      <div className="px-4 pt-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t("myAccount")}</h1>

        <div className="grid grid-cols-4 mb-4">
          {(["overview", "orders", "profile", "activity"] as AccountTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 text-sm font-semibold capitalize transition-all border-b-2 ${
                activeTab === tab ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t(tab as any)}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-3xl p-5 text-white relative overflow-hidden">
              <div className="flex items-center gap-3 mb-5 mt-1">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                  {user?.nickname?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{user?.nickname}</h2>
                  <p className="text-white/70 text-sm">ID: {user?.id?.slice(-12)}</p>
                  <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1 inline-block">
                    {user?.role === "admin" ? "Admin" : "Member"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: t("balance"), value: `$${user?.balance?.toFixed(2)}`, path: "/balance" },
                  { label: t("points"), value: user?.points ?? 0, path: null },
                  { label: t("coupons"), value: user?.coupons ?? 0, path: null },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => (item as any).path && navigate((item as any).path)}
                    className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center hover:bg-white/25 transition-colors"
                  >
                    <p className="text-lg font-bold">{item.value}</p>
                    <p className="text-white/70 text-xs">{item.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Package, label: t("orders"), value: `${orders.length} orders`, path: null },
                { icon: Wallet, label: t("balance"), value: `$${user?.balance?.toFixed(2)}`, path: "/balance" },
                { icon: Key, label: "Passkeys", value: "Manage passkeys", path: hasEmail ? "/passkeys" : null, onTap: !hasEmail ? handlePasskeyAction : undefined },
                { icon: Users, label: "Referrals", value: "Earn 10%", path: null },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if ((item as any).onTap) { (item as any).onTap(); return; }
                    item.path && navigate(item.path);
                  }}
                  className="bg-white rounded-2xl p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-all text-left"
                >
                  <item.icon size={22} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.value}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {[
                { icon: Settings, label: t("settings"), path: null },
                { icon: Globe, label: t("languageAndCurrency"), sub: `${language.toUpperCase()} / ${currency}`, path: null },
                { icon: HelpCircle, label: t("helpCenter"), path: "/support" },
                { icon: MessageCircle, label: "Live Chat Support", sub: "Get instant help", highlight: true, path: "/support/vip" },
                { icon: MessageSquare, label: "Feedback", sub: "Report issues or suggestions", path: "/feedback" },
                { icon: Gift, label: t("inviteForCoupons"), sub: "Unlock rich coupon rewards", highlight2: true, path: "/invite" },
                { icon: DollarSign, label: t("affiliateProgram"), sub: "Earn up to 10% money", highlight2: true, path: "/invite" },
                { icon: User, label: t("aboutUs"), path: "/about" },
              ].map((item, idx) => (
                <button
                  key={item.label}
                  onClick={() => (item as any).path && navigate((item as any).path)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 text-left ${idx < 7 ? "border-b border-gray-100" : ""}`}
                >
                  <item.icon size={20} className="text-gray-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    {(item as any).sub && (
                      <p className={`text-xs mt-0.5 ${(item as any).highlight ? "text-blue-500" : (item as any).highlight2 ? "text-orange-500" : "text-gray-400"}`}>
                        {(item as any).sub}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>

            {user?.role === "admin" && (
              <button
                onClick={() => navigate("/secure-dashboard-92x2011")}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 shadow-md"
              >
                <LayoutDashboard size={18} />
                {t("adminDashboard")}
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full py-4 text-red-500 font-bold flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              {t("logout")}
            </button>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-16">
                <Package size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">{t("noOrdersYet")}</p>
                <button onClick={() => navigate("/")} className="btn-primary mt-6 px-8">{t("browseGames")}</button>
              </div>
            ) : (
              orders.map((order) => {
                const stateInfo = ORDER_STATE_MAP[order.state] || ORDER_STATE_MAP[1];
                return (
                  <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{order.game_name}</h3>
                        <p className="text-xs text-gray-500">{order.sku_name}</p>
                      </div>
                      <span className={`tag-badge ${stateInfo.color} ${stateInfo.bg}`}>{stateInfo.label}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 font-mono">{order.order_id}</p>
                      <p className="font-bold text-gray-900">${order.price.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                  {user?.nickname?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{user?.nickname}</h2>
                  <p className="text-sm text-gray-500">{user?.email || "No email linked"}</p>
                </div>
              </div>

              {/* Account info rows */}
              <div className="space-y-0">
                <div className="flex justify-between items-center py-3.5 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Nickname</span>
                  <span className="text-sm font-semibold text-gray-800">{user?.nickname}</span>
                </div>

                <div className="flex justify-between items-center py-3.5 border-b border-gray-100">
                  <div>
                    <span className="text-sm font-medium text-gray-800">Birthday</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {birthday || "Fill in birthday info, don't miss the surprise"}
                    </p>
                  </div>
                  <button onClick={() => setShowBirthday(true)} className="text-xs text-gray-400 flex items-center gap-1">Set <ChevronRight size={14} /></button>
                </div>

                <div className="py-3.5 border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-medium text-gray-800">Age Range</span>
                      {!ageRange && (
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed max-w-[200px]">
                          You need to set your age in accordance with NoxyStore's User Agreement.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {ageRange && <span className="text-sm font-semibold text-gray-800">{ageRange}</span>}
                      <button onClick={() => setShowAgeRange(true)} className="text-xs text-gray-400 flex items-center gap-1">
                        {ageRange ? "Change" : "Set"} <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center py-3.5 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-800">Email</span>
                  {hasEmail ? (
                    <span className="text-sm text-gray-500">{user?.email?.replace(/(.{3}).*(@)/, "$1***$2")}</span>
                  ) : (
                    <button onClick={() => setShowBindEmail(true)} className="text-sm text-gray-400 flex items-center gap-1">
                      Connect <ChevronRight size={14} />
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center py-3.5 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-800">Password</span>
                  {hasPassword ? (
                    <span className="text-sm text-gray-500">already set</span>
                  ) : (
                    <button onClick={handlePasswordAction} className="text-sm text-gray-400 flex items-center gap-1">
                      Go to set up <ChevronRight size={14} />
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center py-3.5">
                  <span className="text-sm font-medium text-gray-800">Passkey</span>
                  <button onClick={handlePasskeyAction} className="text-sm text-gray-400 flex items-center gap-1">
                    {hasEmail ? "Manage" : "Add a Passkey"} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => navigate("/balance")} className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet size={20} className="text-gray-500" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm">Balance</p>
                  <p className="text-xs text-gray-400">${user?.balance?.toFixed(2)} available</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="text-center py-16">
            <Package size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Activity tracking coming soon</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );

  return (
    <>
      <DesktopAccountContent />
      <MobileAccountContent />

      {showAgeRange && (
        <AgeRangeModal
          onClose={() => setShowAgeRange(false)}
          onSave={(range) => { setAgeRange(range); setShowAgeRange(false); }}
        />
      )}

      {showBirthday && (
        <BirthdayModal
          current={birthday}
          onClose={() => setShowBirthday(false)}
          onSave={(val) => { setBirthday(val); setShowBirthday(false); toast.success("Birthday saved!"); }}
        />
      )}

      {showBindEmail && (
        <BindEmailModal
          onClose={() => setShowBindEmail(false)}
          onSuccess={(email) => {
            setShowBindEmail(false);
            if (pendingAction === "passkey") { navigate("/passkeys"); }
            else if (pendingAction === "password") { navigate("/login"); }
            setPendingAction(null);
          }}
        />
      )}

      {showBindEmailPrompt && (
        <BindEmailPrompt
          onClose={() => setShowBindEmailPrompt(false)}
          onConfirm={() => {
            setShowBindEmailPrompt(false);
            setShowBindEmail(true);
          }}
        />
      )}
    </>
  );
}
