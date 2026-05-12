/**
 * AdminGroupChatPage — Moderate the NoxyStore Community group chat.
 * Delete messages · Pin/unpin messages · Mute (24h) or permanently ban users.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import {
  Trash2, Pin, PinOff, VolumeX, Volume2, Ban,
  RefreshCw, Search, ChevronDown, Shield, Crown,
  MessageSquare, Users, AlertTriangle, X
} from "lucide-react";

const SESSION_ID = "group-chat-main";
const POLL_INTERVAL = 5000;

interface GroupMessage {
  id: string;
  sender: string;
  user_email?: string;
  user_id?: string;
  content: string;
  image_url?: string;
  created_at: string;
  is_read: boolean;
}

interface BanRecord {
  user_email: string;
  permanent: boolean;
  until?: number;
}

// ─── User Avatar ────────────────────────────────────────────────────────────
function MiniAvatar({ name }: { name: string }) {
  const seed = encodeURIComponent(name);
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-yellow-100 border border-yellow-300 flex-shrink-0">
      <img
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=fef3c7`}
        alt={name}
        className="w-full h-full"
      />
    </div>
  );
}

// ─── Confirm Modal ──────────────────────────────────────────────────────────
function ConfirmModal({
  title,
  description,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 shadow-2xl z-10">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? "bg-red-100" : "bg-yellow-100"}`}>
          <AlertTriangle size={22} className={danger ? "text-red-500" : "text-yellow-600"} />
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-2">{title}</h3>
        <p className="text-sm text-gray-500 text-center mb-6">{description}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-bold py-2.5 rounded-xl text-sm text-white ${danger ? "bg-red-500 hover:bg-red-600" : "bg-yellow-400 hover:bg-yellow-300 text-black"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ban Modal ──────────────────────────────────────────────────────────────
function BanModal({
  userEmail,
  onClose,
  onBan,
}: {
  userEmail: string;
  onClose: () => void;
  onBan: (email: string, permanent: boolean, hours: number) => void;
}) {
  const [type, setType] = useState<"temp" | "perm">("temp");
  const [hours, setHours] = useState(24);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 shadow-2xl z-10">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Ban size={22} className="text-red-500" />
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">Ban User</h3>
        <p className="text-xs text-gray-400 text-center mb-5 break-all">{userEmail}</p>

        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:border-orange-300 transition-colors">
            <input type="radio" name="banType" checked={type === "temp"} onChange={() => setType("temp")} className="accent-orange-400" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Temporary Ban</p>
              <p className="text-xs text-gray-400">User will be unbanned after the set period</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:border-red-300 transition-colors">
            <input type="radio" name="banType" checked={type === "perm"} onChange={() => setType("perm")} className="accent-red-500" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Permanent Ban</p>
              <p className="text-xs text-gray-400">User must contact support to appeal</p>
            </div>
          </label>
        </div>

        {type === "temp" && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
            <div className="relative">
              <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 appearance-none bg-white pr-10"
              >
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>7 days</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        <button
          onClick={() => onBan(userEmail, type === "perm", hours)}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
        >
          Confirm Ban
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export function AdminGroupChatPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [mutedEmails, setMutedEmails] = useState<Set<string>>(new Set());
  const [bannedEmails, setBannedEmails] = useState<BanRecord[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{ type: string; payload: any } | null>(null);
  const [banModal, setBanModal] = useState<{ email: string } | null>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    const { data, count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact" })
      .eq("session_id", SESSION_ID)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) { setMessages(data as GroupMessage[]); setTotalMessages(count || 0); }
    setLoading(false);
  }, []);

  const fetchPinned = useCallback(async () => {
    const { data } = await supabase
      .from("analytics_events")
      .select("game_id")
      .eq("event_type", "group_chat_pin");
    if (data) setPinnedIds(new Set(data.map((r: any) => r.game_id as string)));
  }, []);

  const fetchMuted = useCallback(async () => {
    const { data } = await supabase
      .from("analytics_events")
      .select("user_email, extra_data")
      .eq("event_type", "group_chat_mute")
      .order("created_at", { ascending: false });
    if (data) {
      const now = Date.now();
      const active = data.filter((r: any) => {
        const until = (r.extra_data as any)?.until;
        return !until || until > now;
      });
      setMutedEmails(new Set(active.map((r: any) => r.user_email as string)));
    }
  }, []);

  const fetchBanned = useCallback(async () => {
    const { data } = await supabase
      .from("analytics_events")
      .select("user_email, extra_data, created_at")
      .eq("event_type", "spam_ban")
      .order("created_at", { ascending: false });
    if (!data) return;
    const map: Record<string, BanRecord> = {};
    for (const row of data) {
      const email = row.user_email as string;
      if (!map[email]) {
        const extra = row.extra_data as any;
        map[email] = { user_email: email, permanent: extra?.permanent || false, until: extra?.until };
      }
    }
    setBannedEmails(Object.values(map));
  }, []);

  const fetchOnlineCount = useCallback(async () => {
    const since = new Date(Date.now() - 20000).toISOString();
    const { data } = await supabase.from("analytics_events").select("user_id").eq("event_type", "group_chat_presence").gte("created_at", since);
    if (data) setOnlineCount(new Set(data.map((r: any) => r.user_id)).size);
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchPinned();
    fetchMuted();
    fetchBanned();
    fetchOnlineCount();
    pollerRef.current = setInterval(() => {
      fetchMessages();
      fetchOnlineCount();
    }, POLL_INTERVAL);
    return () => { if (pollerRef.current) clearInterval(pollerRef.current); };
  }, [fetchMessages, fetchPinned, fetchMuted, fetchBanned, fetchOnlineCount]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) { toast.error("Failed to delete message"); return; }
    toast.success("Message deleted");
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setConfirmAction(null);
  };

  const togglePin = async (msg: GroupMessage) => {
    const isPinned = pinnedIds.has(msg.id);
    if (isPinned) {
      await supabase.from("analytics_events").delete().eq("event_type", "group_chat_pin").eq("game_id", msg.id);
      setPinnedIds((prev) => { const s = new Set(prev); s.delete(msg.id); return s; });
      toast.success("Message unpinned");
    } else {
      await supabase.from("analytics_events").insert({
        event_type: "group_chat_pin",
        game_id: msg.id,
        user_id: user?.id,
        extra_data: { sender: msg.sender, content: msg.content?.slice(0, 100) },
      });
      setPinnedIds((prev) => new Set(prev).add(msg.id));
      toast.success("Message pinned");
    }
  };

  const toggleMute = async (email: string, muted: boolean) => {
    if (muted) {
      // Unmute: delete mute records
      await supabase.from("analytics_events").delete().eq("event_type", "group_chat_mute").eq("user_email", email);
      setMutedEmails((prev) => { const s = new Set(prev); s.delete(email); return s; });
      toast.success(`${email} unmuted`);
    } else {
      const until = Date.now() + 24 * 60 * 60 * 1000;
      await supabase.from("analytics_events").insert({
        event_type: "group_chat_mute",
        user_email: email,
        user_id: user?.id,
        extra_data: { until, reason: "admin_mute" },
      });
      setMutedEmails((prev) => new Set(prev).add(email));
      toast.success(`${email} muted for 24h`);
    }
    setConfirmAction(null);
  };

  const applyBan = async (email: string, permanent: boolean, hours: number) => {
    const until = permanent ? undefined : Date.now() + hours * 60 * 60 * 1000;
    await supabase.from("analytics_events").insert({
      event_type: "spam_ban",
      user_email: email,
      user_id: user?.id,
      extra_data: { permanent, until, reason: "admin_ban" },
    });
    setBannedEmails((prev) => [...prev.filter((b) => b.user_email !== email), { user_email: email, permanent, until }]);
    setBanModal(null);
    toast.success(`${email} ${permanent ? "permanently banned" : `banned for ${hours}h`}`);
  };

  const unban = async (email: string) => {
    await supabase.from("analytics_events").delete().eq("event_type", "spam_ban").eq("user_email", email);
    setBannedEmails((prev) => prev.filter((b) => b.user_email !== email));
    toast.success(`${email} unbanned`);
    setConfirmAction(null);
  };

  const filteredMessages = messages.filter((m) =>
    !search || m.sender.toLowerCase().includes(search.toLowerCase()) || m.content?.toLowerCase().includes(search.toLowerCase())
  );

  const isBanned = (email?: string) => email ? bannedEmails.some((b) => b.user_email === email) : false;
  const isMuted = (email?: string) => email ? mutedEmails.has(email) : false;

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Group Chat Moderation</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage community chat — delete, pin, mute &amp; ban</p>
          </div>
          <button
            onClick={() => { fetchMessages(); fetchMuted(); fetchBanned(); toast.success("Refreshed"); }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-semibold border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { icon: <MessageSquare size={16} className="text-yellow-600" />, label: "Total Messages", value: totalMessages, bg: "bg-yellow-50" },
            { icon: <Users size={16} className="text-green-600" />, label: "Online Now", value: onlineCount, bg: "bg-green-50" },
            { icon: <VolumeX size={16} className="text-orange-600" />, label: "Muted Users", value: mutedEmails.size, bg: "bg-orange-50" },
            { icon: <Ban size={16} className="text-red-600" />, label: "Banned Users", value: bannedEmails.length, bg: "bg-red-50" },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-2xl p-4 flex items-center gap-3`}>
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">{stat.icon}</div>
              <div>
                <p className="text-xl font-black text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pinned Messages Summary */}
        {pinnedIds.size > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Pin size={14} className="text-yellow-600" />
              <span className="text-sm font-bold text-yellow-800">{pinnedIds.size} pinned message{pinnedIds.size > 1 ? "s" : ""}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {messages.filter((m) => pinnedIds.has(m.id)).map((m) => (
                <div key={m.id} className="flex items-center gap-2 bg-white border border-yellow-200 rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-gray-600 font-semibold">{m.sender}:</span>
                  <span className="text-gray-500 truncate max-w-[120px]">{m.content?.slice(0, 40) || "[media]"}</span>
                  <button onClick={() => togglePin(m)} className="text-yellow-600 hover:text-yellow-800">
                    <PinOff size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Banned Users List */}
        {bannedEmails.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Ban size={14} className="text-red-600" />
              <span className="text-sm font-bold text-red-800">Banned Users</span>
            </div>
            <div className="space-y-2">
              {bannedEmails.map((b) => (
                <div key={b.user_email} className="flex items-center justify-between bg-white border border-red-100 rounded-xl px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{b.user_email}</p>
                    <p className="text-xs text-red-500">
                      {b.permanent ? "Permanently banned" : b.until ? `Until ${new Date(b.until).toLocaleString()}` : "Banned"}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmAction({ type: "unban", payload: b.user_email })}
                    className="text-xs text-green-600 font-semibold border border-green-200 px-3 py-1 rounded-lg hover:bg-green-50"
                  >
                    Unban
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user or message..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-yellow-400 bg-white"
          />
        </div>

        {/* Messages Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-bold text-gray-900 text-sm">{filteredMessages.length} Messages</span>
            <span className="text-xs text-gray-400">Most recent first</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No messages found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMessages.map((msg) => {
                const isPinned = pinnedIds.has(msg.id);
                const isMutedUser = isMuted(msg.user_email);
                const isBannedUser = isBanned(msg.user_email);
                const isVoice = msg.image_url?.includes("/voice/");
                const isImage = msg.image_url && !isVoice;

                return (
                  <div
                    key={msg.id}
                    className={`px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors group ${isPinned ? "bg-yellow-50/40" : ""}`}
                  >
                    <MiniAvatar name={msg.sender} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-bold text-gray-900">{msg.sender}</span>
                        {isPinned && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full">
                            <Pin size={9} /> Pinned
                          </span>
                        )}
                        {isMutedUser && (
                          <span className="text-[10px] font-semibold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full">Muted</span>
                        )}
                        {isBannedUser && (
                          <span className="text-[10px] font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">Banned</span>
                        )}
                        {msg.user_email && (
                          <span className="text-[10px] text-gray-400">{msg.user_email}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 break-words leading-relaxed">
                        {isVoice ? "🎙 Voice message" : isImage ? "🖼 Photo" : msg.content}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Pin */}
                      <button
                        onClick={() => togglePin(msg)}
                        title={isPinned ? "Unpin" : "Pin"}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isPinned ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-gray-100 text-gray-500 hover:bg-yellow-100 hover:text-yellow-700"}`}
                      >
                        {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </button>

                      {/* Mute */}
                      {msg.user_email && (
                        <button
                          onClick={() => setConfirmAction({ type: "mute", payload: { email: msg.user_email, muted: isMutedUser } })}
                          title={isMutedUser ? "Unmute" : "Mute 24h"}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isMutedUser ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-700"}`}
                        >
                          {isMutedUser ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        </button>
                      )}

                      {/* Ban */}
                      {msg.user_email && (
                        <button
                          onClick={() => {
                            if (isBannedUser) {
                              setConfirmAction({ type: "unban", payload: msg.user_email });
                            } else {
                              setBanModal({ email: msg.user_email });
                            }
                          }}
                          title={isBannedUser ? "Unban" : "Ban user"}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isBannedUser ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600"}`}
                        >
                          <Ban size={14} />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => setConfirmAction({ type: "delete", payload: msg.id })}
                        title="Delete message"
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <ConfirmModal
          title={
            confirmAction.type === "delete" ? "Delete Message" :
            confirmAction.type === "mute" ? (confirmAction.payload.muted ? "Unmute User" : "Mute User") :
            "Unban User"
          }
          description={
            confirmAction.type === "delete" ? "This message will be permanently deleted from the group chat." :
            confirmAction.type === "mute" ? (confirmAction.payload.muted ? `Unmute ${confirmAction.payload.email}?` : `Mute ${confirmAction.payload.email} for 24 hours?`) :
            `Unban ${confirmAction.payload}? They will be able to chat again.`
          }
          confirmLabel={
            confirmAction.type === "delete" ? "Delete" :
            confirmAction.type === "mute" ? (confirmAction.payload.muted ? "Unmute" : "Mute") :
            "Unban"
          }
          danger={confirmAction.type === "delete" || (!confirmAction.payload?.muted && confirmAction.type === "mute")}
          onConfirm={() => {
            if (confirmAction.type === "delete") deleteMessage(confirmAction.payload);
            else if (confirmAction.type === "mute") toggleMute(confirmAction.payload.email, confirmAction.payload.muted);
            else if (confirmAction.type === "unban") unban(confirmAction.payload);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Ban Modal */}
      {banModal && (
        <BanModal
          userEmail={banModal.email}
          onClose={() => setBanModal(null)}
          onBan={applyBan}
        />
      )}
    </AdminLayout>
  );
}
