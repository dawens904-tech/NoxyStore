/**
 * Feedback Page — list of tickets + New Ticket modal
 */
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, ChevronDown, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const CLASSIFICATIONS = [
  "Payment issues",
  "Top-up not received",
  "Wrong UID/Server",
  "Refund request",
  "Account security",
  "Technical issue",
  "Other",
];

interface Ticket {
  id: string;
  classification: string;
  content: string;
  contact_email: string;
  status: string;
  created_at: string;
}

export function FeedbackPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New ticket form state
  const [classification, setClassification] = useState("Payment issues");
  const [content, setContent] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    const ext = file.name.split(".").pop();
    const path = `feedback/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-images").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
    setScreenshots((prev) => [...prev, urlData.publicUrl]);
    toast.success("Screenshot attached");
  };

  const handleSubmit = async () => {
    if (!content.trim()) { toast.error("Please describe your issue"); return; }
    if (!contactEmail.trim()) { toast.error("Please enter your contact email"); return; }
    setIsSubmitting(true);

    // Store as a chat message/session for admin visibility
    const ticketId = `TKT-${Date.now()}`;
    await supabase.from("chat_messages").insert({
      session_id: ticketId,
      user_email: contactEmail,
      sender: "user",
      content: `[TICKET] Classification: ${classification}\n\n${content}${screenshots.length > 0 ? `\n\nScreenshots: ${screenshots.join(", ")}` : ""}`,
    });

    await supabase.from("chat_sessions").upsert({
      id: ticketId,
      user_email: contactEmail,
      status: "waiting",
      updated_at: new Date().toISOString(),
    });

    setIsSubmitting(false);
    setContent("");
    setScreenshots([]);
    setShowNewTicket(false);
    toast.success("Ticket submitted! Our team will contact you via email.");

    // Add to local list
    setTickets((prev) => [{
      id: ticketId,
      classification,
      content,
      contact_email: contactEmail,
      status: "open",
      created_at: new Date().toISOString(),
    }, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft size={20} className="text-gray-700" /></button>
          <h1 className="font-bold text-gray-900 flex-1 text-center">Feedback</h1>
          <div className="w-8" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            {/* Empty state illustration */}
            <div className="w-28 h-28 flex items-center justify-center mb-4">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                <rect x="20" y="10" width="80" height="90" rx="8" fill="#e5e7eb"/>
                <rect x="30" y="25" width="60" height="6" rx="3" fill="#d1d5db"/>
                <rect x="30" y="38" width="45" height="6" rx="3" fill="#d1d5db"/>
                <rect x="30" y="51" width="52" height="6" rx="3" fill="#d1d5db"/>
                <rect x="30" y="64" width="38" height="6" rx="3" fill="#d1d5db"/>
                {/* pencil */}
                <rect x="60" y="75" width="40" height="12" rx="4" fill="#9ca3af" transform="rotate(-45 80 81)"/>
                <polygon points="54,98 58,90 66,98" fill="#6b7280"/>
              </svg>
            </div>
            <p className="text-gray-500 font-semibold">No records</p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-bold text-gray-800">{ticket.classification}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ticket.status === "open" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                  }`}>
                    {ticket.status === "open" ? "Open" : "Resolved"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{ticket.content}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(ticket.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Ticket Button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4">
        <button
          onClick={() => setShowNewTicket(true)}
          className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 rounded-2xl transition-colors text-base"
        >
          New Ticket
        </button>
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <button onClick={() => setShowNewTicket(false)}><X size={22} className="text-gray-700" /></button>
            <h2 className="font-bold text-gray-900">New Ticket</h2>
            <div className="w-8" />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
            {/* Classification */}
            <div>
              <label className="block text-sm text-gray-500 mb-2">Classification</label>
              <div className="relative">
                <button
                  onClick={() => setShowClassDropdown(!showClassDropdown)}
                  className="w-full bg-gray-100 rounded-xl px-4 py-3.5 text-left text-sm text-gray-800 font-medium flex items-center justify-between"
                >
                  {classification}
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
                {showClassDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 mt-1 overflow-hidden">
                    {CLASSIFICATIONS.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setClassification(c); setShowClassDropdown(false); }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 ${classification === c ? "text-yellow-600 font-semibold" : "text-gray-700"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Question content */}
            <div>
              <label className="block text-sm text-gray-500 mb-2">Question content</label>
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 400))}
                  placeholder="Describe your issue in detail..."
                  rows={8}
                  className="w-full bg-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-800 outline-none resize-none placeholder-gray-400"
                />
                <span className="absolute bottom-3 right-3 text-xs text-gray-400">{content.length}/400</span>
              </div>
            </div>

            {/* Screenshots */}
            <div>
              <label className="block text-sm text-gray-500 mb-2">Screenshots</label>
              <div className="flex gap-2 flex-wrap">
                {screenshots.map((url, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img src={url} alt="screenshot" className="w-full h-full object-cover rounded-xl" />
                    <button
                      onClick={() => setScreenshots((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
                {screenshots.length < 3 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus size={20} className="text-gray-400" />
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            {/* Contact details */}
            <div>
              <label className="block text-sm text-gray-500 mb-2">Contact details</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Please enter your email"
                className="w-full bg-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-800 outline-none placeholder-gray-400"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="px-4 pb-8 border-t border-gray-100 pt-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 rounded-2xl transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
