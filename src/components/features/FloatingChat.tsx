/**
 * FloatingChat — floating action button that opens VIP support chat
 * Features: animated pulse ring, unread badge, tooltip on hover
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";

export function FloatingChat() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2 lg:bottom-8"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip / mini card */}
      <div
        className={`transition-all duration-200 ${
          hovered ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-1 pointer-events-none"
        }`}
      >
        <div className="bg-white border border-gray-200 shadow-lg px-4 py-3 max-w-[180px] relative">
          {/* Dismiss X */}
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-gray-500 flex items-center justify-center hover:bg-gray-600 transition-colors"
          >
            <X size={10} className="text-white" />
          </button>
          <p className="text-xs font-bold text-gray-900 leading-snug">Need help? 💬</p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
            Chat with our support team — available 24/7
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-green-600 font-semibold">Online now</span>
          </div>
          {/* Arrow pointing down-right */}
          <div className="absolute -bottom-2 right-6 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45" />
        </div>
      </div>

      {/* Main FAB */}
      <div className="relative flex-shrink-0">
        {/* Pulse ring animation */}
        <span className="absolute inset-0 rounded-full bg-yellow-400 opacity-30 animate-ping" />

        {/* Unread badge */}
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-10 border-2 border-white">
          <span className="text-white text-[9px] font-black">1</span>
        </div>

        <button
          onClick={() => navigate("/support")}
          className="relative w-14 h-14 bg-yellow-400 rounded-full shadow-xl flex items-center justify-center hover:bg-yellow-300 active:scale-95 transition-all duration-150"
          aria-label="Chat support"
        >
          <MessageCircle size={26} className="text-black" fill="black" fillOpacity={0.15} />
        </button>
      </div>
    </div>
  );
}
