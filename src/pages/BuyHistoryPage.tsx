/**
 * BuyHistoryPage — Full buy history page with LootBar-style order cards.
 * Features: All/Need Action/Processing/Refund tabs, Purchase Again, Customer Service modal.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Loader2, Check, X, Plus } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { AccountSidebar } from "@/components/features/AccountSidebar";
import { supabase } from "@/lib/supabase";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupportChatButton } from "@/components/features/SupportChatButton";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

interface Order {
  id: string;
  reference_id: string;
  order_id: string | null;
  game_id: string;
  game_name: string;
  sku_name: string;
  quantity: number;
  price: number;
  state: number;
  extra_info: Record<string, string>;
  user_email: string | null;
  created_at: string;
}

const STATE_MAP: Record<number, { label: string; color: string }> = {
  1: { label: "Pending", color: "text-yellow-600" },
  2: { label: "Processing", color: "text-blue-600" },
  3: { label: "Completed", color: "text-green-600" },
  4: { label: "Cancelled", color: "text-gray-400" },
  5: { label: "Failed", color: "text-red-500" },
};

// ─── Customer Service Modal (photo 19-20) ─────────────────────────────────────
function CustomerServiceModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { user } = useAuthStore();
  const [classification, setClassification] = useState("After-sales application");
  const [content, setContent] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [showClassDrop, setShowClassDrop] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const CLASSIFICATIONS = [
    "After-sales application", "Payment issues", "Top-up not received",
    "Wrong UID/Server", "Refund request", "Account security", "Technical issue", "Other"
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `chat/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-images").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
    setScreenshots(p => [...p, data.publicUrl]);
    toast.success("Screenshot attached");
  };

  const handleSubmit = async () => {
    if (!content.trim()) { toast.error("Please describe your issue"); return; }
    setIsSubmitting(true);
    const ticketId = `TKT-${Date.now()}`;
    const fullContent = `[TICKET] Classification: ${classification}\nOrder: ${order.order_id || order.reference_id}\nGame: ${order.game_name}\nSKU: ${order.sku_name}\n\n${content}`;
    await supabase.from("chat_messages").insert({
      session_id: ticketId, user_email: contactEmail, sender: "user", content: fullContent,
    });
    await supabase.from("chat_sessions").upsert({
      id: ticketId, user_email: contactEmail, status: "waiting", updated_at: new Date().toISOString(),
    });
    toast.success("Ticket submitted! Our team will respond within 24 hours.");
    onClose();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">New Ticket</h3>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>

        {/* Banner */}
        <div className="bg-yellow-50 border-b border-yellow-100 px-5 py-3 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-yellow-600 flex-shrink-0">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.88 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.81 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91"/>
          </svg>
          <span className="text-sm text-yellow-800 font-medium">Submit your question or suggestion</span>
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Classification */}
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">Classification</label>
            <div className="relative">
              <button onClick={() => setShowClassDrop(!showClassDrop)}
                className="w-full bg-gray-100 px-4 py-3 text-left text-sm flex items-center justify-between rounded">
                <span className="text-gray-700">{classification}</span>
                <ChevronRight size={14} className={`text-gray-400 transition-transform ${showClassDrop ? "rotate-90" : ""}`} />
              </button>
              {showClassDrop && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-lg z-10 mt-1 overflow-hidden rounded">
                  {CLASSIFICATIONS.map(c => (
                    <button key={c} onClick={() => { setClassification(c); setShowClassDrop(false); }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b last:border-0 ${classification === c ? "text-yellow-600 font-semibold" : "text-gray-700"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Question content */}
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">Question content</label>
            <div className="relative">
              <textarea value={content} onChange={e => setContent(e.target.value.slice(0, 400))}
                placeholder="Describe your issue..."
                rows={5} className="w-full bg-gray-100 px-4 py-3 text-sm outline-none resize-none rounded" />
              <span className="absolute bottom-2 right-3 text-xs text-gray-400">{content.length}/400</span>
            </div>
          </div>

          {/* Screenshots */}
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">Screenshots (optional)</label>
            <div className="flex gap-2 flex-wrap">
              {screenshots.map((url, i) => (
                <div key={i} className="relative w-16 h-16 border border-dashed border-gray-300 rounded">
                  <img src={url} alt="" className="w-full h-full object-cover rounded" />
                  <button onClick={() => setScreenshots(p => p.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-gray-800 rounded-full flex items-center justify-center">
                    <X size={9} className="text-white" />
                  </button>
                </div>
              ))}
              {screenshots.length < 3 && (
                <button onClick={() => fileRef.current?.click()}
                  className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center hover:bg-gray-50">
                  <Plus size={18} className="text-gray-400" />
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Contact email */}
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">Contact details</label>
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
              placeholder="Please enter your email"
              className="w-full bg-gray-100 px-4 py-3 text-sm outline-none rounded" />
          </div>

          {/* Order Number (auto-filled, read-only) */}
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">*Order Number</label>
            <input type="text" value={order.order_id || order.reference_id} readOnly
              className="w-full bg-gray-100 px-4 py-3 text-sm outline-none rounded text-gray-700 cursor-not-allowed" />
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-100">
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 transition-colors">
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Detail Panel (photos 17-18) ────────────────────────────────────────
function OrderDetailPanel({ order, onBack, onCustomerService }: {
  order: Order;
  onBack: () => void;
  onCustomerService: () => void;
}) {
  const navigate = useNavigate();
  const stateInfo = STATE_MAP[order.state] || STATE_MAP[1];
  const isCompleted = order.state === 3;

  const handlePurchaseAgain = () => {
    navigate(`/game/${order.game_id}`);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-5 px-6 py-4 border-b border-gray-100">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded transition-colors">
          <ArrowLeft size={18} className="text-gray-700" />
        </button>
        <h3 className="font-bold text-gray-900">Order Details</h3>
      </div>

      <div className="px-6 pb-6">
        {/* Status */}
        <div className="mb-5">
          {isCompleted ? (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <Check size={12} className="text-white" />
              </div>
              <h4 className="font-bold text-gray-900">Order Completed</h4>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${order.state === 4 ? "bg-gray-400" : "bg-yellow-400"}`} />
              <h4 className={`font-bold ${stateInfo.color}`}>{stateInfo.label}</h4>
            </div>
          )}
          {isCompleted && (
            <p className="text-sm text-gray-500 ml-7">Order completed, please log in to the game to check if it has been credited</p>
          )}
        </div>

        {/* Order info row */}
        <div className="flex items-center gap-2 mb-5 text-sm text-gray-500">
          <span>{new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          <span className="text-gray-300">|</span>
          <span className="font-mono">{order.order_id || order.reference_id}</span>
          <button onClick={() => navigate(`/game/${order.game_id}`)} className="text-yellow-600 font-semibold hover:underline ml-1">
            {order.game_name} →
          </button>
        </div>

        {/* SKU row */}
        <div className="border border-gray-100 p-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-100 flex-shrink-0 overflow-hidden">
              <img src={`https://images.unsplash.com/photo-1542751371-adc38448a05e?w=56&h=56&fit=crop`} alt={order.game_name}
                className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">{order.sku_name}</p>
              {order.extra_info?.server && <p className="text-xs text-gray-500 mt-0.5">Server: {order.extra_info.server}</p>}
              <p className="text-xs text-gray-400">${Number(order.price).toFixed(2)} × {order.quantity || 1}</p>
            </div>
            <p className="font-bold text-gray-900">${Number(order.price).toFixed(2)}</p>
          </div>
          {order.extra_info?.player_id && (
            <p className="text-sm text-gray-500 mt-3">UID : {order.extra_info.player_id}</p>
          )}
          <div className="flex gap-3 mt-4 justify-end">
            <button onClick={onCustomerService}
              className="border border-gray-300 text-gray-700 font-semibold text-sm px-4 py-2 hover:bg-gray-50 transition-colors">
              Customer Service
            </button>
            <button onClick={handlePurchaseAgain}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm px-4 py-2 transition-colors">
              Purchase Again
            </button>
          </div>
        </div>

        {/* Order Information */}
        <div>
          <h4 className="font-bold text-gray-900 mb-3">Order Information</h4>
          <div className="space-y-0 divide-y divide-gray-50">
            {[
              { label: "Order Number", value: order.order_id || order.reference_id },
              { label: "Order created at", value: new Date(order.created_at).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) },
              { label: "Payment Method", value: "Card / Crypto" },
              { label: "Delivery Method", value: "Instant Topup" },
              { label: "Price", value: `${Number(order.price).toFixed(2)} USD` },
            ].map(row => (
              <div key={row.label} className="flex items-start justify-between py-2.5">
                <span className="text-sm text-gray-500 w-40 flex-shrink-0">{row.label} :</span>
                <span className="text-sm text-gray-900 font-medium text-right flex-1">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop Sidebar — replaced by shared AccountSidebar ────────────────────

export function BuyHistoryPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "needaction" | "processing" | "refund">("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    loadOrders();
  }, [isAuthenticated]);

  const loadOrders = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("orders").select("*")
      .eq("user_email", user?.email).order("created_at", { ascending: false }).limit(50);
    if (data) setOrders(data as Order[]);
    setIsLoading(false);
  };

  const getFilteredOrders = () => {
    switch (activeFilter) {
      case "needaction": return orders.filter(o => o.state === 1);
      case "processing": return orders.filter(o => o.state === 2);
      case "refund": return orders.filter(o => o.state === 5);
      default: return orders;
    }
  };

  const handleCustomerService = (order: Order) => {
    setServiceOrder(order);
    setShowServiceModal(true);
  };

  const filteredOrders = getFilteredOrders();

  const TABS = [
    { key: "all" as const, label: t("all") },
    { key: "needaction" as const, label: t("needAction") },
    { key: "processing" as const, label: t("processing") },
    { key: "refund" as const, label: t("refundTab") },
  ];

  const OrderCard = ({ order }: { order: Order }) => {
    const stateInfo = STATE_MAP[order.state] || STATE_MAP[1];
    return (
      <div className="border-b border-gray-100 py-5">
        {/* Order header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            <span className="font-mono">{order.order_id || order.reference_id}</span>
            <button onClick={() => navigate(`/game/${order.game_id}`)}
              className="text-yellow-600 font-semibold hover:underline flex items-center gap-0.5">
              {order.game_name} <ChevronRight size={12} />
            </button>
          </div>
          <span className={`text-sm font-semibold ${stateInfo.color}`}>{stateInfo.label}</span>
        </div>

        {/* SKU row */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gray-100 flex-shrink-0 overflow-hidden">
            <img src={`https://images.unsplash.com/photo-1542751371-adc38448a05e?w=56&h=56&fit=crop`}
              alt={order.game_name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-sm">{order.sku_name}</p>
            {order.extra_info?.server && <p className="text-xs text-gray-500">Server: {order.extra_info.server}</p>}
            <p className="text-xs text-gray-400">${Number(order.price).toFixed(2)} × {order.quantity || 1}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900">${Number(order.price).toFixed(2)}</p>
            <button onClick={() => setSelectedOrder(order)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5 ml-auto mt-0.5">
              <ChevronRight size={10} className="rotate-90" />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4 justify-end">
          <button onClick={() => handleCustomerService(order)}
            className="border border-gray-300 text-gray-700 font-semibold text-sm px-4 py-2 hover:bg-gray-50 transition-colors">
            Customer Service
          </button>
          <button onClick={() => navigate(`/game/${order.game_id}`)}
            className="border border-gray-300 text-gray-700 font-semibold text-sm px-4 py-2 hover:bg-gray-50 transition-colors">
            Purchase Again
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="hidden lg:block"><DesktopHeader /></div>
      <div className="lg:hidden">
        <div className="bg-[#0a0a0a] sticky top-0 z-40 flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={20} /></button>
          <span className="text-white font-bold flex-1 text-center">{t("buyHistory")}</span>
          <div className="w-8" />
        </div>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block max-w-[1280px] mx-auto px-6 py-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Home</button>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium">Buy History</span>
        </div>
        <div className="flex gap-6 items-start">
          <AccountSidebar activePage="buyHistory" className="sticky top-[72px] self-start" />
          <div className="flex-1 bg-white shadow-sm">
            {selectedOrder ? (
              <OrderDetailPanel
                order={selectedOrder}
                onBack={() => setSelectedOrder(null)}
                onCustomerService={() => handleCustomerService(selectedOrder)}
              />
            ) : (
              <>
                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-4">
                  {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
                      className={`py-4 px-4 text-sm font-medium relative transition-colors ${activeFilter === tab.key ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                      {tab.label}
                      {activeFilter === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400" />}
                    </button>
                  ))}
                </div>

                <div className="px-4">
                  {isLoading ? (
                    <div className="space-y-4 py-6">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse" />)}</div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="text-4xl mb-4 opacity-30">📦</div>
                      <p className="text-gray-400 font-medium">No orders yet</p>
                      <button onClick={() => navigate("/")} className="mt-4 bg-yellow-400 text-black font-bold px-6 py-2.5 text-sm">{t("browseGames")}</button>
                    </div>
                  ) : (
                    filteredOrders.map(order => (
                      <button key={order.id} onClick={() => setSelectedOrder(order)} className="w-full text-left">
                        <OrderCard order={order} />
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile ── */}
      <div className="lg:hidden pb-24">
        {selectedOrder ? (
          <div className="bg-white min-h-screen">
            <OrderDetailPanel
              order={selectedOrder}
              onBack={() => setSelectedOrder(null)}
              onCustomerService={() => handleCustomerService(selectedOrder)}
            />
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            <div className="bg-white flex border-b border-gray-100 overflow-x-auto">
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
                  className={`flex-shrink-0 py-3 px-4 text-sm font-medium relative transition-colors ${activeFilter === tab.key ? "text-gray-900" : "text-gray-500"}`}>
                  {tab.label}
                  {activeFilter === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400" />}
                </button>
              ))}
            </div>
            <div className="px-4 pt-2">
              {isLoading ? (
                <div className="space-y-3 py-4">{[1,2].map(i => <div key={i} className="h-20 bg-white animate-pulse" />)}</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-400">No orders found</p>
                  <button onClick={() => navigate("/")} className="mt-4 bg-yellow-400 text-black font-bold px-6 py-2.5 text-sm">{t("browseGames")}</button>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <button key={order.id} onClick={() => setSelectedOrder(order)} className="w-full text-left bg-white mb-2">
                    <OrderCard order={order} />
                  </button>
                ))
              )}
            </div>
          </>
        )}
        <BottomNav />
      </div>

      {/* Customer Service Modal */}
      {showServiceModal && serviceOrder && (
        <CustomerServiceModal order={serviceOrder} onClose={() => { setShowServiceModal(false); setServiceOrder(null); }} />
      )}

      <SupportChatButton />
    </div>
  );
}
