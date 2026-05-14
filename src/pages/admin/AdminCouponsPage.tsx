import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Tag, KeyRound, Copy, ToggleLeft, ToggleRight, X } from "lucide-react";

interface Coupon {
  id: string;
  user_email: string;
  code: string;
  type: string;
  discount_value: number;
  max_discount: number | null;
  min_order: number;
  description: string | null;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

interface RedeemCode {
  id: string;
  code: string;
  type: string;
  value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

type ActiveTab = "coupons" | "redeem";

const EMPTY_COUPON_FORM = {
  user_email: "", code: "", type: "percent", discount_value: "10",
  max_discount: "", min_order: "0.01", description: "", expires_days: "30",
};

const EMPTY_REDEEM_FORM = {
  code: "", type: "coupon", value: "10", max_uses: "1", expires_days: "30", has_expiry: true,
};

const EMPTY_BULK_FORM = {
  prefix: "NOXY", quantity: "10", type: "coupon", value: "10", max_uses: "1", expires_days: "30", has_expiry: true,
};

function generateCode(prefix = "NOXY") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = prefix;
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function AdminCouponsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("redeem");

  // --- Coupon state ---
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm] = useState(EMPTY_COUPON_FORM);

  // --- Redeem code state ---
  const [redeemCodes, setRedeemCodes] = useState<RedeemCode[]>([]);
  const [redeemLoading, setRedeemLoading] = useState(true);
  const [showRedeemForm, setShowRedeemForm] = useState(false);
  const [redeemForm, setRedeemForm] = useState(EMPTY_REDEEM_FORM);
  const [saving, setSaving] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkForm, setBulkForm] = useState(EMPTY_BULK_FORM);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ generated: number; codes: string[] } | null>(null);

  useEffect(() => {
    loadCoupons();
    loadRedeemCodes();
  }, []);

  // ─── Coupons ───────────────────────────────────────────────────────────────

  async function loadCoupons() {
    setCouponsLoading(true);
    const { data } = await supabase.from("user_coupons").select("*").order("created_at", { ascending: false }).limit(100);
    setCoupons(data || []);
    setCouponsLoading(false);
  }

  async function createCoupon() {
    if (!couponForm.user_email || !couponForm.code) { toast.error("Email and code are required"); return; }
    const expires = new Date();
    expires.setDate(expires.getDate() + parseInt(couponForm.expires_days || "30"));
    const { data: profile } = await supabase.from("user_profiles").select("id").eq("email", couponForm.user_email).single();
    const { error } = await supabase.from("user_coupons").insert({
      user_id: profile?.id,
      user_email: couponForm.user_email,
      code: couponForm.code.toUpperCase(),
      type: couponForm.type,
      discount_value: parseFloat(couponForm.discount_value),
      max_discount: couponForm.max_discount ? parseFloat(couponForm.max_discount) : null,
      min_order: parseFloat(couponForm.min_order || "0.01"),
      description: couponForm.description || null,
      expires_at: expires.toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Coupon issued!");
    setShowCouponForm(false);
    setCouponForm(EMPTY_COUPON_FORM);
    loadCoupons();
  }

  // ─── Redeem Codes ─────────────────────────────────────────────────────────

  async function loadRedeemCodes() {
    setRedeemLoading(true);
    const { data } = await supabase.from("admin_redeem_codes").select("*").order("created_at", { ascending: false });
    setRedeemCodes(data || []);
    setRedeemLoading(false);
  }

  async function createRedeemCode() {
    if (!redeemForm.code) { toast.error("Code is required"); return; }
    if (!redeemForm.value || parseFloat(redeemForm.value) <= 0) { toast.error("Value must be > 0"); return; }
    setSaving(true);
    let expires_at: string | null = null;
    if (redeemForm.has_expiry && redeemForm.expires_days) {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(redeemForm.expires_days));
      expires_at = d.toISOString();
    }
    const { error } = await supabase.from("admin_redeem_codes").insert({
      code: redeemForm.code.toUpperCase(),
      type: redeemForm.type,
      value: parseFloat(redeemForm.value),
      max_uses: redeemForm.max_uses ? parseInt(redeemForm.max_uses) : 1,
      expires_at,
      is_active: true,
    });
    if (error) {
      toast.error(error.message.includes("unique") ? "Code already exists" : error.message);
      setSaving(false);
      return;
    }
    toast.success("Redeem code created!");
    setShowRedeemForm(false);
    setRedeemForm(EMPTY_REDEEM_FORM);
    loadRedeemCodes();
    setSaving(false);
  }

  async function toggleRedeemCode(id: string, current: boolean) {
    await supabase.from("admin_redeem_codes").update({ is_active: !current }).eq("id", id);
    setRedeemCodes(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r));
  }

  async function deleteRedeemCode(id: string) {
    if (!confirm("Delete this redeem code?")) return;
    await supabase.from("admin_redeem_codes").delete().eq("id", id);
    setRedeemCodes(prev => prev.filter(r => r.id !== id));
    toast.success("Code deleted");
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Copied: ${code}`);
  }

  async function bulkGenerateCodes() {
    const qty = parseInt(bulkForm.quantity);
    if (!bulkForm.prefix.trim()) { toast.error("Prefix is required"); return; }
    if (isNaN(qty) || qty < 1 || qty > 500) { toast.error("Quantity must be 1–500"); return; }
    if (!bulkForm.value || parseFloat(bulkForm.value) <= 0) { toast.error("Value must be > 0"); return; }
    setBulkGenerating(true);
    setBulkResult(null);

    let expires_at: string | null = null;
    if (bulkForm.has_expiry && bulkForm.expires_days) {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(bulkForm.expires_days));
      expires_at = d.toISOString();
    }

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const prefix = bulkForm.prefix.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const generated: string[] = [];
    const failed: string[] = [];

    // Generate unique codes
    const existingSet = new Set(redeemCodes.map(r => r.code));
    let attempts = 0;
    while (generated.length < qty && attempts < qty * 5) {
      attempts++;
      let suffix = "";
      for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
      const code = `${prefix}${suffix}`;
      if (!existingSet.has(code) && !generated.includes(code)) {
        generated.push(code);
      }
    }

    if (generated.length === 0) {
      toast.error("Failed to generate unique codes");
      setBulkGenerating(false);
      return;
    }

    // Batch insert in chunks of 50
    const chunkSize = 50;
    let totalInserted = 0;
    for (let i = 0; i < generated.length; i += chunkSize) {
      const chunk = generated.slice(i, i + chunkSize).map(code => ({
        code,
        type: bulkForm.type,
        value: parseFloat(bulkForm.value),
        max_uses: parseInt(bulkForm.max_uses) || 1,
        expires_at,
        is_active: true,
      }));
      const { error } = await supabase.from("admin_redeem_codes").insert(chunk);
      if (!error) totalInserted += chunk.length;
    }

    setBulkResult({ generated: totalInserted, codes: generated.slice(0, totalInserted) });
    toast.success(`${totalInserted} codes generated!`);
    setBulkGenerating(false);
    loadRedeemCodes();
  }

  function downloadCodesCSV(codes: string[]) {
    const csv = ["Code", ...codes].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `redeem-codes-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const isExpired = (expires_at: string | null) => expires_at ? new Date(expires_at) < new Date() : false;

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-900">Coupons & Redeem Codes</h1>
          <button
            onClick={activeTab === "redeem" ? loadRedeemCodes : loadCoupons}
            className="border border-gray-200 text-gray-500 px-3 py-2 rounded-lg hover:text-gray-800"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("redeem")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "redeem" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <KeyRound size={15} /> Redeem Codes
          </button>
          <button
            onClick={() => setActiveTab("coupons")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "coupons" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Tag size={15} /> User Coupons
          </button>
        </div>

        {/* ── REDEEM CODES TAB ── */}
        {activeTab === "redeem" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Create shareable codes users can redeem for coupon rewards.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowBulkForm(!showBulkForm); setShowRedeemForm(false); setBulkResult(null); }}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 font-bold px-4 py-2 rounded-xl text-sm hover:bg-gray-200"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20"/></svg>
                  Bulk Generate
                </button>
                <button
                  onClick={() => { setShowRedeemForm(!showRedeemForm); setShowBulkForm(false); }}
                  className="flex items-center gap-2 bg-yellow-400 text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-yellow-300"
                >
                  <Plus size={15} /> New Code
                </button>
              </div>
            </div>

            {/* Bulk Generator Form */}
            {showBulkForm && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">Bulk Code Generator</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Generate multiple unique codes at once and insert them all into the database.</p>
                  </div>
                  <button onClick={() => { setShowBulkForm(false); setBulkResult(null); }}>
                    <X size={15} className="text-gray-400" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Prefix</label>
                    <input
                      value={bulkForm.prefix}
                      onChange={e => setBulkForm(f => ({ ...f, prefix: e.target.value.toUpperCase().slice(0, 8) }))}
                      placeholder="NOXY"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400 font-mono"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Max 8 chars, letters/numbers</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Quantity</label>
                    <input
                      type="number" min="1" max="500"
                      value={bulkForm.quantity}
                      onChange={e => setBulkForm(f => ({ ...f, quantity: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Max 500 per batch</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Max Uses / Code</label>
                    <input
                      type="number" min="1"
                      value={bulkForm.max_uses}
                      onChange={e => setBulkForm(f => ({ ...f, max_uses: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Reward Type</label>
                    <select
                      value={bulkForm.type}
                      onChange={e => setBulkForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                    >
                      <option value="coupon">Coupon (% discount)</option>
                      <option value="percent">Percent Off</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">
                      Value {bulkForm.type === "fixed" ? "($)" : "(%)"}
                    </label>
                    <input
                      type="number" min="0"
                      value={bulkForm.value}
                      onChange={e => setBulkForm(f => ({ ...f, value: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Expiry</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        onClick={() => setBulkForm(f => ({ ...f, has_expiry: !f.has_expiry }))}
                        className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer flex-shrink-0 ${ bulkForm.has_expiry ? "bg-yellow-400" : "bg-gray-200"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${bulkForm.has_expiry ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                      {bulkForm.has_expiry && (
                        <input
                          type="number" min="1"
                          value={bulkForm.expires_days}
                          onChange={e => setBulkForm(f => ({ ...f, expires_days: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400"
                          placeholder="days"
                        />
                      )}
                    </div>
                    {bulkForm.has_expiry && <p className="text-[10px] text-gray-400 mt-0.5">days from now</p>}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center gap-4 text-sm">
                  <div className="flex-1">
                    <span className="text-gray-500">Sample codes: </span>
                    <span className="font-mono font-bold text-gray-900">
                      {bulkForm.prefix.toUpperCase() || "NOXY"}XXXXXX, {bulkForm.prefix.toUpperCase() || "NOXY"}YYYYYY, …
                    </span>
                  </div>
                  <span className="text-gray-400 text-xs">{bulkForm.quantity} codes × {bulkForm.value}{bulkForm.type === "fixed" ? "$" : "%"}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={bulkGenerateCodes}
                    disabled={bulkGenerating}
                    className="flex items-center gap-2 bg-yellow-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-yellow-300 disabled:opacity-50"
                  >
                    {bulkGenerating ? (
                      <><RefreshCw size={14} className="animate-spin" /> Generating…</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20"/></svg> Generate {bulkForm.quantity} Codes</>
                    )}
                  </button>
                  <button onClick={() => { setShowBulkForm(false); setBulkResult(null); }} className="border border-gray-200 text-gray-600 font-semibold px-5 py-2.5 rounded-xl text-sm">
                    Cancel
                  </button>
                </div>

                {/* Result */}
                {bulkResult && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-green-700">
                        ✓ {bulkResult.generated} codes generated successfully!
                      </p>
                      <button
                        onClick={() => downloadCodesCSV(bulkResult.codes)}
                        className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download CSV
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {bulkResult.codes.slice(0, 20).map(code => (
                        <span key={code} className="font-mono text-[11px] bg-white border border-green-200 text-green-800 px-2 py-0.5 rounded">{code}</span>
                      ))}
                      {bulkResult.codes.length > 20 && (
                        <span className="text-[11px] text-green-600 font-semibold px-2 py-0.5">+{bulkResult.codes.length - 20} more (see table below or download CSV)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {showRedeemForm && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                <h3 className="font-bold text-gray-900 mb-4">Create Redeem Code</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Code *</label>
                    <div className="flex gap-2">
                      <input
                        value={redeemForm.code}
                        onChange={e => setRedeemForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                        placeholder="NOXY2024"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400 font-mono"
                      />
                      <button
                        onClick={() => setRedeemForm(f => ({ ...f, code: generateCode() }))}
                        className="border border-gray-200 text-gray-500 px-3 rounded-xl text-xs hover:bg-gray-50 whitespace-nowrap"
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Reward Type</label>
                    <select
                      value={redeemForm.type}
                      onChange={e => setRedeemForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                    >
                      <option value="coupon">Coupon (% discount)</option>
                      <option value="percent">Percent Off</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">
                      Value {redeemForm.type === "fixed" ? "($)" : "(%)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={redeemForm.value}
                      onChange={e => setRedeemForm(f => ({ ...f, value: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Max Uses</label>
                    <input
                      type="number"
                      min="1"
                      value={redeemForm.max_uses}
                      onChange={e => setRedeemForm(f => ({ ...f, max_uses: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setRedeemForm(f => ({ ...f, has_expiry: !f.has_expiry }))}
                      className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${redeemForm.has_expiry ? "bg-yellow-400" : "bg-gray-200"}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${redeemForm.has_expiry ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Set expiry</span>
                  </label>
                  {redeemForm.has_expiry && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={redeemForm.expires_days}
                        onChange={e => setRedeemForm(f => ({ ...f, expires_days: e.target.value }))}
                        className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400"
                      />
                      <span className="text-sm text-gray-500">days from now</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={createRedeemCode} disabled={saving} className="bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-yellow-300 disabled:opacity-50">
                    {saving ? "Creating…" : "Create Code"}
                  </button>
                  <button onClick={() => { setShowRedeemForm(false); setRedeemForm(EMPTY_REDEEM_FORM); }} className="border border-gray-200 text-gray-600 font-semibold px-5 py-2.5 rounded-xl text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {redeemLoading ? (
                <div className="p-8 text-center text-sm text-gray-400">Loading redeem codes…</div>
              ) : redeemCodes.length === 0 ? (
                <div className="p-8 text-center">
                  <KeyRound size={32} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No redeem codes yet. Create your first one above.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Reward</th>
                      <th className="px-4 py-3 text-left">Uses</th>
                      <th className="px-4 py-3 text-left">Expires</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {redeemCodes.map(rc => {
                      const expired = isExpired(rc.expires_at);
                      const exhausted = rc.max_uses !== null && rc.used_count >= rc.max_uses;
                      const statusLabel = !rc.is_active ? "Disabled" : expired ? "Expired" : exhausted ? "Used Up" : "Active";
                      const statusColor = !rc.is_active || expired || exhausted
                        ? "bg-gray-100 text-gray-500"
                        : "bg-green-100 text-green-700";

                      return (
                        <tr key={rc.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-900 text-base tracking-wider">{rc.code}</span>
                              <button onClick={() => copyCode(rc.code)} className="text-gray-300 hover:text-gray-600 transition-colors">
                                <Copy size={13} />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-orange-500">
                            {rc.type === "fixed" ? `$${rc.value}` : `${rc.value}%`}
                            <span className="text-gray-400 font-normal text-xs ml-1">
                              {rc.type === "coupon" ? "coupon" : rc.type === "fixed" ? "off" : "off"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-bold ${exhausted ? "text-red-500" : "text-gray-700"}`}>
                              {rc.used_count}
                            </span>
                            <span className="text-gray-400 text-xs"> / {rc.max_uses ?? "∞"}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {rc.expires_at ? (
                              <span className={expired ? "text-red-400" : ""}>{new Date(rc.expires_at).toLocaleDateString()}</span>
                            ) : (
                              <span className="text-gray-300">No expiry</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => toggleRedeemCode(rc.id, rc.is_active)}
                                className="text-gray-400 hover:text-gray-700 transition-colors"
                                title={rc.is_active ? "Disable" : "Enable"}
                              >
                                {rc.is_active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                              </button>
                              <button onClick={() => deleteRedeemCode(rc.id)} className="text-red-400 hover:text-red-600 p-1">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Users can redeem these codes in their Account → Coupons section. Each code issues a coupon to the user's account.
            </p>
          </div>
        )}

        {/* ── USER COUPONS TAB ── */}
        {activeTab === "coupons" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">Issue coupons directly to specific user accounts.</p>
              <button
                onClick={() => setShowCouponForm(!showCouponForm)}
                className="flex items-center gap-2 bg-yellow-400 text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-yellow-300"
              >
                <Plus size={15} /> Issue Coupon
              </button>
            </div>

            {showCouponForm && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                <h3 className="font-bold text-gray-900 mb-4">Issue Coupon to User</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">User Email *</label>
                    <input
                      value={couponForm.user_email}
                      onChange={e => setCouponForm(f => ({ ...f, user_email: e.target.value }))}
                      placeholder="user@email.com"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Code *</label>
                    <input
                      value={couponForm.code}
                      onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="SAVE10"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Type</label>
                    <select
                      value={couponForm.type}
                      onChange={e => setCouponForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                    >
                      <option value="percent">Percent (%)</option>
                      <option value="fixed">Fixed ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Discount Value</label>
                    <input
                      type="number"
                      value={couponForm.discount_value}
                      onChange={e => setCouponForm(f => ({ ...f, discount_value: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Min Order ($)</label>
                    <input
                      type="number"
                      value={couponForm.min_order}
                      onChange={e => setCouponForm(f => ({ ...f, min_order: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Expires in (days)</label>
                    <input
                      type="number"
                      value={couponForm.expires_days}
                      onChange={e => setCouponForm(f => ({ ...f, expires_days: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Description</label>
                  <input
                    value={couponForm.description}
                    onChange={e => setCouponForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description shown to user"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={createCoupon} className="bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-yellow-300">Issue</button>
                  <button onClick={() => setShowCouponForm(false)} className="border border-gray-200 text-gray-600 font-semibold px-5 py-2.5 rounded-xl text-sm">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {couponsLoading ? (
                <div className="p-8 text-center text-sm text-gray-400">Loading coupons…</div>
              ) : coupons.length === 0 ? (
                <div className="p-8 text-center">
                  <Tag size={32} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No coupons issued yet</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Discount</th>
                      <th className="px-4 py-3 text-left">Expires</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {coupons.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{c.code}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{c.user_email}</td>
                        <td className="px-4 py-3 font-semibold text-orange-500">
                          {c.type === "percent" ? `${c.discount_value}%` : `$${c.discount_value}`}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.expires_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            c.is_used ? "bg-gray-100 text-gray-500"
                            : new Date(c.expires_at) < new Date() ? "bg-red-100 text-red-500"
                            : "bg-green-100 text-green-600"
                          }`}>
                            {c.is_used ? "Used" : new Date(c.expires_at) < new Date() ? "Expired" : "Active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
