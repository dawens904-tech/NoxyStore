/**
 * FloatingChat — opens the support page when clicked.
 * Features: slight tilt angle, dismissable, glow effect idle, pops alive on click.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, X } from "lucide-react";

export function FloatingChat() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [clicked, setClicked] = useState(false);

  if (dismissed) return null;

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => {
      setClicked(false);
      navigate("/support");
    }, 180);
  };

  return (
    <div
      className="fixed bottom-24 right-4 z-50 lg:bottom-8"
      style={{ transform: "rotate(-12deg)" }}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
        className="absolute -top-2 -left-2 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center z-10 shadow-md hover:bg-gray-700 transition-colors"
        style={{ transform: "rotate(12deg)" }}
        aria-label="Dismiss chat button"
      >
        <X size={10} />
      </button>

      {/* Main button */}
      <button
        onClick={handleClick}
        aria-label="Chat support"
        className={`relative w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center transition-all duration-150
          ${clicked ? "scale-110 bg-yellow-300 shadow-2xl" : "shadow-lg hover:bg-yellow-300 hover:scale-105 active:scale-95"}
        `}
        style={{
          boxShadow: clicked
            ? "0 0 0 6px rgba(250,204,21,0.35), 0 8px 24px rgba(0,0,0,0.25)"
            : "0 0 0 4px rgba(250,204,21,0.20), 0 4px 16px rgba(0,0,0,0.18)",
        }}
      >
        <MessageSquare
          size={24}
          className="text-black"
          style={{ transform: "rotate(12deg)" }}
        />

        {/* Idle glow pulse ring */}
        {!clicked && (
          <span className="absolute inset-0 rounded-full animate-ping bg-yellow-400 opacity-20 pointer-events-none" />
        )}
      </button>
    </div>
  );
}
