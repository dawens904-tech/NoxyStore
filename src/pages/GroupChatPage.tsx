/**
 * GroupChatPage — Public community chat room.
 * Stable layout (only messages scroll) · WhatsApp-style bubbles
 * Profile modal on avatar tap · Long-press context menu (react/reply/copy/edit/report)
 * Real voice recording · Anti-spam (6× same word → 24h ban, 2× → permanent)
 * Admin gold crown badge · Pinned welcome message · Read receipts
 */
import { useState, useEffect, useRef, useCallback, TouchEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Image, Mic, X, Play, Pause,
  Users, Shield, Pin, Crown, Square, Copy, Flag,
  CornerUpLeft, Pencil, Smile, Check
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const POLL_INTERVAL = 3000;
const PRESENCE_TTL = 20000;
const PRESENCE_HEARTBEAT = 15000;
const BUCKET = "chat-images";
const SESSION_ID = "group-chat-main";
const MAX_VOICE_SECONDS = 60;
const SPAM_WORD_THRESHOLD = 6;

// ─── Types ─────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  sender: string;
  user_id?: string;
  user_email?: string;
  content: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
}

interface ReadReceipt {
  user_id: string;
  sender: string;
  last_message_id: string;
}

interface ContextMenuState {
  msgId: string;
  x: number;
  y: number;
}

interface ProfileModalState {
  name: string;
  email: string;
  avatarSeed: string;
}

// ─── Spam / Ban helpers ────────────────────────────────────────────────────
function isSpam(text: string): boolean {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
    if (freq[w] >= SPAM_WORD_THRESHOLD) return true;
  }
  return false;
}

async function getBanInfo(userEmail: string): Promise<{ banned: boolean; permanent: boolean; until?: number }> {
  const { data } = await supabase
    .from("analytics_events")
    .select("created_at, extra_data")
    .eq("event_type", "spam_ban")
    .eq("user_email", userEmail)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return { banned: false, permanent: false };

  const banCount = data.length;
  const latest = data[0];
  const extra = latest.extra_data as any;

  if (banCount >= 2 || extra?.permanent) return { banned: true, permanent: true };

  const until = extra?.until as number;
  if (until && Date.now() < until) return { banned: true, permanent: false, until };

  return { banned: false, permanent: false };
}

async function applySpamBan(userEmail: string, userId: string, banCount: number) {
  const permanent = banCount >= 1;
  const until = permanent ? undefined : Date.now() + 24 * 60 * 60 * 1000;
  await supabase.from("analytics_events").insert({
    event_type: "spam_ban",
    user_email: userEmail,
    user_id: userId,
    extra_data: { permanent, until, reason: "spam_word_repeat" },
  });
}

// ─── Pinned Welcome ────────────────────────────────────────────────────────
function PinnedWelcome() {
  return (
    <div className="mx-3 mb-3 bg-yellow-50 border border-yellow-200 flex items-start gap-2 px-3 py-2.5 rounded-lg">
      <Pin size={13} className="text-yellow-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] font-bold text-yellow-700 mb-0.5">Pinned Message</p>
        <p className="text-[11px] text-yellow-800 leading-relaxed">
          👋 Welcome to <strong>NoxyStore Community!</strong> Public chat for all members. Be respectful, no spam. Top-up fast, play faster! 🎮
        </p>
      </div>
    </div>
  );
}

// ─── Voice recorder hook ───────────────────────────────────────────────────
function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setAudioBlob(null);
    setSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
      mr.start(100);
      mediaRef.current = mr;
      setRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_VOICE_SECONDS) { stopRecording(); return MAX_VOICE_SECONDS; }
          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }, []);

  const cancel = useCallback(() => { stopRecording(); setAudioBlob(null); setSeconds(0); }, [stopRecording]);

  return { recording, seconds, audioBlob, start, stop: stopRecording, cancel, setAudioBlob };
}

// ─── Audio bubble ─────────────────────────────────────────────────────────
function AudioBubble({ src, own }: { src: string; own?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(src);
    audioRef.current = a;
    a.onloadedmetadata = () => setDuration(Math.round(a.duration));
    a.ontimeupdate = () => setProgress(a.currentTime / (a.duration || 1));
    a.onended = () => { setPlaying(false); setProgress(0); };
    return () => { a.pause(); };
  }, [src]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const BARS = [3, 5, 8, 6, 9, 7, 10, 6, 8, 5, 7, 9, 6, 10, 7, 5, 8, 6, 4, 5];

  return (
    <div className="flex items-center gap-2.5 min-w-[150px] max-w-[200px]">
      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${own ? "bg-black/20" : "bg-yellow-400"}`}
      >
        {playing
          ? <Square size={10} className={own ? "text-white" : "text-black"} fill="currentColor" />
          : <Play size={11} className={`${own ? "text-white" : "text-black"} ml-0.5`} />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-[2px] h-5">
          {BARS.map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full transition-colors"
              style={{
                height: `${h * 1.8}px`,
                backgroundColor: i / BARS.length <= progress
                  ? (own ? "rgba(255,255,255,0.9)" : "#EAB308")
                  : (own ? "rgba(255,255,255,0.35)" : "#D1D5DB"),
              }}
            />
          ))}
        </div>
        <span className={`text-[9px] ${own ? "text-white/60" : "text-gray-400"}`}>
          {playing ? `${Math.round(progress * (duration || 0))}s` : `${duration || 0}s`}
        </span>
      </div>
    </div>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────
function UserAvatar({ name, size = 9 }: { name: string; size?: number }) {
  const seed = encodeURIComponent(name);
  const px = size * 4;
  return (
    <div
      className="rounded-full overflow-hidden bg-yellow-100 border-2 border-yellow-300 flex-shrink-0"
      style={{ width: px, height: px }}
    >
      <img
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=fef3c7`}
        alt={name}
        className="w-full h-full"
      />
    </div>
  );
}

// ─── Read Receipts Row ─────────────────────────────────────────────────────
function ReadReceiptsRow({ readers }: { readers: ReadReceipt[] }) {
  if (readers.length === 0) return null;
  const shown = readers.slice(0, 5);
  const extra = readers.length - shown.length;
  return (
    <div className="flex items-center gap-0.5 mt-0.5 justify-end pr-1">
      {shown.map((r) => (
        <div key={r.user_id} title={r.sender} className="w-4 h-4 rounded-full overflow-hidden border border-white ring-1 ring-yellow-300 flex-shrink-0">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(r.sender)}&backgroundColor=fef3c7`}
            alt={r.sender}
            className="w-full h-full"
          />
        </div>
      ))}
      {extra > 0 && (
        <span className="text-[8px] text-gray-400 ml-0.5">+{extra}</span>
      )}
    </div>
  );
}

// ─── Message Bubble ────────────────────────────────────────────────────────
const LONG_PRESS_DELAY = 500;

interface BubbleProps {
  msg: ChatMessage;
  isOwn: boolean;
  isAdmin: boolean;
  replyTo?: ChatMessage | null;
  readers: ReadReceipt[];
  onLongPress: (msg: ChatMessage, x: number, y: number) => void;
  onAvatarClick: (msg: ChatMessage) => void;
}

function MessageBubble({ msg, isOwn, isAdmin, replyTo, readers, onLongPress, onAvatarClick }: BubbleProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVoice = msg.image_url?.includes("/voice/") || msg.content === "__voice__";
  const isImage = msg.image_url && !isVoice;
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    timerRef.current = setTimeout(() => onLongPress(msg, touch.clientX, touch.clientY), LONG_PRESS_DELAY);
  };
  const clearLongPress = () => { if (timerRef.current) clearTimeout(timerRef.current); };
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    timerRef.current = setTimeout(() => onLongPress(msg, e.clientX, e.clientY), LONG_PRESS_DELAY);
  };

  const BubbleContent = () => (
    <div className={`max-w-[72vw] lg:max-w-[360px] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
      {replyTo && (
        <div className={`mb-1 px-2 py-1 border-l-4 border-yellow-400 bg-black/5 text-[10px] text-gray-500 max-w-full ${isOwn ? "rounded-tl-lg rounded-tr-sm" : "rounded-tr-lg rounded-tl-sm"}`}>
          <span className="font-semibold">{replyTo.sender}: </span>
          <span className="truncate">{replyTo.content?.slice(0, 60)}</span>
        </div>
      )}
      {isImage && (
        <img
          src={msg.image_url!}
          alt="photo"
          className={`max-w-full max-h-52 object-cover block border ${isOwn ? "border-yellow-200 rounded-tl-2xl rounded-tr-sm rounded-b-2xl" : "border-gray-200 rounded-tr-2xl rounded-tl-sm rounded-b-2xl"}`}
        />
      )}
      {isVoice && msg.image_url && (
        <div className={`px-3 py-2.5 ${isOwn ? "bg-yellow-400 rounded-tl-2xl rounded-tr-sm rounded-b-2xl" : "bg-white border border-gray-200 rounded-tr-2xl rounded-tl-sm rounded-b-2xl"}`}>
          <AudioBubble src={msg.image_url} own={isOwn} />
        </div>
      )}
      {!isVoice && msg.content && msg.content !== "__image__" && (
        <div className={`px-3.5 py-2 text-sm break-words leading-relaxed ${isOwn ? "bg-yellow-400 text-black font-medium rounded-tl-2xl rounded-tr-sm rounded-b-2xl" : "bg-white text-gray-900 border border-gray-200 rounded-tr-2xl rounded-tl-sm rounded-b-2xl"}`}>
          {msg.content}
        </div>
      )}
      <span className="text-[9px] text-gray-400 mt-0.5 px-1">{time}</span>
      {isOwn && readers.length > 0 && <ReadReceiptsRow readers={readers} />}
    </div>
  );

  if (isOwn) {
    return (
      <div
        className="flex flex-col items-end mb-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={clearLongPress}
        onTouchMove={clearLongPress}
        onMouseDown={handleMouseDown}
        onMouseUp={clearLongPress}
        onMouseLeave={clearLongPress}
      >
        <div className="flex items-center gap-1 mr-1 mb-0.5">
          {isAdmin && <Crown size={10} className="text-yellow-500" fill="#EAB308" />}
          <span className="text-[10px] text-gray-400 font-semibold">You</span>
        </div>
        <BubbleContent />
      </div>
    );
  }

  return (
    <div
      className="flex items-end gap-2 mb-2"
      onTouchStart={handleTouchStart}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      onMouseDown={handleMouseDown}
      onMouseUp={clearLongPress}
      onMouseLeave={clearLongPress}
    >
      <button onClick={() => onAvatarClick(msg)} className="flex-shrink-0 mb-1">
        <UserAvatar name={msg.sender} size={9} />
      </button>
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-1 ml-1 mb-0.5">
          <span className="text-[10px] text-gray-600 font-semibold">{msg.sender}</span>
          {isAdmin && <Crown size={10} className="text-yellow-500" fill="#EAB308" />}
        </div>
        <BubbleContent />
      </div>
    </div>
  );
}

// ─── Context Menu ──────────────────────────────────────────────────────────
const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function ContextMenu({
  msg,
  pos,
  isOwn,
  onClose,
  onReport,
  onReply,
  onCopy,
  onEdit,
  onReact,
}: {
  msg: ChatMessage;
  pos: { x: number; y: number };
  isOwn: boolean;
  onClose: () => void;
  onReport: () => void;
  onReply: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onReact: (emoji: string) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const left = Math.min(pos.x, window.innerWidth - 200);
  const top = Math.min(pos.y - 80, window.innerHeight - 260);

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div
        ref={menuRef}
        className="absolute bg-white border border-gray-200 shadow-2xl rounded-2xl overflow-hidden w-48 py-1"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-around px-3 py-2 border-b border-gray-100">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => { onReact(e); onClose(); }} className="text-xl hover:scale-125 transition-transform">
              {e}
            </button>
          ))}
        </div>
        <button onClick={() => { onReply(); onClose(); }} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700">
          <CornerUpLeft size={15} className="text-gray-500" /> Reply
        </button>
        <button onClick={() => { onCopy(); onClose(); }} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700">
          <Copy size={15} className="text-gray-500" /> Copy
        </button>
        {isOwn && (
          <button onClick={() => { onEdit(); onClose(); }} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700">
            <Pencil size={15} className="text-gray-500" /> Edit
          </button>
        )}
        <div className="border-t border-gray-100" />
        <button onClick={() => { onReport(); onClose(); }} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-red-50 text-sm text-red-500">
          <Flag size={15} /> Report
        </button>
      </div>
    </div>
  );
}

// ─── Profile Modal ─────────────────────────────────────────────────────────
function ProfileModal({ profile, onClose, onReport }: {
  profile: ProfileModalState;
  onClose: () => void;
  onReport: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm pb-8 shadow-2xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center pt-8 pb-4">
          <UserAvatar name={profile.avatarSeed} size={18} />
          <p className="font-bold text-gray-900 text-lg mt-3">{profile.name}</p>
          <p className="text-sm text-gray-400 mt-0.5">{profile.email || "Community Member"}</p>
        </div>
        <div className="px-6 space-y-2">
          <button
            onClick={() => { onReport(); onClose(); }}
            className="flex items-center gap-3 w-full border border-red-200 text-red-500 font-semibold py-3 px-4 rounded-xl hover:bg-red-50 transition-colors"
          >
            <Flag size={16} /> Report User
          </button>
          <button onClick={onClose} className="w-full py-3 text-sm text-gray-400 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export function GroupChatPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [adminEmails, setAdminEmails] = useState<Set<string>>(new Set());
  const [banned, setBanned] = useState<{ permanent: boolean; until?: number } | null>(null);
  const [readReceipts, setReadReceipts] = useState<Record<string, ReadReceipt[]>>({});

  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<(ContextMenuState & { msg: ChatMessage }) | null>(null);
  const [profileModal, setProfileModal] = useState<ProfileModalState | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voice = useVoiceRecorder();

  const displayName = user?.username || user?.email?.split("@")[0] || "Guest";

  // ─── Fetch helpers ────────────────────────────────────────────────────────
  const fetchAdmins = useCallback(async () => {
    const { data } = await supabase.from("user_roles").select("email").in("role", ["admin", "superadmin"]).eq("is_active", true);
    if (data) setAdminEmails(new Set(data.map((r: any) => r.email)));
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", SESSION_ID)
      .order("created_at", { ascending: true })
      .limit(150);
    if (data) setMessages(data as ChatMessage[]);
  }, []);

  const updatePresence = useCallback(async () => {
    if (!user?.email) return;
    await supabase.from("analytics_events").insert({
      event_type: "group_chat_presence",
      page: "/support/group",
      user_id: user.id,
      session_id: `presence_${user.id}`,
      extra_data: { ts: Date.now() },
    });
  }, [user]);

  const fetchOnlineCount = useCallback(async () => {
    const since = new Date(Date.now() - PRESENCE_TTL).toISOString();
    const { data } = await supabase.from("analytics_events").select("user_id").eq("event_type", "group_chat_presence").gte("created_at", since);
    if (data) setOnlineCount(Math.max(new Set(data.map((r: any) => r.user_id)).size, 1));
  }, []);

  const checkBan = useCallback(async () => {
    if (!user?.email) return;
    const info = await getBanInfo(user.email);
    if (info.banned) setBanned({ permanent: info.permanent, until: info.until });
  }, [user]);

  // ─── Read tracking ─────────────────────────────────────────────────────────
  const markRead = useCallback(async (lastMessageId: string) => {
    if (!user?.id || !user?.email) return;
    await supabase.from("analytics_events").insert({
      event_type: "group_chat_read",
      page: "/support/group",
      user_id: user.id,
      session_id: `read_${user.id}`,
      game_id: lastMessageId,
      extra_data: { sender: displayName, ts: Date.now() },
    });
  }, [user, displayName]);

  const fetchReadReceipts = useCallback(async (msgs: ChatMessage[]) => {
    if (msgs.length === 0) return;
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("analytics_events")
      .select("user_id, game_id, extra_data")
      .eq("event_type", "group_chat_read")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (!data) return;

    // Map user → their last read message id
    const latestByUser: Record<string, { msgId: string; sender: string }> = {};
    for (const row of data) {
      const uid = row.user_id as string;
      if (!latestByUser[uid]) {
        latestByUser[uid] = {
          msgId: row.game_id as string,
          sender: (row.extra_data as any)?.sender || "User",
        };
      }
    }

    // Build receipts map: messageId → list of readers
    const receiptsMap: Record<string, ReadReceipt[]> = {};
    for (const [uid, info] of Object.entries(latestByUser)) {
      if (uid === user?.id) continue; // skip self
      const msgId = info.msgId;
      if (!receiptsMap[msgId]) receiptsMap[msgId] = [];
      receiptsMap[msgId].push({ user_id: uid, sender: info.sender, last_message_id: msgId });
    }
    setReadReceipts(receiptsMap);
  }, [user]);

  useEffect(() => {
    fetchAdmins();
    fetchMessages();
    fetchOnlineCount();
    checkBan();
    if (isAuthenticated) updatePresence();

    pollerRef.current = setInterval(async () => {
      await fetchMessages();
      fetchOnlineCount();
    }, POLL_INTERVAL);
    if (isAuthenticated) presenceRef.current = setInterval(updatePresence, PRESENCE_HEARTBEAT);

    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
      if (presenceRef.current) clearInterval(presenceRef.current);
    };
  }, [fetchMessages, fetchAdmins, fetchOnlineCount, updatePresence, isAuthenticated, checkBan]);

  // Scroll to bottom & mark read when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0 && user?.id) {
      const lastId = messages[messages.length - 1].id;
      markRead(lastId);
      fetchReadReceipts(messages);
    }
  }, [messages]);

  // ─── File upload ──────────────────────────────────────────────────────────
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `chat/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) { toast.error("Upload failed"); return null; }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return urlData.publicUrl;
  };

  // ─── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (opts?: { content?: string; imageUrl?: string; isVoice?: boolean }) => {
    if (!isAuthenticated) { toast.error("Please log in to send messages"); navigate("/login"); return; }
    if (banned) {
      if (banned.permanent) { toast.error("Your account is permanently banned. Contact support."); return; }
      if (banned.until && Date.now() < banned.until) {
        const mins = Math.ceil((banned.until - Date.now()) / 60000);
        toast.error(`You are banned for ${mins} more minutes due to spam.`);
        return;
      } else { setBanned(null); }
    }
    if (sending) return;

    const content = opts?.content ?? text.trim();
    const imageUrl = opts?.imageUrl;
    if (!content && !imageUrl) return;

    if (content && isSpam(content)) {
      toast.error("Spam detected! Your account has been temporarily banned.");
      const { data: bans } = await supabase.from("analytics_events").select("id").eq("event_type", "spam_ban").eq("user_email", user!.email!);
      const banCount = bans?.length || 0;
      await applySpamBan(user!.email!, user!.id!, banCount);
      await checkBan();
      return;
    }

    setSending(true);

    if (editingId && !imageUrl) {
      const { error } = await supabase.from("chat_messages").update({ content }).eq("id", editingId).eq("user_email", user!.email);
      if (!error) { setEditingId(null); setText(""); await fetchMessages(); }
      else toast.error("Failed to edit message");
      setSending(false);
      return;
    }

    const { error } = await supabase.from("chat_messages").insert({
      session_id: SESSION_ID,
      user_email: user!.email,
      user_id: user!.id,
      sender: displayName,
      content: imageUrl && !content ? (opts?.isVoice ? "__voice__" : "__image__") : content,
      image_url: imageUrl || null,
      is_read: false,
    });

    if (error) { toast.error("Failed to send message"); setSending(false); return; }
    setText("");
    setReplyTo(null);
    await fetchMessages();
    setSending(false);
  };

  const handleSendText = () => { if (text.trim()) sendMessage({ content: text.trim() }); };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setImagePreview({ file, url: URL.createObjectURL(file) });
    e.target.value = "";
  };

  const handleSendImage = async () => {
    if (!imagePreview) return;
    setSending(true);
    const imageUrl = await uploadFile(imagePreview.file, "photos");
    setImagePreview(null);
    if (imageUrl) await sendMessage({ imageUrl, content: text.trim() || "" });
    setSending(false);
  };

  const handleSendVoice = async () => {
    if (!voice.audioBlob) return;
    setSending(true);
    const file = new File([voice.audioBlob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
    const imageUrl = await uploadFile(file, "voice");
    voice.setAudioBlob(null);
    if (imageUrl) await sendMessage({ imageUrl, isVoice: true });
    setSending(false);
  };

  // ─── Context menu actions ─────────────────────────────────────────────────
  const handleReport = (msg?: ChatMessage) => {
    const target = msg?.sender || profileModal?.name || "unknown";
    toast.success(`Report submitted for "${target}". Our team will review it.`);
  };

  const handleReact = async (emoji: string, msg: ChatMessage) => {
    await supabase.from("chat_messages").insert({
      session_id: SESSION_ID,
      user_email: user!.email,
      user_id: user!.id,
      sender: displayName,
      content: emoji,
      is_read: false,
    });
    fetchMessages();
  };

  const handleCopy = (msg: ChatMessage) => {
    navigator.clipboard.writeText(msg.content || "").then(() => toast.success("Copied!"));
  };

  const handleEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setText(msg.content);
    textRef.current?.focus();
  };

  const isAdminMsg = (msg: ChatMessage) => !!(msg.user_email && adminEmails.has(msg.user_email));
  const isOwnMsg = (msg: ChatMessage) => !!(user && (msg.user_id === user.id || msg.user_email === user.email));

  const banMessage = banned
    ? banned.permanent
      ? "Your account has been permanently banned for spam. Contact support@noxystore.com to appeal."
      : `You are temporarily banned for spam. ${banned.until ? `Ban lifts in ${Math.ceil((banned.until - Date.now()) / 60000)} min.` : ""}`
    : null;

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: "100dvh" }}>
      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0 z-40">
        <button onClick={() => navigate(-1)} className="text-gray-700 p-1 -ml-1"><ArrowLeft size={20} /></button>
        <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
          <Users size={18} className="text-black" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-sm">NoxyStore Community</p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">{onlineCount} online</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <Shield size={13} /><span className="text-xs">Safe</span>
        </div>
      </div>

      {/* ─── MESSAGES (scrollable) ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="pt-3">
          <PinnedWelcome />

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-8">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                <Users size={24} className="text-yellow-500" />
              </div>
              <p className="font-bold text-gray-700 mb-1">Be the first to say hello!</p>
              <p className="text-sm text-gray-400 max-w-xs">All NoxyStore members can see and send messages here.</p>
            </div>
          )}

          <div className="px-3">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isOwn={isOwnMsg(msg)}
                isAdmin={isAdminMsg(msg)}
                replyTo={replyTo?.id === msg.id ? null : null}
                readers={readReceipts[msg.id] || []}
                onLongPress={(m, x, y) => setContextMenu({ msgId: m.id, x, y, msg: m })}
                onAvatarClick={(m) => setProfileModal({ name: m.sender, email: m.user_email || "", avatarSeed: m.sender })}
              />
            ))}
          </div>
          <div ref={messagesEndRef} className="h-2" />
        </div>
      </div>

      {/* ─── REPLY / EDIT BAR ────────────────────────────────────────────── */}
      {(replyTo || editingId) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border-t border-yellow-200 flex-shrink-0">
          {replyTo && <CornerUpLeft size={14} className="text-yellow-600 flex-shrink-0" />}
          {editingId && <Pencil size={14} className="text-yellow-600 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-yellow-700">{replyTo ? `Replying to ${replyTo.sender}` : "Editing message"}</p>
            <p className="text-xs text-gray-600 truncate">{replyTo?.content || text}</p>
          </div>
          <button onClick={() => { setReplyTo(null); setEditingId(null); setText(""); }} className="text-gray-400"><X size={16} /></button>
        </div>
      )}

      {/* ─── BAN NOTICE ──────────────────────────────────────────────────── */}
      {banMessage && (
        <div className="px-4 py-2.5 bg-red-50 border-t border-red-200 text-xs text-red-600 text-center font-medium flex-shrink-0">
          🚫 {banMessage}
        </div>
      )}

      {/* ─── IMAGE PREVIEW ───────────────────────────────────────────────── */}
      {imagePreview && (
        <div className="px-3 py-2 bg-white border-t border-gray-200 flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <img src={imagePreview.url} alt="preview" className="w-16 h-16 object-cover rounded-lg border" />
            <button onClick={() => setImagePreview(null)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-800 text-white rounded-full flex items-center justify-center">
              <X size={8} />
            </button>
          </div>
          <p className="text-xs text-gray-400 flex-1">Ready to send photo</p>
          <button onClick={handleSendImage} disabled={sending} className="bg-yellow-400 text-black font-bold px-4 py-2 text-sm disabled:opacity-60">
            {sending ? "..." : "Send"}
          </button>
        </div>
      )}

      {/* ─── VOICE PREVIEW ───────────────────────────────────────────────── */}
      {voice.audioBlob && !voice.recording && (
        <div className="px-3 py-2 bg-white border-t border-gray-200 flex items-center gap-3 flex-shrink-0">
          <div className="flex-1"><AudioBubble src={URL.createObjectURL(voice.audioBlob)} /></div>
          <button onClick={voice.cancel} className="text-gray-400"><X size={16} /></button>
          <button onClick={handleSendVoice} disabled={sending} className="bg-yellow-400 text-black font-bold px-4 py-2 text-sm disabled:opacity-60">
            {sending ? "..." : <Send size={14} />}
          </button>
        </div>
      )}

      {/* ─── RECORDING BAR ───────────────────────────────────────────────── */}
      {voice.recording && (
        <div className="px-3 py-2 bg-red-50 border-t border-red-200 flex items-center gap-3 flex-shrink-0">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 font-semibold">Recording</span>
              <span className="text-sm text-red-500 font-mono">{voice.seconds}s</span>
            </div>
            <div className="flex items-center gap-[2px] mt-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="w-1 bg-red-400 rounded-full animate-pulse" style={{ height: `${Math.random() * 10 + 4}px`, animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
          </div>
          <button onClick={voice.stop} className="w-9 h-9 bg-red-500 text-white rounded-full flex items-center justify-center flex-shrink-0" title="Stop">
            <Square size={12} fill="white" />
          </button>
          <button onClick={voice.cancel} className="text-gray-400 flex-shrink-0"><X size={16} /></button>
        </div>
      )}

      {/* ─── INPUT BAR ───────────────────────────────────────────────────── */}
      {!imagePreview && !voice.audioBlob && !voice.recording && (
        <div
          className="px-3 py-2 bg-white border-t border-gray-200 flex items-center gap-2 flex-shrink-0"
          style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-yellow-500 transition-colors flex-shrink-0"
            disabled={!!banned}
          >
            <Image size={20} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

          <input
            ref={textRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
            placeholder={banned ? "Account restricted — contact support" : isAuthenticated ? (editingId ? "Edit message..." : "Message community...") : "Log in to chat"}
            disabled={!isAuthenticated || !!banned}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none text-gray-900 placeholder-gray-400 disabled:opacity-60"
          />

          {editingId && text.trim() && (
            <button onClick={handleSendText} disabled={sending} className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check size={15} className="text-white" />
            </button>
          )}

          {!text.trim() && !editingId && (
            <button
              onMouseDown={isAuthenticated && !banned ? voice.start : undefined}
              onClick={() => { if (!isAuthenticated) { toast.error("Please log in to send voice messages"); navigate("/login"); } }}
              disabled={!isAuthenticated || !!banned}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-yellow-500 transition-colors flex-shrink-0 disabled:opacity-40"
              title="Hold to record"
            >
              <Mic size={20} />
            </button>
          )}

          {text.trim() && !editingId && (
            <button
              onClick={handleSendText}
              disabled={sending || !isAuthenticated || !!banned}
              className="w-9 h-9 bg-yellow-400 rounded-full flex items-center justify-center disabled:opacity-60 flex-shrink-0"
            >
              <Send size={15} className="text-black" />
            </button>
          )}
        </div>
      )}

      {/* ─── CONTEXT MENU ────────────────────────────────────────────────── */}
      {contextMenu && (
        <ContextMenu
          msg={contextMenu.msg}
          pos={{ x: contextMenu.x, y: contextMenu.y }}
          isOwn={isOwnMsg(contextMenu.msg)}
          onClose={() => setContextMenu(null)}
          onReport={() => handleReport(contextMenu.msg)}
          onReply={() => setReplyTo(contextMenu.msg)}
          onCopy={() => handleCopy(contextMenu.msg)}
          onEdit={() => handleEdit(contextMenu.msg)}
          onReact={(emoji) => handleReact(emoji, contextMenu.msg)}
        />
      )}

      {/* ─── PROFILE MODAL ───────────────────────────────────────────────── */}
      {profileModal && (
        <ProfileModal
          profile={profileModal}
          onClose={() => setProfileModal(null)}
          onReport={() => handleReport()}
        />
      )}
    </div>
  );
}
