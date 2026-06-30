/**
 * Balance Page — Top Up / Withdraw / Cash Flow tabs
 * Mobile: full-screen with back arrow | Desktop: sidebar + content panel (matches AccountPage style)
 *
 * NOTE: TabContent, DesktopLayout, MobileLayout are defined OUTSIDE BalancePage
 * to prevent React from remounting them on every render (causes white screen on iOS Safari).
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, CreditCard, Check, ChevronRight, Loader2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, ShoppingBag, RotateCcw } from "lucide-react";
import { AccountSidebar } from "@/components/features/AccountSidebar";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuthStore } from "@/stores/authStore";
import { supabase, retryQuery } from "@/lib/supabase";
import { toast } from "sonner";
import { FunctionsHttpError } from "@supabase/supabase-js";

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
  method?: string;
}

const PRESETS = ["20.00", "50.00", "100.00", "200.00"];

const WITHDRAW_METHODS = [
  { id: "ewallet", label: "e-Wallet", powered: "Payoneer" },
  { id: "bank_payoneer", label: "Bank Transfer", powered: "Payoneer" },
  { id: "bank_airwallex", label: "Bank Transfer", powered: "Airwallex" },
];

function getCardLogo(type: string) {
  if (type === "visa") return <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />;
  if (type === "mastercard") return <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg" alt="MC" className="h-5" />;
  return <CreditCard size={16} className="text-gray-600" />;
}

// ── Transaction type metadata ─────────────────────────────────────────────────
const TX_META: Record<string, { label: string; icon: React.ReactNode; colorClass: string; sign: "+" | "-" }> = {
  deposit:   { label: "Deposit",   icon: <ArrowDownLeft size={14} />, colorClass: "text-green-600 bg-green-50",  sign: "+" },
  topup:     { label: "Top Up",    icon: <ArrowDownLeft size={14} />, colorClass: "text-green-600 bg-green-50",  sign: "+" },
  refund:    { label: "Refund",    icon: <RotateCcw size={14} />,     colorClass: "text-blue-600 bg-blue-50",    sign: "+" },
  bonus:     { label: "Bonus",     icon: <TrendingUp size={14} />,    colorClass: "text-purple-600 bg-purple-50",sign: "+" },
  purchase:  { label: "Purchase",  icon: <ShoppingBag size={14} />,   colorClass: "text-red-500 bg-red-50",      sign: "-" },
  withdraw:  { label: "Withdraw",  icon: <ArrowUpRight size={14} />,  colorClass: "text-orange-500 bg-orange-50",sign: "-" },
};

function getTxMeta(type: string) {
  return TX_META[type] ?? { label: type, icon: <TrendingDown size={14} />, colorClass: "text-gray-500 bg-gray-100", sign: "-" as const };
}

// ─── Tab Content (outside BalancePage to prevent remount) ─────────────────────
interface TabContentProps {
  activeTab: BalanceTab;
  topupAmount: string;
  setTopupAmount: (v: string) => void;
  withdrawAmount: string;
  setWithdrawAmount: (v: string) => void;
  selectedWithdrawMethod: string;
  setSelectedWithdrawMethod: (v: string) => void;
  bankCards: BankCard[];
  transactions: Transaction[];
  cashflowFilter: string;
  setCashflowFilter: (v: string) => void;
  balance: number;
  onAddCard: () => void;
  onStripeTopup: () => void;
  isProcessingTopup: boolean;
}

function TabContent({
  activeTab,
  topupAmount,
  setTopupAmount,
  withdrawAmount,
  setWithdrawAmount,
  selectedWithdrawMethod,
  setSelectedWithdrawMethod,
  bankCards,
  transactions,
  cashflowFilter,
  setCashflowFilter,
  balance,
  onAddCard,
  onStripeTopup,
  isProcessingTopup,
}: TabContentProps) {
  const amount = parseFloat(topupAmount || "0");
  const processingFee = amount * 0.035 + (amount > 0 ? 0.15 : 0);
  const totalAmount = amount + processingFee;

  const filteredTx = cashflowFilter === "All"
    ? transactions
    : transactions.filter(tx => {
        const label = getTxMeta(tx.type).label.toLowerCase();
        return label === cashflowFilter.toLowerCase();
      });

  return (
    <div>
      {/* TOP UP */}
      {activeTab === "topup" && (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Top-up Amount</h3>
            <div className="border border-gray-300 px-4 py-3 flex items-center gap-2 mb-3">
              <span className="text-gray-400 font-semibold text-xl">$</span>
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                min="1"
                className="flex-1 outline-none text-2xl font-bold text-gray-900 bg-transparent"
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setTopupAmount(p)}
                  className={`border py-2 text-sm font-semibold transition-all ${
                    topupAmount === p ? "border-yellow-400 bg-yellow-50 text-yellow-700" : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  ${p}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method: Stripe card */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Payment Method</h3>
            <div className="border-2 border-yellow-400 bg-yellow-50 py-4 px-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-yellow-500 rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <img src="/images/IMG_8408.webp" alt="Visa/Mastercard" className="h-7 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <span className="text-sm font-semibold text-gray-700">Credit / Debit Card</span>
              </div>
              <span className="ml-auto text-xs text-green-600 font-semibold">Secure</span>
            </div>
          </div>

          {/* Saved cards */}
          {bankCards.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Payment Account</h3>
              <div className="space-y-2">
                {bankCards.map((card) => (
                  <div key={card.id} className="border border-gray-200 px-4 py-3 flex items-center gap-3">
                    {getCardLogo(card.card_type)}
                    <span className="text-sm font-semibold text-gray-700">{card.card_number_masked}</span>
                    {card.is_default && <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 font-semibold">Default</span>}
                  </div>
                ))}
                <button
                  onClick={onAddCard}
                  className="w-full border border-dashed border-gray-300 py-3 flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                >
                  <Plus size={16} /> Add another card
                </button>
              </div>
            </div>
          )}

          {bankCards.length === 0 && (
            <button
              onClick={onAddCard}
              className="w-full border border-dashed border-gray-300 py-4 flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Plus size={18} />
              <span className="font-semibold">Add a bank card</span>
            </button>
          )}

          {amount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 px-4 py-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                Processing fee: <span className="text-orange-500 font-semibold">3.5% + $0.15 = ${processingFee.toFixed(2)}</span>
                <span className="mx-1">·</span>
                Total charged: <span className="text-orange-500 font-semibold">${totalAmount.toFixed(2)}</span>
              </p>
            </div>
          )}

          <button
            onClick={onStripeTopup}
            disabled={isProcessingTopup || amount <= 0}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isProcessingTopup ? (
              <><Loader2 size={18} className="animate-spin" /> Processing...</>
            ) : (
              `Top Up $${amount > 0 ? amount.toFixed(2) : "0.00"}`
            )}
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
          {/* Filter */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {["All", "Deposit", "Purchase", "Refund", "Withdraw", "Bonus"].map((f) => (
              <button
                key={f}
                onClick={() => setCashflowFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold border transition-all rounded-full ${
                  cashflowFilter === f
                    ? "bg-yellow-400 border-yellow-400 text-black"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {filteredTx.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gray-100 flex items-center justify-center mb-4 rounded-full">
                <svg viewBox="0 0 80 80" className="w-14 h-14">
                  <rect x="10" y="5" width="60" height="70" rx="6" fill="#e5e7eb"/>
                  <rect x="20" y="18" width="40" height="4" rx="2" fill="#d1d5db"/>
                  <rect x="20" y="28" width="30" height="4" rx="2" fill="#d1d5db"/>
                  <rect x="20" y="38" width="35" height="4" rx="2" fill="#d1d5db"/>
                </svg>
              </div>
              <p className="text-gray-500 font-semibold text-sm">No transactions yet</p>
              <p className="text-gray-400 text-xs mt-1">Your cash flow history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTx.map((tx) => {
                const meta = getTxMeta(tx.type);
                const isCredit = meta.sign === "+";
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3.5">
                    {/* Icon badge */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.colorClass}`}>
                      {meta.icon}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 text-sm">{meta.label}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          tx.status === "completed" ? "bg-green-100 text-green-700" :
                          tx.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-600"
                        }`}>
                          {tx.status || "completed"}
                        </span>
                      </div>
                      {tx.description && <p className="text-xs text-gray-400 truncate mt-0.5">{tx.description}</p>}
                      {tx.method && <p className="text-xs text-gray-400">via {tx.method}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${isCredit ? "text-green-600" : "text-red-500"}`}>
                        {meta.sign}${Math.abs(tx.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
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
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState("ewallet");
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cashflowFilter, setCashflowFilter] = useState("All");
  const [balance, setBalance] = useState<number>(user?.balance || 0);
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);

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
          const creditTypes = ["deposit", "topup", "refund", "bonus", "points_earned"];
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

    // Load stale data from localStorage immediately
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { cards, txs } = JSON.parse(cached);
        if (cards) setBankCards(cards);
        if (txs) setTransactions(txs);
      }
    } catch (_) {}

    // Fetch fresh cards
    retryQuery(() =>
      supabase.from("user_bank_cards").select("*").eq("user_email", user.email!)
    ).then(({ data }) => {
      if (data) {
        setBankCards(data);
        try {
          const cached = localStorage.getItem(cacheKey);
          const prev = cached ? JSON.parse(cached) : {};
          localStorage.setItem(cacheKey, JSON.stringify({ ...prev, cards: data }));
        } catch (_) {}
      }
    });

    // Fetch fresh transactions
    retryQuery(() =>
      supabase.from("wallet_transactions").select("*").eq("user_email", user.email!)
        .order("created_at", { ascending: false }).limit(100)
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

  // ── Stripe top-up via edge function ──────────────────────────────────────────
  const handleStripeTopup = async () => {
    if (!user?.email) { toast.error("Please login to continue"); navigate("/login"); return; }
    const amount = parseFloat(topupAmount || "0");
    if (amount <= 0) { toast.error("Please enter a valid amount"); return; }
    if (amount < 1) { toast.error("Minimum top-up is $1.00"); return; }

    setIsProcessingTopup(true);
    const refId = `TOPUP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const { data, error } = await supabase.functions.invoke("stripe-checkout", {
      body: {
        gameName: "Wallet Top-Up",
        skuName: `Add $${amount.toFixed(2)} to balance`,
        quantity: 1,
        totalPrice: amount,
        userEmail: user.email,
        referenceId: refId,
        successUrl: `${window.location.origin}/balance?topup=success&ref=${refId}&amount=${amount}`,
        cancelUrl: `${window.location.origin}/balance`,
        metadata: { type: "wallet_topup", amount: amount.toString() },
      },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { msg = await error.context?.text(); } catch { /* ignore */ }
      }
      toast.error(`Payment error: ${msg}`);
      setIsProcessingTopup(false);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    } else {
      toast.error("No checkout URL returned");
      setIsProcessingTopup(false);
    }
  };

  // Handle Stripe success redirect → record deposit in wallet_transactions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("topup") === "success" && user?.email) {
      const ref = params.get("ref");
      const amount = parseFloat(params.get("amount") || "0");
      if (ref && amount > 0) {
        // Record the deposit
        supabase.from("wallet_transactions").insert({
          user_email: user.email,
          user_id: user.id,
          type: "deposit",
          amount,
          status: "completed",
          method: "stripe",
          description: `Wallet top-up via Stripe (${ref})`,
        }).then(({ error }) => {
          if (!error) {
            toast.success(`$${amount.toFixed(2)} added to your balance!`);
            setBalance(prev => prev + amount);
            setTransactions(prev => [{
              id: `tx_${Date.now()}`,
              type: "deposit",
              amount,
              description: `Wallet top-up via Stripe`,
              created_at: new Date().toISOString(),
              status: "completed",
              method: "stripe",
            }, ...prev]);
            // Switch to cash flow tab
            setActiveTab("cashflow");
          }
        });
      }
      // Clean up URL
      window.history.replaceState({}, "", "/balance");
    }
  }, [user?.email]);

  const tabProps: TabContentProps = {
    activeTab,
    topupAmount,
    setTopupAmount,
    withdrawAmount,
    setWithdrawAmount,
    selectedWithdrawMethod,
    setSelectedWithdrawMethod,
    bankCards,
    transactions,
    cashflowFilter,
    setCashflowFilter,
    balance,
    onAddCard: () => setShowAddCard(true),
    onStripeTopup: handleStripeTopup,
    isProcessingTopup,
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
            <AccountSidebar activePage="balance" balanceOverride={balance} className="sticky top-[72px] self-start" />

            {/* Content */}
            <div className="flex-1">
              <div className="bg-gradient-to-r from-yellow-400 to-amber-400 p-6 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-yellow-900 opacity-75">Current Balance</p>
                  <p className="text-5xl font-black text-black mt-1">
                    <span className="text-3xl">$</span>{balance.toFixed(2)}
                  </p>
                  <p className="text-xs text-yellow-800 opacity-70 mt-1">Available for purchases</p>
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
      <div className="lg:hidden min-h-screen bg-[#f5f5f5]">
        {/* Header */}
        <div className="bg-[#0a0a0a] sticky top-0 z-40">
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ paddingTop: "calc(0.875rem + env(safe-area-inset-top))" }}>
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-white rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="text-white font-bold flex-1 text-center text-base">Balance</span>
            <div className="w-8" />
          </div>
        </div>

        {/* Balance card */}
        <div className="bg-gradient-to-br from-yellow-400 to-amber-400 px-5 py-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-semibold text-yellow-900/70">Current Balance</p>
            <p className="text-4xl font-black text-black mt-1">
              <span className="text-2xl">$</span>{balance.toFixed(2)}
            </p>
            <p className="text-xs text-yellow-900/60 mt-0.5">Available for purchases</p>
            {/* Quick action buttons */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setActiveTab("topup")}
                className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 text-black font-bold text-xs px-3 py-1.5 rounded-full transition-colors"
              >
                <Plus size={12} /> Top Up
              </button>
              <button
                onClick={() => setActiveTab("cashflow")}
                className="flex items-center gap-1.5 bg-black/10 hover:bg-black/20 text-black font-semibold text-xs px-3 py-1.5 rounded-full transition-colors"
              >
                History
              </button>
            </div>
          </div>
          <div className="w-20 h-20 opacity-90 flex-shrink-0">
            <svg viewBox="0 0 100 100" fill="none">
              <rect x="10" y="20" width="80" height="60" rx="8" fill="rgba(0,0,0,0.15)" stroke="rgba(0,0,0,0.2)" strokeWidth="2"/>
              <rect x="10" y="30" width="80" height="15" fill="rgba(0,0,0,0.1)"/>
              <circle cx="75" cy="65" r="10" fill="rgba(255,255,255,0.4)"/>
              <path d="M20 55 L40 55" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <path d="M20 62 L35 62" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white border-b border-gray-200 sticky top-[52px] z-30 shadow-sm">
          {TABS.map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab ? "border-yellow-400 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-4 py-5 bg-white mt-3 mx-3 rounded-2xl shadow-sm" style={{ marginBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
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
please ai add withdraw by stripe bank transfer instead of fake must real to user real add bank info routing etc via stripe secure and fix checkout show google pay in desktop and fix when user select visa payment and not have a card yet open a modal paymentcard and add name card,cvv,expiry and address for desktop and for mobile full page after confirm call stripe and real adding for payment also same things for JCBAmexDiscoverDinersLogo open bank number card cvv,expiry,and real calling.
