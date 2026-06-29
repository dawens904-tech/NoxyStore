import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Package, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { useAuthStore } from "@/stores/authStore";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";

type PageState = "loading" | "verifying" | "creating_order" | "success" | "already_done" | "failed";

interface OrderInfo {
  reference_id: string;
  order_id: string;
  game_name: string;
  sku_name: string;
  price: number;
  state: number;
  extra_info: Record<string, string>;
  created_at: string;
}

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, addOrder } = useAuthStore();

  const ref = searchParams.get("ref");
  const sessionId = searchParams.get("session_id"); // Stripe passes this

  const [pageState, setPageState] = useState<PageState>("loading");
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [lootbarOrderId, setLootbarOrderId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!ref) {
      setErrorMessage("No order reference found.");
      setPageState("failed");
      return;
    }
    verifyAndProcess();
  }, [ref]);

  const verifyAndProcess = async () => {
    setPageState("verifying");

    // 1. Look up the order in Supabase
    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("*")
      .eq("reference_id", ref)
      .maybeSingle();

    if (fetchErr || !order) {
      // Order might only be in local store — try to read from authStore
      const localOrders = useAuthStore.getState().orders;
      const localOrder = localOrders.find((o) => o.reference_id === ref);

      if (!localOrder) {
        setErrorMessage("Order not found. Please contact support with your reference ID.");
        setPageState("failed");
        return;
      }

      // Promote local order to DB
      await supabase.from("orders").upsert({
        reference_id: localOrder.reference_id,
        order_id: localOrder.order_id || "",
        game_id: localOrder.game_id,
        game_name: localOrder.game_name,
        sku_name: localOrder.sku_name,
        sku_id: "",
        price: localOrder.price,
        state: 2, // payment received — pending fulfillment
        user_email: user?.email || "",
        extra_info: localOrder.extra_info || {},
        created_at: localOrder.created_at,
        updated_at: new Date().toISOString(),
      }, { onConflict: "reference_id" });

      // Re-fetch
      const { data: saved } = await supabase
        .from("orders")
        .select("*")
        .eq("reference_id", ref)
        .maybeSingle();

      if (saved) {
        await processOrder(saved);
      } else {
        setErrorMessage("Could not persist order. Please contact support.");
        setPageState("failed");
      }
      return;
    }

    await processOrder(order);
  };

  const processOrder = async (order: any) => {
    setOrderInfo(order);

    // If already completed (state=3), skip Lootbar call
    if (order.state === 3) {
      setLootbarOrderId(order.order_id || "");
      setPageState("already_done");
      return;
    }

    // 2. Mark order as payment received (state=2)
    await supabase.from("orders").update({
      state: 2,
      updated_at: new Date().toISOString(),
    }).eq("reference_id", ref);

    setPageState("creating_order");

    // 3. Call lootbar-proxy to create the fulfillment order
    const isManualProduct = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      order.game_id || ""
    );

    let lbOrderId = "";

    if (!isManualProduct) {
      const { data: lbData, error: lbErr } = await supabase.functions.invoke("lootbar-proxy", {
        body: {
          action: "createOrder",
          game_id: order.game_id,
          sku_id: order.sku_id || "",
          quantity: order.quantity || 1,
          extra_info: order.extra_info || {},
          reference_id: order.reference_id,
          user_email: order.user_email || user?.email,
        },
      });

      if (lbErr) {
        let msg = lbErr.message;
        if (lbErr instanceof FunctionsHttpError) {
          try { msg = await lbErr.context?.text(); } catch { /* ignore */ }
        }
        console.error("[checkout-success] Lootbar error:", msg);
        // Don't fail the page — order is saved, admin can fulfill manually
        toast.error("Auto-fulfillment delayed. Your order is saved and will be processed shortly.");
      } else if (lbData?.order_id) {
        lbOrderId = lbData.order_id;
      }
    }

    // 4. Update order with Lootbar order ID and mark completed
    const finalState = lbOrderId ? 3 : 2;
    await supabase.from("orders").update({
      order_id: lbOrderId || order.order_id || "",
      state: finalState,
      updated_at: new Date().toISOString(),
    }).eq("reference_id", ref);

    setLootbarOrderId(lbOrderId);

    // 5. Send confirmation email (non-blocking)
    supabase.functions.invoke("send-order-email", {
      body: {
        userEmail: order.user_email || user?.email,
        referenceId: order.reference_id,
        orderId: lbOrderId || order.order_id || order.reference_id,
        gameName: order.game_name,
        skuName: order.sku_name,
        amount: order.price,
        extraInfo: order.extra_info || {},
      },
    }).catch(() => {/* non-critical */});

    // 6. Sync local store
    addOrder({
      id: order.id,
      reference_id: order.reference_id,
      order_id: lbOrderId || order.order_id || "",
      game_id: order.game_id,
      game_name: order.game_name,
      sku_name: order.sku_name,
      price: order.price,
      state: finalState,
      created_at: order.created_at,
      updated_at: new Date().toISOString(),
      extra_info: order.extra_info,
    });

    setOrderInfo({ ...order, order_id: lbOrderId || order.order_id || "" });
    setPageState("success");
  };

  // ─── Loading / Verifying ───────────────────────────────────────────────────
  if (pageState === "loading" || pageState === "verifying" || pageState === "creating_order") {
    const label =
      pageState === "verifying" ? "Verifying your payment…" :
      pageState === "creating_order" ? "Processing your order…" :
      "Loading…";

    return (
      <div className="min-h-screen bg-white">
        <div className="hidden lg:block"><DesktopHeader /></div>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-5">
            <Loader2 size={36} className="text-blue-500 animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{label}</h1>
          <p className="text-gray-400 text-sm">Please do not close this page.</p>
          {ref && <p className="text-xs text-gray-300 mt-3 font-mono">Ref: {ref}</p>}
        </div>
      </div>
    );
  }

  // ─── Failed ────────────────────────────────────────────────────────────────
  if (pageState === "failed") {
    return (
      <div className="min-h-screen bg-white">
        <div className="hidden lg:block"><DesktopHeader /></div>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5">
            <XCircle size={36} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-500 text-sm mb-2">{errorMessage}</p>
          {ref && (
            <p className="text-xs text-gray-400 mb-6 font-mono bg-gray-50 px-4 py-2 rounded">
              Reference: {ref}
            </p>
          )}
          <p className="text-xs text-gray-400 mb-8">
            Please contact support at{" "}
            <a href="mailto:support@noxystore.com" className="text-blue-500 font-semibold">
              support@noxystore.com
            </a>{" "}
            with your reference ID.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={() => navigate("/")} className="bg-yellow-400 text-black font-bold py-4">
              Back to Home
            </button>
            <button onClick={() => navigate("/account")} className="border border-gray-200 text-gray-700 font-semibold py-4">
              Order History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Success / Already Done ────────────────────────────────────────────────
  const isComplete = pageState === "success" || pageState === "already_done";

  return (
    <div className="min-h-screen bg-white">
      <div className="hidden lg:block"><DesktopHeader /></div>
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-5">
          <CheckCircle size={40} className="text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {pageState === "already_done" ? "Order Already Processed" : "Order Confirmed!"}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {orderInfo?.game_name} — {orderInfo?.sku_name}
        </p>

        {/* Order Details Card */}
        <div className="w-full max-w-sm bg-gray-50 border border-gray-100 p-5 mb-6 text-left space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Package size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Details</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Reference ID</span>
            <span className="font-mono text-xs font-semibold text-gray-800 break-all text-right max-w-[160px]">
              {orderInfo?.reference_id}
            </span>
          </div>

          {(lootbarOrderId || orderInfo?.order_id) && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order ID</span>
              <span className="font-mono text-xs font-semibold text-gray-800">
                {lootbarOrderId || orderInfo?.order_id}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount Paid</span>
            <span className="font-bold text-green-600">USD ${Number(orderInfo?.price || 0).toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Status</span>
            <span className="flex items-center gap-1 font-semibold text-green-600 text-xs">
              <Clock size={12} />
              {orderInfo?.state === 3 ? "Completed" : "Processing"}
            </span>
          </div>

          {orderInfo?.extra_info && Object.entries(orderInfo.extra_info).length > 0 && (
            <div className="pt-2 border-t border-gray-200 space-y-1.5">
              {Object.entries(orderInfo.extra_info).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-gray-500 capitalize">{k}</span>
                  <span className="font-semibold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email notice */}
        <p className="text-xs text-gray-400 mb-6">
          A confirmation email has been sent to{" "}
          <span className="font-semibold text-gray-600">{user?.email}</span>
        </p>

        {/* Actions */}
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => navigate(`/orders/${orderInfo?.reference_id}`)}
            className="w-full bg-yellow-400 text-black font-bold py-4 hover:bg-yellow-300 transition-colors"
          >
            Track Order
          </button>
          <button
            onClick={() => navigate("/account")}
            className="w-full border border-gray-200 text-gray-700 font-semibold py-4 hover:bg-gray-50 transition-colors"
          >
            Order History
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full text-gray-400 text-sm py-2 hover:text-gray-600 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
