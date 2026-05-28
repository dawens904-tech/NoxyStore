import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import AdminSidebar from "./AdminSidebar";
import {
  ArrowLeft, Search, Edit2, DollarSign, Image, Star,
  Loader2, AlertCircle, RefreshCw, Package, Tag
} from "lucide-react";
import { toast } from "sonner";

interface SkuCacheRow {
  game_id: string;
  sku_id: string;
  sku_name: string;
  price: number | null;
  original_price: number | null;
  discount_amount: number | null;
  attributes: Array<Record<string, string>> | null;
  extra_info: Array<Record<string, string>> | null;
  image: string | null;
  cached_at: string | null;
}

interface SkuOverride {
  id?: string;
  game_id: string;
  sku_id: string;
  custom_name: string | null;
  custom_price: number | null;
  custom_image_url: string | null;
  is_hidden: boolean;
  sort_order: number;
}

type MergedSku = SkuCacheRow & { override?: SkuOverride };

interface GameInfo {
  game_id: string;
  game_name: string;
  game_image: string | null;
  category: string | null;
}

// ─── Ensure sku_overrides table exists ──────────────────────────────────────
// We store SKU-level overrides in a separate table. Check DB Context — if not
// present, the upsert will fail gracefully and show an error toast.

export default function LootbarSkuManagement() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [game, setGame] = useState<GameInfo | null>(null);
  const [skus, setSkus] = useState<MergedSku[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editSku, setEditSku] = useState<MergedSku | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    custom_name: "",
    custom_price: "",
    custom_image_url: "",
    is_hidden: false,
    sort_order: "0",
  });

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "admin") { navigate("/"); return; }
    if (!gameId) return;
    fetchData();
  }, [user, gameId]);

  const fetchData = async () => {
    if (!gameId) return;
    setIsLoading(true);

    const [{ data: gameData }, { data: skuData }, { data: overrideData }] = await Promise.all([
      supabase.from("games_cache").select("game_id, game_name, game_image, category").eq("game_id", gameId).single(),
      supabase.from("sku_cache").select("*").eq("game_id", gameId).order("sku_name"),
      supabase.from("sku_overrides").select("*").eq("game_id", gameId),
    ]);

    if (gameData) setGame(gameData as GameInfo);

    const overrideMap = new Map<string, SkuOverride>();
    (overrideData || []).forEach((o: SkuOverride) => overrideMap.set(o.sku_id, o));

    const merged: MergedSku[] = (skuData || []).map((s: SkuCacheRow) => ({
      ...s,
      override: overrideMap.get(s.sku_id),
    }));

    setSkus(merged);
    setIsLoading(false);
  };

  const syncSkus = async () => {
    if (!gameId) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("lootbar-proxy", {
        body: { action: "get_skus", params: { game_id: gameId } },
      });
      if (error) throw error;
      toast.success("SKUs synced from Lootbar");
      await fetchData();
    } catch (err: any) {
      toast.error("Sync failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSyncing(false);
    }
  };

  const openEditModal = (sku: MergedSku) => {
    setEditSku(sku);
    setOverrideForm({
      custom_name: sku.override?.custom_name ?? "",
      custom_price: sku.override?.custom_price != null ? String(sku.override.custom_price) : "",
      custom_image_url: sku.override?.custom_image_url ?? "",
      is_hidden: sku.override?.is_hidden ?? false,
      sort_order: String(sku.override?.sort_order ?? 0),
    });
  };

  const handleSaveOverride = async () => {
    if (!editSku || !gameId) return;

    const payload = {
      game_id: gameId,
      sku_id: editSku.sku_id,
      custom_name: overrideForm.custom_name || null,
      custom_price: overrideForm.custom_price !== "" ? Number(overrideForm.custom_price) : null,
      custom_image_url: overrideForm.custom_image_url || null,
      is_hidden: overrideForm.is_hidden,
      sort_order: Number(overrideForm.sort_order),
    };

    const { error } = await supabase
      .from("sku_overrides")
      .upsert(payload, { onConflict: "game_id,sku_id" });

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("relation")) {
        toast.error("sku_overrides table not found. Please create it first — see instructions below.");
      } else {
        toast.error("Save failed: " + error.message);
      }
      return;
    }

    toast.success(`Override saved for "${editSku.sku_name}"`);
    setEditSku(null);
    await fetchData();
  };

  const quickToggleHidden = async (sku: MergedSku) => {
    if (!gameId) return;
    const newHidden = !(sku.override?.is_hidden ?? false);
    const { error } = await supabase.from("sku_overrides").upsert(
      {
        game_id: gameId,
        sku_id: sku.sku_id,
        is_hidden: newHidden,
        custom_price: sku.override?.custom_price ?? null,
        custom_name: sku.override?.custom_name ?? null,
        custom_image_url: sku.override?.custom_image_url ?? null,
        sort_order: sku.override?.sort_order ?? 0,
      },
      { onConflict: "game_id,sku_id" }
    );
    if (error) { toast.error(error.message); return; }
    toast.success(newHidden ? "SKU hidden" : "SKU visible");
    setSkus(prev =>
      prev.map(s =>
        s.sku_id === sku.sku_id
          ? { ...s, override: { ...(s.override ?? { game_id: gameId, sku_id: s.sku_id, custom_name: null, custom_price: null, custom_image_url: null, sort_order: 0 }), is_hidden: newHidden } }
          : s
      )
    );
  };

  // Group SKUs by attribute (server/region if present)
  const getRegionLabel = (sku: MergedSku): string => {
    const attrs = sku.attributes ?? [];
    for (const attr of attrs) {
      const val = attr["server"] || attr["region"] || attr["zone"] || attr["area"];
      if (val) return String(val);
    }
    return "Default";
  };

  const filtered = skus.filter(s =>
    (s.override?.custom_name ?? s.sku_name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by region
  const grouped: Record<string, MergedSku[]> = {};
  filtered.forEach(sku => {
    const region = getRegionLabel(sku);
    if (!grouped[region]) grouped[region] = [];
    grouped[region].push(sku);
  });

  const stats = {
    total: skus.length,
    overridden: skus.filter(s => s.override?.custom_price != null || s.override?.custom_image_url).length,
    hidden: skus.filter(s => s.override?.is_hidden).length,
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <AdminSidebar />
      <div className="ml-64 flex-1 py-8">
        <div className="max-w-6xl mx-auto px-6">

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate("/secure-dashboard-92x2011/lootbar-games")}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {game?.game_image && (
                  <img src={game.game_image} alt={game.game_name} className="w-10 h-10 rounded-xl object-cover" />
                )}
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{game?.game_name ?? "Loading..."}</h1>
                  <p className="text-sm text-gray-500">Lootbar SKU Management · {game?.category}</p>
                </div>
              </div>
            </div>
            <Button
              onClick={syncSkus}
              disabled={isSyncing}
              className="gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold border-0"
            >
              {isSyncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {isSyncing ? "Syncing..." : "Sync SKUs"}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total SKUs", value: stats.total, icon: <Package size={16} />, color: "text-blue-600 bg-blue-50" },
              { label: "Overridden", value: stats.overridden, icon: <DollarSign size={16} />, color: "text-green-600 bg-green-50" },
              { label: "Hidden", value: stats.hidden, icon: <AlertCircle size={16} />, color: "text-gray-600 bg-gray-100" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
                <div>
                  <p className="text-xl font-black text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-5 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search SKUs..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl bg-white"
            />
          </div>



          {/* Content */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="shimmer h-5 w-32 rounded mb-3" />
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(j => <div key={j} className="shimmer h-24 rounded-xl" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : skus.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Package size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No SKUs cached yet</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">Sync SKUs from Lootbar to manage them here</p>
              <Button onClick={syncSkus} disabled={isSyncing} className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold border-0">
                {isSyncing ? <Loader2 size={14} className="animate-spin mr-2" /> : <RefreshCw size={14} className="mr-2" />}
                Sync from Lootbar
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([region, regionSkus]) => (
                <div key={region} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {/* Region header */}
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <Tag size={13} className="text-gray-400" />
                    <h3 className="font-bold text-sm text-gray-700">{region}</h3>
                    <span className="text-xs text-gray-400 font-medium ml-1">· {regionSkus.length} SKUs</span>
                  </div>

                  <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {regionSkus.map(sku => {
                      const isHidden = sku.override?.is_hidden ?? false;
                      const hasCustomPrice = sku.override?.custom_price != null;
                      const hasCustomImage = !!sku.override?.custom_image_url;
                      const displayName = sku.override?.custom_name ?? sku.sku_name;
                      const displayPrice = sku.override?.custom_price ?? sku.price;
                      const displayImage = sku.override?.custom_image_url ?? sku.image;

                      return (
                        <div
                          key={sku.sku_id}
                          className={`rounded-xl border transition-all ${
                            isHidden ? "opacity-50 border-gray-100 bg-gray-50" : "border-gray-200 bg-white hover:shadow-sm"
                          } ${hasCustomPrice || hasCustomImage ? "ring-1 ring-yellow-300" : ""}`}
                        >
                          {/* Image */}
                          <div className="relative h-28 bg-gray-100 rounded-t-xl overflow-hidden">
                            {displayImage ? (
                              <img
                                src={displayImage}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={28} className="text-gray-300" />
                              </div>
                            )}
                            {/* Badges */}
                            <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                              {hasCustomPrice && (
                                <span className="bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <DollarSign size={7} /> CUSTOM
                                </span>
                              )}
                              {hasCustomImage && (
                                <span className="bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Image size={7} /> IMG
                                </span>
                              )}
                              {isHidden && (
                                <span className="bg-gray-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">HIDDEN</span>
                              )}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="p-2.5">
                            <p className="text-[11px] font-bold text-gray-900 line-clamp-2 leading-tight mb-1.5">{displayName}</p>
                            <div className="flex items-center justify-between mb-2">
                              {displayPrice != null ? (
                                <span className={`text-[12px] font-black ${hasCustomPrice ? "text-green-600" : "text-orange-500"}`}>
                                  ${Number(displayPrice).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-400">No price</span>
                              )}
                              {sku.discount_amount != null && Number(sku.discount_amount) > 0 && (
                                <span className="text-[9px] text-orange-500 font-bold">-${Number(sku.discount_amount).toFixed(2)}</span>
                              )}
                            </div>
                            <p className="text-[9px] text-gray-400 font-mono mb-2 truncate">ID: {sku.sku_id}</p>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-1">
                              <button
                                onClick={() => openEditModal(sku)}
                                className="flex items-center justify-center gap-0.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold transition-all"
                              >
                                <Edit2 size={10} /> Edit
                              </button>
                              <button
                                onClick={() => quickToggleHidden(sku)}
                                className={`flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                  isHidden ? "bg-gray-700 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                                }`}
                              >
                                {isHidden ? "Show" : "Hide"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editSku} onOpenChange={(open) => { if (!open) setEditSku(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Edit2 size={15} /> Override SKU
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-2">
            <div className="space-y-4 py-1">
              {/* Preview */}
              <div className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl">
                <div className="w-16 h-16 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {(overrideForm.custom_image_url || editSku?.image) ? (
                    <img
                      src={overrideForm.custom_image_url || editSku?.image || ""}
                      alt={editSku?.sku_name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <Package size={24} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 line-clamp-2">{editSku?.sku_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">SKU ID: {editSku?.sku_id}</p>
                  <p className="text-xs text-gray-400">
                    Lootbar price: {editSku?.price != null ? `$${Number(editSku.price).toFixed(2)}` : "N/A"}
                  </p>
                </div>
              </div>

              {/* Custom Name */}
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5 text-sm"><Star size={13} /> Custom Name</Label>
                <Input
                  value={overrideForm.custom_name}
                  onChange={e => setOverrideForm(f => ({ ...f, custom_name: e.target.value }))}
                  placeholder={`Lootbar name: "${editSku?.sku_name}"`}
                  className="text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Renames the SKU on your storefront.</p>
              </div>

              {/* Custom Price */}
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5 text-sm"><DollarSign size={13} /> Custom Price (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={overrideForm.custom_price}
                  onChange={e => setOverrideForm(f => ({ ...f, custom_price: e.target.value }))}
                  placeholder={`Lootbar: $${editSku?.price != null ? Number(editSku.price).toFixed(2) : "N/A"}`}
                  className="text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Leave empty to use Lootbar's price.</p>
              </div>

              {/* Custom Image */}
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5 text-sm"><Image size={13} /> Custom Image URL</Label>
                <Input
                  value={overrideForm.custom_image_url}
                  onChange={e => setOverrideForm(f => ({ ...f, custom_image_url: e.target.value }))}
                  placeholder="https://..."
                  className="text-sm"
                />
                {overrideForm.custom_image_url && (
                  <img src={overrideForm.custom_image_url} alt="preview" className="mt-2 w-full h-32 object-cover rounded-xl border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <p className="text-xs text-gray-400 mt-1">Overrides the SKU image. E.g., a diamond pack icon URL.</p>
              </div>

              {/* Sort Order */}
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5 text-sm">Sort Order</Label>
                <Input
                  type="number"
                  value={overrideForm.sort_order}
                  onChange={e => setOverrideForm(f => ({ ...f, sort_order: e.target.value }))}
                  placeholder="0 = default"
                  className="text-sm"
                />
              </div>

              {/* Hidden toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Hide from storefront</p>
                  <p className="text-xs text-gray-400 mt-0.5">Customers won't see this SKU</p>
                </div>
                <div
                  onClick={() => setOverrideForm(f => ({ ...f, is_hidden: !f.is_hidden }))}
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer flex items-center px-1 ${
                    overrideForm.is_hidden ? "bg-gray-700" : "bg-gray-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${overrideForm.is_hidden ? "translate-x-4" : "translate-x-0"}`} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSaveOverride}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold border-0"
                >
                  Save Override
                </Button>
                <Button onClick={() => setEditSku(null)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
also fix if product example 100 diamant show after 200 diamant i want the 100 take place of 200 and 200 take after 100 i can just move the sku product and also when i do it like this its auto set in gamedetail page and if i save photo auto set in game detail never unsavee only if i delete or change.
