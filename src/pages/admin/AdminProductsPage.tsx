import { useEffect, useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Plus, Trash2, RefreshCw, Upload, Search, Edit2,
  X, Check, Star, EyeOff, Save, ChevronLeft, ChevronRight
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
  is_active: boolean;
  sort_order: number;
}

interface LootbarGame {
  game_id: string;
  game_name: string;
  game_image: string | null;
  category: string | null;
  is_featured: boolean | null;
  is_hidden: boolean | null;
  sort_order: number;
}

interface SkuCacheRow {
  sku_id: string;
  sku_name: string;
  price: number;
  original_price: number;
  image: string | null;
}

const CATEGORIES = ["Top Up", "Gift Card", "Game Pass", "CD Key", "Voucher", "Subscription", "Other"];
const LOOTBAR_PAGE_SIZE = 50;

const EMPTY_PRODUCT = {
  product_name: "", game_category: "Top Up", photo_url: "", is_active: true, is_featured: false,
  sort_order: 0, requires_server: false, requires_player_id: true, short_description: "", full_description: "", lootbar_game_id: "",
};

const EMPTY_SKU = { sku_name: "", original_price: "", sale_price: "", photo_url: "" };

export function AdminProductsPage() {
  const [tab, setTab] = useState<"manual" | "lootbar">("manual");

  // ── Manual state ───────────────────────────────────────────────────────────
  const [products, setProducts] = useState<ManualProduct[]>([]);
  const [regions, setRegions] = useState<ManualRegion[]>([]);
  const [skus, setSkus] = useState<ManualSku[]>([]);
  const [loadingManual, setLoadingManual] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ManualProduct | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<ManualRegion | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ManualProduct | null>(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [uploadingProduct, setUploadingProduct] = useState(false);
  const [regionForm, setRegionForm] = useState({ region_name: "", region_key: "" });
  const [showRegionForm, setShowRegionForm] = useState(false);

  // SKU add form
  const [showSkuForm, setShowSkuForm] = useState(false);
  const [skuForm, setSkuForm] = useState(EMPTY_SKU);
  const [uploadingSku, setUploadingSku] = useState(false);

  // SKU inline edit
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [editingSkuForm, setEditingSkuForm] = useState(EMPTY_SKU);
  const [uploadingEditSku, setUploadingEditSku] = useState(false);

  const productFileRef = useRef<HTMLInputElement>(null);
  const skuAddFileRef = useRef<HTMLInputElement>(null);
  const skuEditFileRef = useRef<HTMLInputElement>(null);

  // ── Lootbar state ──────────────────────────────────────────────────────────
  const [lootbarGames, setLootbarGames] = useState<LootbarGame[]>([]);
  const [lootbarSearch, setLootbarSearch] = useState("");
  const [lootbarPage, setLootbarPage] = useState(1);
  const [loadingLootbar, setLoadingLootbar] = useState(false);
  const [selectedLootbarGame, setSelectedLootbarGame] = useState<LootbarGame | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    custom_image_url: "", category_override: "", sort_order: "0", is_featured: false, is_hidden: false,
  });
  const [savingOverride, setSavingOverride] = useState(false);
  const [syncingCache, setSyncingCache] = useState(false);
  const [uploadingLootbarImg, setUploadingLootbarImg] = useState(false);
  const lootbarImgRef = useRef<HTMLInputElement>(null);

  // ── Lootbar SKU cache state ────────────────────────────────────────────────
  const [lootbarSkus, setLootbarSkus] = useState<SkuCacheRow[]>([]);
  const [editingSkuCacheId, setEditingSkuCacheId] = useState<string | null>(null);
  const [skuCacheEditForm, setSkuCacheEditForm] = useState({ sku_name: "", price: "", image: "" });
  const [uploadingSkuCacheImg, setUploadingSkuCacheImg] = useState(false);
  const [savingSkuCache, setSavingSkuCache] = useState(false);
  const skuCacheImgRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadManualProducts(); }, []);
  useEffect(() => { if (tab === "lootbar" && lootbarGames.length === 0) loadLootbarGames(); }, [tab]);

  // ── Manual Products ────────────────────────────────────────────────────────
  async function loadManualProducts() {
    setLoadingManual(true);
    const [{ data: prods }, { data: regs }, { data: sk }] = await Promise.all([
      supabase.from("manual_products").select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("manual_product_regions").select("*").order("sort_order"),
      supabase.from("manual_skus").select("*").order("sort_order"),
    ]);
    setProducts(prods || []);
    setRegions(regs || []);
    setSkus(sk || []);
    setLoadingManual(false);
  }

  async function uploadImage(file: File, folder: string): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("store-assets").upload(path, file);
    if (error) { toast.error("Upload failed: " + error.message); return null; }
    const { data: url } = supabase.storage.from("store-assets").getPublicUrl(path);
    return url.publicUrl;
  }

  async function uploadProductImage(file: File) {
    setUploadingProduct(true);
    const url = await uploadImage(file, "products");
    if (url) setProductForm(f => ({ ...f, photo_url: url }));
    setUploadingProduct(false);
  }

  async function uploadSkuAddImage(file: File) {
    setUploadingSku(true);
    const url = await uploadImage(file, "skus");
    if (url) setSkuForm(f => ({ ...f, photo_url: url }));
    setUploadingSku(false);
  }

  async function uploadSkuEditImage(file: File) {
    setUploadingEditSku(true);
    const url = await uploadImage(file, "skus");
    if (url) setEditingSkuForm(f => ({ ...f, photo_url: url }));
    setUploadingEditSku(false);
  }

  async function uploadLootbarImage(file: File) {
    setUploadingLootbarImg(true);
    const url = await uploadImage(file, "games");
    if (url) setOverrideForm(f => ({ ...f, custom_image_url: url }));
    setUploadingLootbarImg(false);
  }

  async function uploadSkuCacheImage(file: File) {
    setUploadingSkuCacheImg(true);
    const url = await uploadImage(file, "skus");
    if (url) setSkuCacheEditForm(f => ({ ...f, image: url }));
    setUploadingSkuCacheImg(false);
  }

  async function saveProduct() {
    if (!productForm.product_name.trim()) { toast.error("Product name required"); return; }
    const payload = {
      product_name: productForm.product_name,
      game_category: productForm.game_category,
      photo_url: productForm.photo_url || null,
      is_active: productForm.is_active,
      is_featured: productForm.is_featured,
      sort_order: Number(productForm.sort_order) || 0,
      requires_server: productForm.requires_server,
      requires_player_id: productForm.requires_player_id,
      short_description: productForm.short_description,
      full_description: productForm.full_description,
      lootbar_game_id: productForm.lootbar_game_id || null,
      updated_at: new Date().toISOString(),
    };
    if (editingProduct) {
      const { error } = await supabase.from("manual_products").update(payload).eq("id", editingProduct.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Product updated!");
      setSelectedProduct(prev => prev?.id === editingProduct.id ? { ...prev, ...payload } as ManualProduct : prev);
    } else {
      const { error } = await supabase.from("manual_products").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Product created!");
    }
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm(EMPTY_PRODUCT);
    loadManualProducts();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product and all its SKUs?")) return;
    await supabase.from("manual_products").delete().eq("id", id);
    toast.success("Deleted");
    if (selectedProduct?.id === id) setSelectedProduct(null);
    loadManualProducts();
  }

  async function addRegion() {
    if (!selectedProduct || !regionForm.region_name.trim()) return;
    const { error } = await supabase.from("manual_product_regions").insert({
      product_id: selectedProduct.id,
      region_name: regionForm.region_name,
      region_key: regionForm.region_key || regionForm.region_name.toLowerCase().replace(/\s+/g, "_"),
      sort_order: regions.filter(r => r.product_id === selectedProduct.id).length,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Region added!");
    setRegionForm({ region_name: "", region_key: "" });
    setShowRegionForm(false);
    loadManualProducts();
  }

  async function deleteRegion(id: string) {
    if (!confirm("Delete this region and all its products?")) return;
    await supabase.from("manual_skus").delete().eq("region_id", id);
    await supabase.from("manual_product_regions").delete().eq("id", id);
    if (selectedRegion?.id === id) setSelectedRegion(null);
    loadManualProducts();
  }

  async function addSku() {
    if (!selectedProduct || !skuForm.sku_name.trim() || !skuForm.original_price) {
      toast.error("SKU name and price required"); return;
    }
    if (selectedProduct.requires_server && !selectedRegion) {
      toast.error("Select a region first"); return;
    }
    const { error } = await supabase.from("manual_skus").insert({
      product_id: selectedProduct.id,
      region_id: selectedProduct.requires_server ? selectedRegion?.id || null : null,
      sku_name: skuForm.sku_name,
      original_price: parseFloat(skuForm.original_price),
      sale_price: skuForm.sale_price ? parseFloat(skuForm.sale_price) : null,
      photo_url: skuForm.photo_url || null,
      sort_order: skus.filter(s => s.product_id === selectedProduct.id).length,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Product added!");
    setSkuForm(EMPTY_SKU);
    setShowSkuForm(false);
    loadManualProducts();
  }

  async function saveSkuEdit(skuId: string) {
    if (!editingSkuForm.sku_name.trim() || !editingSkuForm.original_price) {
      toast.error("Name and price required"); return;
    }
    const { error } = await supabase.from("manual_skus").update({
      sku_name: editingSkuForm.sku_name,
      original_price: parseFloat(editingSkuForm.original_price),
      sale_price: editingSkuForm.sale_price ? parseFloat(editingSkuForm.sale_price) : null,
      photo_url: editingSkuForm.photo_url || null,
    }).eq("id", skuId);
    if (error) { toast.error(error.message); return; }
    toast.success("Product saved!");
    setEditingSkuId(null);
    loadManualProducts();
  }

  async function deleteSku(id: string) {
    if (!confirm("Delete this product?")) return;
    await supabase.from("manual_skus").delete().eq("id", id);
    loadManualProducts();
  }

  function startEditSku(sku: ManualSku) {
    setEditingSkuId(sku.id);
    setEditingSkuForm({
      sku_name: sku.sku_name,
      original_price: String(sku.original_price),
      sale_price: sku.sale_price ? String(sku.sale_price) : "",
      photo_url: sku.photo_url || "",
    });
  }

  // ── Lootbar ────────────────────────────────────────────────────────────────
  async function loadLootbarGames() {
    setLoadingLootbar(true);
    const [{ data: games }, { data: overrides }] = await Promise.all([
      supabase.from("games_cache").select("game_id, game_name, game_image, category, sort_order").order("sort_order").order("game_name").limit(500),
      supabase.from("game_overrides").select("*"),
    ]);
    const overrideMap = new Map((overrides || []).map(o => [o.game_id, o]));
    setLootbarGames((games || []).map(g => {
      const ov = overrideMap.get(g.game_id);
      return {
        ...g,
        // Each game gets its own unique photo — prefer custom override image
        game_image: ov?.custom_image_url || g.game_image || null,
        is_featured: ov?.is_featured ?? false,
        is_hidden: ov?.is_hidden ?? false,
        sort_order: ov?.sort_order ?? g.sort_order ?? 0,
      };
    }));
    setLoadingLootbar(false);
  }

  async function selectLootbarGame(game: LootbarGame) {
    setSelectedLootbarGame(game);
    setEditingSkuCacheId(null);
    setLootbarSkus([]);
    const [{ data: ov }, { data: skuData }] = await Promise.all([
      supabase.from("game_overrides").select("*").eq("game_id", game.game_id).single(),
      supabase.from("sku_cache").select("sku_id, sku_name, price, original_price, image").eq("game_id", game.game_id).order("price"),
    ]);
    // Always reset override form to this specific game's data — prevents photo bleed between games
    if (ov) {
      setOverrideForm({
        custom_image_url: ov.custom_image_url || "",
        category_override: ov.category_override || "",
        sort_order: String(ov.sort_order || 0),
        is_featured: ov.is_featured || false,
        is_hidden: ov.is_hidden || false,
      });
    } else {
      setOverrideForm({
        custom_image_url: "",
        category_override: game.category || "",
        sort_order: "0",
        is_featured: false,
        is_hidden: false,
      });
    }
    setLootbarSkus((skuData || []) as SkuCacheRow[]);
  }

  async function saveSkuCacheEdit(skuId: string) {
    if (!skuCacheEditForm.sku_name.trim() || !skuCacheEditForm.price) {
      toast.error("Name and price required"); return;
    }
    setSavingSkuCache(true);
    const { error } = await supabase.from("sku_cache").update({
      sku_name: skuCacheEditForm.sku_name,
      price: parseFloat(skuCacheEditForm.price),
      image: skuCacheEditForm.image || null,
    }).eq("sku_id", skuId);
    if (error) { toast.error(error.message); setSavingSkuCache(false); return; }
    toast.success("SKU saved!");
    setEditingSkuCacheId(null);
    setSavingSkuCache(false);
    setLootbarSkus(prev => prev.map(s => s.sku_id === skuId
      ? { ...s, sku_name: skuCacheEditForm.sku_name, price: parseFloat(skuCacheEditForm.price), image: skuCacheEditForm.image || null }
      : s));
  }

  async function saveOverride() {
    if (!selectedLootbarGame) return;
    setSavingOverride(true);
    const payload = {
      game_id: selectedLootbarGame.game_id,
      custom_image_url: overrideForm.custom_image_url || null,
      category_override: overrideForm.category_override || null,
      sort_order: parseInt(overrideForm.sort_order) || 0,
      is_featured: overrideForm.is_featured,
      is_hidden: overrideForm.is_hidden,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("game_overrides").upsert(payload);
    const cacheUpdate: Record<string, unknown> = {};
    if (overrideForm.custom_image_url) cacheUpdate.game_image = overrideForm.custom_image_url;
    if (overrideForm.category_override) cacheUpdate.category = overrideForm.category_override;
    if (Object.keys(cacheUpdate).length > 0) {
      await supabase.from("games_cache").update(cacheUpdate).eq("game_id", selectedLootbarGame.game_id);
    }
    toast.success("Override saved!");
    setSavingOverride(false);
    loadLootbarGames();
  }

  async function syncCache() {
    setSyncingCache(true);
    const { error } = await supabase.functions.invoke("games-cache-refresh", { body: {} });
    if (error) { toast.error("Sync failed"); } else { toast.success("Cache synced!"); loadLootbarGames(); }
    setSyncingCache(false);
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => !productSearch || p.product_name.toLowerCase().includes(productSearch.toLowerCase()));
  const filteredLootbar = lootbarGames.filter(g => !lootbarSearch || g.game_name.toLowerCase().includes(lootbarSearch.toLowerCase()));
  const lootbarTotalPages = Math.max(1, Math.ceil(filteredLootbar.length / LOOTBAR_PAGE_SIZE));
  const paginatedLootbar = filteredLootbar.slice((lootbarPage - 1) * LOOTBAR_PAGE_SIZE, lootbarPage * LOOTBAR_PAGE_SIZE);

  const productRegions = selectedProduct ? regions.filter(r => r.product_id === selectedProduct.id) : [];
  const relevantSkus = selectedProduct
    ? skus.filter(s => s.product_id === selectedProduct.id &&
        (!selectedProduct.requires_server || !selectedRegion || s.region_id === selectedRegion.id))
    : [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-4 flex flex-col" style={{ height: "100vh" }}>
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit flex-shrink-0">
          {(["manual", "lootbar"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
              {t === "manual" ? "Manual Products" : "Lootbar Games"}
            </button>
          ))}
        </div>

        {/* ── MANUAL TAB ──────────────────────────────────────────────────────── */}
        {tab === "manual" && (
          <div className="grid grid-cols-12 gap-4 flex-1 overflow-hidden">

            {/* Panel 1: Games list — scrollable */}
            <div className="col-span-3 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 flex-shrink-0">
                <h3 className="text-sm font-bold text-gray-900">Games</h3>
                <button
                  onClick={() => { setShowProductForm(true); setEditingProduct(null); setProductForm(EMPTY_PRODUCT); }}
                  className="w-6 h-6 bg-yellow-400 rounded-md flex items-center justify-center hover:bg-yellow-300">
                  <Plus size={13} className="text-black" />
                </button>
              </div>
              <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search…"
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none" />
                </div>
              </div>
              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100" style={{ minHeight: 0 }}>
                {loadingManual ? (
                  <div className="p-4 text-center text-xs text-gray-400">Loading…</div>
                ) : filteredProducts.map(p => (
                  <button key={p.id}
                    onClick={() => { setSelectedProduct(p); setSelectedRegion(null); setShowSkuForm(false); setEditingSkuId(null); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${selectedProduct?.id === p.id ? "bg-yellow-50 border-l-2 border-yellow-400" : ""}`}>
                    {p.photo_url
                      ? <img src={p.photo_url} alt={p.product_name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      : <div className="w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{p.product_name}</p>
                      <p className="text-[10px] text-gray-400">{p.game_category}{p.requires_server ? " · Server" : ""}</p>
                    </div>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.is_active ? "bg-green-400" : "bg-gray-300"}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Panel 2: Product form + Region management */}
            <div className="col-span-3 flex flex-col gap-3 overflow-hidden">
              {/* Product form */}
              {showProductForm && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex-shrink-0 overflow-y-auto" style={{ maxHeight: "55%" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">{editingProduct ? "Edit Game" : "New Game"}</h3>
                    <button onClick={() => { setShowProductForm(false); setEditingProduct(null); }}><X size={15} className="text-gray-400" /></button>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Name *</label>
                      <input value={productForm.product_name} onChange={e => setProductForm(f => ({ ...f, product_name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Category</label>
                      <select value={productForm.game_category} onChange={e => setProductForm(f => ({ ...f, game_category: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Game Photo</label>
                      {productForm.photo_url ? (
                        <div className="relative">
                          <img src={productForm.photo_url} className="w-full h-20 object-cover rounded-lg" />
                          <button onClick={() => setProductForm(f => ({ ...f, photo_url: "" }))}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => productFileRef.current?.click()}
                          className="w-full h-14 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center gap-2 text-xs text-gray-400 hover:border-yellow-400 hover:text-yellow-600">
                          {uploadingProduct ? <RefreshCw size={14} className="animate-spin" /> : <><Upload size={14} /> Upload Photo</>}
                        </button>
                      )}
                      <input ref={productFileRef} type="file" accept="image/*" className="hidden"
                        onChange={e => e.target.files?.[0] && uploadProductImage(e.target.files[0])} />
                      <input value={productForm.photo_url} onChange={e => setProductForm(f => ({ ...f, photo_url: e.target.value }))}
                        placeholder="Or paste image URL…"
                        className="w-full border border-gray-100 rounded-lg px-2 py-1.5 text-xs outline-none mt-1" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Short Description</label>
                      <input value={productForm.short_description} onChange={e => setProductForm(f => ({ ...f, short_description: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={productForm.requires_server} onChange={e => setProductForm(f => ({ ...f, requires_server: e.target.checked }))} className="rounded" />
                        Server/Region
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={productForm.requires_player_id} onChange={e => setProductForm(f => ({ ...f, requires_player_id: e.target.checked }))} className="rounded" />
                        Player ID
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={productForm.is_featured} onChange={e => setProductForm(f => ({ ...f, is_featured: e.target.checked }))} className="rounded" />
                        Featured
                      </label>
                    </div>
                    <button onClick={saveProduct}
                      className="w-full bg-yellow-400 text-black font-bold py-2 rounded-lg text-sm hover:bg-yellow-300">
                      {editingProduct ? "Save Changes" : "Create Game"}
                    </button>
                  </div>
                </div>
              )}

              {/* Region / server management */}
              {selectedProduct && (
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden flex-1" style={{ minHeight: 0 }}>
                  <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 flex-shrink-0">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 truncate">{selectedProduct.product_name}</h3>
                      <p className="text-[10px] text-gray-400">
                        {selectedProduct.requires_server ? "Select a region to manage its products" : "No regions — products are global"}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingProduct(selectedProduct);
                          setProductForm({
                            product_name: selectedProduct.product_name,
                            game_category: selectedProduct.game_category,
                            photo_url: selectedProduct.photo_url || "",
                            is_active: selectedProduct.is_active,
                            is_featured: selectedProduct.is_featured,
                            sort_order: selectedProduct.sort_order,
                            requires_server: selectedProduct.requires_server,
                            requires_player_id: selectedProduct.requires_player_id,
                            short_description: selectedProduct.short_description || "",
                            full_description: selectedProduct.full_description || "",
                            lootbar_game_id: selectedProduct.lootbar_game_id || "",
                          });
                          setShowProductForm(true);
                        }}
                        className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center hover:bg-gray-200">
                        <Edit2 size={11} className="text-gray-600" />
                      </button>
                      <button onClick={() => deleteProduct(selectedProduct.id)}
                        className="w-6 h-6 bg-red-50 rounded-md flex items-center justify-center hover:bg-red-100">
                        <Trash2 size={11} className="text-red-500" />
                      </button>
                    </div>
                  </div>

                  {selectedProduct.requires_server ? (
                    <>
                      <div className="flex-1 overflow-y-auto divide-y divide-gray-100" style={{ minHeight: 0 }}>
                        {productRegions.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-6">No regions yet. Add one below.</p>
                        ) : productRegions.map(r => (
                          <button key={r.id}
                            onClick={() => setSelectedRegion(selectedRegion?.id === r.id ? null : r)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${selectedRegion?.id === r.id ? "bg-yellow-50 border-l-2 border-yellow-400" : ""}`}>
                            <div>
                              <p className="text-xs font-bold text-gray-900">{r.region_name}</p>
                              <p className="text-[10px] text-gray-400">{skus.filter(s => s.region_id === r.id).length} products</p>
                            </div>
                            <button onClick={e => { e.stopPropagation(); deleteRegion(r.id); }}
                              className="text-red-400 hover:text-red-600 p-1">
                              <Trash2 size={11} />
                            </button>
                          </button>
                        ))}
                      </div>
                      <div className="p-3 border-t border-gray-100 flex-shrink-0">
                        {showRegionForm ? (
                          <div className="space-y-2">
                            <input value={regionForm.region_name} onChange={e => setRegionForm(f => ({ ...f, region_name: e.target.value }))}
                              placeholder="Region name (e.g. USA, Asia)"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-yellow-400" />
                            <input value={regionForm.region_key} onChange={e => setRegionForm(f => ({ ...f, region_key: e.target.value }))}
                              placeholder="Key — optional (e.g. usa)"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-yellow-400" />
                            <div className="flex gap-1.5">
                              <button onClick={addRegion} className="flex-1 bg-yellow-400 text-black font-bold py-1.5 rounded-lg text-xs hover:bg-yellow-300">Add</button>
                              <button onClick={() => setShowRegionForm(false)} className="flex-1 border border-gray-200 text-gray-500 py-1.5 rounded-lg text-xs">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setShowRegionForm(true)}
                            className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-200 rounded-lg py-2 text-xs text-gray-400 hover:border-yellow-400 hover:text-yellow-600">
                            <Plus size={12} /> Add Region
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 flex-1 flex items-center justify-center">
                      <p className="text-xs text-gray-400 text-center">Products are shown on the right panel.<br />Enable "Server/Region" to add regions.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel 3: SKU list with inline edit — scrollable */}
            <div className="col-span-6 flex flex-col gap-3 overflow-hidden">
              {selectedProduct ? (
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden flex-1" style={{ minHeight: 0 }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        {selectedProduct.requires_server
                          ? selectedRegion ? `${selectedRegion.region_name} — Products` : "Select a region to manage products"
                          : "Products"}
                      </h3>
                      <p className="text-[10px] text-gray-400">{relevantSkus.length} product{relevantSkus.length !== 1 ? "s" : ""} — each can have its own photo, name, price</p>
                    </div>
                    {(!selectedProduct.requires_server || selectedRegion) && (
                      <button onClick={() => { setShowSkuForm(!showSkuForm); setSkuForm(EMPTY_SKU); }}
                        className="flex items-center gap-1.5 bg-yellow-400 text-black font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-yellow-300">
                        <Plus size={12} /> Add Product
                      </button>
                    )}
                  </div>

                  {/* Add SKU form */}
                  {showSkuForm && (!selectedProduct.requires_server || selectedRegion) && (
                    <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100 space-y-2 flex-shrink-0">
                      <p className="text-xs font-bold text-gray-700">New product {selectedRegion ? `for ${selectedRegion.region_name}` : ""}</p>
                      <input value={skuForm.sku_name} onChange={e => setSkuForm(f => ({ ...f, sku_name: e.target.value }))}
                        placeholder="Product name (e.g. 100 Diamonds) *"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={skuForm.original_price} onChange={e => setSkuForm(f => ({ ...f, original_price: e.target.value }))}
                          placeholder="Price ($) *"
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
                        <input type="number" value={skuForm.sale_price} onChange={e => setSkuForm(f => ({ ...f, sale_price: e.target.value }))}
                          placeholder="Sale price (opt)"
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        {skuForm.photo_url ? (
                          <div className="relative flex-shrink-0">
                            <img src={skuForm.photo_url} className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                            <button onClick={() => setSkuForm(f => ({ ...f, photo_url: "" }))}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => skuAddFileRef.current?.click()}
                            className="flex-shrink-0 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 hover:border-yellow-400">
                            {uploadingSku ? <RefreshCw size={12} className="animate-spin" /> : <><Upload size={12} /> Photo</>}
                          </button>
                        )}
                        <input value={skuForm.photo_url} onChange={e => setSkuForm(f => ({ ...f, photo_url: e.target.value }))}
                          placeholder="Or paste image URL"
                          className="flex-1 border border-gray-100 rounded-lg px-2 py-1.5 text-xs outline-none" />
                        <input ref={skuAddFileRef} type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files?.[0] && uploadSkuAddImage(e.target.files[0])} />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={addSku} className="bg-yellow-400 text-black font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-yellow-300">Add</button>
                        <button onClick={() => setShowSkuForm(false)} className="border border-gray-200 text-gray-500 px-4 py-1.5 rounded-lg text-sm">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* SKU list — scrollable */}
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-100" style={{ minHeight: 0 }}>
                    {selectedProduct.requires_server && !selectedRegion ? (
                      <div className="p-8 text-center text-xs text-gray-400">← Select a region to manage its products</div>
                    ) : relevantSkus.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400">No products yet. Click "Add Product" to create one.</div>
                    ) : relevantSkus.map(sku => (
                      <div key={sku.id}>
                        {editingSkuId === sku.id ? (
                          <div className="px-4 py-3 bg-blue-50 border-l-2 border-blue-400 space-y-2">
                            <p className="text-xs font-bold text-blue-700">Editing product</p>
                            <input value={editingSkuForm.sku_name} onChange={e => setEditingSkuForm(f => ({ ...f, sku_name: e.target.value }))}
                              placeholder="Product name *"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
                            <div className="grid grid-cols-2 gap-2">
                              <input type="number" value={editingSkuForm.original_price} onChange={e => setEditingSkuForm(f => ({ ...f, original_price: e.target.value }))}
                                placeholder="Price ($) *"
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
                              <input type="number" value={editingSkuForm.sale_price} onChange={e => setEditingSkuForm(f => ({ ...f, sale_price: e.target.value }))}
                                placeholder="Sale price (opt)"
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
                            </div>
                            <div className="flex items-center gap-2">
                              {editingSkuForm.photo_url ? (
                                <div className="relative flex-shrink-0">
                                  <img src={editingSkuForm.photo_url} className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                                  <button onClick={() => setEditingSkuForm(f => ({ ...f, photo_url: "" }))}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✕</button>
                                </div>
                              ) : (
                                <button onClick={() => skuEditFileRef.current?.click()}
                                  className="flex-shrink-0 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 hover:border-blue-400">
                                  {uploadingEditSku ? <RefreshCw size={12} className="animate-spin" /> : <><Upload size={12} /> Change Photo</>}
                                </button>
                              )}
                              <input value={editingSkuForm.photo_url} onChange={e => setEditingSkuForm(f => ({ ...f, photo_url: e.target.value }))}
                                placeholder="Or paste URL"
                                className="flex-1 border border-gray-100 rounded-lg px-2 py-1.5 text-xs outline-none" />
                              <input ref={skuEditFileRef} type="file" accept="image/*" className="hidden"
                                onChange={e => e.target.files?.[0] && uploadSkuEditImage(e.target.files[0])} />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => saveSkuEdit(sku.id)}
                                className="flex items-center gap-1.5 bg-blue-500 text-white font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-blue-600">
                                <Save size={13} /> Save
                              </button>
                              <button onClick={() => setEditingSkuId(null)}
                                className="border border-gray-200 text-gray-500 px-4 py-1.5 rounded-lg text-sm">Cancel</button>
                              <button onClick={() => deleteSku(sku.id)}
                                className="ml-auto border border-red-200 text-red-500 px-3 py-1.5 rounded-lg text-sm hover:bg-red-50">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 bg-gray-50">
                              {sku.photo_url
                                ? <img src={sku.photo_url} className="w-full h-full object-cover" />
                                : <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{sku.sku_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm font-black text-orange-500">${Number(sku.original_price).toFixed(2)}</span>
                                {sku.sale_price && (
                                  <span className="text-xs text-gray-400 line-through">${Number(sku.sale_price).toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditSku(sku)}
                                className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-blue-100 hover:text-blue-600">
                                <Edit2 size={12} className="text-gray-500" />
                              </button>
                              <button onClick={() => deleteSku(sku.id)}
                                className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center hover:bg-red-100">
                                <Trash2 size={12} className="text-red-500" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Search size={24} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm">Select a game from the left to manage its products</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LOOTBAR TAB ─────────────────────────────────────────────────────── */}
        {tab === "lootbar" && (
          <div className="grid grid-cols-12 gap-4 flex-1 overflow-hidden">

            {/* Left: Games list — scrollable with pagination */}
            <div className="col-span-4 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <h3 className="text-sm font-bold text-gray-900">Lootbar Games ({lootbarGames.length})</h3>
                <button onClick={syncCache} disabled={syncingCache}
                  className="flex items-center gap-1.5 bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-blue-100 disabled:opacity-50">
                  <RefreshCw size={12} className={syncingCache ? "animate-spin" : ""} />
                  {syncingCache ? "Syncing…" : "Sync Cache"}
                </button>
              </div>
              <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={lootbarSearch}
                    onChange={e => { setLootbarSearch(e.target.value); setLootbarPage(1); }}
                    placeholder="Search games…"
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              {/* Scrollable game list — paginated 50 per page */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100" style={{ minHeight: 0 }}>
                {loadingLootbar ? (
                  <div className="p-4 text-center text-xs text-gray-400">Loading…</div>
                ) : paginatedLootbar.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">No games found.</div>
                ) : paginatedLootbar.map(game => (
                  <button key={game.game_id} onClick={() => selectLootbarGame(game)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${selectedLootbarGame?.game_id === game.game_id ? "bg-yellow-50 border-l-2 border-yellow-400" : ""} ${game.is_hidden ? "opacity-40" : ""}`}>
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                      {game.game_image ? (
                        /* key forces React to create a new img element for each game — prevents same-photo glitch */
                        <img
                          key={`${game.game_id}-${game.game_image}`}
                          src={game.game_image}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-[9px] font-black">
                          {game.game_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{game.game_name}</p>
                      <p className="text-[10px] text-gray-400">{game.category || "Top Up"}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {game.is_featured && <Star size={10} fill="#FFD200" stroke="none" />}
                      {game.is_hidden && <EyeOff size={10} className="text-gray-300" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination controls */}
              {lootbarTotalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 flex-shrink-0 bg-gray-50">
                  <button
                    onClick={() => setLootbarPage(p => Math.max(1, p - 1))}
                    disabled={lootbarPage === 1}
                    className="flex items-center gap-0.5 px-2.5 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={12} /> Prev
                  </button>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-gray-700">{lootbarPage} / {lootbarTotalPages}</p>
                    <p className="text-[9px] text-gray-400">{filteredLootbar.length} games</p>
                  </div>
                  <button
                    onClick={() => setLootbarPage(p => Math.min(lootbarTotalPages, p + 1))}
                    disabled={lootbarPage === lootbarTotalPages}
                    className="flex items-center gap-0.5 px-2.5 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Override + SKU panel */}
            <div className="col-span-8 flex flex-col gap-3 overflow-hidden">
              {selectedLootbarGame ? (
                <>
                  {/* Game override card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 flex-shrink-0">
                    <div className="flex items-start gap-4 mb-3">
                      {/* Live preview — shows game-specific override image, not shared across games */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                        {overrideForm.custom_image_url ? (
                          <img
                            key={overrideForm.custom_image_url}
                            src={overrideForm.custom_image_url}
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : selectedLootbarGame.game_image ? (
                          <img
                            key={selectedLootbarGame.game_id}
                            src={selectedLootbarGame.game_image}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs font-bold">
                            {selectedLootbarGame.game_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{selectedLootbarGame.game_name}</h3>
                        <p className="text-xs text-gray-400">ID: {selectedLootbarGame.game_id}</p>
                        <p className="text-xs text-gray-400">{selectedLootbarGame.category}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Image URL — auto-previews when typed */}
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Game Image (preview updates live)</label>
                        <div className="flex gap-2">
                          <button onClick={() => lootbarImgRef.current?.click()}
                            className="flex-shrink-0 flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 hover:border-yellow-400 hover:text-yellow-600 font-semibold">
                            {uploadingLootbarImg ? <RefreshCw size={12} className="animate-spin" /> : <><Upload size={12} /> Upload</>}
                          </button>
                          <input
                            value={overrideForm.custom_image_url}
                            onChange={e => setOverrideForm(f => ({ ...f, custom_image_url: e.target.value }))}
                            placeholder="Paste image URL — preview updates instantly"
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-yellow-400"
                          />
                          {overrideForm.custom_image_url && (
                            <button onClick={() => setOverrideForm(f => ({ ...f, custom_image_url: "" }))}
                              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500">
                              <X size={13} />
                            </button>
                          )}
                          <input ref={lootbarImgRef} type="file" accept="image/*" className="hidden"
                            onChange={e => e.target.files?.[0] && uploadLootbarImage(e.target.files[0])} />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Category Override</label>
                        <select value={overrideForm.category_override} onChange={e => setOverrideForm(f => ({ ...f, category_override: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none bg-white">
                          <option value="">Default: {selectedLootbarGame.category}</option>
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Sort Order</label>
                        <input type="number" value={overrideForm.sort_order} onChange={e => setOverrideForm(f => ({ ...f, sort_order: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-yellow-400" />
                      </div>

                      <div className="col-span-2 flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={overrideForm.is_featured} onChange={e => setOverrideForm(f => ({ ...f, is_featured: e.target.checked }))} className="w-4 h-4 accent-yellow-400" />
                          <span className="text-xs font-semibold text-gray-700">Featured</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={overrideForm.is_hidden} onChange={e => setOverrideForm(f => ({ ...f, is_hidden: e.target.checked }))} className="w-4 h-4 accent-red-400" />
                          <span className="text-xs font-semibold text-gray-700">Hidden</span>
                        </label>
                        <button onClick={saveOverride} disabled={savingOverride}
                          className="ml-auto flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2 rounded-xl text-xs disabled:opacity-50">
                          <Check size={13} />
                          {savingOverride ? "Saving…" : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SKU cache list — scrollable */}
                  <div className="bg-white rounded-xl border border-gray-200 flex flex-col flex-1 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                      <h3 className="text-sm font-bold text-gray-900">SKU Packages ({lootbarSkus.length})</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">Hover a row and click edit to change photo, name, or price</p>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100" style={{ minHeight: 0 }}>
                      {lootbarSkus.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-400">No SKUs cached for this game yet. Sync cache to load them.</div>
                      ) : lootbarSkus.map(sku => (
                        <div key={sku.sku_id}>
                          {editingSkuCacheId === sku.sku_id ? (
                            <div className="px-4 py-3 bg-blue-50 border-l-2 border-blue-400 space-y-2">
                              <p className="text-xs font-bold text-blue-700">Editing SKU</p>
                              <input value={skuCacheEditForm.sku_name} onChange={e => setSkuCacheEditForm(f => ({ ...f, sku_name: e.target.value }))}
                                placeholder="SKU name *"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
                              <input type="number" step="0.01" value={skuCacheEditForm.price} onChange={e => setSkuCacheEditForm(f => ({ ...f, price: e.target.value }))}
                                placeholder="Price ($) *"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
                              <div className="flex items-center gap-2">
                                {skuCacheEditForm.image ? (
                                  <div className="relative flex-shrink-0">
                                    <img src={skuCacheEditForm.image} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                                    <button onClick={() => setSkuCacheEditForm(f => ({ ...f, image: "" }))}
                                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✕</button>
                                  </div>
                                ) : (
                                  <button onClick={() => skuCacheImgRef.current?.click()}
                                    className="flex-shrink-0 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 hover:border-blue-400">
                                    {uploadingSkuCacheImg ? <RefreshCw size={12} className="animate-spin" /> : <><Upload size={12} /> Photo</>}
                                  </button>
                                )}
                                <input value={skuCacheEditForm.image} onChange={e => setSkuCacheEditForm(f => ({ ...f, image: e.target.value }))}
                                  placeholder="Or paste image URL"
                                  className="flex-1 border border-gray-100 rounded-lg px-2 py-1.5 text-xs outline-none" />
                                <input ref={skuCacheImgRef} type="file" accept="image/*" className="hidden"
                                  onChange={e => e.target.files?.[0] && uploadSkuCacheImage(e.target.files[0])} />
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button onClick={() => saveSkuCacheEdit(sku.sku_id)} disabled={savingSkuCache}
                                  className="flex items-center gap-1.5 bg-blue-500 text-white font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">
                                  <Save size={13} /> {savingSkuCache ? "Saving…" : "Save"}
                                </button>
                                <button onClick={() => setEditingSkuCacheId(null)}
                                  className="border border-gray-200 text-gray-500 px-4 py-1.5 rounded-lg text-sm">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                                {sku.image
                                  ? <img src={sku.image} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                  : <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{sku.sku_name}</p>
                                <p className="text-xs font-black text-orange-500">${Number(sku.price).toFixed(2)}</p>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingSkuCacheId(sku.sku_id);
                                  setSkuCacheEditForm({ sku_name: sku.sku_name, price: String(sku.price), image: sku.image || "" });
                                }}
                                className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit2 size={12} className="text-gray-500" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Search size={32} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm">Select a game to edit its image and settings</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
