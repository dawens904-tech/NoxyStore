
/**
 * FloatingChat — opens the support page when clicked
 */
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";

export function FloatingChat() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/support")}
      className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-yellow-400 rounded-full shadow-lg flex items-center justify-center hover:bg-yellow-300 active:scale-95 transition-all lg:bottom-8"
      aria-label="Chat support"
    >
      <MessageSquare size={24} className="text-black" />
    </button>
  );
}
make this a little bit pi anle and also li can close komsi li vinn paret kwense nn dwat flou and lew click li alive paret bien.
