
/**
 * Support Page — Home tab (FAQ + Send message) and Messages tab (AI support + VIP service)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronRight, Send, MessageSquare, Home } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const FAQ_ITEMS = [
  {
    q: "Is it safe to recharge on NoxyStore?",
    a: "Yes, 100% safe. All transactions are encrypted and protected. We use the Lootbar reseller system with official API connections. Your payment data is never stored on our servers.",
  },
  {
    q: "How long does it take to receive the recharged items?",
    a: "Most top-ups are delivered within 3–5 minutes. During peak hours or for certain regions, it may take up to 30 minutes. You'll receive a notification when your order is complete.",
  },
  {
    q: "Why are your prices cheaper than the prices in-game?",
    a: "We work directly with Lootbar.gg as an authorized reseller, allowing us to offer competitive pricing. We pass bulk discounts and platform savings directly to our customers.",
  },
  {
    q: "I entered the wrong UID/Server. What should I do?",
    a: "Contact our VIP support immediately. If the order hasn't been processed yet, we can cancel it. Once processed, we cannot change the game account information.",
  },
  {
    q: "How can I get a refund?",
    a: "If your top-up failed or was not delivered, we guarantee a full refund within 3–5 business days. Contact VIP support with your order reference ID.",
  },
];

export function SupportPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"home" | "messages">("home");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <X size={22} className="text-gray-700" />
          </button>
          <span className="font-bold text-base">{activeTab === "messages" ? "Messages" : ""}</span>
          <div className="w-8" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "home" ? (
          <HomeTab
            faqItems={FAQ_ITEMS}
            expandedFaq={expandedFaq}
            setExpandedFaq={setExpandedFaq}
            navigate={navigate}
          />
        ) : (
          <MessagesTab navigate={navigate} user={user} />
        )}
      </div>

      {/* Bottom Nav */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100">
        <div className="flex">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${activeTab === "home" ? "text-gray-900" : "text-gray-400"}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === "home" ? "bg-yellow-400" : "bg-transparent"}`}>
              <Home size={20} className={activeTab === "home" ? "text-black" : "text-gray-400"} />
            </div>
            <span className="text-xs font-semibold">Home</span>
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${activeTab === "messages" ? "text-gray-900" : "text-gray-400"}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === "messages" ? "bg-yellow-400" : "bg-transparent"}`}>
              <MessageSquare size={20} className={activeTab === "messages" ? "text-black" : "text-gray-400"} />
            </div>
            <span className="text-xs font-semibold">Messages</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeTab({ faqItems, expandedFaq, setExpandedFaq, navigate }: {
  faqItems: typeof FAQ_ITEMS;
  expandedFaq: number | null;
  setExpandedFaq: (i: number | null) => void;
  navigate: (path: string) => void;
}) {
  return (
    <div>
      {/* Yellow hero */}
      <div className="bg-yellow-400 px-5 pt-6 pb-10 relative overflow-hidden">
        {/* Decorative shape */}
        <div className="absolute right-0 top-0 w-40 h-40 opacity-20">
          <svg viewBox="0 0 200 200" fill="white">
            <path d="M100 0 C155 0 200 45 200 100 C200 155 155 200 100 200 C45 200 0 155 0 100 C0 45 45 0 100 0 Z" />
          </svg>
        </div>
        <div className="absolute right-8 top-8 w-24 h-24 opacity-30 border-4 border-white rounded-full" />

        {/* Agent avatars */}
        <div className="flex items-center gap-1 mb-4">
          {[
            "https://api.dicebear.com/7.x/avataaars/svg?seed=agent1&backgroundColor=b6e3f4",
            "https://api.dicebear.com/7.x/avataaars/svg?seed=agent2&backgroundColor=ffd5dc",
            "https://api.dicebear.com/7.x/avataaars/svg?seed=bot&style=circle",
          ].map((src, i) => (
            <div key={i} className="relative">
              <div className="w-12 h-12 rounded-full bg-white overflow-hidden border-2 border-white shadow-sm">
                <img src={src} alt="agent" className="w-full h-full" />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white" />
            </div>
          ))}
        </div>

        <h1 className="text-2xl font-black text-black mb-1">Welcome!</h1>
        <p className="text-lg font-semibold text-black/80">What can we do for you?</p>
      </div>

      <div className="px-4 -mt-4 space-y-3 pb-6">
        {/* Send message card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">Send a message to us</p>
            <p className="text-sm text-gray-500 mt-0.5">We usually respond within a few minutes.</p>
          </div>
          <button
            onClick={() => navigate("/support/vip")}
            className="flex items-center gap-1.5 bg-yellow-400 text-black font-bold px-4 py-2.5 rounded-full hover:bg-yellow-300 transition-colors flex-shrink-0 ml-3"
          >
            <Send size={14} />
            Send
          </button>
        </div>

        {/* Help Center FAQ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
            <div className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-xs">?</span>
            </div>
            <span className="font-bold text-gray-900">Help Center</span>
          </div>
          {faqItems.slice(0, 3).map((item, i) => (
            <div key={i} className="border-b border-gray-100 last:border-0">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full text-left px-4 py-4 flex items-start justify-between gap-3"
              >
                <span className="text-sm text-gray-800 leading-relaxed">{item.q}</span>
                <ChevronRight
                  size={16}
                  className={`text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${expandedFaq === i ? "rotate-90" : ""}`}
                />
              </button>
              {expandedFaq === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessagesTab({ navigate, user }: { navigate: (path: string) => void; user: any }) {
  const vipLastMessage = "Greetings! Welcome to NoxyStore. How can I assist you today?";
  const vipTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="divide-y divide-gray-100">
      {/* AI Support */}
      <button
        onClick={() => navigate("/support/ai")}
        className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" className="w-7 h-7">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="black" stroke="none"/>
            <rect x="3" y="3" width="18" height="18" rx="4" stroke="black" strokeWidth="1.5" fill="none"/>
            <path d="M8 9h8M8 12h5" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900">AI support</p>
          <p className="text-sm text-gray-500 truncate">AI Support is at your service around the cl...</p>
        </div>
      </button>

      {/* VIP Service */}
      <button
        onClick={() => navigate("/support/vip")}
        className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-amber-100">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=vip-agent&backgroundColor=b6e3f4&clotheType=BlazerShirt"
            alt="VIP"
            className="w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className="font-bold text-gray-900">NoxyStore VIP Service</p>
            <span className="text-xs text-gray-400">{vipTime}</span>
          </div>
          <p className="text-sm text-gray-500 truncate">{vipLastMessage.slice(0, 40)}...</p>
        </div>
      </button>
    </div>
  );
}
hello ai if see this add a group chat and create group chat page with photo upload,voice send real message for all user in store.
