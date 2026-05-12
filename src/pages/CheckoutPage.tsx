import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle, XCircle, Loader2, ArrowLeft, Edit2, Shield,
  ChevronRight, X, Plus, HelpCircle, Minus
} from "lucide-react";
import { lootbarApi } from "@/lib/lootbar-api";
import { useAuthStore } from "@/stores/authStore";
import { ORDER_STATE_MAP } from "@/types";
import type { SkuItem, LootbarGame, Order } from "@/types";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type CheckoutState = "review" | "processing" | "success" | "failed";

// ─── Payment Logo Placeholder Components (replace src with real logos) ──────
const VisaLogo = () => <img src="https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/WhatsApp%20Image%202026-05-12%20at%201.19.31%20PM%20(4).jpeg" alt="Visa" className="h-5 w-auto object-contain" />;
const MastercardLogo = () => <img src="https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/WhatsApp%20Image%202026-05-12%20at%201.25.03%20PM.jpeg" alt="Mastercard" className="h-5 w-auto object-contain" />;
const JCBLogo = () => <img src="https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/WhatsApp%20Image%202026-05-12%20at%201.19.31%20PM%20(2).jpeg" alt="JCB" className="h-5 w-auto object-contain" />;
const AmexLogo = () => <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/200px-American_Express_logo_%282018%29.svg.png" alt="Amex" className="h-5 w-auto object-contain" />;
const DiscoverLogo = () => <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Discover_Card_logo.svg/200px-Discover_Card_logo.svg.png" alt="Discover" className="h-5 w-auto object-contain" />;
const DinersLogo = () => <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Diners_Club_Logo3.svg/200px-Diners_Club_Logo3.svg.png" alt="Diners" className="h-5 w-auto object-contain" />;
const CashAppLogo = () => <img src="https://uzxmmddivzqjhcnnrkns.supabase.co/storage/v1/object/public/hi/WhatsApp%20Image%202026-05-12%20at%201.19.31%20PM%20(1).jpeg" alt="Cash App" className="h-5 w-5 object-contain" />;
const BitcoinLogo = () => <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/200px-Bitcoin.svg.png" alt="BTC" className="h-5 w-5 object-contain" />;
const EthLogo = () => <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Ethereum-icon-purple.svg/200px-Ethereum-icon-purple.svg.png" alt="ETH" className="h-5 w-5 object-contain" />;
const SolLogo = () => <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-600 text-white text-[8px] font-bold">SOL</span>;
const MirLogo = () => <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Mir-logo.SVG.svg/200px-Mir-logo.SVG.svg.png" alt="MIR" className="h-5 w-auto object-contain" />;
const UsdtLogo = () => <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Tether_logo.png/200px-Tether_logo.png" alt="USDT" className="h-5 w-5 object-contain" />;
const TronLogo = () => <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[8px] font-bold">TRX</span>;

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
  </svg>
);

const PointsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
    <text x="9" y="16" fontSize="10" fontWeight="bold" fill="currentColor" fontFamily="Arial,sans-serif">P</text>
  </svg>
);

const CouponIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
    <path d="M13 5v2M13 17v2M13 11v2"/>
  </svg>
);

const GiftIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 12 20 22 4 22 4 12"/>
    <rect x="2" y="7" width="20" height="5"/>
    <line x1="12" y1="22" x2="12" y2="7"/>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
  </svg>
);

// ─── Payment Method Config ────────────────────────────────────────────────────
type PaymentMethod = {
  id: string;
  label: string;
  logos: React.FC[];
  fee: number;
  tag?: string;
  subCards?: Array<{ masked: string; tag?: string }>;
  isBalance?: boolean;
  isCrypto?: boolean;
};

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, addOrder, balance, points } = useAuthStore();

  const state = location.state as {
    sku: SkuItem;
    game: LootbarGame;
    quantity: number;
    extraInfo: Record<string, string>;
  };

  const [checkoutState, setCheckoutState] = useState<CheckoutState>("review");
  const [orderId, setOrderId] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("visa_mc");
  const [selectedSubCard, setSelectedSubCard] = useState("card_0");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const [isLoadingCoupon, setIsLoadingCoupon] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [userCoupons, setUserCoupons] = useState<any[]>([]);
  const [couponTab, setCouponTab] = useState<"valid" | "invalid">("valid");
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [ticketCategory, setTicketCategory] = useState("Submit payment method suggestions");
  const [ticketContent, setTicketContent] = useState("");
  const [liveBalance, setLiveBalance] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(state?.quantity || 1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyValues, setModifyValues] = useState<Record<string, string>>({});

  // Auto-apply pending coupon from coupons page
  useEffect(() => {
    if (!state?.sku) return;
    setModifyValues(extraInfo || {});
    const pending = sessionStorage.getItem("pending_coupon");
    if (pending) {
      const coupon = JSON.parse(pending);
      const bp = (state.sku.price || 0) * quantity;
      if (coupon.type === "percent") {
        const discount = Math.min(bp * (coupon.discount_value / 100), coupon.max_discount || Infinity);
        setCouponDiscount(discount);
        setCouponCode(coupon.code);
        setAppliedCouponId(coupon.id);
      }
      sessionStorage.removeItem("pending_coupon");
    }
    loadUserCoupons();
    loadSavedCards();
    lootbarApi.getBalance().then(setLiveBalance).catch(() => {});
  }, []);

  const loadUserCoupons = async () => {
    if (!user?.email) return;
    const { data } = await supabase
      .from("user_coupons")
      .select("*")
      .eq("user_email", user.email)
      .order("created_at", { ascending: false });
    if (data) setUserCoupons(data);
  };

  const loadSavedCards = async () => {
    if (!user?.email) return;
    const { data } = await supabase
      .from("user_bank_cards")
      .select("*")
      .eq("user_email", user.email)
      .order("is_default", { ascending: false });
    if (data) setSavedCards(data);
  };

  if (!state?.sku) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-gray-500 mb-4">Invalid checkout session</p>
          <button onClick={() => navigate("/")} className="bg-yellow-400 text-black font-bold px-6 py-3">Go Home</button>
        </div>
      </div>
    );
  }

  const { sku, game, extraInfo } = state;
  const basePrice = (sku.price || 0) * quantity;

  const PAYMENT_METHODS: PaymentMethod[] = [
    {
      id: "visa_mc",
      label: "VISA / Mastercard",
      logos: [VisaLogo, MastercardLogo],
      fee: 0,
      tag: "Last used",
      subCards: savedCards.length > 0
        ? savedCards.map((c, i) => ({ masked: `${c.card_type?.toUpperCase() || "Visa"} **** **** **** ${c.card_number_masked?.slice(-4) || "0000"}`, tag: c.is_default ? "Default" : undefined }))
        : [{ masked: "Add an account for payment" }],
    },
    { id: "jcb_group", label: "JCB / AmEx / Discover / Diners", logos: [JCBLogo, AmexLogo, DiscoverLogo, DinersLogo], fee: -0.01 },
    { id: "cashapp", label: "Cash App", logos: [CashAppLogo], fee: 0.14 },
    { id: "visa_mir", label: "VISA / Mastercard / МИР", logos: [VisaLogo, MastercardLogo, MirLogo], fee: 0.01 },
    {
      id: "crypto",
      label: "Bitcoin / Ethereum / SOL and more",
      logos: [BitcoinLogo, EthLogo, SolLogo, UsdtLogo, TronLogo],
      fee: -0.57,
      isCrypto: true,
    },
    {
      id: "balance",
      label: "My Balance",
      logos: [],
      fee: -0.70,
      isBalance: true,
    },
  ];

  const paymentMethod = PAYMENT_METHODS.find((m) => m.id === selectedPayment);
  const paymentFee = paymentMethod?.fee ?? 0;
  const totalPrice = Math.max(0, basePrice - couponDiscount + paymentFee);
  const userRealPoints = points ?? 0;

  const validCoupons = userCoupons.filter(c => !c.is_used && new Date(c.expires_at) > new Date());
  const invalidCoupons = userCoupons.filter(c => c.is_used || new Date(c.expires_at) <= new Date());

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(1, quantity + delta);
    setQuantity(newQty);
    // Recalculate coupon discount
    if (appliedCouponId && couponDiscount > 0) {
      const coupon = userCoupons.find(c => c.id === appliedCouponId);
      if (coupon) {
        const newBasePrice = (sku.price || 0) * newQty;
        const newDiscount = Math.min(newBasePrice * (coupon.discount_value / 100), coupon.max_discount || Infinity);
        setCouponDiscount(newDiscount);
      }
    }
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsLoadingCoupon(true);
    const { data: userCouponsDb } = await supabase
      .from("user_coupons")
      .select("*")
      .eq("user_email", user?.email)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString());

    const matched = userCouponsDb?.find((c: any) => c.code === couponCode.trim().toUpperCase());
    if (matched) {
      const discount = Math.min(basePrice * (matched.discount_value / 100), matched.max_discount || Infinity);
      setCouponDiscount(discount);
      setAppliedCouponId(matched.id);
      toast.success(`Coupon applied! ${matched.discount_value}% off`);
    } else {
      toast.error("Invalid or expired coupon code");
    }
    setIsLoadingCoupon(false);
  };

  const handleApplyCouponFromModal = (coupon: any) => {
    const discount = Math.min(basePrice * (coupon.discount_value / 100), coupon.max_discount || Infinity);
    setCouponDiscount(discount);
    setAppliedCouponId(coupon.id);
    setCouponCode(coupon.code);
    setSelectedCouponId(coupon.id);
    setShowCouponModal(false);
    toast.success(`${coupon.discount_value}% coupon applied`);
  };

  const handlePayNow = async () => {
    if (!isAuthenticated) { toast.error("Please login to continue"); navigate("/login"); return; }
    if (isProcessingPayment) return;
    setIsProcessingPayment(true);
    setCheckoutState("processing");
    const refId = `NOXY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    setReferenceId(refId);
    try {
      const result = await lootbarApi.createOrder(
        game.game_id, game.game_name, sku.sku_id, sku.sku_name,
        quantity, totalPrice, extraInfo, user?.email, user?.id
      );
      setOrderId(result.order_id);
      const order: Order = {
        id: `local_${Date.now()}`,
        reference_id: result.reference_id || refId,
        order_id: result.order_id,
        game_id: game.game_id,
        game_name: game.game_name,
        sku_name: sku.sku_name,
        price: totalPrice,
        state: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        extra_info: extraInfo,
      };
      addOrder(order);
      setCheckoutState("success");
      toast.success("Order created successfully!");
    } catch {
      setCheckoutState("failed");
      toast.error("Order failed. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // ─── Success State ─────────────────────────────────────────────────────────
  if (checkoutState === "success") {
    return (
      <div className="min-h-screen bg-white">
        <div className="hidden lg:block"><DesktopHeader /></div>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
          <div className="w-20 h-20 bg-green-100 flex items-center justify-center mb-5">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Created!</h1>
          <p className="text-gray-500 mb-1">{sku.sku_name} — {game.game_name}</p>
          <div className="w-full max-w-sm bg-gray-50 p-4 mb-6 text-left space-y-2.5 mt-4">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Order ID</span><span className="font-mono font-semibold text-xs">{orderId}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Amount</span><span className="font-bold text-green-600">${totalPrice.toFixed(2)}</span></div>
            {Object.entries(extraInfo).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm"><span className="text-gray-500 capitalize">{k}</span><span className="font-semibold">{v}</span></div>
            ))}
          </div>
          <div className="w-full max-w-sm space-y-3">
            <button onClick={() => navigate(`/orders/${referenceId}`)} className="w-full bg-yellow-400 text-black font-bold py-4">Track Order</button>
            <button onClick={() => navigate("/account")} className="w-full border border-gray-200 text-gray-700 font-semibold py-4">Order History</button>
          </div>
        </div>
      </div>
    );
  }

  if (checkoutState === "failed") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-red-100 flex items-center justify-center mb-5"><XCircle size={40} className="text-red-500" /></div>
        <h1 className="text-2xl font-bold mb-2">Order Failed</h1>
        <p className="text-gray-500 mb-6">Something went wrong. Please try again.</p>
        <button onClick={() => setCheckoutState("review")} className="bg-yellow-400 text-black font-bold px-8 py-4 w-full max-w-xs">Try Again</button>
        <button onClick={() => navigate(-1)} className="border border-gray-200 text-gray-700 font-semibold px-8 py-4 w-full max-w-xs mt-3">Go Back</button>
      </div>
    );
  }

  if (checkoutState === "processing") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-blue-50 flex items-center justify-center mb-5"><Loader2 size={40} className="text-blue-500 animate-spin" /></div>
        <h1 className="text-xl font-bold mb-2">Creating Your Order...</h1>
        <p className="text-gray-500 text-sm">Please wait while we process your request</p>
      </div>
    );
  }

  // ─── Right Panel: Payment Details (FIXED - NO SCROLL) ───────────────────
  const PaymentDetailsPanel = () => (
    <div className="w-[360px] flex-shrink-0">
      <div className="sticky top-[100px] bg-white border border-gray-200">
        <div className="px-5 pt-6 pb-3 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-900">Payment Details</h3>
        </div>

        <div className="border-b border-gray-200">
          {/* Points row */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2 text-gray-600">
              <PointsIcon />
              <span className="text-sm">{userRealPoints} Points</span>
            </div>
            <span className="text-xs text-gray-400">
              {userRealPoints < 100 ? "Unavailable" : `−$${(userRealPoints / 1000).toFixed(2)}`}
            </span>
          </div>

          {/* Coupon code row — input + separate square Redeem button */}
          <div className="flex items-center border-b border-gray-200">
            <div className="flex items-center gap-2 flex-1 px-5 py-3">
              <CouponIcon />
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Coupon Code"
                className="flex-1 text-sm text-gray-700 outline-none bg-transparent min-w-0"
              />
            </div>
            <button
              onClick={handleRedeemCoupon}
              disabled={isLoadingCoupon || !couponCode.trim()}
              className="h-full px-4 py-3 border-l border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex-shrink-0 bg-white"
            >
              {isLoadingCoupon ? "..." : "Redeem"}
            </button>
          </div>

          {/* 5% OFF row — opens modal */}
          <button
            onClick={() => setShowCouponModal(true)}
            className="flex items-center justify-between w-full px-5 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-gray-700">
              <GiftIcon />
              <span className="text-sm font-medium">
                {couponDiscount > 0 ? `${couponCode} Applied` : "5% OFF"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {couponDiscount > 0 && (
                <span className="text-sm text-orange-500 font-semibold">−${couponDiscount.toFixed(2)}</span>
              )}
              <ChevronRight size={14} className="text-gray-400" />
            </div>
          </button>
        </div>

        {/* Price breakdown */}
        <div className="px-5 py-4 space-y-2.5 border-b border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Price</span>
            <span className="text-gray-900">${basePrice.toFixed(2)}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Coupon</span>
              <span className="text-orange-500 font-semibold">−${couponDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-600 flex items-center gap-1">
              Payment Fee (3.5%+$0.15)
              <HelpCircle size={12} className="text-gray-400" />
            </span>
            <span className="text-gray-900">
              {paymentFee >= 0 ? `+$${paymentFee.toFixed(2)}` : `−$${Math.abs(paymentFee).toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm font-bold text-gray-900">Total Amount</span>
            <span className="text-xl font-black text-orange-500">USD ${totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Pay Now */}
        <div className="px-5 py-4">
          <button
            onClick={handlePayNow}
            disabled={isProcessingPayment}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 text-base transition-colors disabled:opacity-70" style={{borderRadius:0}}
          >
            {isProcessingPayment ? "Processing..." : "Pay Now"}
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <Shield size={12} className="text-green-500" />
            <span className="text-xs text-gray-400">NoxyStore Security Guarantee</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Payment Row Renderer ──────────────────────────────────────────────────
  const renderPaymentRow = (method: PaymentMethod) => {
    const price = Math.max(0, basePrice - couponDiscount + method.fee);
    const isSelected = selectedPayment === method.id;
    const isInsufficient = method.isBalance && Number(liveBalance || 0) < totalPrice;

    return (
      <div key={method.id} className={`border border-gray-200 mb-2 ${isSelected ? "border-yellow-400" : ""}`}>
        <button
          onClick={() => { if (isInsufficient) { navigate("/balance"); } else { setSelectedPayment(method.id); } }}
          className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${isSelected ? "bg-yellow-50" : "bg-white hover:bg-gray-50"} ${isInsufficient ? "opacity-60" : ""}`}
        >
          <div className="flex items-center gap-3">
            {/* Radio */}
            <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? "border-yellow-500" : "border-gray-300"}`}>
              {isSelected && <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />}
            </div>
            {/* Logos */}
            <div className="flex items-center gap-1">
              {method.isBalance ? (
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-800">My Balance</span>
                    <WalletIcon />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-500">${liveBalance || "0.00"}</span>
                    {isInsufficient && <span className="text-xs text-orange-500 flex items-center gap-1">⚠ Insufficient balance</span>}
                    {isInsufficient && <button onClick={(e) => { e.stopPropagation(); navigate("/balance"); }} className="text-xs text-blue-500 font-medium">Go to top-up</button>}
                  </div>
                </div>
              ) : method.isCrypto ? (
                <div className="flex items-center gap-1">
                  {method.logos.map((Logo, i) => <Logo key={i} />)}
                  <span className="text-sm font-medium text-gray-700 ml-1">and more</span>
                </div>
              ) : (
                <>
                  {method.logos.map((Logo, i) => <Logo key={i} />)}
                </>
              )}
            </div>
          </div>
          {!method.isBalance && (
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-700">USD ${price.toFixed(2)}</span>
              {method.tag && <span className="text-[10px] text-orange-500 font-semibold">{method.tag}</span>}
              {method.fee < 0 && <span className="text-[10px] text-green-600 font-semibold">Save ${Math.abs(method.fee).toFixed(2)}</span>}
            </div>
          )}
          {method.isBalance && !isInsufficient && (
            <span className="text-sm font-semibold text-gray-700">USD ${price.toFixed(2)}</span>
          )}
        </button>

        {/* Sub-cards for visa_mc */}
        {method.id === "visa_mc" && isSelected && (
          <div className="border-t border-gray-100 bg-yellow-50 px-5 py-3 space-y-2">
            {savedCards.length > 0 ? savedCards.map((card, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${selectedSubCard === `card_${i}` ? "border-yellow-500" : "border-gray-300"}`}>
                  {selectedSubCard === `card_${i}` && <div className="w-2 h-2 bg-yellow-500 rounded-full" />}
                </div>
                <span className="text-sm text-gray-700">{card.card_type?.toUpperCase() || "Visa"} **** **** **** {card.card_number_masked?.slice(-4) || "0000"}</span>
                {card.is_default && <span className="text-[10px] text-orange-500 font-semibold ml-auto">Default</span>}
              </label>
            )) : null}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${selectedSubCard === "new" ? "border-yellow-500" : "border-gray-300"}`}>
                {selectedSubCard === "new" && <div className="w-2 h-2 bg-yellow-500 rounded-full" />}
              </div>
              <button onClick={() => setSelectedSubCard("new")} className="text-sm text-gray-500">Add an account for payment</button>
            </label>
          </div>
        )}
      </div>
    );
  };

  // ─── Desktop Layout ────────────────────────────────────────────────────────
  const DesktopCheckout = () => (
    <div className="hidden lg:flex min-h-screen bg-[#f5f5f5]">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <DesktopHeader />
      </div>

      <div className="flex w-full pt-[100px] max-w-[1200px] mx-auto gap-6 px-6 pb-6 items-start">
        {/* LEFT: Scrollable content */}
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: "calc(100vh - 80px)", scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {/* Product Card - NO BORDER RADIUS (square corners) */}
          <div className="bg-white border border-gray-200 mb-3">
            <div className="px-6 py-5 flex items-start gap-4">
              <img
                src={sku.image || game.game_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80&h=80&fit=crop"}
                alt={sku.sku_name}
                className="w-16 h-16 object-cover flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80&h=80&fit=crop"; }}
              />
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-base">{sku.sku_name}</p>
                <p className="text-gray-500 text-sm mt-0.5">{game.game_name}</p>
                <p className="text-base font-bold text-gray-900 mt-1">USD ${basePrice.toFixed(2)}</p>
              </div>
              {/* Quantity - square buttons */}
              <div className="flex items-center border border-gray-300">
                <button 
                  onClick={() => handleQuantityChange(-1)}
                  className="px-3 py-2 text-gray-500 text-sm hover:bg-gray-50 flex items-center justify-center"
                >
                  <Minus size={14} />
                </button>
                <span className="px-4 py-2 text-sm font-bold border-x border-gray-300 min-w-[40px] text-center">{quantity}</span>
                <button 
                  onClick={() => handleQuantityChange(1)}
                  className="px-3 py-2 text-gray-500 text-sm hover:bg-gray-50 flex items-center justify-center"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {Object.entries(extraInfo).length > 0 && (
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {Object.entries(extraInfo).map(([k, v]) => (
                    <span key={k} className="text-sm text-gray-600">
                      <span className="capitalize font-medium text-gray-700">{k}:</span> <span className="text-gray-900 font-semibold">{v}</span>
                    </span>
                  ))}
                </div>
                <button onClick={() => { setModifyValues({...extraInfo}); setShowModifyModal(true); }} className="flex items-center gap-1.5 text-blue-500 text-sm font-semibold hover:text-blue-600">
                  <Edit2 size={12} /> Modify
                </button>
              </div>
            )}
          </div>

          {/* Payment Method - NO BORDER RADIUS */}
          <div className="bg-white border border-gray-200 mb-3">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Payment Method</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {PAYMENT_METHODS.map((method) => renderPaymentRow(method))}
            </div>
            <div className="px-6 py-3 border-t border-gray-100">
              <button
                onClick={() => setShowTicketModal(true)}
                className="text-sm text-blue-500 font-medium hover:text-blue-600 flex items-center gap-1"
              >
                Not the payment method you prefer? <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Fixed Payment Details - NO SCROLL */}
        <PaymentDetailsPanel />
      </div>
    </div>
  );

  // ─── Mobile Layout ─────────────────────────────────────────────────────────
  const MobileCheckout = () => (
    <div className="lg:hidden min-h-screen bg-gray-50 pb-32">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-40">
        <button onClick={() => navigate(-1)} className="text-gray-700"><ArrowLeft size={20} /></button>
        <span className="font-bold text-gray-900 text-base flex-1 text-center">Payment</span>
        <div className="w-8" />
      </div>

      {/* Product */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <img src={sku.image || game.game_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80&h=80&fit=crop"} alt={sku.sku_name}
            className="w-14 h-14 object-cover flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80&h=80&fit=crop"; }}
          />
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-sm">{sku.sku_name}</p>
            <p className="text-sm text-gray-500">{game.game_name}</p>
            <p className="text-base font-bold mt-0.5">USD ${basePrice.toFixed(2)}</p>
          </div>
        </div>
        {Object.entries(extraInfo).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
            <div>{Object.entries(extraInfo).map(([k, v]) => <p key={k} className="text-xs text-gray-500"><span className="capitalize font-medium">{k}</span>: <span className="text-gray-800">{v}</span></p>)}</div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-blue-500 text-xs font-semibold"><Edit2 size={10} /> Modify</button>
          </div>
        )}
      </div>

      {/* Payment details */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 mt-2">
        <h3 className="font-bold text-gray-900 mb-3">Payment Details</h3>
        <div className="space-y-0">
          <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-600"><PointsIcon /><span className="text-sm">{userRealPoints} Points</span></div>
            <span className="text-xs text-gray-400">{userRealPoints < 100 ? "Unavailable" : `−$${(userRealPoints / 1000).toFixed(2)}`}</span>
          </div>
          <div className="flex items-center py-2.5 border-b border-gray-100 gap-2">
            <CouponIcon />
            <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon Code" className="flex-1 text-sm outline-none" />
            <button onClick={handleRedeemCoupon} disabled={isLoadingCoupon} className="text-sm text-gray-500 font-semibold">{isLoadingCoupon ? "..." : "Redeem"}</button>
          </div>
          <button onClick={() => setShowCouponModal(true)} className="flex items-center justify-between w-full py-2.5">
            <div className="flex items-center gap-2"><GiftIcon /><span className="text-sm font-medium text-gray-700">5% OFF</span></div>
            <div className="flex items-center gap-1">{couponDiscount > 0 && <span className="text-sm text-orange-500 font-semibold">−${couponDiscount.toFixed(2)}</span>}<ChevronRight size={14} className="text-gray-400" /></div>
          </button>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Price</span><span>${basePrice.toFixed(2)}</span></div>
          {couponDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Coupon</span><span className="text-orange-500 font-semibold">−${couponDiscount.toFixed(2)}</span></div>}
          <div className="flex justify-between text-sm"><span className="text-gray-600">Payment Fee</span><span>{paymentFee >= 0 ? `+$${paymentFee.toFixed(2)}` : `−$${Math.abs(paymentFee).toFixed(2)}`}</span></div>
        </div>
      </div>

      {/* Payment methods mobile */}
      <div className="bg-white mt-2 px-4 py-4">
        <h3 className="font-bold text-gray-900 mb-3">Payment Method</h3>
        {PAYMENT_METHODS.map((method) => renderPaymentRow(method))}
        <button onClick={() => setShowTicketModal(true)} className="w-full text-center text-sm text-blue-500 font-medium py-3">Not the payment method you prefer? &gt;</button>
      </div>

      {/* Fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-40">
        <div className="flex items-center justify-between mb-3">
          <div><span className="text-sm text-gray-500">Total Amount</span></div>
          <span className="text-xl font-black text-orange-500">USD ${totalPrice.toFixed(2)}</span>
        </div>
        <button onClick={handlePayNow} disabled={isProcessingPayment} className="w-full bg-yellow-400 text-black font-bold py-4 disabled:opacity-70">
          {isProcessingPayment ? "Processing..." : "Pay Now"}
        </button>
      </div>
    </div>
  );

  // ─── Modify Order Info Modal ───────────────────────────────────────────────
  const ModifyModal = () => {
    const fields = state?.sku?.extra_info || [];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => setShowModifyModal(false)} />
        <div className="relative bg-white w-full max-w-md mx-4 shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-bold text-gray-900">Order Information</h3>
            <button onClick={() => setShowModifyModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="px-6 py-5 space-y-4">
            {fields.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No fields to modify for this product.</p>
            ) : fields.map((field: any) => (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {field.required && <span className="text-red-500 mr-0.5">*</span>}
                  {field.title}
                </label>
                {field.type === "select" && field.options?.length > 0 ? (
                  <select
                    value={modifyValues[field.name] || ""}
                    onChange={(e) => setModifyValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                    className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 bg-white"
                    style={{borderRadius:0}}
                  >
                    <option value="">Please select {field.title}</option>
                    {field.options.map((opt: any) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={modifyValues[field.name] || ""}
                    onChange={(e) => setModifyValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.placeholder || `Enter your ${field.title}`}
                    className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-yellow-400"
                    style={{borderRadius:0}}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => setShowModifyModal(false)}
              className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 text-sm hover:bg-gray-50"
              style={{borderRadius:0}}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Update extraInfo with modified values
                Object.assign(extraInfo, modifyValues);
                setShowModifyModal(false);
              }}
              className="flex-1 bg-yellow-400 text-black font-bold py-3 text-sm hover:bg-yellow-300"
              style={{borderRadius:0}}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Product Coupons Modal ────────────────────────────────────────────────
  const CouponModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowCouponModal(false)} />
      <div className="relative bg-white w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Product Coupons</h3>
          <button onClick={() => setShowCouponModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button onClick={() => setCouponTab("valid")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${couponTab === "valid" ? "border-yellow-400 text-gray-900" : "border-transparent text-gray-400"}`}>
            Valid ({validCoupons.length})
          </button>
          <button onClick={() => setCouponTab("invalid")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${couponTab === "invalid" ? "border-yellow-400 text-gray-900" : "border-transparent text-gray-400"}`}>
            Invalid ({invalidCoupons.length})
          </button>
        </div>

        {/* Redeem code input */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Please enter the redeem code."
              className="flex-1 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-yellow-400 bg-gray-50"
            />
            <button
              onClick={handleRedeemCoupon}
              disabled={isLoadingCoupon || !couponCode.trim()}
              className="bg-yellow-400 text-black font-bold px-5 py-2.5 text-sm hover:bg-yellow-300 disabled:opacity-50"
            >
              {isLoadingCoupon ? "..." : "Redeem"}
            </button>
          </div>
        </div>

        {/* Coupon list */}
        <div className="px-6 py-3 max-h-[320px] overflow-y-auto space-y-3">
          {(couponTab === "valid" ? validCoupons : invalidCoupons).length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">{couponTab === "valid" ? "No valid coupons available" : "No invalid coupons"}</p>
            </div>
          ) : (
            (couponTab === "valid" ? validCoupons : invalidCoupons).map((coupon) => {
              const isApplied = selectedCouponId === coupon.id;
              return (
                <div
                  key={coupon.id}
                  onClick={() => couponTab === "valid" && handleApplyCouponFromModal(coupon)}
                  className={`border-2 p-4 cursor-pointer transition-all relative overflow-hidden ${couponTab === "invalid" ? "border-gray-200 opacity-60 cursor-default" : isApplied ? "border-yellow-400 bg-yellow-50" : "border-gray-200 hover:border-yellow-300"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${isApplied ? "border-yellow-500 bg-yellow-400" : "border-gray-300"}`}>
                      {isApplied && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    <div className="flex-1">
                      <p className="text-orange-500 font-bold text-sm">{coupon.discount_value}% OFF <span className="text-gray-500 font-normal text-xs">(Up to ${coupon.max_discount || "∞"})</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">Valid for orders over ${coupon.min_order || 1.00}</p>
                      {coupon.description && <p className="text-xs text-gray-400 mt-0.5">{coupon.description}</p>}
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-yellow-100/40 to-transparent" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">Discount Amount</span>
            <span className="text-base font-bold text-orange-500">USD ${couponDiscount.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setShowCouponModal(false)}
            className="w-full bg-yellow-400 text-black font-bold py-3.5 text-sm hover:bg-yellow-300"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );

  // ─── New Ticket Modal ──────────────────────────────────────────────────────
  const TicketModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowTicketModal(false)} />
      <div className="relative bg-white w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">New Ticket</h3>
          <button onClick={() => setShowTicketModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Info banner */}
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-4 py-2.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 002-2v-4M17 9l-5 5-5-5M12 12.8V2.5"/></svg>
            <span className="text-xs text-yellow-700">Submit your question or suggestion</span>
          </div>

          {/* Classification */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Classification</label>
            <div className="relative">
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value)}
                className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 appearance-none bg-white pr-10"
              >
                <option>Submit payment method suggestions</option>
                <option>Report a payment issue</option>
                <option>Request a refund</option>
                <option>Other</option>
              </select>
              <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90" />
            </div>
          </div>

          {/* Question content */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Question content</label>
            <textarea
              value={ticketContent}
              onChange={(e) => setTicketContent(e.target.value.slice(0, 400))}
              placeholder="Describe your question or suggestion..."
              rows={5}
              className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 resize-none bg-gray-50"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{ticketContent.length}/400</p>
          </div>

          {/* Image upload placeholder */}
          <div>
            <div className="border-2 border-dashed border-gray-200 w-20 h-20 flex items-center justify-center cursor-pointer hover:border-yellow-400 transition-colors">
              <Plus size={20} className="text-gray-400" />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={() => {
              if (!ticketContent.trim()) { toast.error("Please describe your question"); return; }
              toast.success("Ticket submitted! We'll review your suggestion.");
              setShowTicketModal(false);
              setTicketContent("");
            }}
            className="w-full bg-yellow-400 text-black font-bold py-3.5 text-sm hover:bg-yellow-300"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <DesktopCheckout />
      <MobileCheckout />
      {showCouponModal && <CouponModal />}
      {showTicketModal && <TicketModal />}
      {showModifyModal && <ModifyModal />}
    </>
  );
}

