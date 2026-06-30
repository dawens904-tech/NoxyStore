import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AdminSidebar from "./AdminSidebar";
import {
  ArrowLeft, Search, Edit2, Save, X, Loader2, RefreshCw,
  EyeOff, Eye, ChevronUp, ChevronDown, Globe, Package, DollarSign, Image,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { FunctionsHttpError } from "@supabase/supabase-js";

// ── Types ────────────────────────────────────────────────────────────────────
interface RawSku {
  sku_id: string | number;
  sku_name: string;
  price: number;
  original_price?: number;
  discount_amount?: number;
  image?: string;
  attribute?: Array<{ key: string; value: string; key_text?: string; value_text?: string }>;
}

interface SkuOverride {
  game_id: string;
  sku_id: string;
  custom_name: string | null;
  custom_price: number | null;
  custom_image_url: string | null;
  is_hidden: boolean;
  sort_order: number;
}

interface MergedSku extends RawSku {
  override?: SkuOverride;
  _region: string;
  _regionLabel: string;
}

// Country flag map
const FLAG: Record<string, string> = {
  "United States": "🇺🇸", "US": "🇺🇸", "USA": "🇺🇸",
  "Malaysia": "🇲🇾", "MY": "🇲🇾",
  "Indonesia": "🇮🇩", "ID": "🇮🇩",
  "Singapore": "🇸🇬", "SG": "🇸🇬",
  "Thailand": "🇹🇭", "TH": "🇹🇭",
  "Philippines": "🇵🇭", "PH": "🇵🇭",
  "Brazil": "🇧🇷", "BR": "🇧🇷",
  "Turkey": "🇹🇷", "TR": "🇹🇷",
  "Japan": "🇯🇵", "JP": "🇯🇵",
  "Korea": "🇰🇷", "KR": "🇰🇷",
  "China": "🇨🇳", "CN": "🇨🇳",
  "Vietnam": "🇻🇳", "VN": "🇻🇳",
  "Taiwan": "🇹🇼", "TW": "🇹🇼",
  "Hong Kong": "🇭🇰", "HK": "🇭🇰",
  "Saudi Arabia": "🇸🇦", "SA": "🇸🇦",
  "UAE": "🇦🇪", "AE": "🇦🇪",
  "India": "🇮🇳", "IN": "🇮🇳",
  "Pakistan": "🇵🇰", "PK": "🇵🇰",
  "Europe": "🇪🇺", "EU": "🇪🇺",
  "Global": "🌐", "GLOBAL": "🌐", "ROW": "🌐",
};

function getFlag(region: string): string {
  return FLAG[region] || "🌐";
}

// ── Edit Modal ───────────────────────────────────────────────────────────────
interface EditModalProps {
  sku: MergedSku | null;
  gameId: string;
  onClose: () => void;
  onSaved: (override: SkuOverride) => void;
}

function EditSkuModal({ sku, gameId, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    custom_name: sku?.override?.custom_name ?? sku?.sku_name ?? "",
    custom_price: sku?.override?.custom_price != null ? String(sku.override.custom_price) : "",
    custom_image_url: sku?.override?.custom_image_url ?? "",
    is_hidden: sku?.override?.is_hidden ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!sku) return;
    setSaving(true);
    const payload: SkuOverride = {
      game_id: gameId,
      sku_id: String(sku.sku_id),
      custom_name: form.custom_name.trim() || null,
      custom_price: form.custom_price !== "" ? Number(form.custom_price) : null,
      custom_image_url: form.custom_image_url.trim() || null,
      is_hidden: form.is_hidden,
      sort_order: sku.override?.sort_order ?? 9999,
    };
    const { error } = await supabase
      .from("sku_overrides")
      .upsert(payload, { onConflict: "game_id,sku_id" });
    setSaving(false);
    if (error) { toast.error("Save failed: " + error.message); return; }
    toast.success("SKU override saved");
    onSaved(payload);
    onClose();
  };

  if (!sku) return null;
  const previewImg = form.custom_image_url || sku.image;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Edit2 size={15} /> Edit SKU Override
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Preview */}
          <div className="flex gap-3 items-center p-3 bg-gray-50 rounded-xl">
            {previewImg && (
              <img src={previewImg} alt={sku.sku_name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <div>
              <p className="text-xs font-bold text-gray-700">{sku._regionLabel} Region</p>
              <p className="text-sm font-bold text-gray-900">{sku.sku_name}</p>
              <p className="text-xs text-gray-400">SKU ID: {sku.sku_id} · Base: ${Number(sku.price).toFixed(2)}</p>
            </div>
          </div>

          {/* Custom Name */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1 block">Custom Display Name</Label>
            <Input
              value={form.custom_name}
              onChange={(e) => setForm(f => ({ ...f, custom_name: e.target.value }))}
              placeholder={sku.sku_name}
              className="text-sm rounded-xl"
            />
            <p className="text-[10px] text-gray-400 mt-1">Shown on storefront instead of Lootbar SKU name.</p>
          </div>

          {/* Custom Image */}
          <div>
            <Label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1"><Image size={11} /> Custom Image URL</Label>
            <Input
              value={form.custom_image_url}
              onChange={(e) => setForm(f => ({ ...f, custom_image_url: e.target.value }))}
              placeholder="https://... (leave empty to use Lootbar image)"
              className="text-sm rounded-xl"
            />
          </div>

          {/* Custom Price */}
          <div>
            <Label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1"><DollarSign size={11} /> Custom Price (USD)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.custom_price}
              onChange={(e) => setForm(f => ({ ...f, custom_price: e.target.value }))}
              placeholder={`Lootbar price: $${Number(sku.price).toFixed(2)}`}
              className="text-sm rounded-xl"
            />
          </div>

          {/* Hidden toggle */}
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
            <div className="flex items-center gap-2">
              <EyeOff size={14} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Hide from storefront</span>
            </div>
            <div
              onClick={() => setForm(f => ({ ...f, is_hidden: !f.is_hidden }))}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.is_hidden ? "bg-gray-700" : "bg-gray-300"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_hidden ? "translate-x-4" : "translate-x-0"}`} />
            </div>
          </label>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold border-0 gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function LootbarSkuManagement() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [skus, setSkus] = useState<MergedSku[]>([]);
  const [gameName, setGameName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [search, setSearch] = useState("");
  const [editSku, setEditSku] = useState<MergedSku | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "admin") { navigate("/"); return; }
    if (gameId) loadFromDB();
  }, [user, gameId]);

  // ── Build merged SKUs from raw array + override map ───────────────────────
  const buildMerged = (rawSkus: RawSku[], overrideMap: Map<string, SkuOverride>): MergedSku[] =>
    rawSkus.map((s) => {
      const attrs = s.attribute || [];
      const regionVal = attrs[0]?.value || "global";
      const regionLabel = attrs[0]?.value_text || attrs[0]?.value || "Global";
      return {
        ...s,
        override: overrideMap.get(String(s.sku_id)),
        _region: regionVal,
        _regionLabel: regionLabel,
      };
    });

  // ── Load from sku_cache (permanent DB) ───────────────────────────────────
  const loadFromDB = useCallback(async () => {
    if (!gameId) return;
    setIsLoading(true);

    supabase.from("games_cache").select("game_name").eq("game_id", gameId).single()
      .then(({ data }) => { if (data) setGameName(data.game_name); });

    try {
      const [{ data: cachedSkus }, { data: overridesData }] = await Promise.all([
        supabase.from("sku_cache").select("*").eq("game_id", gameId).order("sku_id"),
        supabase.from("sku_overrides").select("*").eq("game_id", gameId),
      ]);

      const overrideMap = new Map<string, SkuOverride>();
      (overridesData || []).forEach((o: SkuOverride) => overrideMap.set(String(o.sku_id), o));

      if (cachedSkus && cachedSkus.length > 0) {
        // Set cache timestamp from first row
        setCacheTimestamp(cachedSkus[0].cached_at || null);

        const rawSkus: RawSku[] = cachedSkus.map((s: any) => ({
          sku_id: s.sku_id,
          sku_name: s.sku_name,
          price: Number(s.price || 0),
          original_price: s.original_price ? Number(s.original_price) : undefined,
          discount_amount: s.discount_amount ? Number(s.discount_amount) : undefined,
          image: s.image || undefined,
          attribute: Array.isArray(s.attributes) ? s.attributes :
            (s.attributes ? (typeof s.attributes === "string" ? JSON.parse(s.attributes) : s.attributes) : []),
        }));

        const merged = buildMerged(rawSkus, overrideMap);
        setSkus(merged);
        if (merged.length > 0) setSelectedRegion(merged[0]._region);
      } else {
        // No cache — trigger live sync automatically
        await syncFromLootbar(true);
      }
    } catch (err: any) {
      toast.error("Failed to load SKUs: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  // ── Sync live from Lootbar API and persist to sku_cache ──────────────────
  const syncFromLootbar = useCallback(async (silent = false) => {
    if (!gameId) return;
    setIsSyncing(true);
    if (!silent) toast.info("Fetching latest SKUs from Lootbar…");

    try {
      const [skuRes, { data: overridesData }] = await Promise.all([
        supabase.functions.invoke("lootbar-proxy", {
          body: { action: "get_skus", params: { game_id: gameId } },
        }),
        supabase.from("sku_overrides").select("*").eq("game_id", gameId),
      ]);

      if (skuRes.error) {
        let msg = skuRes.error.message;
        if (skuRes.error instanceof FunctionsHttpError) {
          try { msg = await skuRes.error.context?.text() || msg; } catch {}
        }
        throw new Error(msg);
      }

      const rawSkus: RawSku[] = Array.isArray(skuRes.data) ? skuRes.data : (skuRes.data?.skus || []);

      if (rawSkus.length === 0) {
        toast.warning("No SKUs returned from Lootbar for this game.");
        setIsSyncing(false);
        return;
      }

      // Persist to sku_cache permanently
      const now = new Date().toISOString();
      const rows = rawSkus.map(s => ({
        game_id: gameId,
        sku_id: String(s.sku_id),
        sku_name: s.sku_name,
        price: s.price || 0,
        original_price: s.original_price || null,
        discount_amount: s.discount_amount || null,
        attributes: s.attribute || [],
        extra_info: [],
        image: s.image || null,
        cached_at: now,
      }));

      const { error: upsertErr } = await supabase
        .from("sku_cache")
        .upsert(rows, { onConflict: "game_id,sku_id" });

      if (upsertErr) {
        console.error("[sku-sync] upsert error:", upsertErr.message);
      }

      const overrideMap = new Map<string, SkuOverride>();
      (overridesData || []).forEach((o: SkuOverride) => overrideMap.set(String(o.sku_id), o));

      const merged = buildMerged(rawSkus, overrideMap);
      setSkus(merged);
      if (merged.length > 0 && !selectedRegion) setSelectedRegion(merged[0]._region);
      setCacheTimestamp(now);

      if (!silent) toast.success(`${rawSkus.length} SKUs synced and saved to database.`);
    } catch (err: any) {
      toast.error("Sync failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [gameId, selectedRegion]);

  // ── Regions derived from SKUs ─────────────────────────────────────────────
  const regions = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ value: string; label: string; count: number }> = [];
    skus.forEach((s) => {
      if (!seen.has(s._region)) {
        seen.add(s._region);
        const count = skus.filter(x => x._region === s._region).length;
        result.push({ value: s._region, label: s._regionLabel, count });
      }
    });
    return result;
  }, [skus]);

  // ── Filtered SKUs for selected region ─────────────────────────────────────
  const regionSkus = useMemo(() => {
    let filtered = skus.filter(s => s._region === selectedRegion);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s =>
        (s.override?.custom_name || s.sku_name).toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => {
      const ao = a.override?.sort_order ?? 9999;
      const bo = b.override?.sort_order ?? 9999;
      if (ao !== bo) return ao - bo;
      return (a.price || 0) - (b.price || 0);
    });
  }, [skus, selectedRegion, search]);

  const handleOverrideSaved = useCallback((saved: SkuOverride) => {
    setSkus(prev => prev.map(s =>
      String(s.sku_id) === String(saved.sku_id) ? { ...s, override: saved } : s
    ));
  }, []);

  const handleToggleHide = async (sku: MergedSku) => {
    const newHidden = !(sku.override?.is_hidden ?? false);
    const payload: SkuOverride = {
      game_id: gameId!,
      sku_id: String(sku.sku_id),
      custom_name: sku.override?.custom_name ?? null,
      custom_price: sku.override?.custom_price ?? null,
      custom_image_url: sku.override?.custom_image_url ?? null,
      is_hidden: newHidden,
      sort_order: sku.override?.sort_order ?? 9999,
    };
    const { error } = await supabase.from("sku_overrides").upsert(payload, { onConflict: "game_id,sku_id" });
    if (error) { toast.error(error.message); return; }
    handleOverrideSaved(payload);
    toast.success(newHidden ? "SKU hidden" : "SKU visible");
  };

  const handleMoveUp = async (sku: MergedSku, idx: number) => {
    if (idx === 0) return;
    const prev = regionSkus[idx - 1];
    const aOrder = sku.override?.sort_order ?? idx;
    const bOrder = prev.override?.sort_order ?? idx - 1;
    const blank = (s: MergedSku) => ({ game_id: gameId!, sku_id: String(s.sku_id), custom_name: s.override?.custom_name ?? null, custom_price: s.override?.custom_price ?? null, custom_image_url: s.override?.custom_image_url ?? null, is_hidden: s.override?.is_hidden ?? false, sort_order: 0 });
    await Promise.all([
      supabase.from("sku_overrides").upsert({ ...blank(sku), sort_order: bOrder }, { onConflict: "game_id,sku_id" }),
      supabase.from("sku_overrides").upsert({ ...blank(prev), sort_order: aOrder }, { onConflict: "game_id,sku_id" }),
    ]);
    setSkus(old => old.map(s => {
      if (String(s.sku_id) === String(sku.sku_id)) return { ...s, override: { ...(s.override ?? { game_id: gameId!, sku_id: String(s.sku_id), custom_name: null, custom_price: null, custom_image_url: null, is_hidden: false, sort_order: 9999 }), sort_order: bOrder } };
      if (String(s.sku_id) === String(prev.sku_id)) return { ...s, override: { ...(s.override ?? { game_id: gameId!, sku_id: String(s.sku_id), custom_name: null, custom_price: null, custom_image_url: null, is_hidden: false, sort_order: 9999 }), sort_order: aOrder } };
      return s;
    }));
    toast.success("Order updated");
  };

  const handleMoveDown = async (sku: MergedSku, idx: number) => {
    if (idx >= regionSkus.length - 1) return;
    const next = regionSkus[idx + 1];
    const aOrder = sku.override?.sort_order ?? idx;
    const bOrder = next.override?.sort_order ?? idx + 1;
    const blank = (s: MergedSku) => ({ game_id: gameId!, sku_id: String(s.sku_id), custom_name: s.override?.custom_name ?? null, custom_price: s.override?.custom_price ?? null, custom_image_url: s.override?.custom_image_url ?? null, is_hidden: s.override?.is_hidden ?? false, sort_order: 0 });
    await Promise.all([
      supabase.from("sku_overrides").upsert({ ...blank(sku), sort_order: bOrder }, { onConflict: "game_id,sku_id" }),
      supabase.from("sku_overrides").upsert({ ...blank(next), sort_order: aOrder }, { onConflict: "game_id,sku_id" }),
    ]);
    setSkus(old => old.map(s => {
      if (String(s.sku_id) === String(sku.sku_id)) return { ...s, override: { ...(s.override ?? { game_id: gameId!, sku_id: String(s.sku_id), custom_name: null, custom_price: null, custom_image_url: null, is_hidden: false, sort_order: 9999 }), sort_order: bOrder } };
      if (String(s.sku_id) === String(next.sku_id)) return { ...s, override: { ...(s.override ?? { game_id: gameId!, sku_id: String(s.sku_id), custom_name: null, custom_price: null, custom_image_url: null, is_hidden: false, sort_order: 9999 }), sort_order: aOrder } };
      return s;
    }));
    toast.success("Order updated");
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <AdminSidebar />
      <main className="ml-64 flex-1 py-8">
        <div className="max-w-7xl mx-auto px-6">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <button
              onClick={() => navigate("/secure-dashboard-92x2011/lootbar-games")}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-gray-900">SKU Management</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-sm text-gray-500">
                  {gameName ? `${gameName} · ` : ""}
                  {skus.length} SKUs across {regions.length} regions
                </p>
                {cacheTimestamp && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    <Database size={9} /> Cached {new Date(cacheTimestamp).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <Button
              onClick={() => loadFromDB()}
              disabled={isLoading}
              variant="outline"
              className="gap-2 rounded-xl"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              Reload
            </Button>
            <Button
              onClick={() => syncFromLootbar(false)}
              disabled={isSyncing || isLoading}
              className="gap-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-bold border-0"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "Syncing…" : "Sync from Lootbar"}
            </Button>
          </div>

          {/* DB cache info banner */}
          {!isLoading && skus.length > 0 && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 mb-5 text-xs text-green-700">
              <Database size={13} className="text-green-500 flex-shrink-0" />
              <span>
                SKUs are loaded from the permanent database — no live API calls needed.
                Click <strong>Sync from Lootbar</strong> to update to the latest prices.
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="flex gap-5">
              <div className="w-52 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 bg-white rounded-xl animate-pulse" />)}
              </div>
              <div className="flex-1 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
              </div>
            </div>
          ) : skus.length === 0 ? (
            <div className="text-center py-20">
              <Package size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No SKUs cached for this game</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">Click "Sync from Lootbar" to fetch and save SKUs permanently</p>
              <Button
                onClick={() => syncFromLootbar(false)}
                disabled={isSyncing}
                className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold border-0 gap-2"
              >
                <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "Syncing…" : "Sync from Lootbar"}
              </Button>
            </div>
          ) : (
            <div className="flex gap-5 items-start">

              {/* ── Region sidebar ── */}
              <div className="w-52 flex-shrink-0">
                <div className="bg-white rounded-2xl border border-gray-100 p-3 sticky top-20">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">
                    Regions ({regions.length})
                  </p>
                  <div className="space-y-0.5">
                    {regions.map(r => {
                      const isSelected = selectedRegion === r.value;
                      return (
                        <button
                          key={r.value}
                          onClick={() => { setSelectedRegion(r.value); setSearch(""); }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            isSelected ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-base leading-none">{getFlag(r.label)}</span>
                            <span className="truncate">{r.label}</span>
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg flex-shrink-0 ml-1 ${
                            isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                          }`}>
                            {r.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── SKU list ── */}
              <div className="flex-1">
                {/* Region header */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl leading-none">
                      {getFlag(regions.find(r => r.value === selectedRegion)?.label || selectedRegion)}
                    </span>
                    <h2 className="text-lg font-black text-gray-900">
                      {regions.find(r => r.value === selectedRegion)?.label || selectedRegion}
                    </h2>
                  </div>
                  <span className="text-sm text-gray-400">·</span>
                  <span className="text-sm text-gray-500">{regionSkus.length} SKUs</span>

                  {/* Search */}
                  <div className="relative ml-auto w-56">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search SKUs…"
                      className="pl-8 h-8 text-xs rounded-xl bg-white"
                    />
                  </div>
                </div>

                {/* SKU cards */}
                <div className="space-y-2">
                  {regionSkus.map((sku, idx) => {
                    const displayName = sku.override?.custom_name || sku.sku_name;
                    const displayPrice = sku.override?.custom_price ?? sku.price;
                    const displayImg = sku.override?.custom_image_url || sku.image;
                    const isHidden = sku.override?.is_hidden ?? false;
                    const hasOverride = sku.override && (
                      sku.override.custom_name ||
                      sku.override.custom_price != null ||
                      sku.override.custom_image_url
                    );

                    return (
                      <div
                        key={sku.sku_id}
                        className={`bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 transition-all hover:shadow-sm ${
                          isHidden ? "opacity-50" : ""
                        }`}
                      >
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => handleMoveUp(sku, idx)}
                            disabled={idx === 0}
                            className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-colors"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={() => handleMoveDown(sku, idx)}
                            disabled={idx === regionSkus.length - 1}
                            className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-colors"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>

                        {/* Image */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          {displayImg ? (
                            <img
                              src={displayImg}
                              alt={displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={20} className="text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                            {hasOverride && (
                              <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">OVERRIDE</span>
                            )}
                            {isHidden && (
                              <span className="text-[9px] bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded">HIDDEN</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            SKU {sku.sku_id}
                            {sku.override?.custom_name && (
                              <> · <span className="text-gray-400 line-through text-[10px]">{sku.sku_name}</span></>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-black text-orange-500">
                              ${Number(displayPrice).toFixed(2)}
                            </span>
                            {sku.override?.custom_price != null && (
                              <span className="text-[10px] text-gray-400 line-through">${Number(sku.price).toFixed(2)}</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleToggleHide(sku)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                              isHidden
                                ? "bg-gray-700 text-white hover:bg-gray-600"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title={isHidden ? "Show SKU" : "Hide SKU"}
                          >
                            {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                          <button
                            onClick={() => setEditSku(sku)}
                            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-yellow-100 text-gray-600 hover:text-yellow-700 flex items-center justify-center transition-colors"
                            title="Edit override"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {regionSkus.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                      <Globe size={32} className="text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm font-medium">No SKUs in this region</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {editSku && (
        <EditSkuModal
          sku={editSku}
          gameId={gameId!}
          onClose={() => setEditSku(null)}
          onSaved={handleOverrideSaved}
        />
      )}
    </div>
  );
}
