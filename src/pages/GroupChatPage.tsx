/**
 * GroupChatPage — Public community chat room.
 * Real messages saved to DB · online presence tracking · WhatsApp-style voice
 * Pinned welcome message · Admin gold crown badge
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Image, Mic, X, Play, Pause,
  Users, Shield, Pin, Crown, Square
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const POLL_INTERVAL = 3000;
const PRESENCE_INTERVAL = 15000; // update presence every 15s
const BUCKET = "chat-images";
const SESSION_ID = "group-chat-main";
const MAX_VOICE_SECONDS = 60;

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

// ─── Pinned Welcome Message ────────────────────────────────────────────────
function PinnedWelcome() {
  return (
    <div className="mx-4 mb-4 bg-yellow-50 border border-yellow-200 flex items-start gap-3 px-4 py-3">
      <Pin size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-bold text-yellow-700 mb-0.5">Pinned Message</p>
        <p className="text-xs text-yellow-800 leading-relaxed">
          👋 Welcome to the <strong>NoxyStore Community!</strong> This is a public chat for all members.
          Be respectful, no spam, and enjoy chatting with fellow gamers. Top-up fast, play faster! 🎮
        </p>
      </div>
    </div>
  );
}

// ─── Voice recorder hook (WhatsApp-style) ──────────────────────────────────
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
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
      };
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
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }, []);

  const cancel = useCallback(() => {
    stopRecording();
    setAudioBlob(null);
    setSeconds(0);
  }, [stopRecording]);

  return { recording, seconds, audioBlob, start, stop: stopRecording, cancel, setAudioBlob };
}

// ─── Audio player bubble ────────────────────────────────────────────────────
function AudioBubble({ src, own }: { src: string; own?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(Math.round(audio.duration));
    audio.ontimeupdate = () => setProgress(audio.currentTime / (audio.duration || 1));
    audio.onended = () => { setPlaying(false); setProgress(0); };
    return () => { audio.pause(); };
  }, [src]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-3 min-w-[160px] max-w-[220px]">
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${own ? "bg-black/20" : "bg-yellow-400"}`}
      >
        {playing
          ? <Square size={12} className={own ? "text-white" : "text-black"} fill="currentColor" />
          : <Play size={13} className={`${own ? "text-white" : "text-black"} ml-0.5`} />
        }
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        {/* Waveform bars */}
        <div className="flex items-center gap-[2px] h-6">
          {Array.from({ length: 20 }).map((_, i) => {
            const filled = i / 20 <= progress;
            const height = [3, 5, 8, 6, 9, 7, 10, 6, 8, 5, 7, 9, 6, 10, 7, 5, 8, 6, 4, 5][i];
            return (
              <div
                key={i}
                className="w-1 rounded-full transition-colors"
                style={{
                  height: `${height * 2}px`,
                  backgroundColor: filled
                    ? (own ? "rgba(255,255,255,0.9)" : "#EAB308")
                    : (own ? "rgba(255,255,255,0.4)" : "#D1D5DB"),
                }}
              />
            );
          })}
        </div>
        <span className={`text-[10px] ${own ? "text-white/70" : "text-gray-400"}`}>
          {playing ? `${Math.round(progress * (duration || 0))}s` : `${duration || 0}s`}
        </span>
      </div>
    </div>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const seed = encodeURIComponent(name);
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden bg-yellow-100 border-2 border-yellow-300 flex-shrink-0">
      <img
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=fef3c7`}
        alt={name}
        className="w-full h-full"
      />
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, isAdmin }: { msg: ChatMessage; isOwn: boolean; isAdmin: boolean }) {
  const isVoice = msg.image_url?.includes("/voice/") || msg.content === "__voice__";
  const isImage = msg.image_url && !isVoice;
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isOwn) {
    return (
      <div className="flex flex-col items-end gap-1 mb-3">
        <div className="flex items-center gap-1 mr-1">
          {isAdmin && <Crown size={11} className="text-yellow-500" fill="#EAB308" />}
          <span className="text-[10px] text-gray-400">You · {time}</span>
        </div>
        <div className="max-w-[75vw] lg:max-w-[400px]">
          {isImage && (
            <img
              src={msg.image_url!}
              alt="photo"
              className="max-w-full rounded-tl-2xl rounded-tr-sm rounded-b-2xl border border-yellow-200 max-h-60 object-cover block mb-1"
            />
          )}
          {isVoice && msg.image_url && (
            <div className="bg-yellow-400 px-4 py-3 rounded-tl-2xl rounded-tr-sm rounded-b-2xl mb-1">
              <AudioBubble src={msg.image_url} own />
            </div>
          )}
          {!isVoice && msg.content && msg.content !== "__image__" && (
            <div className="bg-yellow-400 text-black px-4 py-2.5 rounded-tl-2xl rounded-tr-sm rounded-b-2xl text-sm font-medium break-words">
              {msg.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-3">
      <Avatar name={msg.sender} />
      <div className="max-w-[75vw] lg:max-w-[400px]">
        <div className="flex items-center gap-1 ml-1 mb-0.5">
          <span className="text-[10px] text-gray-500 font-semibold">{msg.sender}</span>
          {isAdmin && <Crown size={11} className="text-yellow-500" fill="#EAB308" />}
          <span className="text-[10px] text-gray-400">· {time}</span>
        </div>
        {isImage && (
          <img
            src={msg.image_url!}
            alt="photo"
            className="max-w-full rounded-tr-2xl rounded-tl-sm rounded-b-2xl border border-gray-200 max-h-60 object-cover block"
          />
        )}
        {isVoice && msg.image_url && (
          <div className="bg-white border border-gray-200 px-4 py-3 rounded-tr-2xl rounded-tl-sm rounded-b-2xl">
            <AudioBubble src={msg.image_url} />
          </div>
        )}
        {!isVoice && msg.content && msg.content !== "__image__" && (
          <div className="bg-white border border-gray-200 text-gray-900 px-4 py-2.5 rounded-tr-2xl rounded-tl-sm rounded-b-2xl text-sm break-words">
            {msg.content}
          </div>
        )}
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
  const [onlineCount, setOnlineCount] = useState(0);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [adminEmails, setAdminEmails] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voice = useVoiceRecorder();

  const displayName = user?.username || user?.email?.split("@")[0] || "Guest";

  // Fetch admin emails for crown badge
  const fetchAdmins = useCallback(async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("email")
      .in("role", ["admin", "superadmin"])
      .eq("is_active", true);
    if (data) setAdminEmails(new Set(data.map((r: any) => r.email)));
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", SESSION_ID)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setMessages(data as ChatMessage[]);
  }, []);

  // Track presence: upsert a row in analytics_events as a heartbeat
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

  // Count online: presence events in last 20s
  const fetchOnlineCount = useCallback(async () => {
    const since = new Date(Date.now() - 20000).toISOString();
    const { data } = await supabase
      .from("analytics_events")
      .select("user_id")
      .eq("event_type", "group_chat_presence")
      .gte("created_at", since);
    if (data) {
      const unique = new Set(data.map((r: any) => r.user_id)).size;
      setOnlineCount(Math.max(unique, 1));
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
    fetchMessages();
    fetchOnlineCount();
    if (isAuthenticated) updatePresence();

    pollerRef.current = setInterval(() => {
      fetchMessages();
      fetchOnlineCount();
    }, POLL_INTERVAL);

    if (isAuthenticated) {
      updatePresence();
      presenceRef.current = setInterval(updatePresence, PRESENCE_INTERVAL);
    }

    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
      if (presenceRef.current) clearInterval(presenceRef.current);
    };
  }, [fetchMessages, fetchAdmins, fetchOnlineCount, updatePresence, isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `chat/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) { toast.error("Upload failed"); return null; }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return urlData.publicUrl;
  };

  const sendMessage = async (opts?: { content?: string; imageUrl?: string; isVoice?: boolean }) => {
    if (!isAuthenticated) { toast.error("Please log in to send messages"); navigate("/login"); return; }
    if (sending) return;
    const content = opts?.content ?? text.trim();
    const imageUrl = opts?.imageUrl;
    if (!content && !imageUrl) return;
    setSending(true);
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
    await fetchMessages();
    setSending(false);
  };

  const handleSendText = () => {
    if (!text.trim()) return;
    sendMessage({ content: text.trim() });
  };

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

  const isAdminMsg = (msg: ChatMessage) =>
    (msg.user_email && adminEmails.has(msg.user_email)) || false;

  const isOwnMsg = (msg: ChatMessage) =>
    (user && (msg.user_id === user.id || msg.user_email === user.email)) || false;

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-40 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="text-gray-700 p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
          <Users size={18} className="text-black" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-sm">NoxyStore Community</p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">{onlineCount} online now</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <Shield size={14} />
          <span className="text-xs">Safe</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-4">
        <PinnedWelcome />

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
              <Users size={28} className="text-yellow-500" />
            </div>
            <p className="font-bold text-gray-700 mb-1">Be the first to say hello!</p>
            <p className="text-sm text-gray-400 max-w-xs">All NoxyStore members can see and send messages here.</p>
          </div>
        )}

        <div className="px-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={isOwnMsg(msg)}
              isAdmin={isAdminMsg(msg)}
            />
          ))}
        </div>
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Image preview bar */}
      {imagePreview && (
        <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <img src={imagePreview.url} alt="preview" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center"
            >
              <X size={10} />
            </button>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-2">Ready to send photo</p>
            <button
              onClick={handleSendImage}
              disabled={sending}
              className="bg-yellow-400 text-black font-bold px-5 py-2 text-sm disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send Photo"}
            </button>
          </div>
          <button onClick={() => setImagePreview(null)} className="text-gray-400"><X size={18} /></button>
        </div>
      )}

      {/* Voice preview bar */}
      {voice.audioBlob && !voice.recording && (
        <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center gap-3 flex-shrink-0">
          <div className="flex-1">
            <AudioBubble src={URL.createObjectURL(voice.audioBlob)} />
          </div>
          <button onClick={voice.cancel} className="text-gray-400 p-1 flex-shrink-0"><X size={18} /></button>
          <button
            onClick={handleSendVoice}
            disabled={sending}
            className="bg-yellow-400 text-black font-bold px-5 py-2 text-sm disabled:opacity-60 flex-shrink-0"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      )}

      {/* WhatsApp-style recording bar */}
      {voice.recording && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200 flex items-center gap-3 flex-shrink-0">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 font-semibold">Recording</span>
              <span className="text-sm text-red-500 font-mono">{voice.seconds}s</span>
            </div>
            <div className="flex items-center gap-[2px] mt-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-400 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 12 + 4}px`,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={voice.stop}
            className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center flex-shrink-0"
            title="Stop recording"
          >
            <Square size={14} fill="white" />
          </button>
          <button onClick={voice.cancel} className="text-gray-400 p-1 flex-shrink-0">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Input bar */}
      {!imagePreview && !voice.audioBlob && !voice.recording && (
        <div
          className="px-3 py-3 bg-white border-t border-gray-200 flex items-center gap-2 flex-shrink-0"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          {/* Photo */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-yellow-500 transition-colors flex-shrink-0"
          >
            <Image size={20} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

          {/* Text input */}
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
            placeholder={isAuthenticated ? "Message community..." : "Log in to send messages"}
            disabled={!isAuthenticated}
            className="flex-1 bg-gray-100 px-4 py-2.5 text-sm outline-none text-gray-900 placeholder-gray-400 disabled:opacity-60 rounded-full"
          />

          {/* Voice mic */}
          {!text.trim() && (
            <button
              onMouseDown={isAuthenticated ? voice.start : undefined}
              onClick={() => { if (!isAuthenticated) { toast.error("Please log in to send voice messages"); navigate("/login"); } }}
              disabled={!isAuthenticated}
              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-yellow-500 transition-colors flex-shrink-0 disabled:opacity-40"
              title="Hold to record"
            >
              <Mic size={20} />
            </button>
          )}

          {/* Send text */}
          {text.trim() && (
            <button
              onClick={handleSendText}
              disabled={sending || !isAuthenticated}
              className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center disabled:opacity-60 flex-shrink-0"
            >
              <Send size={16} className="text-black" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
