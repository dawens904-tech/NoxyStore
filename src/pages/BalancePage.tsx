/**
 * Balance Page — Top Up / Withdraw / Cash Flow tabs
 * Mobile: full-screen with back arrow | Desktop: sidebar + content panel (matches AccountPage style)
 *
 * NOTE: TabContent, DesktopLayout, MobileLayout are defined OUTSIDE BalancePage
 * to prevent React from remounting them on every render (causes white screen on iOS Safari).
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, CreditCard, Check, ChevronRight } from "lucide-react";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuthStore } from "@/stores/authStore";
import { supabase, retryQuery } from "@/lib/supabase";
import { toast } from "sonner";

type BalanceTab = "topup" | "withdraw" | "cashflow";

interface BankCard {
  id: string;
  card_number_masked: string;
  card_type: string;
  expiry: string;
  is_default: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  status: string;
}

const PAYMENT_METHODS = [
  {
    id: "visa",
    label: "Visa / Mastercard",
    icon: (
      <div className="flex items-center gap-1.5">
        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-5" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg" alt="MC" className="h-5" />
      </div>
    ),
  },
  {
    id: "jcb",
    label: "JCB / Amex / Discover",
    icon: (
      <div className="flex items-center gap-1">
        <div className="w-8 h-5 bg-[#003087] text-white text-[8px] font-bold flex items-center justify-center">JCB</div>
        <div className="w-8 h-5 bg-[#2E77BC] text-white text-[8px] font-bold flex items-center justify-center">AMEX</div>
        <div className="w-8 h-5 bg-orange-500 text-white text-[8px] font-bold flex items-center justify-center">DISC</div>
      </div>
    ),
  },
  {
    id: "paypal",
    label: "PayPal",
    icon: <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.png" alt="PayPal" className="h-6" />,
  },
  {
    id: "crypto",
    label: "Cryptocurrency",
    icon: (
      <div className="flex items-center gap-1">
        {["#F7931A", "#627EEA", "#26A17B", "#00A3FF"].map((c, i) => (
          <div key={i} className="w-5 h-5" style={{ backgroundColor: c }} />
        ))}
      </div>
    ),
  },
];

const WITHDRAW_METHODS = [
  { id: "ewallet", label: "e-Wallet", powered: "Payoneer" },
  { id: "bank_payoneer", label: "Bank Transfer", powered: "Payoneer" },
  { id: "bank_airwallex", label: "Bank Transfer", powered: "Airwallex" },
];

const PRESETS = ["50.00", "90.00", "150.00"];

function getCardLogo(type: string) {
  if (type === "visa") return <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />;
  if (type === "mastercard") return <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg" alt="MC" className="h-5" />;
  return <CreditCard size={16} className="text-gray-600" />;
}

// ─── Tab Content (outside BalancePage to prevent remount) ─────────────────────
interface TabContentProps {
  activeTab: BalanceTab;
  topupAmount: string;
  setTopupAmount: (v: string) => void;
  withdrawAmount: string;
  setWithdrawAmount: (v: string) => void;
  selectedPayment: string;
  setSelectedPayment: (v: string) => void;
  selectedWithdrawMethod: string;
  setSelectedWithdrawMethod: (v: string) => void;
  bankCards: BankCard[];
  transactions: Transaction[];
  cashflowFilter: string;
  setCashflowFilter: (v: string) => void;
  balance: number;
  onAddCard: () => void;
}

function TabContent({
  activeTab,
  topupAmount,
  setTopupAmount,
  withdrawAmount,
  setWithdrawAmount,
  selectedPayment,
  setSelectedPayment,
  selectedWithdrawMethod,
  setSelectedWithdrawMethod,
  bankCards,
  transactions,
  cashflowFilter,
  setCashflowFilter,
  balance,
  onAddCard,
}: TabContentProps) {
  const processingFee = parseFloat(topupAmount || "0") * 0.035 + 0.15;
  const totalAmount = parseFloat(topupAmount || "0") + processingFee;

  return (
    <div>
      {/* TOP UP */}
      {activeTab === "topup" && (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Top-up Amount</h3>
            <div className="border border-gray-300 px-4 py-3 flex items-center gap-2 mb-3">
              <span className="text-gray-400 font-semibold">$</span>
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="flex-1 outline-none text-2xl font-bold text-gray-900 bg-transparent"
              />
            </div>
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setTopupAmount(p)}
                  className={`flex-1 border py-2 text-sm font-semibold transition-all ${
                    topupAmount === p ? "border-yellow-400 bg-yellow-50 text-yellow-700" : "border-gray-300 text-gray-600"
                  }`}
                >
                  $ {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-3">Top-up Method</h3>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`border-2 py-4 px-3 flex items-center justify-center relative transition-all ${
                    selectedPayment === method.id ? "border-yellow-400 bg-yellow-50" : "border-gray-200"
                  }`}
                >
                  {selectedPayment === method.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-yellow-400 flex items-center justify-center">
                      <Check size={10} className="text-black" />
                    </div>
                  )}
                  {method.icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-3">Payment Account</h3>
            {bankCards.length > 0 ? (
              <div className="space-y-2">
                {bankCards.map((card) => (
                  <div key={card.id} className="border border-gray-200 px-4 py-3 flex items-center gap-3">
                    {getCardLogo(card.card_type)}
                    <span className="text-sm font-semibold text-gray-700">{card.card_number_masked}</span>
                    {card.is_default && <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 font-semibold">Default</span>}
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={onAddCard}
                className="w-full border border-dashed border-gray-300 py-4 flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <Plus size={18} />
                <span className="font-semibold">Add a bank card</span>
              </button>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 px-4 py-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              Payment processing fees: <span className="text-orange-500 font-semibold">3.5% + $0.15</span>, Actual payment amount:{" "}
              <span className="text-orange-500 font-semibold">${totalAmount.toFixed(2)}, processing fee: ${processingFee.toFixed(2)}</span>.
              Deposit balance can only be used to purchase items on this platform.
            </p>
          </div>

          <button
            onClick={() => toast.info("Balance top-up coming soon. Please purchase directly from the game catalog.")}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 transition-colors"
          >
            Top Up
          </button>
        </div>
      )}

      {/* WITHDRAW */}
      {activeTab === "withdraw" && (
        <div className="space-y-5">
          <div>
            <p className="text-sm text-gray-500 mb-1">Withdrawable Amount</p>
            <p className="text-3xl font-black text-gray-900">${balance.toFixed(2)}</p>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Amount</h3>
            <div className="border border-gray-300 px-4 py-3 flex items-center gap-2">
              <span className="text-gray-400 font-semibold">$</span>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 outline-none text-2xl font-bold text-gray-900 bg-transparent placeholder-gray-300"
              />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Method</h3>
            <div className="space-y-2">
              {WITHDRAW_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedWithdrawMethod(m.id)}
                  className={`w-full border-2 px-4 py-3.5 flex items-center justify-between transition-all ${
                    selectedWithdrawMethod === m.id ? "border-yellow-400 bg-yellow-50" : "border-gray-200"
                  }`}
                >
                  <span className="font-semibold text-gray-800 text-sm">{m.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Powered by</span>
                    <div className={`w-5 h-5 ${m.powered === "Payoneer" ? "bg-orange-500" : "bg-red-500"} flex items-center justify-center`}>
                      <span className="text-white text-[7px] font-bold">P</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">{m.powered}</span>
                    {selectedWithdrawMethod === m.id && (
                      <div className="w-5 h-5 bg-yellow-400 flex items-center justify-center ml-2">
                        <Check size={10} className="text-black" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Account</h3>
            <button
              onClick={() => toast.info("Please link a Payoneer or Airwallex account first.")}
              className="w-full border border-dashed border-gray-300 py-4 flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Plus size={18} />
              <span className="font-semibold">Add A Payoneer Account</span>
            </button>
          </div>
          <button
            disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
            onClick={() => toast.info("Withdrawal request submitted. Processing takes 3-5 business days.")}
            className={`w-full font-bold py-4 transition-colors ${
              withdrawAmount && parseFloat(withdrawAmount) > 0
                ? "bg-yellow-400 hover:bg-yellow-300 text-black"
                : "bg-yellow-200 text-yellow-600 cursor-not-allowed"
            }`}
          >
            Confirm
          </button>
        </div>
      )}

      {/* CASH FLOW */}
      {activeTab === "cashflow" && (
        <div>
          <div className="mb-4">
            <select
              value={cashflowFilter}
              onChange={(e) => setCashflowFilter(e.target.value)}
              className="border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white outline-none"
            >
              {["All", "Top Up", "Withdraw", "Purchase", "Refund"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-24 h-24 bg-gray-100 flex items-center justify-center mb-4">
                <svg viewBox="0 0 80 80" className="w-16 h-16">
                  <rect x="10" y="5" width="60" height="70" rx="6" fill="#e5e7eb"/>
                  <rect x="20" y="18" width="40" height="4" rx="2" fill="#d1d5db"/>
                  <rect x="20" y="28" width="30" height="4" rx="2" fill="#d1d5db"/>
                  <rect x="20" y="38" width="35" height="4" rx="2" fill="#d1d5db"/>
                  <path d="M50 55 L60 65 L70 50" stroke="#9ca3af" strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-gray-500 font-semibold">No records</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm capitalize">{tx.type}</p>
                    <p className="text-xs text-gray-400">{tx.description}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-bold text-sm ${tx.type === "purchase" || tx.type === "withdraw" ? "text-red-500" : "text-green-600"}`}>
                    {tx.type === "purchase" || tx.type === "withdraw" ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function BalancePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<BalanceTab>("topup");
  const [topupAmount, setTopupAmount] = useState("50.00");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("visa");
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState("ewallet");
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cashflowFilter, setCashflowFilter] = useState("All");
  const [balance, setBalance] = useState<number>(user?.balance || 0);

  // Fetch real wallet balance from wallet_transactions (credits - debits)
  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from("wallet_transactions")
      .select("type, amount, status")
      .eq("user_email", user.email)
      .eq("status", "completed")
      .then(({ data }) => {
        if (!data) return;
        const bal = data.reduce((acc, tx) => {
          const debitTypes = ["purchase", "withdraw", "points_redeemed"];
          const creditTypes = ["topup", "refund", "bonus", "points_earned"];
          if (debitTypes.includes(tx.type)) return acc - Math.abs(tx.amount);
          if (creditTypes.includes(tx.type)) return acc + Math.abs(tx.amount);
          return acc;
        }, 0);
        setBalance(Math.max(0, parseFloat(bal.toFixed(2))));
      });
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    const cacheKey = `balance_data_${user.email}`;

    // 1. Load stale data from localStorage immediately (instant display)
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { cards, txs } = JSON.parse(cached);
        if (cards) setBankCards(cards);
        if (txs) setTransactions(txs);
      }
    } catch (_) {}

    // 2. Fetch fresh data with retry backoff
    retryQuery(() =>
      supabase.from("user_bank_cards").select("*").eq("user_email", user.email!)
    ).then(({ data }) => {
      if (data) {
        setBankCards(data);
        // Update cache
        try {
          const cached = localStorage.getItem(cacheKey);
          const prev = cached ? JSON.parse(cached) : {};
          localStorage.setItem(cacheKey, JSON.stringify({ ...prev, cards: data }));
        } catch (_) {}
      }
    });

    retryQuery(() =>
      supabase.from("wallet_transactions").select("*").eq("user_email", user.email!)
        .order("created_at", { ascending: false }).limit(50)
    ).then(({ data }) => {
      if (data) {
        setTransactions(data);
        try {
          const cached = localStorage.getItem(cacheKey);
          const prev = cached ? JSON.parse(cached) : {};
          localStorage.setItem(cacheKey, JSON.stringify({ ...prev, txs: data }));
        } catch (_) {}
      }
    });
  }, [user?.email]);

  const tabProps: TabContentProps = {
    activeTab,
    topupAmount,
    setTopupAmount,
    withdrawAmount,
    setWithdrawAmount,
    selectedPayment,
    setSelectedPayment,
    selectedWithdrawMethod,
    setSelectedWithdrawMethod,
    bankCards,
    transactions,
    cashflowFilter,
    setCashflowFilter,
    balance,
    onAddCard: () => setShowAddCard(true),
  };

  const TABS: [BalanceTab, string][] = [
    ["topup", "Top Up"],
    ["withdraw", "Withdraw"],
    ["cashflow", "Cash Flow"],
  ];

  return (
    <>
      {/* ── Desktop ── */}
      <div className="hidden lg:block min-h-screen bg-[#f5f5f5]">
        <DesktopHeader />
        <div className="max-w-[1280px] mx-auto px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => navigate("/")} className="hover:text-gray-700">Home</button>
            <ChevronRight size={14} />
            <button onClick={() => navigate("/account")} className="hover:text-gray-700">Account</button>
            <ChevronRight size={14} />
            <span className="text-gray-800 font-medium">Balance</span>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-6 pb-12">
          <div className="flex gap-6">
            {/* Sidebar — AccountPage style */}
            <div className="w-72 flex-shrink-0 sticky top-6 self-start h-fit">
              <div className="bg-white shadow-sm p-5 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                    {user?.nickname?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{user?.nickname}</p>
                    <button onClick={() => navigate("/vip")} className="text-xs text-yellow-600 font-medium flex items-center gap-1 hover:underline">Check VIP Benefits <ChevronRight size={12} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-4 py-3 border-y border-gray-100">
                  <button onClick={() => navigate("/balance")} className="hover:opacity-80 transition-opacity">
                    <p className="text-lg font-bold text-gray-900">${balance.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Balance</p>
                  </button>
                  <div className="h-8 w-px bg-gray-200" />
                  <button onClick={() => navigate("/points")} className="hover:opacity-80 transition-opacity">
                    <p className="text-lg font-bold text-gray-900 flex items-center gap-1"><span className="text-yellow-500">●</span> {user?.points ?? 0}</p>
                    <p className="text-xs text-gray-500">Points</p>
                  </button>
                </div>
              </div>
              <div className="bg-white shadow-sm overflow-hidden">
                {[
                  { label: "Buy History", path: "/account", active: false },
                  { label: "Coupon", path: "/coupons", active: false },
                  { label: "Settings", path: "/account", active: false },
                  { label: "Help Center", path: "/support", active: false },
                  { label: "Feedback", path: "/feedback", active: false },
                  { label: "Balance", path: "/balance", active: true },
                  { label: "Invite for Coupons", path: "/invite", active: false },
                  { label: "Affiliate Program", path: "/affiliate", active: false, highlight: true },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${
                      item.active
                        ? "bg-yellow-50 text-yellow-700 border-l-4 border-l-yellow-400"
                        : item.highlight
                        ? "text-yellow-500 hover:bg-yellow-50"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                    <ChevronRight size={14} className="text-gray-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="bg-gradient-to-r from-yellow-400 to-amber-400 p-6 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-yellow-900 opacity-75">Current Balance</p>
                  <p className="text-5xl font-black text-black mt-1">
                    <span className="text-3xl">$</span>{balance.toFixed(2)}
                  </p>
                </div>
                <div className="w-24 h-24 opacity-70">
                  <svg viewBox="0 0 100 100" fill="none">
                    <rect x="10" y="20" width="80" height="60" rx="0" fill="rgba(0,0,0,0.15)" stroke="rgba(0,0,0,0.2)" strokeWidth="2"/>
                    <rect x="10" y="30" width="80" height="15" fill="rgba(0,0,0,0.1)"/>
                    <circle cx="75" cy="65" r="10" fill="rgba(255,255,255,0.4)"/>
                    <path d="M20 55 L40 55" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    <path d="M20 62 L35 62" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              <div className="bg-white overflow-hidden">
                <div className="flex border-b border-gray-200">
                  {TABS.map(([tab, label]) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-4 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === tab ? "border-yellow-400 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="p-8">
                  <TabContent {...tabProps} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile ── */}
      <div className="lg:hidden bg-white" style={{ minHeight: "100dvh" }}>
        <div className="bg-[#0a0a0a] sticky top-0 z-40">
          <div className="flex items-center gap-3 px-4 py-3" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
            <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={20} /></button>
            <span className="text-white font-bold flex-1 text-center">Balance</span>
            <div className="w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-amber-100 px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-600">Balance</p>
            <p className="text-4xl font-black text-gray-900 mt-1">
              <span className="text-2xl">$</span>{balance.toFixed(2)}
            </p>
          </div>
          <div className="w-20 h-20 opacity-80">
            <svg viewBox="0 0 100 100" fill="none">
              <rect x="10" y="20" width="80" height="60" rx="0" fill="#FFD200" stroke="#F0A000" strokeWidth="2"/>
              <rect x="10" y="30" width="80" height="15" fill="#F0A000"/>
              <circle cx="75" cy="65" r="10" fill="#FFE066"/>
              <path d="M20 55 L40 55" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <path d="M20 62 L35 62" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div className="flex border-b border-gray-200">
          {TABS.map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab ? "border-yellow-400 text-gray-900" : "border-transparent text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-4 py-5" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}>
          <TabContent {...tabProps} />
        </div>
        <BottomNav />
      </div>

      {showAddCard && (
        <AddBankCardModal
          onClose={() => setShowAddCard(false)}
          onSave={(card) => { setBankCards((prev) => [...prev, card]); setShowAddCard(false); }}
          userEmail={user?.email || ""}
          userId={user?.id || ""}
        />
      )}
    </>
  );
}

// ─── Add Bank Card Modal ──────────────────────────────────────────────────────
function AddBankCardModal({ onClose, onSave, userEmail, userId }: {
  onClose: () => void;
  onSave: (card: BankCard) => void;
  userEmail: string;
  userId: string;
}) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const detectCardType = (num: string): string => {
    const n = num.replace(/\s/g, "");
    if (n.startsWith("4")) return "visa";
    if (/^5[1-5]/.test(n)) return "mastercard";
    if (/^3[47]/.test(n)) return "amex";
    if (/^35/.test(n)) return "jcb";
    return "visa";
  };

  const formatCardNumber = (val: string) =>
    val.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);

  const formatExpiry = (val: string) => {
    const v = val.replace(/\D/g, "");
    return v.length >= 2 ? v.slice(0, 2) + "/" + v.slice(2, 4) : v;
  };

  const handleSave = async () => {
    if (cardNumber.replace(/\s/g, "").length < 13) { toast.error("Invalid card number"); return; }
    if (!expiry || expiry.length < 5) { toast.error("Invalid expiry date"); return; }
    if (!cvv || cvv.length < 3) { toast.error("Invalid CVV"); return; }

    setIsSaving(true);
    const cardType = detectCardType(cardNumber);
    const last4 = cardNumber.replace(/\s/g, "").slice(-4);
    const masked = `**** **** **** ${last4}`;

    const { data, error } = await supabase.from("user_bank_cards").insert({
      user_id: userId,
      user_email: userEmail,
      card_number_masked: masked,
      card_type: cardType,
      expiry,
      is_default: true,
    }).select().single();

    setIsSaving(false);
    if (error) { toast.error("Failed to save card"); return; }
    toast.success("Card added successfully!");
    onSave(data as BankCard);
  };

  const cardType = detectCardType(cardNumber);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
      <div className="bg-white flex-1 flex flex-col max-w-lg mx-auto w-full mt-auto lg:my-auto lg:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <button onClick={onClose}><X size={22} className="text-gray-700" /></button>
          <h2 className="font-bold text-gray-900">Payment Information</h2>
          <div className="w-8" />
        </div>

        <div className="flex-1 px-4 py-5 space-y-5">
          <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
            <div className="w-5 h-5 bg-green-600 flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
            Your payment information are encrypted
          </div>

          <div className="flex items-center gap-3">
            <div className={`border-2 px-3 py-1.5 transition-all ${cardType === "visa" ? "border-blue-500" : "border-gray-200"}`}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
            </div>
            <div className={`border-2 px-3 py-1.5 transition-all ${cardType === "mastercard" ? "border-red-500" : "border-gray-200"}`}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg" alt="MC" className="h-5" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">*Bank card number</label>
            <div className="bg-gray-100 px-4 py-3.5 flex items-center gap-3">
              <CreditCard size={18} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="Enter card number"
                className="flex-1 bg-transparent outline-none text-gray-700 text-base"
                maxLength={19}
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">*Expiry date</label>
            <div className="bg-gray-100 px-4 py-3.5">
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                className="w-full bg-transparent outline-none text-gray-700 text-base"
                maxLength={5}
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">*CVV</label>
            <div className="bg-gray-100 px-4 py-3.5">
              <input
                type="password"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="CVV"
                className="w-full bg-transparent outline-none text-gray-700 text-base"
                maxLength={4}
                inputMode="numeric"
              />
            </div>
          </div>
        </div>

        <div className="px-4 pb-8">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 transition-colors"
          >
            {isSaving ? "Saving..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
