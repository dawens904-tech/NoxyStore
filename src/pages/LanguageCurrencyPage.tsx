/**
 * LanguageCurrencyPage — Mobile settings for language and display currency.
 * Shows two rows: Language (EN >) and Display Currency ($ USD >).
 * Clicking each opens a bottom-sheet list. After selection: confirm modal.
 * Photo 8-9 style.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Check, ChevronRight } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "zh-TW", label: "中文(繁體)", flag: "🇹🇼" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "th", label: "ภาษาไทย", flag: "🇹🇭" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

const CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "IDR", label: "Indonesian Rupiah", symbol: "Rp" },
  { code: "MYR", label: "Malaysian Ringgit", symbol: "RM" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "THB", label: "Thai Baht", symbol: "฿" },
  { code: "VND", label: "Vietnamese Dong", symbol: "₫" },
  { code: "PHP", label: "Philippine Peso", symbol: "₱" },
  { code: "BRL", label: "Brazilian Real", symbol: "R$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "KRW", label: "South Korean Won", symbol: "₩" },
];

export function LanguageCurrencyPage() {
  const navigate = useNavigate();
  const { language, currency, setLanguage, setCurrency } = useSettingsStore();

  const [sheet, setSheet] = useState<"language" | "currency" | null>(null);
  const [pendingLang, setPendingLang] = useState<string | null>(null);
  const [pendingCurr, setPendingCurr] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: "language" | "currency"; value: string; label: string } | null>(null);

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
  const currentCurr = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  const handleLangSelect = (lang: typeof LANGUAGES[0]) => {
    setSheet(null);
    setConfirmModal({ type: "language", value: lang.code, label: lang.label });
  };

  const handleCurrSelect = (curr: typeof CURRENCIES[0]) => {
    setSheet(null);
    setConfirmModal({ type: "currency", value: curr.code, label: `${curr.symbol} ${curr.code} — ${curr.label}` });
  };

  const handleConfirm = () => {
    if (!confirmModal) return;
    if (confirmModal.type === "language") {
      setLanguage(confirmModal.value as any);
      toast.success(`Language changed to ${confirmModal.label}`);
    } else {
      setCurrency(confirmModal.value);
      toast.success(`Currency changed to ${confirmModal.value}`);
    }
    setConfirmModal(null);
  };

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      {/* Header */}
      <div className="bg-black sticky top-0 z-40 flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft size={20} />
        </button>
        <p className="text-white font-bold">Language &amp; Currency</p>
        <div className="w-8" />
      </div>

      {/* Settings rows */}
      <div className="bg-white mt-4 divide-y divide-gray-100">
        <button
          onClick={() => setSheet("language")}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <span className="text-base font-medium text-gray-900">Language</span>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-sm">{currentLang.code.toUpperCase().slice(0, 2)}</span>
            <ChevronRight size={16} />
          </div>
        </button>
        <button
          onClick={() => setSheet("currency")}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <span className="text-base font-medium text-gray-900">Display Currency</span>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-sm">{currentCurr.symbol} {currentCurr.code}</span>
            <ChevronRight size={16} />
          </div>
        </button>
      </div>

      {/* Language bottom sheet */}
      {sheet === "language" && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSheet(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white w-full rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden z-10" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center">
              <button onClick={() => setSheet(null)}><X size={20} className="text-gray-700" /></button>
            </div>
            <div className="overflow-y-auto max-h-[65vh] divide-y divide-gray-100">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLangSelect(lang)}
                  className={`w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left ${lang.code === language ? "bg-gray-50" : ""}`}
                >
                  <span className={`text-base ${lang.code === language ? "font-bold text-gray-900" : "text-gray-800 font-normal"}`}>
                    {lang.label}
                  </span>
                  {lang.code === language && <Check size={18} className="text-yellow-500" />}
                </button>
              ))}
            </div>
            <div className="h-6 bg-white" />
          </div>
        </div>
      )}

      {/* Currency bottom sheet */}
      {sheet === "currency" && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSheet(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white w-full rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden z-10" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center">
              <button onClick={() => setSheet(null)}><X size={20} className="text-gray-700" /></button>
            </div>
            <div className="overflow-y-auto max-h-[65vh] divide-y divide-gray-100">
              {CURRENCIES.map(curr => (
                <button
                  key={curr.code}
                  onClick={() => handleCurrSelect(curr)}
                  className={`w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left ${curr.code === currency ? "bg-gray-50" : ""}`}
                >
                  <div>
                    <span className={`text-base ${curr.code === currency ? "font-bold text-gray-900" : "text-gray-800"}`}>{curr.symbol} {curr.code}</span>
                    <span className="text-sm text-gray-400 ml-2">{curr.label}</span>
                  </div>
                  {curr.code === currency && <Check size={18} className="text-yellow-500" />}
                </button>
              ))}
            </div>
            <div className="h-6 bg-white" />
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" onClick={() => setConfirmModal(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl z-10" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-lg mb-2">
              {confirmModal.type === "language" ? "Change Language?" : "Change Currency?"}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Switch to <span className="font-semibold text-gray-900">{confirmModal.label}</span>?
              {confirmModal.type === "language" && " The website will reload to apply the new language."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 border border-gray-200 rounded-2xl py-3 font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleConfirm} className="flex-1 bg-yellow-400 rounded-2xl py-3 font-bold text-black hover:bg-yellow-300">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
