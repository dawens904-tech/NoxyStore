import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings, Globe, HelpCircle, MessageSquare, MessageCircle, Gift, DollarSign, User,
  ChevronRight, LogOut, LayoutDashboard, Package, Wallet, Tag, Users, Camera, ShoppingBag,
  Key, X, Loader2, Check, ArrowLeft, ChevronDown, Plus, Star
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { Header } from "@/components/layout/Header";
import { AgeRangeModal } from "@/components/features/AgeRangeModal";
import { AccountSidebar } from "@/components/features/AccountSidebar";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTranslation } from "@/hooks/useTranslation";
import { ORDER_STATE_MAP } from "@/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import coupon10off from "@/assets/coupon-10off.png";
import coupon6off from "@/assets/coupon-6off.png";
import inviteReward from "@/assets/invite-reward.png";
import couponSave5 from "@/assets/coupon-save5.png";

// ── Metallic VIP Badge ────────────────────────────────────────────────────────
function VipBadgeMetallic({ level, size = 32 }: { level: number; size?: number }) {
  const cfgs: Record<number, { g1: string; g2: string; stroke: string; textFill: string }> = {
    1: { g1: "#e2e8f0", g2: "#94a3b8", stroke: "#64748b", textFill: "#1e293b" },
    2: { g1: "#fef08a", g2: "#f59e0b", stroke: "#d97706", textFill: "#78350f" },
    3: { g1: "#a7f3d0", g2: "#10b981", stroke: "#059669", textFill: "#064e3b" },
    4: { g1: "#ddd6fe", g2: "#8b5cf6", stroke: "#7c3aed", textFill: "#4c1d95" },
    5: { g1: "#fecaca", g2: "#dc2626", stroke: "#b91c1c", textFill: "#450a0a" },
  };
  const c = cfgs[level] || cfgs[1];
  const uid = `vbm${level}s${size}`;
  const w = size * 1.6;
  const h = size;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2={w} y2={h} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={c.g1} />
          <stop offset="100%" stopColor={c.g2} />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width={w - 1.5} height={h - 1.5} rx={h * 0.25} fill={`url(#${uid})`} stroke={c.stroke} strokeWidth="1.5" />
      <text x={w / 2} y={h * 0.68} textAnchor="middle" fill={c.textFill} fontWeight="900" fontSize={h * 0.5} fontFamily="system-ui,-apple-system,sans-serif">V{level}</text>
    </svg>
  );
}

type AccountTab = "overview" | "orders" | "profile" | "activity";
type DesktopSection = "buyHistory" | "coupon" | "settings" | "helpCenter" | "feedback" | "invite" | "earn";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
const CLASSIFICATIONS = ["Payment issues","Top-up not received","Wrong UID/Server","Refund request","Account security","Technical issue","Other"];

function daysUntil(dateStr: string) {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
}

// ─── Passkey Modal ────────────────────────────────────────────────────────────
function PasskeyModal({ onClose, onNavigate }: { onClose: () => void; onNavigate: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white w-full max-w-sm shadow-2xl overflow-hidden z-10" onClick={e => e.stopPropagation()}>
        <div className="absolute top-4 right-4">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full">
            <X size={18} className="text-gray-700" />
          </button>
        </div>
        <div className="px-8 pt-8 pb-3">
          <h2 className="text-xl font-black text-gray-900 mb-2">Create a Passkey</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-1">Create a Passkey for faster, safer login with Face ID, Fingerprint, or PIN.</p>
          <button className="text-sm text-blue-600 font-semibold flex items-center gap-1 hover:underline mb-5">
            Learn More <ChevronRight size={14} />
          </button>
        </div>
        <div className="px-8 pb-4 flex justify-center">
          <div className="relative w-56 h-40 flex items-center justify-center">
            <div className="w-20 h-24 border-4 border-gray-900 flex items-center justify-center bg-white shadow-lg relative z-10">
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"><User size={16} className="text-gray-600" /></div>
                <Key size={14} className="text-gray-700" />
              </div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-6 border-4 border-gray-900 border-b-0 rounded-t-full" />
            </div>
            <div className="absolute top-2 left-8 w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-14 h-14 bg-teal-100 border-2 border-teal-300 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-0.5">{[...Array(4)].map((_, i) => <div key={i} className="w-2 h-2 bg-teal-500" />)}</div>
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-14 h-14 bg-yellow-100 border-2 border-yellow-300 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-yellow-500 flex items-center justify-center"><div className="w-4 h-4 rounded-full border-2 border-yellow-500" /></div>
            </div>
            <div className="absolute bottom-0 right-4 w-12 h-12 bg-purple-100 border-2 border-purple-300 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-0.5">{[...Array(9)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-purple-400" />)}</div>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button onClick={onNavigate} className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 flex items-center justify-center gap-2">
            <User size={18} /> Create a Passkey
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── More Games section (conditional: 30s + search/buy) ──────────────────────
function MoreGamesSection() {
  const navigate = useNavigate();
  const [games, setGames] = useState<any[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const arrivedAt = (window as any).__arrivedAt || Date.now();
    if (!(window as any).__arrivedAt) (window as any).__arrivedAt = arrivedAt;
    const hasSearched = !!sessionStorage.getItem("has_searched");
    const hasBought = !!sessionStorage.getItem("has_bought");
    const timeSpent = Date.now() - arrivedAt;
    if (timeSpent >= 30000 || hasSearched || hasBought) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(true), Math.max(0, 30000 - timeSpent));
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    supabase.from("games_cache").select("*").limit(6).then(({ data }) => {
      if (data && data.length > 0) setGames(data);
    });
  }, [show]);

  if (!show || games.length === 0) return null;

  return (
    <div className="px-4 pb-6 mt-4">
      <h3 className="text-base font-bold text-gray-900 mb-3">More Games You Might Like</h3>
      <div className="grid grid-cols-3 gap-2">
        {games.slice(0, 6).map(g => (
          <button key={g.game_id} onClick={() => navigate(`/game/${g.game_id}`)} className="flex flex-col text-left">
            <div className="relative aspect-square overflow-hidden bg-gray-200 w-full">
              <img
                src={g.game_image || `https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop`}
                alt={g.game_name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop`; }}
              />
              {g.discount > 0 && (
                <div className="absolute top-1 left-1 bg-orange-500 text-white text-[9px] font-black px-1 py-0.5">-{g.discount}%</div>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-900 mt-1 leading-tight line-clamp-1">{g.game_name}</p>
            <p className="text-[10px] text-gray-400">{g.sold_count}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Birthday Picker Modal ────────────────────────────────────────────────────
function BirthdayModal({ onClose, onSave, current }: { onClose: () => void; onSave: (val: string) => void; current: string }) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(current ? parseInt(current.split("-")[0]) - 1 : today.getMonth());
  const [selectedDay, setSelectedDay] = useState(current ? parseInt(current.split("-")[1]) : today.getDate());
  const daysInMonth = new Date(today.getFullYear(), selectedMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <button onClick={onClose}><X size={22} className="text-gray-700" /></button>
          <h2 className="font-bold text-gray-900">Birthday</h2>
          <div className="w-8" />
        </div>
        <div className="flex gap-0 h-52 overflow-hidden relative">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-12 bg-gray-100 z-0 pointer-events-none" />
          <div className="flex-1 overflow-y-auto snap-y snap-mandatory" style={{ scrollSnapType: "y mandatory" }}>
            {MONTHS.map((m, i) => (
              <div key={m} onClick={() => setSelectedMonth(i)} className={`h-12 flex items-center justify-center cursor-pointer snap-center transition-all ${i === selectedMonth ? "text-gray-900 font-bold text-base" : "text-gray-400 text-sm"}`}>{m}</div>
            ))}
          </div>
          <div className="w-24 overflow-y-auto snap-y snap-mandatory" style={{ scrollSnapType: "y mandatory" }}>
            {days.map((d) => (
              <div key={d} onClick={() => setSelectedDay(d)} className={`h-12 flex items-center justify-center cursor-pointer snap-center transition-all ${d === selectedDay ? "text-gray-900 font-bold text-base" : "text-gray-400 text-sm"}`}>{d}</div>
            ))}
          </div>
        </div>
        <div className="px-4 py-5">
          <p className="text-xs text-gray-500 text-center mb-3">Birthday cannot be changed after saving</p>
          <button onClick={() => onSave(`${String(selectedMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`)} className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4">Confirm</button>
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
  useEffect(() => { if (countdown > 0) { const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); } }, [countdown]);
  const handleSend = async () => {
    if (!email.trim()) { toast.error("Enter your email"); return; }
    setIsSending(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
    setIsSending(false);
    if (error) { toast.error(error.message); return; }
    setStep("otp"); setCountdown(60); toast.success("Verification code sent!");
  };
  const handleVerify = async () => {
    if (!otp.trim()) { toast.error("Enter the code"); return; }
    setIsVerifying(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: "email" });
    setIsVerifying(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Email linked successfully!"); onSuccess(email.trim());
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
        <div className="bg-white px-4 py-3.5"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your Email" className="w-full bg-transparent text-sm text-gray-800 outline-none" disabled={step === "otp"} /></div>
        {step === "otp" && (
          <div className="bg-white px-4 py-3.5 flex items-center justify-between">
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Verification code" className="flex-1 bg-transparent text-sm text-gray-800 outline-none" maxLength={6} />
            <button onClick={handleSend} disabled={countdown > 0} className={`text-sm font-semibold ${countdown > 0 ? "text-gray-400" : "text-yellow-600"}`}>{countdown > 0 ? `${countdown}s` : "Send"}</button>
          </div>
        )}
        <p className="text-xs text-gray-500 leading-relaxed">Please verify your Email address before trading, we will send you trade related messages and other important notifications via Email.</p>
      </div>
      <div className="px-4 pb-8 pt-4">
        <button onClick={step === "email" ? handleSend : handleVerify} disabled={isSending || isVerifying} className={`w-full font-bold py-4 transition-colors ${email.trim() ? "bg-yellow-400 hover:bg-yellow-300 text-black" : "bg-yellow-200 text-yellow-600"}`}>
          {(isSending || isVerifying) ? <Loader2 className="animate-spin mx-auto" size={20} /> : step === "email" ? "Send" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ─── Bind Email Prompt ────────────────────────────────────────────────────────
function BindEmailPrompt({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
      <div className="bg-white p-6 max-w-sm w-full">
        <div className="flex items-start gap-3 mb-4">
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
          <h3 className="font-bold text-gray-900 text-lg leading-tight flex-1">Binding Email</h3>
        </div>
        <p className="text-gray-600 text-center text-sm mb-6">For your account security, please bind your email address first and then set your login password.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 py-3 font-semibold text-gray-700">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-yellow-400 py-3 font-bold text-black">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop Inline Feedback ──────────────────────────────────────────────────
function DesktopFeedback({ userEmail }: { userEmail: string }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [classification, setClassification] = useState("Payment issues");
  const [content, setContent] = useState("");
  const [contactEmail, setContactEmail] = useState(userEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClassDrop, setShowClassDrop] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `feedback/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-images").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
    setScreenshots(p => [...p, data.publicUrl]);
    toast.success("Screenshot attached");
  };

  const handleSubmit = async () => {
    if (!content.trim()) { toast.error("Describe your issue"); return; }
    setIsSubmitting(true);
    const ticketId = `TKT-${Date.now()}`;
    await supabase.from("chat_messages").insert({ session_id: ticketId, user_email: contactEmail, sender: "user", content: `[TICKET] Classification: ${classification}\n\n${content}` });
    await supabase.from("chat_sessions").upsert({ id: ticketId, user_email: contactEmail, status: "waiting", updated_at: new Date().toISOString() });
    setTickets(p => [{ id: ticketId, classification, content, status: "open", created_at: new Date().toISOString() }, ...p]);
    setContent(""); setScreenshots([]); setShowModal(false); setIsSubmitting(false);
    toast.success("Ticket submitted!");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Feedback</h2>
        <button onClick={() => setShowModal(true)} className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm px-5 py-2.5">New Ticket</button>
      </div>
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-28 h-28 flex items-center justify-center mb-4">
            <svg viewBox="0 0 120 120" className="w-full h-full opacity-30"><rect x="20" y="10" width="80" height="90" rx="8" fill="#9ca3af"/><rect x="30" y="25" width="60" height="6" rx="3" fill="#d1d5db"/><rect x="30" y="38" width="45" height="6" rx="3" fill="#d1d5db"/><rect x="30" y="51" width="52" height="6" rx="3" fill="#d1d5db"/><rect x="30" y="64" width="38" height="6" rx="3" fill="#d1d5db"/><rect x="60" y="75" width="40" height="12" rx="4" fill="#6b7280" transform="rotate(-45 80 81)"/><polygon points="54,98 58,90 66,98" fill="#4b5563"/></svg>
          </div>
          <p className="text-gray-400 font-medium">No records</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="border border-gray-100 p-4 flex items-start justify-between">
              <div><p className="font-bold text-gray-900 text-sm">{t.classification}</p><p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.content}</p><p className="text-xs text-gray-400 mt-1">{new Date(t.created_at).toLocaleDateString()}</p></div>
              <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5">Open</span>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900">New Ticket</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Classification</label>
                <div className="relative">
                  <button onClick={() => setShowClassDrop(!showClassDrop)} className="w-full bg-gray-100 px-4 py-3 text-left text-sm flex items-center justify-between">{classification}<ChevronDown size={16} /></button>
                  {showClassDrop && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-lg z-10 mt-1 overflow-hidden">
                      {CLASSIFICATIONS.map(c => <button key={c} onClick={() => { setClassification(c); setShowClassDrop(false); }} className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b last:border-0 ${classification === c ? "text-yellow-600 font-semibold" : "text-gray-700"}`}>{c}</button>)}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Question content</label>
                <div className="relative">
                  <textarea value={content} onChange={(e) => setContent(e.target.value.slice(0, 400))} placeholder="Describe your issue..." rows={5} className="w-full bg-gray-100 px-4 py-3 text-sm outline-none resize-none" />
                  <span className="absolute bottom-2 right-3 text-xs text-gray-400">{content.length}/400</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Screenshots (optional)</label>
                <div className="flex gap-2 flex-wrap">
                  {screenshots.map((url, i) => (
                    <div key={i} className="relative w-16 h-16">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setScreenshots(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 w-4 h-4 bg-gray-800 rounded-full flex items-center justify-center"><X size={9} className="text-white" /></button>
                    </div>
                  ))}
                  {screenshots.length < 3 && <button onClick={() => fileRef.current?.click()} className="w-16 h-16 border-2 border-dashed border-gray-300 flex items-center justify-center hover:bg-gray-50"><Plus size={18} className="text-gray-400" /></button>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Contact email</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Your email" className="w-full bg-gray-100 px-4 py-3 text-sm outline-none" />
              </div>
            </div>
            <div className="px-5 pb-5 pt-3 border-t">
              <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3">{isSubmitting ? "Submitting..." : "Submit"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Desktop Inline Invite ────────────────────────────────────────────────────
function DesktopInvite({ user }: { user: any }) {
  const navigate = useNavigate();
  const [referral, setReferral] = useState<any>(null);
  const [useShorter, setUseShorter] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.email || !user?.id) return;
    supabase.from("referral_codes").select("*").eq("user_email", user.email).single().then(({ data }) => {
      if (data) { setReferral(data); return; }
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const seed = user.id.replace(/-/g, "").slice(0, 8);
      let code = "";
      for (let i = 0; i < 8; i++) { const idx = parseInt(seed[i] || "0", 16) % chars.length; code += chars[idx]; }
      const shortChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      let short = "";
      for (let i = 0; i < 6; i++) short += shortChars[Math.floor(Math.random() * shortChars.length)];
      supabase.from("referral_codes").insert({ user_id: user.id, user_email: user.email, code, short_code: short, users_invited: 0, orders_completed: 0, total_spending: 0 }).select().single().then(({ data: d }) => { if (d) setReferral(d); });
    });
  }, [user]);

  const inviteLink = useShorter ? `https://noxystore.gg/s/${referral?.short_code || "..."}` : `https://noxystore.gg?share_token=${referral?.code || "..."}&utm_source=copy&utm_campaign=p_invite&utm_medium=social`;
  const shareText = `Sign up on NoxyStore.gg using my link to claim coupons! ${inviteLink}`;
  const handleCopy = async () => { await navigator.clipboard.writeText(inviteLink); setCopied(true); toast.success("Link copied!"); setTimeout(() => setCopied(false), 2000); };
  const handleShare = (p: string) => {
    const enc = encodeURIComponent(shareText);
    const urls: Record<string, string> = { twitter: `https://twitter.com/intent/tweet?text=${enc}`, facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`, whatsapp: `https://wa.me/?text=${enc}`, discord: "https://discord.com/channels/@me" };
    if (urls[p]) window.open(urls[p], "_blank");
  };
  const usersInvited = referral?.users_invited || 0;
  const ordersCompleted = referral?.orders_completed || 0;
  const totalSpending = referral?.total_spending || 0;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-5">Invite for Coupons</h2>
      <div className="bg-yellow-400 p-6 mb-5 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-black text-gray-900 text-lg leading-tight mb-1">Invite new users to sign up and make orders to earn multiple rewards!</h3>
          <p className="text-gray-700 text-sm">The more users you invite the more rewards you could earn!</p>
          <button onClick={() => navigate("/invite")} className="flex items-center gap-1 text-blue-700 font-semibold text-sm mt-2 hover:underline">Click here to view the rules <ChevronRight size={14} /></button>
        </div>
        <img src={inviteReward} alt="" className="w-24 h-24 object-contain flex-shrink-0 ml-4" />
      </div>
      <div className="bg-gray-50 p-5 mb-5">
        <div className="flex items-center justify-center gap-10 mb-5">
          {[
            { key: "twitter", label: "X", bg: "#000", icon: <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.843L1.254 2.25H8.08l4.257 5.629L18.244 2.25z"/></svg> },
            { key: "facebook", label: "Facebook", bg: "#1877F2", icon: <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
            { key: "whatsapp", label: "WhatsApp", bg: "#25D366", icon: <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
            { key: "discord", label: "Discord", bg: "#5865F2", icon: <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg> },
          ].map(p => (
            <button key={p.key} onClick={() => handleShare(p.key)} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform" style={{ backgroundColor: p.bg }}>{p.icon}</div>
              <span className="text-xs text-gray-600 font-medium">{p.label}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-white border border-gray-200 px-4 py-3 text-sm text-gray-500 font-mono truncate">{inviteLink}</div>
          <button onClick={handleCopy} className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-3 flex items-center gap-2 transition-colors whitespace-nowrap">
            {copied ? <Check size={16} /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
            Copy Link
          </button>
        </div>
        <button onClick={() => setUseShorter(!useShorter)} className="flex items-center gap-2 text-sm text-gray-600">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${useShorter ? "bg-yellow-400 border-yellow-400" : "border-gray-300"}`}>{useShorter && <Check size={11} className="text-black" />}</div>
          Share with a shorter link
        </button>
      </div>
      <div className="bg-gray-50 p-5 mb-5">
        <h3 className="font-bold text-gray-900 text-base mb-4">Invite Progress Overview</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-black text-orange-500">{usersInvited}</p><p className="text-xs text-gray-500 mt-0.5">Users Invited</p></div>
          <div><p className="text-2xl font-black text-orange-500">{ordersCompleted}</p><p className="text-xs text-gray-500 mt-0.5">Orders Completed</p></div>
          <div><p className="text-2xl font-black text-orange-500">${totalSpending.toFixed(2)}</p><p className="text-xs text-gray-500 mt-0.5">Total Spending</p></div>
        </div>
      </div>
      <div className="bg-gray-50 p-5">
        <div className="flex items-center gap-2 mb-4"><div className="w-1 h-5 bg-yellow-400 rounded-full" /><h3 className="font-bold text-gray-900 text-base">Task &amp; Reward</h3></div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: "Invite Master", desc: "Invite new users to join NoxyStore", progress: `${usersInvited} / 5`, img: couponSave5 },
            { title: "Slow and Steady Basic", desc: "Earn rewards as your users purchase", progress: `${ordersCompleted} / 3`, img: couponSave5 },
            { title: "Slow and Steady Advanced", desc: "Unlock even more advanced rewards", progress: `${ordersCompleted} / 3`, img: couponSave5 },
            { title: "Big Spender", desc: "Invited users reach spending milestones", progress: `$${totalSpending.toFixed(0)} / $500`, img: couponSave5 },
          ].map((t, i) => (
            <div key={i} className="border border-gray-200 p-4 bg-white relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="flex-1"><p className="font-bold text-gray-900 text-sm">{t.title}</p><p className="text-gray-500 text-xs mt-0.5">{t.desc}</p><button onClick={() => toast.info("Complete tasks to earn coupon rewards!")} className="mt-2 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 font-bold text-xs px-4 py-1.5">Claim</button></div>
                <img src={t.img} alt="reward" className="w-12 h-12 object-contain flex-shrink-0" />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between"><span className="text-xs text-gray-500">Progress: {t.progress}</span><ChevronRight size={14} className="text-gray-400" /></div>
            </div>
          ))}
        </div>
        <button onClick={() => navigate("/invite")} className="w-full mt-4 py-3 text-sm font-semibold text-gray-500 bg-white hover:bg-gray-100 border border-gray-200">View Full Invite Page</button>
      </div>
    </div>
  );
}

// ─── Desktop Inline Coupons ───────────────────────────────────────────────────
function DesktopCoupons({ user }: { user: any }) {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => { if (!user?.email) return; loadCoupons(); }, [user]);

  const loadCoupons = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("user_coupons").select("*").eq("user_email", user?.email).order("created_at", { ascending: false });
    if (data) setCoupons(data);
    setIsLoading(false);
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setIsRedeeming(true);
    const { data: adminCode } = await supabase.from("admin_redeem_codes").select("*").eq("code", redeemCode.trim().toUpperCase()).eq("is_active", true).single();
    if (!adminCode) { toast.error("Invalid or expired code"); setIsRedeeming(false); return; }
    if (adminCode.used_count >= adminCode.max_uses) { toast.error("Code usage limit reached"); setIsRedeeming(false); return; }
    const { count } = await supabase.from("user_coupons").select("id", { count: "exact", head: true }).eq("user_email", user?.email).eq("code", redeemCode.trim().toUpperCase());
    if (count && count > 0) { toast.error("Already used this code"); setIsRedeeming(false); return; }
    const expires = adminCode.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("user_coupons").insert({ user_email: user?.email, code: redeemCode.trim().toUpperCase(), type: adminCode.type === "coupon" ? "percent" : adminCode.type, discount_value: adminCode.value, min_order: 0.01, description: `Redeemed: ${redeemCode.trim().toUpperCase()}`, expires_at: expires });
    await supabase.from("admin_redeem_codes").update({ used_count: (adminCode.used_count || 0) + 1 }).eq("id", adminCode.id);
    toast.success("Code redeemed!"); setRedeemCode(""); loadCoupons(); setIsRedeeming(false);
  };

  const activeCoupons = coupons.filter(c => !c.is_used && daysUntil(c.expires_at) > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-900">Coupon ({activeCoupons.length})</h2>
        <div className="flex gap-2">
          <input type="text" value={redeemCode} onChange={(e) => setRedeemCode(e.target.value.toUpperCase())} placeholder="Please enter the redeem code." className="border border-gray-200 px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-yellow-400 w-56" />
          <button onClick={handleRedeem} disabled={!redeemCode.trim() || isRedeeming} className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 text-sm disabled:opacity-50 transition-colors">{isRedeeming ? <Loader2 size={16} className="animate-spin" /> : "Redeem"}</button>
        </div>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="bg-gray-100 h-32 animate-pulse" />)}</div>
      ) : activeCoupons.length === 0 ? (
        <div className="text-center py-16"><Tag size={48} className="text-gray-200 mx-auto mb-4" /><p className="text-gray-500">No coupons yet</p><button onClick={() => navigate("/invite")} className="mt-4 bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-6 py-2.5 text-sm">Invite Friends to Earn Coupons</button></div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {activeCoupons.map(c => {
            const days = daysUntil(c.expires_at);
            const img = c.discount_value >= 10 ? coupon10off : coupon6off;
            return (
              <div key={c.id} className="bg-white border border-orange-100 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 flex items-center gap-3 relative overflow-hidden">
                  <div className="absolute right-2 top-0 bottom-0 w-20 opacity-20 flex items-center"><img src={img} alt="" className="w-full object-contain" /></div>
                  <img src={img} alt="" className="w-16 h-16 object-cover flex-shrink-0" />
                  <div><p className="text-orange-500 font-black text-xl">{c.discount_value}% OFF</p>{c.max_discount && <p className="text-gray-500 text-xs">(Up to ${c.max_discount.toFixed(2)})</p>}<p className="text-gray-700 text-xs mt-0.5">{c.description || "Reseller Exclusive Coupon"}</p></div>
                </div>
                <div className="border-t border-dashed border-orange-100 mx-4" />
                <div className="px-4 py-3 flex items-center justify-between">
                  <p className="text-gray-400 text-sm">Valid for orders over ${c.min_order?.toFixed(2) || "1.00"}</p>
                  <button onClick={() => { sessionStorage.setItem("pending_coupon", JSON.stringify(c)); toast.success("Coupon selected for checkout!"); navigate("/"); }} className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs px-4 py-2">Use</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {coupons.filter(c => c.is_used || daysUntil(c.expires_at) === 0).length > 0 && (
        <button onClick={() => navigate("/coupons")} className="w-full mt-4 py-3 text-sm font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200">View All Coupons (incl. used/expired)</button>
      )}
    </div>
  );
}

// ─── Desktop Inline Affiliate ───────────────────────────────────────────────
function DesktopAffiliate({ user }: { user: any }) {
  const navigate = useNavigate();
  const [store, setStore] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    supabase.from("affiliate_stores").select("*").eq("user_email", user.email).single().then(({ data }) => {
      if (data) setStore(data);
      setIsLoading(false);
    });
  }, [user]);

  const commission = store ? (store.income_30d || 0) : 0;
  const orders30d = store ? (store.orders_30d || 0) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Affiliate Program</h2>
        <button onClick={() => navigate("/affiliate")} className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm px-5 py-2.5">
          Manage Store
        </button>
      </div>

      {/* Hero banner */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6 mb-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-40 opacity-10">
          <DollarSign size={160} className="text-black" />
        </div>
        <h3 className="font-black text-gray-900 text-lg mb-1">Earn up to 10% Commission</h3>
        <p className="text-gray-800 text-sm mb-4">Create your affiliate store, share your link, and earn money every time someone buys through your store.</p>
        <button onClick={() => navigate("/affiliate")} className="bg-black text-yellow-400 font-bold text-sm px-5 py-2.5 hover:bg-gray-900 transition-colors">
          Open My Store
        </button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[1,2,3].map(i => <div key={i} className="bg-gray-100 h-24 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: "30-Day Orders", value: orders30d, suffix: "" },
            { label: "30-Day Income", value: `$${commission.toFixed(2)}`, suffix: "" },
            { label: "Commission Rate", value: "Up to 10", suffix: "%" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-50 p-5 text-center border border-gray-100">
              <p className="text-2xl font-black text-orange-500">{stat.value}<span className="text-lg">{stat.suffix}</span></p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="bg-gray-50 p-5 mb-5">
        <div className="flex items-center gap-2 mb-4"><div className="w-1 h-5 bg-yellow-400 rounded-full" /><h3 className="font-bold text-gray-900">How it works</h3></div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { step: "1", title: "Create Your Store", desc: "Set up your affiliate store with your branding and featured games." },
            { step: "2", title: "Share Your Link", desc: "Share your store link on social media, Discord, YouTube, or anywhere." },
            { step: "3", title: "Earn Commission", desc: "Earn up to 10% on every order placed through your affiliate store." },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center mx-auto mb-3 font-black text-black text-lg">{item.step}</div>
              <p className="font-bold text-gray-900 text-sm mb-1">{item.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Store info if exists */}
      {store && (
        <div className="bg-white border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            {store.avatar_url ? (
              <img src={store.avatar_url} alt="store" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-black text-lg">{store.store_name?.[0]?.toUpperCase()}</div>
            )}
            <div>
              <p className="font-bold text-gray-900">{store.store_name}</p>
              <p className="text-xs text-gray-500 font-mono">{store.store_link}</p>
            </div>
          </div>
          <button onClick={() => navigate("/affiliate")} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-sm py-3 border border-gray-200 transition-colors">
            Edit Store Settings
          </button>
        </div>
      )}

      {!store && !isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">You don't have an affiliate store yet.</p>
          <button onClick={() => navigate("/affiliate")} className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-8 py-3">
            Create My Store
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Activity Feed ───────────────────────────────────────────────────────────
function ActivityFeed({ userId, userEmail }: { userId?: string; userEmail?: string }) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId && !userEmail) { setLoading(false); return; }
    loadActivity();
  }, [userId, userEmail]);

  async function loadActivity() {
    setLoading(true);
    const [analyticsRes, walletRes, ordersRes, couponsRes] = await Promise.all([
      supabase.from("analytics_events").select("*").eq("user_id", userId || "").order("created_at", { ascending: false }).limit(20),
      supabase.from("wallet_transactions").select("*").eq("user_email", userEmail || "").order("created_at", { ascending: false }).limit(10),
      supabase.from("orders").select("*").eq("user_email", userEmail || "").order("created_at", { ascending: false }).limit(10),
      supabase.from("user_coupons").select("*").eq("user_email", userEmail || "").order("created_at", { ascending: false }).limit(5),
    ]);

    const merged: any[] = [];

    for (const ev of analyticsRes.data || []) {
      const typeMap: Record<string, { label: string; icon: string; color: string }> = {
        daily_login: { label: "Daily login bonus earned (+2 pts)", icon: "🎯", color: "text-green-600 bg-green-50" },
        page_view: { label: `Visited ${ev.page || "a page"}`, icon: "👁️", color: "text-gray-500 bg-gray-50" },
        search: { label: `Searched for "${ev.extra_data?.query || ""}"`, icon: "🔍", color: "text-blue-600 bg-blue-50" },
        game_view: { label: `Viewed game${ev.game_id ? " #" + ev.game_id : ""}`, icon: "🎮", color: "text-purple-600 bg-purple-50" },
        checkout_started: { label: "Started checkout", icon: "🛒", color: "text-orange-600 bg-orange-50" },
        order_placed: { label: "Order placed", icon: "✅", color: "text-green-600 bg-green-50" },
        coupon_redeemed: { label: "Coupon code redeemed", icon: "🎟️", color: "text-yellow-600 bg-yellow-50" },
        profile_updated: { label: "Profile information updated", icon: "✏️", color: "text-blue-600 bg-blue-50" },
      };
      const meta = typeMap[ev.event_type];
      if (!meta) continue;
      merged.push({ id: "ev_" + ev.id, ts: ev.created_at, label: meta.label, icon: meta.icon, color: meta.color, type: "event" });
    }

    for (const tx of walletRes.data || []) {
      const isCredit = ["points_earned", "top_up", "refund", "bonus"].includes(tx.type);
      merged.push({
        id: "tx_" + tx.id,
        ts: tx.created_at,
        label: tx.description || (isCredit ? "Wallet credited" : "Wallet debited"),
        icon: isCredit ? "💰" : "💸",
        color: isCredit ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50",
        sub: `${isCredit ? "+" : "-"}$${Math.abs(Number(tx.amount)).toFixed(2)}`,
        type: "wallet",
      });
    }

    for (const order of ordersRes.data || []) {
      merged.push({
        id: "ord_" + order.id,
        ts: order.created_at,
        label: `Purchased: ${order.game_name} — ${order.sku_name}`,
        icon: "🛍️",
        color: "text-purple-700 bg-purple-50",
        sub: `$${Number(order.price).toFixed(2)}`,
        type: "order",
        path: `/orders/${order.reference_id}`,
      });
    }

    for (const c of couponsRes.data || []) {
      merged.push({
        id: "cp_" + c.id,
        ts: c.created_at,
        label: `Coupon received: ${c.code} (${c.discount_value}% off)`,
        icon: "🎟️",
        color: "text-yellow-700 bg-yellow-50",
        type: "coupon",
      });
    }

    merged.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    setActivities(merged.slice(0, 30));
    setLoading(false);
  }

  function timeAgo(ts: string) {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white p-4 flex items-center gap-3 animate-pulse shadow-sm">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0" />
            <div className="flex-1"><div className="h-3 bg-gray-100 rounded w-3/4 mb-2" /><div className="h-2.5 bg-gray-100 rounded w-1/3" /></div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📋</div>
        <p className="text-gray-500 font-medium">No activity yet</p>
        <p className="text-gray-400 text-sm mt-1">Your actions like logins, orders, and wallet changes will appear here.</p>
        <button onClick={() => navigate("/")} className="mt-5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-6 py-2.5 text-sm">Browse Games</button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
        <span className="text-xs text-gray-400">{activities.length} events</span>
      </div>
      {activities.map(act => (
        <button
          key={act.id}
          onClick={() => act.path && navigate(act.path)}
          className={`w-full bg-white p-3.5 flex items-center gap-3 shadow-sm text-left ${
            act.path ? "hover:shadow-md transition-shadow cursor-pointer" : "cursor-default"
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${act.color}`}>
            {act.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">{act.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{timeAgo(act.ts)} · {new Date(act.ts).toLocaleDateString()}</p>
          </div>
          {act.sub && (
            <span className={`text-sm font-black flex-shrink-0 ${
              act.sub.startsWith("+") ? "text-green-600" : "text-red-500"
            }`}>{act.sub}</span>
          )}
          {act.path && <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AccountPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, orders, login } = useAuthStore();
  const { t } = useTranslation();
  const { currency, language, setLanguage, setCurrency } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<AccountTab>("overview");
  const [desktopSection, setDesktopSection] = useState<DesktopSection>("settings");
  const [showAgeRange, setShowAgeRange] = useState(false);
  const [ageRange, setAgeRange] = useState("");
  const [showBirthday, setShowBirthday] = useState(false);
  const [birthday, setBirthday] = useState("");
  const [showBindEmail, setShowBindEmail] = useState(false);
  const [showBindEmailPrompt, setShowBindEmailPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<"password" | "passkey" | null>(null);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  const hasEmail = !!(user?.email && user.email.includes("@"));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const identities = data.user.identities || [];
        setHasPassword(identities.some(id => id.provider === "email") && !!(data.user.user_metadata?.username));
        if (data.user.user_metadata?.avatar_url) setAvatarUrl(data.user.user_metadata.avatar_url);
        if (data.user.user_metadata?.birthday) setBirthday(data.user.user_metadata.birthday);
        if (data.user.user_metadata?.age_range) setAgeRange(data.user.user_metadata.age_range);
      }
    });
  }, []);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Only image files supported"); return; }
    setIsUploadingAvatar(true);
    const toastId = toast.loading("Uploading avatar...");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `avatars/${user?.id}/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabase.storage.from("store-assets").upload(path, arrayBuffer, { contentType: file.type, upsert: true });
    if (error) { toast.dismiss(toastId); toast.error("Upload failed"); setIsUploadingAvatar(false); return; }
    const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(path);
    const { error: updateErr } = await supabase.auth.updateUser({ data: { avatar_url: urlData.publicUrl } });
    toast.dismiss(toastId);
    if (updateErr) { toast.error("Failed to save avatar"); } else { setAvatarUrl(urlData.publicUrl); toast.success("Avatar updated!"); }
    setIsUploadingAvatar(false);
  }, [user]);

  const saveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) { setIsEditingNickname(false); return; }
    const { data, error } = await supabase.auth.updateUser({ data: { username: trimmed } });
    if (error) { toast.error("Failed to update nickname"); return; }
    if (data.user && user) { login({ ...user, nickname: trimmed }); }
    setIsEditingNickname(false);
    toast.success("Nickname updated!");
  };

  const saveBirthday = async (val: string) => {
    if (birthday) { toast.error("Birthday cannot be changed once set"); return; }
    setBirthday(val);
    await supabase.auth.updateUser({ data: { birthday: val } });
    const today = new Date();
    const todayMM = String(today.getMonth() + 1).padStart(2, "0");
    const todayDD = String(today.getDate()).padStart(2, "0");
    if (val === `${todayMM}-${todayDD}`) {
      const vip = 1;
      const discountMap: Record<number, number> = { 1: 5, 2: 8, 3: 10, 4: 15, 5: 20 };
      const discount = discountMap[vip];
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      if (user?.email) {
        await supabase.from("user_coupons").insert({
          user_email: user.email,
          user_id: user.id,
          code: `BDAY${todayMM}${todayDD}${Date.now().toString(36).toUpperCase()}`,
          type: "percent",
          discount_value: discount,
          min_order: 0.01,
          description: `Happy Birthday! VIP ${vip} birthday gift - ${discount}% off`,
          expires_at: expires,
        });
        toast.success(`Happy Birthday! Your ${discount}% birthday coupon has been added!`);
      }
    } else {
      toast.success("Birthday saved! You will not be able to change this.");
    }
  };

  const saveAgeRange = async (range: string) => {
    setAgeRange(range);
    await supabase.auth.updateUser({ data: { age_range: range } });
  };

  const handleLogout = async () => { await logout(); toast.success("Logged out"); navigate("/"); };
  const handlePasswordAction = () => { if (!hasEmail) { setShowBindEmailPrompt(true); setPendingAction("password"); } else { navigate("/login"); } };
  const handlePasskeyAction = () => { if (!hasEmail) { setShowBindEmailPrompt(true); setPendingAction("passkey"); } else { setShowPasskeyModal(true); } };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f8f8]">
        <div className="hidden lg:block"><DesktopHeader /></div>
        <div className="lg:hidden"><Header showMenu /></div>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4"><User size={40} className="text-gray-400" /></div>
          <p className="text-gray-500 text-lg mb-6">{t("login")} to view your account</p>
          <button onClick={() => navigate("/login")} className="btn-primary px-12">{t("loginSignup")}</button>
        </div>
        <div className="lg:hidden"><BottomNav /></div>
      </div>
    );
  }

  const vipLevel = 1;

  const sidebarItems: { key: DesktopSection; icon: any; label: string; badge?: string; dot?: boolean; highlight?: boolean; inline?: boolean }[] = [
    { key: "buyHistory", icon: ShoppingBag, label: t("buyHistory") },
    { key: "coupon", icon: Tag, label: t("coupons"), badge: "1397" },
    { key: "settings", icon: Settings, label: t("settings") },
    { key: "helpCenter", icon: HelpCircle, label: t("helpCenter") },
    { key: "feedback", icon: MessageSquare, label: "Feedback" },
    { key: "invite", icon: Gift, label: t("inviteForCoupons"), dot: true },
    { key: "earn", icon: DollarSign, label: t("affiliateProgram"), highlight: true, inline: true },
  ];

  // ─── Desktop Layout ───────────────────────────────────────────────────────
  const DesktopLayout = () => (
    <div className="hidden lg:block min-h-screen bg-[#f5f5f5]">
      <DesktopHeader />
      <div className="max-w-[1280px] mx-auto px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Home</button>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium capitalize">{desktopSection === "earn" ? "Affiliate Program" : desktopSection}</span>
        </div>
      </div>
      <div className="max-w-[1280px] mx-auto px-6" style={{ height: "calc(100vh - 110px)" }}>
        <div className="flex gap-6 h-full">
          {/* Sidebar — shared AccountSidebar component */}
          <AccountSidebar activePage={desktopSection === "buyHistory" ? "buyHistory" : desktopSection === "coupon" ? "coupon" : desktopSection === "invite" ? "invite" : desktopSection === "earn" ? "affiliate" : desktopSection === "feedback" ? "feedback" : "settings"} className="sticky top-0 self-start" />

          {/* Content */}
          <div className="flex-1 overflow-y-auto pb-12" style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
            <div className="bg-white shadow-sm p-8">
              {desktopSection === "settings" && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{t("accountInfo")}</h2>
                  <div className="space-y-0">
                    {[
                      { label: "Avatar", render: () => <div className="relative group cursor-pointer ml-auto mr-4" onClick={() => avatarInputRef.current?.click()}>{isUploadingAvatar ? <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-gray-400" /></div> : avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">{user?.nickname?.[0]?.toUpperCase()}</div>}<div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={14} className="text-white" /></div></div> },
                      { label: "Nickname", render: () => isEditingNickname ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input ref={nicknameInputRef} type="text" value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveNickname(); if (e.key === "Escape") setIsEditingNickname(false); }} className="flex-1 border border-yellow-400 px-3 py-1.5 text-sm text-gray-800 outline-none" autoFocus />
                            <button onClick={saveNickname} className="text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-black px-3 py-1.5">Save</button>
                            <button onClick={() => setIsEditingNickname(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5">Cancel</button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-800">{user?.nickname}</p>
                        ), action: isEditingNickname ? null : "Modify", onAction: () => { setNicknameInput(user?.nickname || ""); setIsEditingNickname(true); setTimeout(() => nicknameInputRef.current?.focus(), 50); } },
                      { label: "Birthday", value: birthday || "Fill in birthday info", valueClass: birthday ? "text-gray-800" : "text-gray-400 text-sm",
                        action: birthday ? "Check my birthday benefit" : "Set",
                        actionClass: birthday ? "text-orange-500 hover:text-orange-600" : undefined,
                        onAction: birthday ? () => navigate("/vip") : () => setShowBirthday(true) },
                      { label: "Age Range", value: ageRange || <span className="text-sm text-gray-400">Set your age range</span>, action: ageRange ? "Change" : "Set", onAction: () => setShowAgeRange(true) },
                      { label: "Email", value: hasEmail ? user?.email?.replace(/(.{3}).*(@)/, "$1***$2") : null, action: hasEmail ? null : "Connect", onAction: hasEmail ? undefined : () => setShowBindEmail(true) },
                      { label: "Password", value: hasPassword ? "already set" : null, action: hasPassword ? "Change" : "Go to set up", onAction: handlePasswordAction },
                      { label: "Passkey", value: "Create a Passkey for faster, safer login with Face ID, Fingerprint, or PIN.", action: "Manage", onAction: handlePasskeyAction },
                    ].map((row: any) => (
                      <div key={row.label} className="flex items-center gap-6 py-4 border-b border-gray-100 last:border-0">
                        <span className="w-36 text-sm text-gray-500 flex-shrink-0">{row.label}</span>
                        <div className="flex-1">{row.render ? row.render() : <p className={`text-sm ${row.valueClass || "text-gray-800"}`}>{row.value}</p>}</div>
                        {row.action && <button onClick={row.onAction} className={`text-sm flex-shrink-0 flex items-center gap-1 ${row.actionClass || "text-gray-400 hover:text-gray-600"}`}>{row.action}<ChevronRight size={14} /></button>}
                      </div>
                    ))}
                  </div>
                  {/* Preferences Settings */}
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <h3 className="text-base font-bold text-gray-900 mb-4">Preferences Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-6 py-2">
                        <span className="w-36 text-sm text-gray-500 flex-shrink-0">Display Currency</span>
                        <select value={currency} onChange={e => setCurrency(e.target.value)} className="border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-yellow-400 bg-white">
                          {["USD","EUR","GBP","IDR","MYR","SGD","THB","VND","PHP","BRL","AUD","CAD","JPY","KRW"].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-6 py-2">
                        <span className="w-36 text-sm text-gray-500 flex-shrink-0">Language</span>
                        <select value={language} onChange={e => setLanguage(e.target.value as any)} className="border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-yellow-400 bg-white">
                          {[{code:"en",label:"English"},{code:"es",label:"Español"},{code:"fr",label:"Français"},{code:"id",label:"Bahasa Indonesia"},{code:"ms",label:"Bahasa Melayu"},{code:"ja",label:"日本語"},{code:"zh-TW",label:"中文(繁體)"},{code:"ko",label:"한국어"},{code:"th",label:"ภาษาไทย"},{code:"vi",label:"Tiếng Việt"},{code:"ar",label:"العربية"}].map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {desktopSection === "buyHistory" && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{t("buyHistory")}</h2>
                  {orders.length === 0 ? (
                    <div className="text-center py-16"><Package size={48} className="text-gray-200 mx-auto mb-4" /><p className="text-gray-500">{t("noOrdersYet")}</p><button onClick={() => navigate("/")} className="btn-primary mt-4 px-8">{t("browseGames")}</button></div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map(order => {
                        const si = ORDER_STATE_MAP[order.state] || ORDER_STATE_MAP[1];
                        return (
                          <div key={order.id} className="flex items-center gap-4 p-4 border border-gray-100 hover:bg-gray-50 transition-colors">
                            <div className="flex-1"><p className="font-semibold text-gray-900">{order.game_name}</p><p className="text-sm text-gray-500">{order.sku_name}</p><p className="text-xs text-gray-400 font-mono mt-1">{order.order_id}</p></div>
                            <span className="text-[10px] font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded-sm border border-yellow-500">V{vipLevel}</span>
                            <span className={`tag-badge ${si.color} ${si.bg}`}>{si.label}</span>
                            <p className="font-bold text-gray-900">${order.price.toFixed(2)}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {desktopSection === "coupon" && <DesktopCoupons user={user} />}
              {desktopSection === "feedback" && <DesktopFeedback userEmail={user?.email || ""} />}
              {desktopSection === "invite" && <DesktopInvite user={user} />}
              {desktopSection === "earn" && <DesktopAffiliate user={user} />}
            </div>

            <div className="flex gap-4 mt-4">
              {user?.role === "admin" && (
                <button onClick={() => navigate("/secure-dashboard-92x2011")} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 font-bold flex items-center justify-center gap-2">
                  <LayoutDashboard size={18} />{t("adminDashboard")}
                </button>
              )}
              <button onClick={() => navigate("/points")} className="flex-1 bg-yellow-400 text-black border border-yellow-400 py-3 font-bold flex items-center justify-center gap-2 hover:bg-yellow-300">
                <Star size={18} /> Points
              </button>
              <button onClick={handleLogout} className="flex-1 bg-white text-red-500 border border-red-200 py-3 font-bold flex items-center justify-center gap-2 hover:bg-red-50">
                <LogOut size={18} />{t("logout")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Mobile Layout ────────────────────────────────────────────────────────
  const MobileLayout = () => (
    <div className="lg:hidden bg-[#f8f8f8] min-h-screen pb-20">
      <Header showMenu />
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t("myAccount")}</h1>
        <div className="grid grid-cols-4 mb-4">
          {(["overview","orders","profile","activity"] as AccountTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2.5 text-sm font-semibold capitalize transition-all border-b-2 ${activeTab === tab ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>{t(tab as any)}</button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-5 text-white relative overflow-hidden">
              <div className="flex items-center gap-3 mb-5 mt-1">
                        <div className="w-14 h-14 overflow-hidden border-2 border-white/30 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">{avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-white">{user?.nickname?.[0]?.toUpperCase()}</span>}</div>
                <div>
                  <h2 className="text-lg font-bold">{user?.nickname}</h2>
                  <p className="text-white/70 text-sm">ID: {user?.id?.slice(-12)}</p>
                  <button onClick={() => navigate("/vip")} className="bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5 mt-1 inline-flex items-center gap-1 hover:bg-white/30">
                    Check VIP Benefits <ChevronRight size={10} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: t("balance"), value: `$${(user?.balance ?? 0).toFixed(2)}`, path: "/balance" },
                  { label: t("points"), value: user?.points ?? 0, path: "/points" },
                  { label: t("coupons"), value: `${user?.coupons ?? 0}`, path: "/coupons" },
                ].map(item => (
                  <button key={item.label} onClick={() => (item as any).path && navigate((item as any).path)} className="bg-white/15 backdrop-blur-sm p-3 text-center hover:bg-white/25 transition-colors">
                    <p className="text-lg font-bold">{item.value}</p><p className="text-white/70 text-xs">{item.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Package, label: t("orders"), value: `${orders.length} orders`, path: null },
                { icon: Wallet, label: t("balance"), value: `$${(user?.balance ?? 0).toFixed(2)}`, path: "/balance" },
                { icon: Key, label: "Passkeys", value: "Manage passkeys", path: null, onTap: handlePasskeyAction },
                { icon: Users, label: "Referrals", value: "Earn 10%", path: null },
              ].map(item => (
                <button key={item.label} onClick={() => { if ((item as any).onTap) { (item as any).onTap(); return; } (item as any).path && navigate((item as any).path); }} className="bg-white p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-all text-left">
                  <item.icon size={22} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div><p className="font-bold text-gray-900 text-sm">{item.label}</p><p className="text-xs text-gray-500 mt-0.5">{item.value}</p></div>
                </button>
              ))}
            </div>

            <div className="bg-white shadow-sm overflow-hidden">
              {[
                { icon: Settings, label: t("settings"), path: null, onTap: () => setActiveTab("profile") },
                { icon: Globe, label: t("languageAndCurrency"), sub: `${currency} | ${language.toUpperCase().slice(0,2)}`, path: "/language-currency" },
                { icon: HelpCircle, label: t("helpCenter"), path: "/support" },
                { icon: MessageSquare, label: "Feedback", sub: "Report issues or suggestions", path: "/feedback" },
                { icon: Gift, label: t("inviteForCoupons"), sub: "Unlock rich coupon rewards", highlight2: true, path: "/invite" },
                { icon: DollarSign, label: t("affiliateProgram"), sub: "Earn up to 10% money", highlight2: true, path: "/affiliate" },
                { icon: User, label: t("aboutUs"), path: "/about" },
              ].map((item, idx) => (
                <button key={item.label} onClick={() => { if ((item as any).onTap) { (item as any).onTap(); return; } (item as any).path && navigate((item as any).path); }} className={`w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 text-left ${idx < 7 ? "border-b border-gray-100" : ""}`}>
                  <item.icon size={20} className="text-gray-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    {(item as any).sub && <p className={`text-xs mt-0.5 ${(item as any).highlight ? "text-blue-500" : (item as any).highlight2 ? "text-orange-500" : "text-gray-400"}`}>{(item as any).sub}</p>}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>

            {user?.role === "admin" && (
              <button onClick={() => navigate("/secure-dashboard-92x2011")} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 font-bold flex items-center justify-center gap-2 shadow-md"><LayoutDashboard size={18} />{t("adminDashboard")}</button>
            )}

            <button onClick={handleLogout} className="w-full py-4 border border-gray-200 bg-white text-gray-700 font-semibold flex items-center justify-center gap-2 hover:bg-gray-50">
              <LogOut size={18} className="text-gray-500" /> Log out
            </button>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-16"><Package size={48} className="text-gray-200 mx-auto mb-4" /><p className="text-gray-500 font-medium">{t("noOrdersYet")}</p><button onClick={() => navigate("/")} className="btn-primary mt-6 px-8">{t("browseGames")}</button></div>
            ) : orders.map(order => {
              const si = ORDER_STATE_MAP[order.state] || ORDER_STATE_MAP[1];
              return (
                <div key={order.id} className="bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div><h3 className="font-bold text-gray-900 text-sm">{order.game_name}</h3><p className="text-xs text-gray-500">{order.sku_name}</p></div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded-sm">V{vipLevel}</span>
                      <span className={`tag-badge ${si.color} ${si.bg}`}>{si.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100"><p className="text-xs text-gray-400 font-mono">{order.order_id}</p><p className="font-bold text-gray-900">${order.price.toFixed(2)}</p></div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
              <button onClick={() => setActiveTab("overview")}><ArrowLeft size={20} className="text-gray-700" /></button>
              <h2 className="font-bold text-gray-900 flex-1 text-center">Account Information</h2>
              <div className="w-6" />
            </div>

            <button onClick={() => avatarInputRef.current?.click()} className="flex items-center justify-between px-4 py-4 border-b border-gray-100 w-full">
              <span className="text-sm font-medium text-gray-800">Avatar</span>
              <div className="flex items-center gap-2">
                {isUploadingAvatar ? <Loader2 size={20} className="animate-spin text-gray-400" /> : avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">{user?.nickname?.[0]?.toUpperCase()}</div>}
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </button>

            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-800">Nickname</span>
              {isEditingNickname ? (
                <div className="flex items-center gap-2 flex-1 ml-4">
                  <input type="text" value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveNickname(); if (e.key === "Escape") setIsEditingNickname(false); }} className="flex-1 border border-yellow-400 px-3 py-1.5 text-sm text-gray-800 outline-none" autoFocus />
                  <button onClick={saveNickname} className="text-xs font-bold bg-yellow-400 text-black px-3 py-1.5">Save</button>
                  <button onClick={() => setIsEditingNickname(false)} className="text-xs text-gray-400 px-2 py-1.5"><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => { setNicknameInput(user?.nickname || ""); setIsEditingNickname(true); }} className="flex items-center gap-1 text-gray-400">
                  <span className="text-sm">{user?.nickname}</span><ChevronRight size={16} />
                </button>
              )}
            </div>

            <div className="flex items-start justify-between px-4 py-4 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-800">Birthday</span>
              {birthday ? (
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm text-gray-800">{birthday}</span>
                  <button onClick={() => navigate("/vip")} className="text-xs text-orange-500 font-semibold flex items-center gap-0.5 hover:underline">
                    Check my birthday benefit <ChevronRight size={11} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowBirthday(true)} className="flex items-center gap-1 text-right">
                  <span className="text-sm text-gray-400">Fill in birthday info</span>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                </button>
              )}
            </div>

            <div className="flex items-start justify-between px-4 py-4 border-b border-gray-100">
              <div>
                <span className="text-sm font-medium text-gray-800">Age Range</span>
                {!ageRange && <p className="text-xs text-gray-400 mt-0.5 max-w-[180px] leading-relaxed">Set your age in accordance with our User Agreement.</p>}
              </div>
              <button onClick={() => setShowAgeRange(true)} className="flex items-center gap-1 ml-4 flex-shrink-0">
                {ageRange && <span className="text-sm text-gray-800">{ageRange}</span>}
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-800">Email</span>
              {hasEmail ? <span className="text-sm text-gray-500">{user?.email?.replace(/(.{3}).*(@)/, "$1***$2")}</span> : (
                <button onClick={() => setShowBindEmail(true)} className="flex items-center gap-1 text-gray-400"><span className="text-sm">Connect</span><ChevronRight size={16} /></button>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-800">Password</span>
              <button onClick={handlePasswordAction} className="flex items-center gap-1 text-gray-400">
                <span className="text-sm">{hasPassword ? "already set" : "Go to set up"}</span><ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-800">Passkey</span>
              <button onClick={handlePasskeyAction} className="flex items-center gap-1 text-gray-400"><span className="text-sm">{hasEmail ? "Manage" : "Add a Passkey"}</span><ChevronRight size={16} /></button>
            </div>

            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Social Accounts</p>
            </div>

            {[
              { label: "Steam", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-700"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z"/></svg>, bound: false },
              { label: "Google", icon: <svg viewBox="0 0 24 24" className="w-6 h-6"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>, bound: user?.email ? "connected" : false },
              { label: "Facebook", icon: <svg viewBox="0 0 24 24" fill="#1877F2" className="w-6 h-6"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, bound: false },
              { label: "Twitter / X", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-black"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.843L1.254 2.25H8.08l4.257 5.629L18.244 2.25z"/></svg>, bound: false },
              { label: "Apple", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-black"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>, bound: false },
              { label: "TikTok", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-black"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.79 1.52V6.69a4.85 4.85 0 0 1-1.02-.0z"/></svg>, bound: false },
            ].map((social, i, arr) => (
              <div key={social.label} className={`flex items-center justify-between px-4 py-4 ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}>
                <div className="flex items-center gap-3">{social.icon}<span className="text-sm font-medium text-gray-800">{social.label}</span></div>
                {social.bound ? (
                  <div className="flex items-center gap-1 text-gray-400"><span className="text-sm">{social.bound === "connected" ? "Connected" : String(social.bound)}</span><ChevronRight size={16} /></div>
                ) : (
                  <button onClick={() => toast.info(`${social.label} binding coming soon`)} className="flex items-center gap-1 text-gray-400"><span className="text-sm">Bind</span><ChevronRight size={16} /></button>
                )}
              </div>
            ))}

            <div className="px-4 pt-4 pb-2 border-t border-gray-100 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800">KYC Verification</span>
                <button className="flex items-center gap-1 text-gray-400"><span className="text-sm">Verify</span><ChevronRight size={16} /></button>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-2">Some features require you to pass the KYC real name before you can use them.</p>
              <p className="text-xs text-red-500 font-medium leading-relaxed">Caution! You only get two chances.</p>
            </div>

            <div className="h-4" />
          </div>
        )}

        {activeTab === "activity" && (
          <ActivityFeed userId={user?.id} userEmail={user?.email} />
        )}

        {activeTab === "overview" && <MoreGamesSection />}
      </div>
      <BottomNav />
    </div>
  );

  return (
    <>
      <DesktopLayout />
      <MobileLayout />

      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
      {showAgeRange && <AgeRangeModal onClose={() => setShowAgeRange(false)} onSave={(range) => { saveAgeRange(range); setShowAgeRange(false); }} />}
      {showBirthday && !birthday && <BirthdayModal current={birthday} onClose={() => setShowBirthday(false)} onSave={(val) => { saveBirthday(val); setShowBirthday(false); }} />}
      {showBindEmail && <BindEmailModal onClose={() => setShowBindEmail(false)} onSuccess={() => { setShowBindEmail(false); if (pendingAction === "passkey") setShowPasskeyModal(true); else if (pendingAction === "password") navigate("/login"); setPendingAction(null); }} />}
      {showBindEmailPrompt && <BindEmailPrompt onClose={() => setShowBindEmailPrompt(false)} onConfirm={() => { setShowBindEmailPrompt(false); setShowBindEmail(true); }} />}
      {showPasskeyModal && <PasskeyModal onClose={() => setShowPasskeyModal(false)} onNavigate={() => { setShowPasskeyModal(false); navigate("/passkeys"); }} />}
    </>
  );
}
