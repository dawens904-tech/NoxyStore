
/**
 * VIP Service Chat Page — live chat with admin, AI when admin not available
 * Admin joins from email notification link, closes chat when done
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, ThumbsUp, ThumbsDown, MoreVertical, Zap, Image, FileText, History, X, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "user" | "admin" | "ai";
  content: string;
  image_url?: string;
  created_at: string;
}

const QUICK_QUESTIONS = [
  "I have already made the payment, please top-up as soon as possible.",
  "Why hasn't the product I top-up arrived in the game yet?",
  "I have initiated a refund, please process it as soon as possible.",
  "I entered the wrong game account information.",
  "I need to check my order status.",
];

export function VipServicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showQuickQ, setShowQuickQ] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"ai" | "waiting" | "live" | "closed">("ai");
  const [sessionId] = useState(() => `vip_${user?.email?.split("@")[0] || "guest"}_${Date.now()}`);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin mode — if ?adminToken=xyz is in URL, this is admin joining
  const isAdmin = searchParams.get("adminToken") === "admin-join";
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [showEndChatModal, setShowEndChatModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  useEffect(() => {
    // Initial welcome message
    setMessages([
      {
        id: "welcome1",
        sender: "admin",
        content: "Greetings! Welcome to NoxyStore. How can I assist you today?",
        created_at: new Date(Date.now() - 300000).toISOString(),
      },
    ]);

    // Create or update session
    supabase.from("chat_sessions").upsert({
      id: sessionId,
      user_email: user?.email,
      user_id: user?.id,
      status: "ai",
      updated_at: new Date().toISOString(),
    }).then(() => {});

    // Poll for new messages every 3 seconds
    const interval = setInterval(loadNewMessages, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadNewMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (data && data.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = data.filter((m: ChatMessage) => !existingIds.has(m.id));
        if (newMsgs.length === 0) return prev;
        return [...prev, ...newMsgs];
      });
    }
  };

  const sendMessage = useCallback(async (text: string, imageUrl?: string) => {
    if ((!text.trim() && !imageUrl) || isSending) return;
    setIsSending(true);
    setInput("");
    setShowActions(false);
    setShowQuickQ(false);

    const msg = {
      session_id: sessionId,
      user_email: user?.email,
      sender: isAdmin ? "admin" : "user",
      content: text.trim(),
      image_url: imageUrl,
    };

    const { data: inserted } = await supabase.from("chat_messages").insert(msg).select().single();
    if (inserted) {
      setMessages((prev) => [...prev, inserted as ChatMessage]);
    }

    // Update session timestamp
    await supabase.from("chat_sessions").upsert({
      id: sessionId,
      user_email: user?.email,
      status: sessionStatus,
      updated_at: new Date().toISOString(),
    });

    // AI reply — only when NOT in agent mode and session is 'ai'
    if (!isAdmin && sessionStatus === "ai" && !isAgentMode && (text.trim() || imageUrl)) {
      const history = messages
        .filter((m) => !m.id.startsWith("welcome"))
        .map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.content || "[image]"}));
      history.push({ role: "user", content: text.trim() || "[image attachment]" });

      supabase.functions.invoke("ai-support", {
        body: { messages: history, userEmail: user?.email, sessionId },
      }).then(async ({ data: aiData, error: aiErr }) => {
        if (aiErr) {
          const { FunctionsHttpError } = await import("@supabase/supabase-js");
          if (aiErr instanceof FunctionsHttpError) {
            console.error("AI support error:", await aiErr.context.text());
          }
          return;
        }
        if (aiData?.reply) {
          const aiMsg: ChatMessage = {
            id: `ai_${Date.now()}`,
            sender: "ai",
            content: aiData.reply,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, aiMsg]);
        }
      });
    }

    setIsSending(false);
  }, [isSending, sessionId, user, isAdmin, sessionStatus, messages]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-selected
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Only image files are supported"); return; }

    const toastId = toast.loading("Uploading image...");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `chat/${sessionId}/${Date.now()}.${ext}`;

    // Upload via fetch+blob for better performance
    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from("chat-images")
      .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

    if (error) {
      toast.dismiss(toastId);
      toast.error("Image upload failed. Please try again.");
      return;
    }

    const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
    toast.dismiss(toastId);
    sendMessage("", urlData.publicUrl);
  };

  const handleContactPlatform = () => {
    setShowContactModal(true);
    setShowActions(false);
  };

  const confirmContactPlatform = async () => {
    setShowContactModal(false);
    setIsAgentMode(true);
    setSessionStatus("live");
    await supabase.from("chat_sessions").upsert({
      id: sessionId,
      user_email: user?.email,
      status: "live",
      updated_at: new Date().toISOString(),
    });
    // Insert connecting message
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      user_email: user?.email,
      sender: "ai",
      content: "Connecting you to a VIP support agent...",
    });
    // Agent AI greets — edge function called once as agent persona
    const history = messages
      .filter((m) => !m.id.startsWith("welcome"))
      .map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.content || "[image]" }));
    supabase.functions.invoke("ai-support", {
      body: {
        messages: history,
        userEmail: user?.email,
        sessionId,
        agentMode: true,
      },
    }).then(({ data: aiData }) => {
      if (aiData?.reply) {
        const agentMsg: ChatMessage = {
          id: `agent_${Date.now()}`,
          sender: "admin",
          content: aiData.reply,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      }
    });
    loadNewMessages();
    toast.success("VIP Agent connected.");
  };

  const handleEndChat = async () => {
    setShowEndChatModal(false);
    setIsAgentMode(false);
    setSessionStatus("ai");
    await supabase.from("chat_sessions").upsert({
      id: sessionId,
      user_email: user?.email,
      status: "closed",
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const closedMsg: ChatMessage = {
      id: `closed_${Date.now()}`,
      sender: "ai",
      content: "This chat session has ended. Thank you for contacting NoxyStore VIP Support. If you need further assistance, feel free to start a new chat.",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, closedMsg]);
    toast.success("Chat ended. You can start a new session anytime.");
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-[#eef0f3] flex flex-col">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => {
              if (isAgentMode) { setShowLeaveModal(true); }
              else { navigate("/support"); }
            }}
            className="p-1"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-amber-100">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=vip-agent&backgroundColor=b6e3f4&clotheType=BlazerShirt"
              alt="VIP"
              className="w-full h-full"
            />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-sm">NoxyStore VIP Service</p>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-500">Online</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAgentMode && (
              <button
                onClick={() => setShowEndChatModal(true)}
                className="text-xs font-bold text-red-500 border border-red-200 bg-red-50 px-2.5 py-1 rounded-full hover:bg-red-100 transition-colors"
              >
                End Chat
              </button>
            )}
            <button className="p-1"><ThumbsUp size={18} className="text-gray-500" /></button>
            <span className="text-gray-300">|</span>
            <button className="p-1"><ThumbsDown size={18} className="text-gray-500" /></button>
            <span className="text-gray-300">|</span>
            <button className="p-1"><MoreVertical size={18} className="text-gray-500" /></button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id}>
            {(msg.sender === "admin" || msg.sender === "ai") && (
              <p className="text-xs text-gray-400 text-center mb-2">{formatTime(msg.created_at)}</p>
            )}
            <div className={`flex items-end gap-2 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {msg.sender !== "user" && (
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-amber-100">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=vip-agent&backgroundColor=b6e3f4&clotheType=BlazerShirt"
                    alt="VIP"
                    className="w-full h-full"
                  />
                </div>
              )}
              <div>
                {msg.sender !== "user" && (
                  <p className="text-xs text-gray-500 mb-1 ml-1">NoxyStore VIP Service</p>
                )}
                <div className={`max-w-[280px] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-white text-gray-800 rounded-br-sm"
                    : "bg-white text-gray-800 rounded-bl-sm"
                } shadow-sm`}>
                  {msg.image_url ? (
                    <img src={msg.image_url} alt="attachment" className="rounded-xl max-w-full" />
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.sender === "user" && (
                  <p className="text-[10px] text-gray-400 text-right mt-1">{formatTime(msg.created_at)}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick Questions Panel */}
      {showQuickQ && (
        <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-gray-900">Quick Question</span>
            <button onClick={() => setShowQuickQ(false)}><X size={18} className="text-gray-500" /></button>
          </div>
          <p className="text-xs text-gray-500 mb-3">Click on the following questions to quickly ask the seller.</p>
          <div className="space-y-3">
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => { sendMessage(q); setShowQuickQ(false); }}
                className="w-full text-left text-sm text-gray-700 border-b border-gray-100 pb-3 last:border-0 hover:text-yellow-600 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action bar (+ button expanded) */}
      {showActions && !showQuickQ && (
        <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Zap, label: "Quick Question", action: () => { setShowQuickQ(true); setShowActions(false); } },
              { icon: Image, label: "Album", action: () => { fileInputRef.current?.click(); setShowActions(false); } },
              { icon: FileText, label: "Contact the platform", action: handleContactPlatform },
              { icon: History, label: "Chat history", action: () => { setShowHistoryModal(true); setShowActions(false); } },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <item.icon size={22} className="text-gray-700" />
                </div>
                <span className="text-[10px] text-gray-600 text-center leading-tight">{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => { toast.info("New Ticket created. Our team will review it shortly."); setShowActions(false); }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                <FileText size={22} className="text-gray-700" />
              </div>
              <span className="text-[10px] text-gray-600 text-center leading-tight">New Ticket</span>
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
            placeholder="Send a message"
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-800 outline-none placeholder-gray-400"
          />
          {input.trim() ? (
            <button
              onClick={() => sendMessage(input)}
              disabled={isSending}
              className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center hover:bg-yellow-300 transition-colors flex-shrink-0"
            >
              <Send size={16} className="text-black" />
            </button>
          ) : (
            <button
              onClick={() => setShowActions(!showActions)}
              className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              <Plus size={18} className="text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Contact Platform Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
            <div className="flex items-start gap-3 mb-4">
              <button onClick={() => setShowContactModal(false)} className="text-gray-500 mt-0.5">
                <X size={20} />
              </button>
              <h3 className="font-bold text-gray-900 text-lg leading-tight">Request VIP Customer Service to Join Chat</h3>
            </div>
            <p className="text-gray-600 text-center text-sm mb-6">Would you like our VIP Customer Service agent to join this chat and help with your issue?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 border border-gray-300 rounded-2xl py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmContactPlatform}
                className="flex-1 bg-yellow-400 rounded-2xl py-3 font-bold text-black hover:bg-yellow-300 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Chat Confirmation Modal */}
      {showEndChatModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 text-lg mb-2 text-center">End this chat?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">The VIP agent session will be closed and AI support will be re-enabled. You can start a new session anytime.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndChatModal(false)}
                className="flex-1 border border-gray-300 rounded-2xl py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Continue Chat
              </button>
              <button
                onClick={handleEndChat}
                className="flex-1 bg-red-500 rounded-2xl py-3 font-bold text-white hover:bg-red-600 transition-colors"
              >
                End Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Page Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 text-lg mb-2 text-center">Leave this chat?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">A VIP agent is currently connected. Would you like to end the session before leaving?</p>
            <div className="space-y-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="w-full border border-gray-300 rounded-2xl py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Continue Chat
              </button>
              <button
                onClick={async () => { setShowLeaveModal(false); await handleEndChat(); navigate("/support"); }}
                className="w-full bg-red-500 rounded-2xl py-3 font-bold text-white hover:bg-red-600 transition-colors"
              >
                End &amp; Leave
              </button>
              <button
                onClick={() => { setShowLeaveModal(false); navigate("/support"); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
              >
                Leave without ending
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-gray-900">Chat History</h3>
              <button onClick={() => setShowHistoryModal(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="px-4 py-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-600">
                    {msg.sender === "user" ? "U" : "A"}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{msg.sender === "user" ? "You" : "NoxyStore VIP"} · {formatTime(msg.created_at)}</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">{msg.image_url ? "[Image]" : msg.content}</p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-gray-400 py-8 text-sm">No chat history yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

