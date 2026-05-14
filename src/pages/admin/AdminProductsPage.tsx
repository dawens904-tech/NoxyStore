/**
 * AdminProductsPage — Full product management
 *
 * Three sections:
 *   1. Lootbar Products  — Override image / category / featured / hidden
 *   2. Manual Products   — Full CRUD with server (region) and SKU management
 *
 * Navigation:
 *   Tab "Lootbar"  → list of games from games_cache
 *   Tab "Manual"   → list of manual_products
 *      → click "Manage" → opens inline panel:
 *          - If requires_server: shows region tabs + SKUs per region
 *          - Else: shows flat SKU list
 */
import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Edit2, Save, Eye, EyeOff, Star, Camera, Upload,
  Plus, Trash2, Server, Package, X, ChevronRight, Check,
  ToggleLeft, ToggleRight, Image as ImageIcon,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LootbarGame {
  game_id: string;
  game_name: string;
  game_image: string | null;
  category: string;
  is_hot: boolean;
  discount: number;
  min_price: number | null;
}

interface GameOverride {
  game_id: string;
  custom_price?: number;
  category_override?: string;
  is_featured?: boolean;
  is_hidden?: boolean;
  custom_image_url?: string;
}

interface ManualProduct {
  id: string;
  product_name: string;
  game_category: string;
  photo_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  requires_server: boolean;
  requires_player_id: boolean;
  short_description: string;
  full_description: string;
  created_at: string;
}

interface ManualRegion {
  id: string;
  product_id: string;
  region_name: string;
  region_key: string;
  sort_order: number;
  is_active: boolean;
}

interface ManualSku {
  id: string;
  product_id: string;
  region_id: string | null;
  sku_name: string;
  original_price: number;
  sale_price: number | null;
  photo_url: string | null;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = ["Top Up", "Game Coins", "Gift Card", "Game Keys", "Game Items", "Best Seller", "Hot Selling"];

// ─── Image Upload Helper ──────────────────────────────────────────────────────
async function uploadImage(file: File, prefix: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${prefix}_${Date.now()}.${ext}`;
  const buffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from("store-assets")
    .upload(path, buffer, { upsert: true, contentType: file.type });
  if (error) { toast.error(`Upload failed: ${error.message}`); return null; }
  return supabase.storage.from("store-assets").getPublicUrl(path).data.publicUrl;
}

// ─── Lootbar Tab ──────────────────────────────────────────────────────────────
function LootbarTab() {
  const [games, setGames] = useState<LootbarGame[]>([]);
  const [overrides, setOverrides] = useState<Record<string, GameOverride>>({});
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<GameOverride> & { custom_price_str?: string }>({});
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    const { data: cached } = await supabase.from("games_cache").select("*").order("game_name");
    if (cached) setGames(cached as LootbarGame[]);
    const { data: ovr } = await supabase.from("game_overrides").select("*");
    if (ovr) {
      const map: Record<string, GameOverride> = {};
      ovr.forEach((r: GameOverride) => { map[r.game_id] = r; });
      setOverrides(map);
    }
    setIsLoading(false);
  };

  const startEdit = (game: LootbarGame) => {
    const ovr = overrides[game.game_id];
    setEditingId(game.game_id);
    setEditData({
      game_id: game.game_id,
      custom_price_str: ovr?.custom_price ? String(ovr.custom_price) : "",
      category_override: ovr?.category_override || game.category || "Top Up",
      is_featured: ovr?.is_featured ?? false,
      is_hidden: ovr?.is_hidden ?? false,
      custom_image_url: ovr?.custom_image_url || game.game_image || "",
    });
    setImgFile(null);
    setImgPreview("");
  };

  const saveEdit = async (gameId: string) => {
    setIsUploading(true);
    let imageUrl = editData.custom_image_url || "";

    if (imgFile) {
      const url = await uploadImage(imgFile, `game_${gameId}`);
      if (!url) { setIsUploading(false); return; }
      imageUrl = url;
    }

    const overrideUpdates: Record<string, unknown> = {
      game_id: gameId,
      category_override: editData.category_override,
      is_featured: editData.is_featured,
      is_hidden: editData.is_hidden,
      updated_at: new Date().toISOString(),
    };
    if (editData.custom_price_str) overrideUpdates.custom_price = parseFloat(editData.custom_price_str);
    if (imageUrl) overrideUpdates.custom_image_url = imageUrl;
    await supabase.from("game_overrides").upsert(overrideUpdates);

    // Sync to games_cache
    const cacheUpdates: Record<string, unknown> = {};
    if (imageUrl) cacheUpdates.game_image = imageUrl;
    if (editData.category_override) cacheUpdates.category = editData.category_override;
    if (typeof editData.is_featured === "boolean") cacheUpdates.is_hot = editData.is_featured;
    if (Object.keys(cacheUpdates).length > 0) {
      await supabase.from("games_cache").update(cacheUpdates).eq("game_id", gameId);
    }

    setGames((prev) => prev.map((g) =>
      g.game_id === gameId ? { ...g, game_image: imageUrl || g.game_image, category: editData.category_override || g.category, is_hot: editData.is_featured ?? g.is_hot } : g
    ));
    setOverrides((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], game_id: gameId, custom_image_url: imageUrl || prev[gameId]?.custom_image_url, category_override: editData.category_override, is_featured: editData.is_featured, is_hidden: editData.is_hidden },
    }));

    toast.success("Saved — changes are live on all pages");
    setEditingId(null);
    setIsUploading(false);
  };

  const toggleHidden = async (gameId: string) => {
    const current = overrides[gameId]?.is_hidden ?? false;
    await supabase.from("game_overrides").upsert({ game_id: gameId, is_hidden: !current, updated_at: new Date().toISOString() });
    setOverrides((prev) => ({ ...prev, [gameId]: { ...prev[gameId], game_id: gameId, is_hidden: !current } }));
    toast.success(!current ? "Product hidden from store" : "Product now visible");
  };

  const filtered = games.filter((g) => !search || g.game_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Lootbar products…"
          className="flex-1 bg-[#1a1a1a] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400 placeholder-gray-600"
        />
        <button onClick={loadAll} className="p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-gray-400 hover:text-white">
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading Lootbar products…</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.slice(0, 150).map((game) => {
              const ovr = overrides[game.game_id];
              const isEditing = editingId === game.game_id;
              const isHidden = ovr?.is_hidden ?? false;
              const isFeatured = ovr?.is_featured ?? false;
              const displayImage = ovr?.custom_image_url || game.game_image;

              return (
                <div key={game.game_id} className={isHidden ? "opacity-50" : ""}>
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <img
                        src={displayImage || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=48&h=48&fit=crop"}
                        alt={game.game_name}
                        className="w-12 h-12 rounded-xl object-cover bg-gray-800"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=48&h=48&fit=crop"; }}
                      />
                      {ovr?.custom_image_url && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                          <Camera size={8} className="text-black" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white truncate">{game.game_name}</p>
                        {isFeatured && <Star size={12} className="text-yellow-400 flex-shrink-0" fill="currentColor" />}
                        {isHidden && <EyeOff size={12} className="text-red-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500">
                        ID: {game.game_id} · {ovr?.category_override || game.category || "Top Up"}
                        {ovr?.custom_price ? ` · $${ovr.custom_price}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleHidden(game.game_id)}
                        className={`p-2 rounded-lg transition-colors ${isHidden ? "text-red-400 bg-red-400/10" : "text-gray-500 hover:text-white bg-white/5"}`}
                        title={isHidden ? "Show" : "Hide"}
                      >
                        {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => isEditing ? setEditingId(null) : startEdit(game)}
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-3 py-2 rounded-xl"
                      >
                        <Edit2 size={12} /> {isEditing ? "Close" : "Edit"}
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="px-5 pb-5 bg-white/[0.02] border-t border-white/5 pt-4 space-y-4">
                      {/* Photo */}
                      <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Custom Photo</label>
                        <div className="flex items-center gap-3">
                          <img
                            src={imgPreview || editData.custom_image_url || game.game_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=64&h=64&fit=crop"}
                            alt="" className="w-16 h-16 rounded-xl object-cover bg-gray-800"
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=64&h=64&fit=crop"; }}
                          />
                          <div className="space-y-2 flex-1">
                            <label className="flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/15 text-white font-semibold px-3 py-2 rounded-xl text-xs w-fit">
                              <Upload size={12} /> {imgFile ? imgFile.name.slice(0, 20) : "Upload Photo"}
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const f = e.target.files?.[0]; if (!f) return; setImgFile(f);
                                const r = new FileReader(); r.onload = (ev) => setImgPreview(ev.target?.result as string); r.readAsDataURL(f);
                              }} />
                            </label>
                            <input
                              type="text" value={editData.custom_image_url || ""}
                              onChange={(e) => setEditData({ ...editData, custom_image_url: e.target.value })}
                              placeholder="Or paste image URL"
                              className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-yellow-400"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Custom Price ($)</label>
                          <input
                            type="number" value={editData.custom_price_str || ""}
                            onChange={(e) => setEditData({ ...editData, custom_price_str: e.target.value })}
                            placeholder="Leave empty = Lootbar price"
                            className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Category</label>
                          <select
                            value={editData.category_override || "Top Up"}
                            onChange={(e) => setEditData({ ...editData, category_override: e.target.value })}
                            className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400"
                          >
                            {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editData.is_featured || false} onChange={(e) => setEditData({ ...editData, is_featured: e.target.checked })} className="w-4 h-4 rounded accent-yellow-400" />
                          <span className="text-sm text-gray-300">Featured (Hot)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editData.is_hidden || false} onChange={(e) => setEditData({ ...editData, is_hidden: e.target.checked })} className="w-4 h-4 rounded accent-red-400" />
                          <span className="text-sm text-gray-300">Hide from store</span>
                        </label>
                      </div>
                      <button
                        onClick={() => saveEdit(game.game_id)} disabled={isUploading}
                        className="flex items-center gap-2 bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-300 text-sm"
                      >
                        {isUploading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-gray-500 text-center py-12">No products found</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SKU Form Modal ───────────────────────────────────────────────────────────
function SkuModal({
  productId, regionId, sku, onSave, onClose,
}: {
  productId: string;
  regionId: string | null;
  sku: ManualSku | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    sku_name: sku?.sku_name || "",
    original_price: sku?.original_price?.toString() || "",
    sale_price: sku?.sale_price?.toString() || "",
    sort_order: sku?.sort_order?.toString() || "0",
  });
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState(sku?.photo_url || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!form.sku_name.trim() || !form.original_price) {
      toast.error("Name and original price are required");
      return;
    }
    setIsSaving(true);

    let photoUrl = sku?.photo_url || null;
    if (imgFile) {
      const url = await uploadImage(imgFile, `sku_${productId}`);
      if (url) photoUrl = url;
    }

    const payload: Record<string, unknown> = {
      product_id: productId,
      region_id: regionId,
      sku_name: form.sku_name.trim(),
      original_price: parseFloat(form.original_price),
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      sort_order: parseInt(form.sort_order) || 0,
      photo_url: photoUrl,
      is_active: true,
    };

    if (sku?.id) {
      await supabase.from("manual_skus").update(payload).eq("id", sku.id);
    } else {
      await supabase.from("manual_skus").insert(payload);
    }

    toast.success(sku ? "Package updated" : "Package added");
    setIsSaving(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="font-bold text-white">{sku ? "Edit Package" : "Add Package"}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-white" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Image */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Package Image</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-800 overflow-hidden flex-shrink-0">
                {imgPreview ? (
                  <img src={imgPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={24} className="text-gray-600" />
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/15 text-white font-semibold px-3 py-2 rounded-xl text-xs">
                <Upload size={12} /> {imgFile ? imgFile.name.slice(0, 20) : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return; setImgFile(f);
                  const r = new FileReader(); r.onload = (ev) => setImgPreview(ev.target?.result as string); r.readAsDataURL(f);
                }} />
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Package Name *</label>
            <input
              type="text" value={form.sku_name} onChange={(e) => setForm({ ...form, sku_name: e.target.value })}
              placeholder="e.g. 100 Diamonds"
              className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Original Price ($) *</label>
              <input
                type="number" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                placeholder="0.00"
                className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Sale Price ($)</label>
              <input
                type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                placeholder="Optional"
                className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Sort Order</label>
            <input
              type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400"
            />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-white/20 text-gray-300 rounded-xl text-sm font-semibold hover:bg-white/5">Cancel</button>
          <button
            onClick={handleSave} disabled={isSaving}
            className="flex-1 py-2.5 bg-yellow-400 text-black rounded-xl text-sm font-bold hover:bg-yellow-300 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {sku ? "Save Changes" : "Add Package"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Manual Product Detail Panel ───────────────────────────────────────────────
function ManualProductDetail({
  product, onBack, onRefresh,
}: {
  product: ManualProduct;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [regions, setRegions] = useState<ManualRegion[]>([]);
  const [skus, setSkus] = useState<ManualSku[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSkuModal, setShowSkuModal] = useState(false);
  const [editingSku, setEditingSku] = useState<ManualSku | null>(null);
  const [showAddRegion, setShowAddRegion] = useState(false);
  const [newRegionName, setNewRegionName] = useState("");
  const [newRegionKey, setNewRegionKey] = useState("");
  const [editingProduct, setEditingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    product_name: product.product_name,
    game_category: product.game_category,
    short_description: product.short_description || "",
    full_description: product.full_description || "",
    requires_server: product.requires_server,
    requires_player_id: product.requires_player_id,
    is_featured: product.is_featured,
    is_active: product.is_active,
    sort_order: product.sort_order.toString(),
  });
  const [productImg, setProductImg] = useState<File | null>(null);
  const [productImgPreview, setProductImgPreview] = useState(product.photo_url || "");
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const { data: regs } = await supabase
      .from("manual_product_regions")
      .select("*").eq("product_id", product.id).order("sort_order");
    const loadedRegions = (regs as ManualRegion[]) || [];
    setRegions(loadedRegions);
    if (loadedRegions.length > 0 && !selectedRegionId) {
      setSelectedRegionId(loadedRegions[0].id);
    }

    const { data: skuData } = await supabase
      .from("manual_skus")
      .select("*").eq("product_id", product.id).order("sort_order");
    setSkus((skuData as ManualSku[]) || []);
    setIsLoading(false);
  }, [product.id, selectedRegionId]);

  useEffect(() => { loadData(); }, [product.id]);

  const filteredSkus = product.requires_server && selectedRegionId
    ? skus.filter((s) => s.region_id === selectedRegionId)
    : product.requires_server ? [] : skus.filter((s) => !s.region_id);

  const addRegion = async () => {
    if (!newRegionName.trim()) return;
    await supabase.from("manual_product_regions").insert({
      product_id: product.id,
      region_name: newRegionName.trim(),
      region_key: newRegionKey.trim() || newRegionName.trim().toLowerCase().replace(/\s+/g, "_"),
      sort_order: regions.length,
      is_active: true,
    });
    setNewRegionName(""); setNewRegionKey(""); setShowAddRegion(false);
    await loadData();
    toast.success("Server added");
  };

  const deleteRegion = async (id: string) => {
    if (!confirm("Delete this server and all its packages?")) return;
    await supabase.from("manual_skus").delete().eq("region_id", id);
    await supabase.from("manual_product_regions").delete().eq("id", id);
    if (selectedRegionId === id) setSelectedRegionId(null);
    await loadData();
    toast.success("Server deleted");
  };

  const deleteSku = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    await supabase.from("manual_skus").delete().eq("id", id);
    await loadData();
    toast.success("Package deleted");
  };

  const toggleSkuActive = async (sku: ManualSku) => {
    await supabase.from("manual_skus").update({ is_active: !sku.is_active }).eq("id", sku.id);
    await loadData();
  };

  const saveProductInfo = async () => {
    setIsSavingProduct(true);
    let photoUrl = product.photo_url;
    if (productImg) {
      const url = await uploadImage(productImg, `product_${product.id}`);
      if (url) photoUrl = url;
    }
    await supabase.from("manual_products").update({
      product_name: productForm.product_name,
      game_category: productForm.game_category,
      photo_url: photoUrl,
      short_description: productForm.short_description,
      full_description: productForm.full_description,
      requires_server: productForm.requires_server,
      requires_player_id: productForm.requires_player_id,
      is_featured: productForm.is_featured,
      is_active: productForm.is_active,
      sort_order: parseInt(productForm.sort_order) || 0,
      updated_at: new Date().toISOString(),
    }).eq("id", product.id);
    toast.success("Product info saved");
    setIsSavingProduct(false);
    setEditingProduct(false);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 bg-white/10 hover:bg-white/15 rounded-xl text-gray-400 hover:text-white transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Manual Products</span>
          <ChevronRight size={14} />
          <span className="text-white font-semibold">{product.product_name}</span>
        </div>
      </div>

      {/* Product info card */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <img
              src={productImgPreview || product.photo_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=48&h=48&fit=crop"}
              alt={product.product_name}
              className="w-12 h-12 rounded-xl object-cover bg-gray-800"
              onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=48&h=48&fit=crop"; }}
            />
            <div>
              <p className="font-bold text-white">{product.product_name}</p>
              <p className="text-xs text-gray-500">{product.game_category} · {product.is_active ? "Active" : "Inactive"}</p>
            </div>
          </div>
          <button
            onClick={() => setEditingProduct(!editingProduct)}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-3 py-2 rounded-xl"
          >
            <Edit2 size={12} /> {editingProduct ? "Close" : "Edit Info"}
          </button>
        </div>

        {editingProduct && (
          <div className="p-5 border-b border-white/5 space-y-4 bg-white/[0.02]">
            {/* Image upload */}
            <div className="flex items-center gap-3">
              <img src={productImgPreview || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=64&h=64&fit=crop"}
                alt="" className="w-16 h-16 rounded-xl object-cover bg-gray-800"
                onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=64&h=64&fit=crop"; }}
              />
              <label className="flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/15 text-white font-semibold px-3 py-2 rounded-xl text-xs">
                <Camera size={12} /> Change Photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return; setProductImg(f);
                  const r = new FileReader(); r.onload = (ev) => setProductImgPreview(ev.target?.result as string); r.readAsDataURL(f);
                }} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">Product Name</label>
                <input type="text" value={productForm.product_name} onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                  className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">Category</label>
                <select value={productForm.game_category} onChange={(e) => setProductForm({ ...productForm, game_category: e.target.value })}
                  className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">Short Description</label>
              <textarea value={productForm.short_description} onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })}
                rows={2} placeholder="Brief description shown by default…"
                className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400 resize-none" />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">Full Description (Show All)</label>
              <textarea value={productForm.full_description} onChange={(e) => setProductForm({ ...productForm, full_description: e.target.value })}
                rows={3} placeholder="Detailed description shown after 'Show All'…"
                className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400 resize-none" />
            </div>

            <div className="flex flex-wrap gap-5">
              {[
                { key: "requires_server", label: "Requires Server Selection" },
                { key: "requires_player_id", label: "Requires Player ID" },
                { key: "is_featured", label: "Featured Product" },
                { key: "is_active", label: "Active (Visible in store)" },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={(productForm as Record<string, unknown>)[opt.key] as boolean}
                    onChange={(e) => setProductForm({ ...productForm, [opt.key]: e.target.checked })}
                    className="w-4 h-4 rounded accent-yellow-400" />
                  <span className="text-sm text-gray-300">{opt.label}</span>
                </label>
              ))}
            </div>

            <button onClick={saveProductInfo} disabled={isSavingProduct}
              className="flex items-center gap-2 bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-300 text-sm">
              {isSavingProduct ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save Product Info
            </button>
          </div>
        )}
      </div>

      {/* Server Management */}
      {product.requires_server && (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-blue-400" />
              <h3 className="font-bold text-white text-sm">Servers / Regions</h3>
            </div>
            <button onClick={() => setShowAddRegion(true)} className="flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold px-3 py-2 rounded-xl">
              <Plus size={12} /> Add Server
            </button>
          </div>

          {showAddRegion && (
            <div className="px-5 py-4 bg-white/[0.02] border-b border-white/5 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={newRegionName} onChange={(e) => setNewRegionName(e.target.value)}
                  placeholder="Server name (e.g. Brazil)" 
                  className="bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
                <input type="text" value={newRegionKey} onChange={(e) => setNewRegionKey(e.target.value)}
                  placeholder="Key (optional, e.g. BR)"
                  className="bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="flex gap-2">
                <button onClick={addRegion} className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-400">Add</button>
                <button onClick={() => setShowAddRegion(false)} className="px-4 py-2 bg-white/10 text-gray-300 text-sm font-semibold rounded-xl hover:bg-white/15">Cancel</button>
              </div>
            </div>
          )}

          <div className="divide-y divide-white/5">
            {regions.map((r) => (
              <div key={r.id} className={`px-5 py-3 flex items-center justify-between ${selectedRegionId === r.id ? "bg-white/[0.04]" : ""}`}>
                <button onClick={() => setSelectedRegionId(r.id)} className="flex items-center gap-2 flex-1">
                  {selectedRegionId === r.id && <Check size={14} className="text-yellow-400" />}
                  <span className={`text-sm font-semibold ${selectedRegionId === r.id ? "text-white" : "text-gray-400"}`}>{r.region_name}</span>
                  <span className="text-xs text-gray-600">({skus.filter((s) => s.region_id === r.id).length} packages)</span>
                </button>
                <button onClick={() => deleteRegion(r.id)} className="p-1.5 text-red-400/50 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {regions.length === 0 && (
              <p className="text-gray-500 text-sm px-5 py-4">No servers yet. Add one above.</p>
            )}
          </div>
        </div>
      )}

      {/* Package Management */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-yellow-400" />
            <h3 className="font-bold text-white text-sm">
              Packages
              {product.requires_server && selectedRegionId && (
                <span className="ml-2 text-gray-400 font-normal">
                  — {regions.find((r) => r.id === selectedRegionId)?.region_name || ""}
                </span>
              )}
            </h3>
          </div>
          <button
            onClick={() => { setEditingSku(null); setShowSkuModal(true); }}
            disabled={product.requires_server && !selectedRegionId}
            className="flex items-center gap-1.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={12} /> Add Package
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredSkus.map((sku) => (
              <div key={sku.id} className={`px-5 py-4 flex items-center gap-4 ${!sku.is_active ? "opacity-50" : ""}`}>
                <div className="w-10 h-10 rounded-xl bg-gray-800 overflow-hidden flex-shrink-0">
                  {sku.photo_url ? (
                    <img src={sku.photo_url} alt={sku.sku_name} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={16} className="text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{sku.sku_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {sku.sale_price ? (
                      <>
                        <span className="text-xs font-bold text-orange-400">${sku.sale_price.toFixed(2)}</span>
                        <span className="text-xs text-gray-500 line-through">${sku.original_price.toFixed(2)}</span>
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold">
                          -{Math.round((1 - sku.sale_price / sku.original_price) * 100)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-orange-400">${sku.original_price.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleSkuActive(sku)} className={`p-1.5 rounded-lg transition-colors ${sku.is_active ? "text-gray-500 hover:text-white bg-white/5" : "text-red-400 bg-red-400/10"}`}>
                    {sku.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <button onClick={() => { setEditingSku(sku); setShowSkuModal(true); }} className="p-1.5 text-gray-500 hover:text-white bg-white/5 rounded-lg">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteSku(sku.id)} className="p-1.5 text-red-400/50 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {filteredSkus.length === 0 && (
              <p className="text-gray-500 text-sm px-5 py-6 text-center">
                {product.requires_server && !selectedRegionId
                  ? "Select a server to view packages"
                  : "No packages yet. Click 'Add Package' to create one."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* SKU modal */}
      {showSkuModal && (
        <SkuModal
          productId={product.id}
          regionId={product.requires_server ? selectedRegionId : null}
          sku={editingSku}
          onSave={loadData}
          onClose={() => { setShowSkuModal(false); setEditingSku(null); }}
        />
      )}
    </div>
  );
}

// ─── Manual Products Tab ───────────────────────────────────────────────────────
function ManualTab() {
  const [products, setProducts] = useState<ManualProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ManualProduct | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    product_name: "",
    game_category: "Top Up",
    requires_server: false,
    requires_player_id: true,
    short_description: "",
  });
  const [addImg, setAddImg] = useState<File | null>(null);
  const [addImgPreview, setAddImgPreview] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from("manual_products").select("*").order("sort_order").order("created_at", { ascending: false });
    setProducts((data as ManualProduct[]) || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, []);

  const addProduct = async () => {
    if (!addForm.product_name.trim()) { toast.error("Product name is required"); return; }
    setIsAdding(true);
    let photoUrl = null;
    if (addImg) {
      photoUrl = await uploadImage(addImg, `product_new_${Date.now()}`);
    }
    const { data, error } = await supabase.from("manual_products").insert({
      product_name: addForm.product_name.trim(),
      game_category: addForm.game_category,
      requires_server: addForm.requires_server,
      requires_player_id: addForm.requires_player_id,
      short_description: addForm.short_description,
      photo_url: photoUrl,
      is_active: true,
      is_featured: false,
      sort_order: products.length,
    }).select().single();

    if (error) { toast.error("Failed to create product"); setIsAdding(false); return; }
    toast.success("Product created");
    setShowAddModal(false);
    setAddForm({ product_name: "", game_category: "Top Up", requires_server: false, requires_player_id: true, short_description: "" });
    setAddImg(null); setAddImgPreview("");
    setIsAdding(false);
    await loadProducts();
    if (data) setSelectedProduct(data as ManualProduct);
  };

  const toggleActive = async (product: ManualProduct) => {
    await supabase.from("manual_products").update({ is_active: !product.is_active }).eq("id", product.id);
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_active: !p.is_active } : p));
    toast.success(!product.is_active ? "Product visible in store" : "Product hidden from store");
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product and ALL its servers and packages? This cannot be undone.")) return;
    await supabase.from("manual_skus").delete().eq("product_id", id);
    await supabase.from("manual_product_regions").delete().eq("product_id", id);
    await supabase.from("manual_products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (selectedProduct?.id === id) setSelectedProduct(null);
    toast.success("Product deleted");
  };

  const filtered = products.filter((p) => !search || p.product_name.toLowerCase().includes(search.toLowerCase()));

  // If product selected → show detail panel
  if (selectedProduct) {
    return (
      <ManualProductDetail
        product={selectedProduct}
        onBack={() => setSelectedProduct(null)}
        onRefresh={loadProducts}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search manual products…"
          className="flex-1 bg-[#1a1a1a] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400 placeholder-gray-600"
        />
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-yellow-400 text-black font-bold px-4 py-2.5 rounded-xl hover:bg-yellow-300 text-sm whitespace-nowrap">
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading…</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((product) => (
              <div key={product.id} className={`px-5 py-4 flex items-center gap-4 ${!product.is_active ? "opacity-50" : ""}`}>
                <div className="w-12 h-12 rounded-xl bg-gray-800 overflow-hidden flex-shrink-0">
                  {product.photo_url ? (
                    <img src={product.photo_url} alt={product.product_name} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=48&h=48&fit=crop"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={20} className="text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white truncate">{product.product_name}</p>
                    {product.requires_server && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">SERVER</span>}
                    {product.is_featured && <Star size={12} className="text-yellow-400" fill="currentColor" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {product.game_category} · {product.is_active ? "Active" : "Hidden"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(product)} className={`p-2 rounded-lg transition-colors ${!product.is_active ? "text-red-400 bg-red-400/10" : "text-gray-500 hover:text-white bg-white/5"}`}>
                    {product.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => setSelectedProduct(product)} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-3 py-2 rounded-xl">
                    <Package size={12} /> Manage
                  </button>
                  <button onClick={() => deleteProduct(product.id)} className="p-2 text-red-400/50 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-gray-500 mb-3">No manual products yet</p>
                <button onClick={() => setShowAddModal(true)} className="text-yellow-400 font-semibold text-sm hover:text-yellow-300">
                  + Add your first product
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="font-bold text-white">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)}><X size={18} className="text-gray-400 hover:text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Image */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-gray-800 overflow-hidden flex-shrink-0">
                  {addImgPreview ? (
                    <img src={addImgPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ImageIcon size={24} className="text-gray-600" /></div>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/15 text-white font-semibold px-3 py-2 rounded-xl text-xs">
                  <Camera size={12} /> Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return; setAddImg(f);
                    const r = new FileReader(); r.onload = (ev) => setAddImgPreview(ev.target?.result as string); r.readAsDataURL(f);
                  }} />
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Product Name *</label>
                <input type="text" value={addForm.product_name} onChange={(e) => setAddForm({ ...addForm, product_name: e.target.value })}
                  placeholder="e.g. Free Fire Top-up"
                  className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Category</label>
                <select value={addForm.game_category} onChange={(e) => setAddForm({ ...addForm, game_category: e.target.value })}
                  className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Short Description</label>
                <textarea value={addForm.short_description} onChange={(e) => setAddForm({ ...addForm, short_description: e.target.value })}
                  rows={2} placeholder="Brief description…"
                  className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 resize-none" />
              </div>

              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={addForm.requires_server} onChange={(e) => setAddForm({ ...addForm, requires_server: e.target.checked })} className="w-4 h-4 rounded accent-blue-400" />
                  <span className="text-sm text-gray-300">Requires Server Selection</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={addForm.requires_player_id} onChange={(e) => setAddForm({ ...addForm, requires_player_id: e.target.checked })} className="w-4 h-4 rounded accent-yellow-400" />
                  <span className="text-sm text-gray-300">Requires Player ID</span>
                </label>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-white/20 text-gray-300 rounded-xl text-sm font-semibold hover:bg-white/5">Cancel</button>
              <button onClick={addProduct} disabled={isAdding}
                className="flex-1 py-2.5 bg-yellow-400 text-black rounded-xl text-sm font-bold hover:bg-yellow-300 disabled:opacity-50 flex items-center justify-center gap-2">
                {isAdding ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} Create Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function AdminProductsPage() {
  const [activeTab, setActiveTab] = useState<"lootbar" | "manual">("lootbar");

  return (
    <AdminLayout title="Product Management">
      <div className="max-w-5xl space-y-6">
        <div>
          <p className="text-gray-400 text-sm mb-4">
            Manage all products. <strong className="text-white">Lootbar</strong> products are synced from the API.
            <strong className="text-white"> Manual</strong> products are fully custom with server/region support.
          </p>

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit">
            {[
              { key: "lootbar" as const, label: "Lootbar Products", icon: "⚡" },
              { key: "manual" as const, label: "Manual Products", icon: "📦" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.key
                    ? "bg-yellow-400 text-black shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "lootbar" ? <LootbarTab /> : <ManualTab />}
      </div>
    </AdminLayout>
  );
}
