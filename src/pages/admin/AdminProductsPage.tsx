import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit3, Save, X, Upload, Search, RefreshCw,
  ChevronLeft, ChevronRight, Image, Package, Globe, Tag
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  lootbar_game_id: string | null;
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
  sort_order: number;
  is_active: boolean;
}

interface LootbarGame {
  game_id: string;
  game_name: string;
  game_image: string | null;
  category: string | null;
  min_price: number | null;
  is_hot: boolean;
  discount: number;
}

interface GameOverride {
  game_id: string;
  custom_price: number | null;
  category_override: string | null;
  is_featured: boolean;
  is_hidden: boolean;
  sort_order: number;
  custom_image_url: string | null;
}

interface SkuCacheItem {
  game_id: string;
  sku_id: string;
  sku_name: string;
  price: number | null;
  image: string | null;
}

const LOOTBAR_PAGE_SIZE = 50;
const CATEGORIES = ["Top Up", "Gift Card", "Game Keys", "Game Coins", "Subscription", "Other"];

// ─── AdminProductsPage ────────────────────────────────────────────────────────
export function AdminProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"manual" | "lootbar">("manual");

  useEffect(() => {
    if (user?.role !== "admin" && user?.role !== "moderator") navigate("/");
  }, [user]);

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Tab bar */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 pt-4">
          <div className="flex gap-1">
            {(["manual", "lootbar"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-t-xl text-sm font-bold transition-colors border-b-2 ${
                  activeTab === tab
                    ? "border-yellow-400 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                {tab === "manual" ? "Manual Products" : "Lootbar Games"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "manual" ? <ManualTab /> : <LootbarTab />}
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Manual Products Tab ──────────────────────────────────────────────────────
function ManualTab() {
  const [products, setProducts] = useState<ManualProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ManualProduct | null>(null);
  const [regions, setRegions] = useState<ManualRegion[]>([]);
  const [skus, setSkus] = useState<ManualSku[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<ManualRegion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<Partial<ManualProduct>>({});
  const [newRegionName, setNewRegionName] = useState("");
  const [newSku, setNewSku] = useState({ sku_name: "", original_price: "", sale_price: "", photo_url: "" });
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [editingSkuData, setEditingSkuData] = useState<Partial<ManualSku>>({});
  const photoInputRef = useRef<HTMLInputElement>(null);
  const skuPhotoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    setLoading(true);
    const { data } = await supabase.from("manual_products").select("*").order("sort_order").order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  }

  async function selectProduct(prod: ManualProduct) {
    setSelectedProduct(prod);
    setEditingProduct({ ...prod });
    setSelectedRegion(null);
    setEditingSkuId(null);
    const [{ data: regs }, { data: sk }] = await Promise.all([
      supabase.from("manual_product_regions").select("*").eq("product_id", prod.id).order("sort_order"),
      supabase.from("manual_skus").select("*").eq("product_id", prod.id).order("sort_order"),
    ]);
    setRegions(regs || []);
    setSkus(sk || []);
    if (regs && regs.length > 0) setSelectedRegion(regs[0]);
  }

  async function saveProduct() {
    if (!selectedProduct) return;
    setSaving(true);
    const { error } = await supabase.from("manual_products").update({
      product_name: editingProduct.product_name,
      game_category: editingProduct.game_category,
      short_description: editingProduct.short_description,
      full_description: editingProduct.full_description,
      is_active: editingProduct.is_active,
      is_featured: editingProduct.is_featured,
      requires_server: editingProduct.requires_server,
      requires_player_id: editingProduct.requires_player_id,
      sort_order: editingProduct.sort_order,
      photo_url: editingProduct.photo_url,
      updated_at: new Date().toISOString(),
    }).eq("id", selectedProduct.id);
    if (error) { toast.error("Save failed: " + error.message); }
    else { toast.success("Product saved"); await loadProducts(); }
    setSaving(false);
  }

  async function uploadProductPhoto(file: File) {
    const ext = file.name.split(".").pop();
    const path = `products/${selectedProduct!.id}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("store-assets").getPublicUrl(path);
    setEditingProduct(prev => ({ ...prev, photo_url: publicUrl }));
    toast.success("Photo uploaded");
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product and all its SKUs?")) return;
    await supabase.from("manual_products").delete().eq("id", id);
    if (selectedProduct?.id === id) { setSelectedProduct(null); setRegions([]); setSkus([]); }
    await loadProducts();
    toast.success("Product deleted");
  }

  async function addRegion() {
    if (!selectedProduct || !newRegionName.trim()) return;
    const { data, error } = await supabase.from("manual_product_regions").insert({
      product_id: selectedProduct.id,
      region_name: newRegionName.trim(),
      region_key: newRegionName.trim().toLowerCase().replace(/\s+/g, "_"),
      sort_order: regions.length,
    }).select().single();
    if (error) { toast.error("Failed to add region"); return; }
    const updated = [...regions, data];
    setRegions(updated);
    setSelectedRegion(data);
    setNewRegionName("");
  }

  async function deleteRegion(id: string) {
    await supabase.from("manual_product_regions").delete().eq("id", id);
    const updated = regions.filter(r => r.id !== id);
    setRegions(updated);
    if (selectedRegion?.id === id) setSelectedRegion(updated[0] || null);
    // Delete SKUs for this region
    setSkus(prev => prev.filter(s => s.region_id !== id));
  }

  async function addSku() {
    if (!selectedProduct || !newSku.sku_name.trim() || !newSku.original_price) return;
    const { data, error } = await supabase.from("manual_skus").insert({
      product_id: selectedProduct.id,
      region_id: selectedProduct.requires_server ? (selectedRegion?.id || null) : null,
      sku_name: newSku.sku_name.trim(),
      original_price: parseFloat(newSku.original_price),
      sale_price: newSku.sale_price ? parseFloat(newSku.sale_price) : null,
      photo_url: newSku.photo_url || null,
      sort_order: skus.length,
    }).select().single();
    if (error) { toast.error("Failed to add SKU"); return; }
    setSkus(prev => [...prev, data]);
    setNewSku({ sku_name: "", original_price: "", sale_price: "", photo_url: "" });
    toast.success("SKU added");
  }

  async function saveSkuEdit(skuId: string) {
    const { error } = await supabase.from("manual_skus").update({
      sku_name: editingSkuData.sku_name,
      original_price: editingSkuData.original_price,
      sale_price: editingSkuData.sale_price || null,
      photo_url: editingSkuData.photo_url || null,
    }).eq("id", skuId);
    if (error) { toast.error("Failed to save SKU"); return; }
    setSkus(prev => prev.map(s => s.id === skuId ? { ...s, ...editingSkuData } as ManualSku : s));
    setEditingSkuId(null);
    toast.success("SKU updated");
  }

  async function deleteSku(id: string) {
    await supabase.from("manual_skus").delete().eq("id", id);
    setSkus(prev => prev.filter(s => s.id !== id));
  }

  async function uploadSkuPhoto(skuId: string, file: File) {
    const ext = file.name.split(".").pop();
    const path = `skus/${skuId}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("store-assets").getPublicUrl(path);
    if (editingSkuId === skuId) {
      setEditingSkuData(prev => ({ ...prev, photo_url: publicUrl }));
    }
    await supabase.from("manual_skus").update({ photo_url: publicUrl }).eq("id", skuId);
    setSkus(prev => prev.map(s => s.id === skuId ? { ...s, photo_url: publicUrl } : s));
    toast.success("SKU photo uploaded");
  }

  const filteredProducts = useMemo(() =>
    products.filter(p => p.product_name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const filteredSkus = useMemo(() => {
    if (!editingProduct.requires_server) return skus;
    if (!selectedRegion) return skus;
    return skus.filter(s => s.region_id === selectedRegion.id);
  }, [skus, selectedRegion, editingProduct.requires_server]);

  return (
    <div className="flex h-full">
      {/* Left: product list */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
        <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white outline-none" />
            </div>
            <button onClick={() => navigate("/admin/add-product")}
              className="bg-yellow-400 hover:bg-yellow-300 text-black px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1">
              <Plus size={14} />
            </button>
          </div>
          <p className="text-xs text-gray-400">{filteredProducts.length} products</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No products found</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredProducts.map(prod => (
                <button key={prod.id} onClick={() => selectProduct(prod)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedProduct?.id === prod.id ? "bg-yellow-50 dark:bg-yellow-900/20 border-r-2 border-yellow-400" : ""}`}>
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                    {prod.photo_url
                      ? <img src={prod.photo_url} alt={prod.product_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={18} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{prod.product_name}</p>
                    <p className="text-xs text-gray-400">{prod.game_category} · {prod.is_active ? "Active" : "Hidden"}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteProduct(prod.id); }}
                    className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: product editor */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {!selectedProduct ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <Package size={48} className="opacity-30" />
            <p className="text-sm">Select a product to edit</p>
            <button onClick={() => navigate("/admin/add-product")}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-2 rounded-xl text-sm">
              <Plus size={14} /> Add New Product
            </button>
          </div>
        ) : (
          <div className="p-6 max-w-3xl">
            {/* Product info */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 dark:text-white">Product Info</h2>
                <button onClick={saveProduct} disabled={saving}
                  className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                  <Save size={14} /> {saving ? "Saving…" : "Save"}
                </button>
              </div>

              <div className="flex gap-4 mb-4">
                {/* Photo */}
                <div className="flex-shrink-0">
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-yellow-400 transition-colors flex items-center justify-center relative group"
                  >
                    {editingProduct.photo_url
                      ? <img key={editingProduct.photo_url} src={editingProduct.photo_url} alt="cover" className="w-full h-full object-cover" />
                      : <Image size={24} className="text-gray-300" />}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Upload size={18} className="text-white" />
                    </div>
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadProductPhoto(f); e.target.value = ""; }} />
                  <div className="mt-2">
                    <input value={editingProduct.photo_url || ""} onChange={e => setEditingProduct(p => ({ ...p, photo_url: e.target.value }))}
                      placeholder="Or paste URL"
                      className="w-24 text-[10px] border border-gray-200 dark:border-gray-600 px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white outline-none" />
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Name</label>
                    <input value={editingProduct.product_name || ""} onChange={e => setEditingProduct(p => ({ ...p, product_name: e.target.value }))}
                      className="w-full border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Category</label>
                    <select value={editingProduct.game_category || ""} onChange={e => setEditingProduct(p => ({ ...p, game_category: e.target.value }))}
                      className="w-full border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white outline-none mt-1">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Short Description</label>
                  <input value={editingProduct.short_description || ""} onChange={e => setEditingProduct(p => ({ ...p, short_description: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white outline-none mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sort Order</label>
                  <input type="number" value={editingProduct.sort_order ?? 0} onChange={e => setEditingProduct(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white outline-none mt-1" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Full Description</label>
                <textarea value={editingProduct.full_description || ""} onChange={e => setEditingProduct(p => ({ ...p, full_description: e.target.value }))} rows={3}
                  className="w-full border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white outline-none mt-1 resize-none" />
              </div>

              <div className="flex flex-wrap gap-4 mt-3">
                {[
                  { key: "is_active", label: "Active" },
                  { key: "is_featured", label: "Featured" },
                  { key: "requires_server", label: "Has Regions/Servers" },
                  { key: "requires_player_id", label: "Requires Player ID" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setEditingProduct(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                      className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${editingProduct[key as keyof ManualProduct] ? "bg-yellow-400" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${editingProduct[key as keyof ManualProduct] ? "translate-x-4" : ""}`} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Regions (only if requires_server) */}
            {editingProduct.requires_server && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Globe size={16} /> Regions / Servers</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {regions.map(r => (
                    <div key={r.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors cursor-pointer ${selectedRegion?.id === r.id ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 font-semibold" : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300"}`}
                      onClick={() => setSelectedRegion(r)}>
                      {r.region_name}
                      <button onClick={e => { e.stopPropagation(); deleteRegion(r.id); }} className="text-gray-300 hover:text-red-500 transition-colors ml-1"><X size={11} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newRegionName} onChange={e => setNewRegionName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addRegion(); }}
                    placeholder="New region name…"
                    className="flex-1 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 dark:text-white outline-none" />
                  <button onClick={addRegion} className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold"><Plus size={14} /></button>
                </div>
              </div>
            )}

            {/* SKUs */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Tag size={16} /> SKUs / Packages
                {editingProduct.requires_server && selectedRegion && (
                  <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">for {selectedRegion.region_name}</span>
                )}
              </h3>

              {/* SKU list */}
              <div className="space-y-2 mb-4">
                {filteredSkus.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No SKUs yet{editingProduct.requires_server && !selectedRegion ? " — select a region first" : ""}</p>
                ) : filteredSkus.map(sku => (
                  <div key={sku.id} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                    {editingSkuId === sku.id ? (
                      <div className="p-3 space-y-2 bg-yellow-50 dark:bg-yellow-900/10">
                        <div className="flex gap-2">
                          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer relative group"
                            onClick={() => skuPhotoInputRefs.current[sku.id]?.click()}>
                            {editingSkuData.photo_url
                              ? <img key={editingSkuData.photo_url} src={editingSkuData.photo_url} alt="sku" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-gray-300"><Image size={18} /></div>}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Upload size={14} className="text-white" />
                            </div>
                          </div>
                          <input ref={el => { skuPhotoInputRefs.current[sku.id] = el; }} type="file" accept="image/*" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadSkuPhoto(sku.id, f); e.target.value = ""; }} />
                          <div className="flex-1 space-y-1.5">
                            <input value={editingSkuData.sku_name || ""} onChange={e => setEditingSkuData(p => ({ ...p, sku_name: e.target.value }))}
                              placeholder="SKU Name"
                              className="w-full border border-gray-200 dark:border-gray-600 px-2 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white outline-none" />
                            <input value={editingSkuData.photo_url || ""} onChange={e => setEditingSkuData(p => ({ ...p, photo_url: e.target.value }))}
                              placeholder="Photo URL"
                              className="w-full border border-gray-200 dark:border-gray-600 px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white outline-none" />
                            <div className="flex gap-2">
                              <input type="number" value={editingSkuData.original_price || ""} onChange={e => setEditingSkuData(p => ({ ...p, original_price: parseFloat(e.target.value) || 0 }))}
                                placeholder="Price"
                                className="flex-1 border border-gray-200 dark:border-gray-600 px-2 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white outline-none" />
                              <input type="number" value={editingSkuData.sale_price ?? ""} onChange={e => setEditingSkuData(p => ({ ...p, sale_price: e.target.value ? parseFloat(e.target.value) : null }))}
                                placeholder="Sale Price"
                                className="flex-1 border border-gray-200 dark:border-gray-600 px-2 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white outline-none" />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveSkuEdit(sku.id)} className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-1.5 rounded-lg text-sm flex items-center justify-center gap-1"><Save size={13} /> Save</button>
                          <button onClick={() => setEditingSkuId(null)} className="px-4 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                          {sku.photo_url
                            ? <img src={sku.photo_url} alt={sku.sku_name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-300"><Image size={14} /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{sku.sku_name}</p>
                          <p className="text-xs text-gray-400">${Number(sku.original_price).toFixed(2)}{sku.sale_price ? ` · Sale: $${Number(sku.sale_price).toFixed(2)}` : ""}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingSkuId(sku.id); setEditingSkuData({ ...sku }); }}
                            className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Edit3 size={13} /></button>
                          <button onClick={() => deleteSku(sku.id)}
                            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new SKU */}
              <div className="border border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-400 mb-2">Add New Package</p>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      {newSku.photo_url
                        ? <img key={newSku.photo_url} src={newSku.photo_url} alt="new" className="w-full h-full object-cover" />
                        : <Image size={18} className="text-gray-300" />}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <input value={newSku.sku_name} onChange={e => setNewSku(p => ({ ...p, sku_name: e.target.value }))}
                        placeholder="Package name (e.g. 100 Diamonds)"
                        className="w-full border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 dark:text-white outline-none" />
                      <input value={newSku.photo_url} onChange={e => setNewSku(p => ({ ...p, photo_url: e.target.value }))}
                        placeholder="Photo URL (optional)"
                        className="w-full border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-lg text-xs bg-gray-50 dark:bg-gray-800 dark:text-white outline-none" />
                      <div className="flex gap-2">
                        <input type="number" value={newSku.original_price} onChange={e => setNewSku(p => ({ ...p, original_price: e.target.value }))}
                          placeholder="Price ($)"
                          className="flex-1 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 dark:text-white outline-none" />
                        <input type="number" value={newSku.sale_price} onChange={e => setNewSku(p => ({ ...p, sale_price: e.target.value }))}
                          placeholder="Sale ($)"
                          className="flex-1 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 dark:text-white outline-none" />
                      </div>
                    </div>
                  </div>
                  <button onClick={addSku} disabled={!newSku.sku_name.trim() || !newSku.original_price}
                    className="w-full bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 disabled:opacity-40 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-1">
                    <Plus size={14} /> Add Package
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Lootbar Games Tab ────────────────────────────────────────────────────────
function LootbarTab() {
  const [lootbarGames, setLootbarGames] = useState<(LootbarGame & { _overrideImage?: string })[]>([]);
  const [selectedGame, setSelectedGame] = useState<LootbarGame | null>(null);
  const [override, setOverride] = useState<Partial<GameOverride>>({});
  const [skuCache, setSkuCache] = useState<SkuCacheItem[]>([]);
  const [editingSkus, setEditingSkus] = useState<Record<string, Partial<SkuCacheItem>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [previewUrl, setPreviewUrl] = useState("");
  const overridePhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadGames(); }, []);

  async function loadGames() {
    setLoading(true);
    const { data: games } = await supabase.from("games_cache").select("game_id,game_name,game_image,category,min_price,is_hot,discount").order("sort_order").order("game_name");
    const { data: overrides } = await supabase.from("game_overrides").select("game_id,custom_image_url");
    const overrideMap: Record<string, string | null> = {};
    (overrides || []).forEach((o: { game_id: string; custom_image_url: string | null }) => { overrideMap[o.game_id] = o.custom_image_url; });
    const merged = (games || []).map(g => ({
      ...g,
      _overrideImage: overrideMap[g.game_id] || undefined,
    }));
    setLootbarGames(merged);
    setLoading(false);
  }

  async function selectGame(g: LootbarGame & { _overrideImage?: string }) {
    setSelectedGame(g);
    setEditingSkus({});
    const { data: ov } = await supabase.from("game_overrides").select("*").eq("game_id", g.game_id).single();
    const ovData = ov || {};
    setOverride(ovData);
    const imgPreview = ovData.custom_image_url || g.game_image || "";
    setPreviewUrl(imgPreview);
    const { data: skList } = await supabase.from("sku_cache").select("game_id,sku_id,sku_name,price,image").eq("game_id", g.game_id).order("price");
    setSkuCache(skList || []);
  }

  async function syncGames() {
    setSyncing(true);
    const { error } = await supabase.functions.invoke("lootbar-proxy", { body: { action: "get_games", params: { page_num: 1, page_size: 200 } } });
    if (error) toast.error("Sync failed");
    else { toast.success("Games synced"); await loadGames(); }
    setSyncing(false);
  }

  async function saveOverride() {
    if (!selectedGame) return;
    setSaving(true);
    const upsertData = {
      game_id: selectedGame.game_id,
      custom_price: override.custom_price || null,
      category_override: override.category_override || null,
      is_featured: override.is_featured ?? false,
      is_hidden: override.is_hidden ?? false,
      sort_order: override.sort_order ?? 0,
      custom_image_url: previewUrl || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("game_overrides").upsert(upsertData);
    if (error) { toast.error("Failed to save override"); setSaving(false); return; }
    // Sync to games_cache
    const cacheUpdate: Record<string, unknown> = {};
    if (previewUrl) cacheUpdate.game_image = previewUrl;
    if (override.category_override) cacheUpdate.category = override.category_override;
    if (Object.keys(cacheUpdate).length > 0) {
      await supabase.from("games_cache").update(cacheUpdate).eq("game_id", selectedGame.game_id);
    }
    toast.success("Override saved");
    await loadGames();
    setSaving(false);
  }

  async function uploadOverridePhoto(file: File) {
    const ext = file.name.split(".").pop();
    const path = `overrides/${selectedGame!.game_id}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("store-assets").getPublicUrl(path);
    setPreviewUrl(publicUrl);
    toast.success("Photo uploaded — click Save Override to apply");
  }

  async function saveSkuEdits() {
    const updates = Object.entries(editingSkus);
    for (const [skuId, data] of updates) {
      await supabase.from("sku_cache").update({ sku_name: data.sku_name, price: data.price, image: data.image }).eq("sku_id", skuId).eq("game_id", selectedGame!.game_id);
    }
    setSkuCache(prev => prev.map(s => editingSkus[s.sku_id] ? { ...s, ...editingSkus[s.sku_id] } as SkuCacheItem : s));
    setEditingSkus({});
    toast.success("SKU cache updated");
  }

  const filtered = useMemo(() =>
    lootbarGames.filter(g => g.game_name.toLowerCase().includes(search.toLowerCase())),
    [lootbarGames, search]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / LOOTBAR_PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * LOOTBAR_PAGE_SIZE, page * LOOTBAR_PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="flex h-full">
      {/* Left: game list */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
        <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search games…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white outline-none" />
            </div>
            <button onClick={syncGames} disabled={syncing}
              className="bg-gray-900 dark:bg-gray-700 text-white px-3 py-2 rounded-lg disabled:opacity-50"
              title="Sync from Lootbar">
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{filtered.length} games</span>
            <span>Page {page}/{totalPages}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginated.map(g => (
                <button key={g.game_id} onClick={() => selectGame(g)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedGame?.game_id === g.game_id ? "bg-yellow-50 dark:bg-yellow-900/20 border-r-2 border-yellow-400" : ""}`}>
                  <div className="w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                    {(g._overrideImage || g.game_image)
                      ? <img key={g._overrideImage || g.game_image} src={g._overrideImage || g.game_image!} alt={g.game_name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={16} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{g.game_name}</p>
                    <p className="text-[10px] text-gray-400">{g.category || "Top Up"}{g.min_price ? ` · $${g.min_price}` : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-700 p-3 flex items-center justify-between">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-gray-500">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Right: game editor */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {!selectedGame ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <Package size={48} className="opacity-30" />
            <p className="text-sm">Select a game to configure overrides</p>
            <button onClick={syncGames} disabled={syncing}
              className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 text-white font-bold px-4 py-2 rounded-xl text-sm">
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync Games"}
            </button>
          </div>
        ) : (
          <div className="p-6 max-w-2xl">
            {/* Override panel */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 dark:text-white">{selectedGame.game_name}</h2>
                <button onClick={saveOverride} disabled={saving}
                  className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                  <Save size={14} /> {saving ? "Saving…" : "Save Override"}
                </button>
              </div>

              <div className="flex gap-5 mb-4">
                {/* Photo */}
                <div className="flex-shrink-0">
                  <div
                    onClick={() => overridePhotoRef.current?.click()}
                    className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-yellow-400 transition-colors relative group"
                  >
                    {previewUrl
                      ? <img key={previewUrl} src={previewUrl} alt={selectedGame.game_name} className="w-full h-full object-cover" onError={() => setPreviewUrl("")} />
                      : <div className="w-full h-full flex items-center justify-center text-gray-300"><Image size={24} /></div>}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                      <Upload size={18} className="text-white" />
                    </div>
                  </div>
                  <input ref={overridePhotoRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadOverridePhoto(f); e.target.value = ""; }} />
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Custom Image URL</label>
                    <input value={previewUrl} onChange={e => setPreviewUrl(e.target.value)}
                      placeholder="https://… or upload above"
                      className="w-full border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white outline-none mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Category Override</label>
                      <select value={override.category_override || ""} onChange={e => setOverride(p => ({ ...p, category_override: e.target.value || null }))}
                        className="w-full border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white outline-none mt-1">
                        <option value="">— No override —</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Custom Price ($)</label>
                      <input type="number" value={override.custom_price ?? ""} onChange={e => setOverride(p => ({ ...p, custom_price: e.target.value ? parseFloat(e.target.value) : null }))}
                        placeholder="Leave blank for API price"
                        className="w-full border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white outline-none mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sort Order</label>
                      <input type="number" value={override.sort_order ?? 0} onChange={e => setOverride(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white outline-none mt-1" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                {[
                  { key: "is_featured", label: "Featured" },
                  { key: "is_hidden", label: "Hidden" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setOverride(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                      className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${override[key as keyof GameOverride] ? "bg-yellow-400" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${override[key as keyof GameOverride] ? "translate-x-4" : ""}`} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* SKU Cache */}
            {skuCache.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Tag size={16} /> SKU Cache ({skuCache.length})</h3>
                  {Object.keys(editingSkus).length > 0 && (
                    <button onClick={saveSkuEdits} className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-3 py-1.5 rounded-lg text-sm">
                      <Save size={13} /> Save SKU Changes
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {skuCache.map(sku => {
                    const editing = editingSkus[sku.sku_id];
                    const displaySku = editing ? { ...sku, ...editing } : sku;
                    return (
                      <div key={sku.sku_id} className="flex items-center gap-3 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2">
                        <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                          {displaySku.image
                            ? <img key={displaySku.image} src={displaySku.image} alt={displaySku.sku_name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            : <div className="w-full h-full flex items-center justify-center text-gray-300"><Image size={14} /></div>}
                        </div>
                        <div className="flex-1 min-w-0 grid grid-cols-3 gap-2">
                          <input value={displaySku.sku_name} onChange={e => setEditingSkus(p => ({ ...p, [sku.sku_id]: { ...p[sku.sku_id], sku_name: e.target.value } }))}
                            className="col-span-1 border border-gray-200 dark:border-gray-600 px-2 py-1 rounded text-xs bg-gray-50 dark:bg-gray-800 dark:text-white outline-none" />
                          <input value={displaySku.price ?? ""} onChange={e => setEditingSkus(p => ({ ...p, [sku.sku_id]: { ...p[sku.sku_id], price: parseFloat(e.target.value) || null } }))}
                            type="number" placeholder="Price"
                            className="col-span-1 border border-gray-200 dark:border-gray-600 px-2 py-1 rounded text-xs bg-gray-50 dark:bg-gray-800 dark:text-white outline-none" />
                          <input value={displaySku.image || ""} onChange={e => setEditingSkus(p => ({ ...p, [sku.sku_id]: { ...p[sku.sku_id], image: e.target.value } }))}
                            placeholder="Image URL"
                            className="col-span-1 border border-gray-200 dark:border-gray-600 px-2 py-1 rounded text-xs bg-gray-50 dark:bg-gray-800 dark:text-white outline-none" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
