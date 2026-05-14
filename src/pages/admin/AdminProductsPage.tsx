/**
 * AdminProductsPage — Lootbar-style product management
 *
 * Layout (matches reference screenshot):
 *   Row 1: Games Management table (left) | Server Management panel (right, when game selected)
 *   Row 2: Products Management table (left) | Edit/Add Product form (right, when product selected/adding)
 *
 * Supports:
 *   - Lootbar API games (override image/category/featured/hidden)
 *   - Manual games (full CRUD, server/region/product management)
 *   - Add Game wizard: choose requirement type → setup servers → add products
 */
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, Edit2, Trash2, Upload, X, Save, RefreshCw, ToggleLeft,
  ToggleRight, Eye, EyeOff, Star, Camera, Image as ImageIcon,
  ChevronRight, Server, Package, Check, Search, Globe,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ManualGame {
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

interface LootbarGame {
  game_id: string;
  game_name: string;
  game_image: string | null;
  category: string;
  is_hot: boolean;
  requires_server: boolean;
  requires_player_id: boolean;
}

interface Region {
  id: string;
  product_id: string;
  region_name: string;
  region_key: string;
  sort_order: number;
  is_active: boolean;
}

interface Sku {
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

type RequirementType = "player_id" | "server" | "region" | "player_id+server" | "player_id+region" | "none";
type Tab = "manual" | "lootbar";

const CATEGORIES = ["Top Up", "Game Coins", "Gift Card", "Game Keys", "Game Items", "Best Seller", "Hot Selling"];
const PLACEHOLDER = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=64&h=64&fit=crop";

// ─── Image Upload ──────────────────────────────────────────────────────────────
async function uploadImg(file: File, prefix: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${prefix}_${Date.now()}.${ext}`;
  const buf = await file.arrayBuffer();
  const { error } = await supabase.storage.from("store-assets").upload(path, buf, { upsert: true, contentType: file.type });
  if (error) { toast.error(`Upload failed: ${error.message}`); return null; }
  return supabase.storage.from("store-assets").getPublicUrl(path).data.publicUrl;
}

// ─── Image Input Helper ────────────────────────────────────────────────────────
function ImgPicker({ preview, onChange, size = 14 }: { preview: string; onChange: (f: File, prev: string) => void; size?: number }) {
  return (
    <label className="cursor-pointer relative flex-shrink-0" style={{ width: size * 4, height: size * 4 }}>
      <div className="w-full h-full rounded-xl bg-gray-800 overflow-hidden border border-white/10 hover:border-yellow-400 transition-colors">
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={size} className="text-gray-600" />
          </div>
        )}
      </div>
      <div className="absolute bottom-0 right-0 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow">
        <Camera size={9} className="text-black" />
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0]; if (!f) return;
        const r = new FileReader(); r.onload = (ev) => onChange(f, ev.target?.result as string); r.readAsDataURL(f);
      }} />
    </label>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-yellow-400" : "bg-white/20"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </label>
  );
}

// ─── Add Game Wizard ───────────────────────────────────────────────────────────
function AddGameWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (game: ManualGame) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    product_name: "",
    game_category: "Top Up",
    short_description: "",
    full_description: "",
    requirement: "player_id" as RequirementType,
    requires_server: false,
    requires_player_id: true,
  });
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPrev, setImgPrev] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const requirementOptions: { value: RequirementType; label: string; desc: string }[] = [
    { value: "player_id", label: "Player ID Only", desc: "User enters Player ID to purchase. No server/region needed." },
    { value: "server", label: "Server Selection", desc: "User selects a server (e.g. Asia, Europe). Products vary per server." },
    { value: "region", label: "Region Selection", desc: "User selects a region (e.g. Malaysia, USA). Products vary per region." },
    { value: "player_id+server", label: "Player ID + Server", desc: "User enters Player ID and selects a server." },
    { value: "player_id+region", label: "Player ID + Region", desc: "User enters Player ID and selects a region." },
    { value: "none", label: "No Requirements", desc: "Direct purchase with no player info needed." },
  ];

  const handleCreate = async () => {
    if (!form.product_name.trim()) { toast.error("Game name is required"); return; }
    setIsSaving(true);
    let photoUrl: string | null = null;
    if (imgFile) photoUrl = await uploadImg(imgFile, `game_${Date.now()}`);

    const requiresServer = form.requirement.includes("server") || form.requirement === "region" || form.requirement.includes("region");
    const requiresPlayerId = form.requirement.includes("player_id");

    const { data, error } = await supabase.from("manual_products").insert({
      product_name: form.product_name.trim(),
      game_category: form.game_category,
      short_description: form.short_description,
      full_description: form.full_description,
      photo_url: photoUrl,
      requires_server: requiresServer,
      requires_player_id: requiresPlayerId,
      is_active: true,
      is_featured: false,
      sort_order: 0,
    }).select().single();

    if (error || !data) { toast.error("Failed to create game"); setIsSaving(false); return; }
    toast.success("Game created — now set up your servers and products");
    onCreated(data as ManualGame);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h3 className="font-bold text-white text-base">Add New Game</h3>
            <p className="text-xs text-gray-500 mt-0.5">Step {step} of 2</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-white" /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {step === 1 ? (
            <>
              {/* Image + name */}
              <div className="flex items-start gap-4">
                <ImgPicker preview={imgPrev} size={16}
                  onChange={(f, p) => { setImgFile(f); setImgPrev(p); }} />
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Game Name *</label>
                    <input type="text" value={form.product_name}
                      onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                      placeholder="e.g. Free Fire, Mobile Legends"
                      className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Category</label>
                    <select value={form.game_category} onChange={(e) => setForm({ ...form, game_category: e.target.value })}
                      className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Short Description</label>
                <textarea value={form.short_description}
                  onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                  rows={2} placeholder="Brief description visible on the product page…"
                  className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 resize-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Full Description (shown after "Show All")</label>
                <textarea value={form.full_description}
                  onChange={(e) => setForm({ ...form, full_description: e.target.value })}
                  rows={3} placeholder="Detailed game information, features, how to top-up…"
                  className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 resize-none" />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-400">What information does the user need to provide to purchase?</p>
              <div className="space-y-2">
                {requirementOptions.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm({ ...form, requirement: opt.value })}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      form.requirement === opt.value
                        ? "border-yellow-400 bg-yellow-400/10"
                        : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                    }`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold ${form.requirement === opt.value ? "text-yellow-400" : "text-white"}`}>{opt.label}</p>
                      {form.requirement === opt.value && <Check size={14} className="text-yellow-400 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-6 flex gap-3">
          {step === 2 && (
            <button onClick={() => setStep(1)}
              className="flex-1 py-2.5 border border-white/20 text-gray-300 rounded-xl text-sm font-semibold hover:bg-white/5">
              Back
            </button>
          )}
          {step === 1 ? (
            <button onClick={() => { if (!form.product_name.trim()) { toast.error("Game name is required"); return; } setStep(2); }}
              className="flex-1 py-2.5 bg-yellow-400 text-black rounded-xl text-sm font-bold hover:bg-yellow-300">
              Next: Requirements
            </button>
          ) : (
            <button onClick={handleCreate} disabled={isSaving}
              className="flex-1 py-2.5 bg-yellow-400 text-black rounded-xl text-sm font-bold hover:bg-yellow-300 disabled:opacity-50 flex items-center justify-center gap-2">
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Lootbar Tab ───────────────────────────────────────────────────────────────
function LootbarTab() {
  const [games, setGames] = useState<LootbarGame[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { is_hidden?: boolean; is_featured?: boolean; custom_image_url?: string; category_override?: string }>>({});
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPrev, setImgPrev] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setIsLoading(true);
    const { data: gc } = await supabase.from("games_cache").select("game_id,game_name,game_image,category,is_hot,requires_server,requires_player_id").order("game_name");
    if (gc) setGames(gc as LootbarGame[]);
    const { data: ovr } = await supabase.from("game_overrides").select("*");
    if (ovr) {
      const m: typeof overrides = {};
      ovr.forEach((r: Record<string, unknown>) => { m[r.game_id as string] = r as typeof overrides[string]; });
      setOverrides(m);
    }
    setIsLoading(false);
  };

  const startEdit = (g: LootbarGame) => {
    const o = overrides[g.game_id] || {};
    setEditId(g.game_id);
    setEditData({
      category_override: o.category_override || g.category || "Top Up",
      is_featured: o.is_featured ?? false,
      is_hidden: o.is_hidden ?? false,
      custom_image_url: o.custom_image_url || g.game_image || "",
    });
    setImgFile(null); setImgPrev("");
  };

  const save = async (gameId: string) => {
    setIsSaving(true);
    // Start with existing URL so we never overwrite with empty
    let imgUrl = (editData.custom_image_url as string) || overrides[gameId]?.custom_image_url || "";
    if (imgFile) {
      const url = await uploadImg(imgFile, `lb_${gameId}`);
      if (url) imgUrl = url;
    }
    const overridePayload = {
      game_id: gameId,
      category_override: editData.category_override,
      is_featured: editData.is_featured,
      is_hidden: editData.is_hidden,
      ...(imgUrl ? { custom_image_url: imgUrl } : {}),
      updated_at: new Date().toISOString(),
    };
    await supabase.from("game_overrides").upsert(overridePayload);
    // Sync changes to games_cache so home page / categories / game-detail all reflect instantly
    const cacheUpdate: Record<string, unknown> = {};
    if (imgUrl) cacheUpdate.game_image = imgUrl;
    if (editData.category_override) cacheUpdate.category = editData.category_override;
    if (typeof editData.is_featured === "boolean") cacheUpdate.is_hot = editData.is_featured;
    if (Object.keys(cacheUpdate).length) {
      await supabase.from("games_cache").update(cacheUpdate).eq("game_id", gameId);
    }
    setOverrides((p) => ({ ...p, [gameId]: { ...p[gameId], ...overridePayload } }));
    toast.success("Saved — changes are now live on the store");
    setEditId(null);
    setImgFile(null);
    setImgPrev("");
    setIsSaving(false);
  };

  const toggleHidden = async (gameId: string) => {
    const cur = overrides[gameId]?.is_hidden ?? false;
    await supabase.from("game_overrides").upsert({ game_id: gameId, is_hidden: !cur, updated_at: new Date().toISOString() });
    setOverrides((p) => ({ ...p, [gameId]: { ...p[gameId], is_hidden: !cur } }));
    toast.success(!cur ? "Hidden from store" : "Visible in store");
  };

  const filtered = games.filter((g) => !search || g.game_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Lootbar games…"
            className="w-full bg-[#1a1a1a] border border-white/10 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-yellow-400 placeholder-gray-600" />
        </div>
        <button onClick={load} className="p-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-gray-400 hover:text-white">
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/5 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <span>Game</span>
          <span>Category</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading…</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.slice(0, 150).map((g) => {
              const o = overrides[g.game_id] || {};
              const hidden = o.is_hidden ?? false;
              const img = o.custom_image_url || g.game_image;
              const isEditing = editId === g.game_id;

              return (
                <div key={g.game_id}>
                  <div className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 ${hidden ? "opacity-40" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={img || PLACEHOLDER} alt={g.game_name}
                        className="w-9 h-9 rounded-lg object-cover bg-gray-800 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{g.game_name}</p>
                        <p className="text-[10px] text-gray-600">ID: {g.game_id}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{o.category_override || g.category || "Top Up"}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${hidden ? "bg-red-500" : "bg-green-500"}`} />
                      <span className="text-xs text-gray-400 whitespace-nowrap">{hidden ? "Hidden" : "Active"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleHidden(g.game_id)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white">
                        {hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button onClick={() => isEditing ? setEditId(null) : startEdit(g)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${isEditing ? "bg-white/10 text-gray-300" : "bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30"}`}>
                        {isEditing ? "Close" : "Edit"}
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="px-5 pb-5 bg-white/[0.02] border-t border-white/5 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Left: image */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Custom Image</p>
                          <div className="flex items-center gap-3">
                            <ImgPicker preview={imgPrev || (editData.custom_image_url as string) || g.game_image || ""}
                              onChange={(f, p) => { setImgFile(f); setImgPrev(p); }} size={14} />
                            <div className="flex-1 min-w-0">
                              <input type="text" value={editData.custom_image_url as string || ""}
                                onChange={(e) => setEditData({ ...editData, custom_image_url: e.target.value })}
                                placeholder="Or paste URL"
                                className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-yellow-400" />
                            </div>
                          </div>
                        </div>
                        {/* Right: settings */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Settings</p>
                          <select value={editData.category_override as string || "Top Up"}
                            onChange={(e) => setEditData({ ...editData, category_override: e.target.value })}
                            className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400">
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <div className="flex gap-4">
                            <Toggle checked={editData.is_featured as boolean || false}
                              onChange={(v) => setEditData({ ...editData, is_featured: v })} label="Featured" />
                            <Toggle checked={editData.is_hidden as boolean || false}
                              onChange={(v) => setEditData({ ...editData, is_hidden: v })} label="Hidden" />
                          </div>
                        </div>
                      </div>
                      <button onClick={() => save(g.game_id)} disabled={isSaving}
                        className="mt-4 flex items-center gap-2 bg-yellow-400 text-black font-bold px-5 py-2 rounded-xl hover:bg-yellow-300 text-sm">
                        {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />} Save Changes
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-gray-500 text-center py-10">No games found</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Manual Tab — main panel ───────────────────────────────────────────────────
function ManualTab() {
  const [games, setGames] = useState<ManualGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showWizard, setShowWizard] = useState(false);

  // Selection state
  const [selectedGame, setSelectedGame] = useState<ManualGame | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [editingProduct, setEditingProduct] = useState<Sku | null>(null);
  const [addingProduct, setAddingProduct] = useState(false);

  // Regions + SKUs
  const [regions, setRegions] = useState<Region[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Add region inline
  const [showAddRegion, setShowAddRegion] = useState(false);
  const [newRegion, setNewRegion] = useState({ name: "", key: "" });
  const [isSavingRegion, setIsSavingRegion] = useState(false);

  const loadGames = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from("manual_products").select("*").order("sort_order").order("created_at", { ascending: false });
    setGames((data as ManualGame[]) || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadGames(); }, []);

  const loadGameDetail = useCallback(async (game: ManualGame) => {
    setIsLoadingDetail(true);
    setSelectedRegion(null);
    setEditingProduct(null);
    setAddingProduct(false);

    const { data: regs } = await supabase.from("manual_product_regions")
      .select("*").eq("product_id", game.id).order("sort_order");
    const loadedRegions = (regs as Region[]) || [];
    setRegions(loadedRegions);

    const { data: skuData } = await supabase.from("manual_skus")
      .select("*").eq("product_id", game.id).order("sort_order");
    setSkus((skuData as Sku[]) || []);

    if (loadedRegions.length > 0) setSelectedRegion(loadedRegions[0]);
    setIsLoadingDetail(false);
  }, []);

  const selectGame = (game: ManualGame) => {
    setSelectedGame(game);
    loadGameDetail(game);
  };

  const toggleActive = async (game: ManualGame) => {
    await supabase.from("manual_products").update({ is_active: !game.is_active }).eq("id", game.id);
    setGames((p) => p.map((g) => g.id === game.id ? { ...g, is_active: !g.is_active } : g));
    if (selectedGame?.id === game.id) setSelectedGame({ ...selectedGame, is_active: !selectedGame.is_active });
  };

  const deleteGame = async (id: string) => {
    if (!confirm("Delete this game and ALL its servers and products?")) return;
    await supabase.from("manual_skus").delete().eq("product_id", id);
    await supabase.from("manual_product_regions").delete().eq("product_id", id);
    await supabase.from("manual_products").delete().eq("id", id);
    setGames((p) => p.filter((g) => g.id !== id));
    if (selectedGame?.id === id) { setSelectedGame(null); setRegions([]); setSkus([]); }
    toast.success("Game deleted");
  };

  const addRegion = async () => {
    if (!newRegion.name.trim() || !selectedGame) return;
    setIsSavingRegion(true);
    await supabase.from("manual_product_regions").insert({
      product_id: selectedGame.id,
      region_name: newRegion.name.trim(),
      region_key: newRegion.key.trim() || newRegion.name.trim().toLowerCase().replace(/\s+/g, "_"),
      sort_order: regions.length,
      is_active: true,
    });
    setNewRegion({ name: "", key: "" });
    setShowAddRegion(false);
    await loadGameDetail(selectedGame);
    toast.success("Server/Region added");
    setIsSavingRegion(false);
  };

  const deleteRegion = async (id: string) => {
    if (!confirm("Delete this server/region and all its products?")) return;
    await supabase.from("manual_skus").delete().eq("region_id", id);
    await supabase.from("manual_product_regions").delete().eq("id", id);
    if (selectedRegion?.id === id) setSelectedRegion(null);
    if (selectedGame) await loadGameDetail(selectedGame);
    toast.success("Deleted");
  };

  const filteredSkus = selectedGame?.requires_server
    ? skus.filter((s) => selectedRegion ? s.region_id === selectedRegion.id : false)
    : skus.filter((s) => !s.region_id);

  const filtered = games.filter((g) => !search || g.product_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Wizard */}
      {showWizard && (
        <AddGameWizard
          onClose={() => setShowWizard(false)}
          onCreated={(g) => { loadGames(); selectGame(g); }}
        />
      )}

      {/* ── Row 1: Games table | Server Management ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Games Management */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="font-bold text-white">Games Management</h3>
            <button onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 bg-yellow-400 text-black font-bold text-xs px-3 py-2 rounded-xl hover:bg-yellow-300">
              <Plus size={13} /> Add Game
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full bg-[#111] border border-white/10 text-white rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-yellow-400 placeholder-gray-600" />
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-2.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-white/5">
            <span>Game</span>
            <span>Server</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5 max-h-[420px]">
            {isLoading ? (
              <div className="p-10 text-center text-gray-500 text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-gray-500 text-sm mb-3">No games yet</p>
                <button onClick={() => setShowWizard(true)} className="text-yellow-400 text-sm font-semibold hover:text-yellow-300">
                  + Add your first game
                </button>
              </div>
            ) : filtered.map((g) => {
              const isSelected = selectedGame?.id === g.id;
              return (
                <div key={g.id}
                  className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-5 py-3 cursor-pointer transition-colors ${isSelected ? "bg-yellow-400/10 border-l-2 border-yellow-400" : "hover:bg-white/[0.02]"} ${!g.is_active ? "opacity-50" : ""}`}
                  onClick={() => selectGame(g)}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={g.photo_url || PLACEHOLDER} alt={g.product_name}
                      className="w-8 h-8 rounded-lg object-cover bg-gray-800 flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{g.product_name}</p>
                      <p className="text-[10px] text-gray-600 truncate">{g.game_category}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Toggle checked={g.requires_server}
                      onChange={async (v) => {
                        await supabase.from("manual_products").update({ requires_server: v }).eq("id", g.id);
                        setGames((p) => p.map((x) => x.id === g.id ? { ...x, requires_server: v } : x));
                        if (selectedGame?.id === g.id) { setSelectedGame({ ...g, requires_server: v }); }
                      }} />
                  </div>
                  <span className={`text-[10px] font-bold ${g.is_active ? "text-green-400" : "text-red-400"}`}>{g.is_active ? "Active" : "Hidden"}</span>
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleActive(g)} className="p-1 text-gray-600 hover:text-white">
                      {g.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button onClick={() => deleteGame(g.id)} className="p-1 text-red-400/50 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Server Management — shown when game selected */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div>
              <h3 className="font-bold text-white">
                Server Management
                {selectedGame && <span className="text-gray-400 font-normal text-sm ml-2">— {selectedGame.product_name}</span>}
              </h3>
            </div>
            {selectedGame && selectedGame.requires_server && (
              <button onClick={() => setShowAddRegion(true)}
                className="flex items-center gap-1.5 bg-yellow-400 text-black font-bold text-xs px-3 py-2 rounded-xl hover:bg-yellow-300">
                <Plus size={13} /> Add Server
              </button>
            )}
          </div>

          {!selectedGame ? (
            <div className="flex-1 flex items-center justify-center p-10">
              <div className="text-center">
                <Globe size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Select a game from the left to manage servers</p>
              </div>
            </div>
          ) : !selectedGame.requires_server ? (
            <div className="flex-1 flex items-center justify-center p-10">
              <div className="text-center">
                <p className="text-gray-400 text-sm font-semibold">No server required</p>
                <p className="text-gray-600 text-xs mt-1">Products are managed globally for this game</p>
                <p className="text-gray-600 text-xs mt-1">Enable "Server" toggle in the games table to add servers</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Add region inline form */}
              {showAddRegion && (
                <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex gap-2">
                    <input type="text" value={newRegion.name} onChange={(e) => setNewRegion({ ...newRegion, name: e.target.value })}
                      placeholder="Server name (e.g. Asia, Brazil)"
                      className="flex-1 bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400" />
                    <input type="text" value={newRegion.key} onChange={(e) => setNewRegion({ ...newRegion, key: e.target.value })}
                      placeholder="Key (e.g. AS)"
                      className="w-24 bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400" />
                    <button onClick={addRegion} disabled={isSavingRegion}
                      className="px-4 py-2 bg-yellow-400 text-black font-bold text-sm rounded-xl hover:bg-yellow-300 disabled:opacity-50">
                      {isSavingRegion ? <RefreshCw size={14} className="animate-spin" /> : "Add"}
                    </button>
                    <button onClick={() => setShowAddRegion(false)} className="px-3 py-2 bg-white/10 text-gray-400 text-sm rounded-xl hover:bg-white/15">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-white/5">
                <span>Server Name</span>
                <span>Status</span>
                <span>Action</span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/5 max-h-[360px]">
                {isLoadingDetail ? (
                  <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
                ) : regions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">No servers yet. Click "Add Server" to create one.</div>
                ) : regions.map((r) => {
                  const isSelected = selectedRegion?.id === r.id;
                  const count = skus.filter((s) => s.region_id === r.id).length;
                  return (
                    <div key={r.id} className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-3 ${isSelected ? "bg-white/[0.04]" : ""}`}>
                      <span className={`text-sm font-semibold ${isSelected ? "text-white" : "text-gray-300"}`}>
                        {r.region_name}
                        <span className="ml-2 text-[10px] text-gray-600">({count} products)</span>
                      </span>
                      <span className="text-[10px] font-bold text-green-400">Active</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedRegion(r); setEditingProduct(null); setAddingProduct(false); }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg ${isSelected ? "bg-yellow-400 text-black" : "bg-white/10 text-gray-300 hover:bg-white/15"}`}>
                          Manage Products
                        </button>
                        <button onClick={() => deleteRegion(r.id)} className="p-1 text-red-400/40 hover:text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Products table | Edit/Add Product ── */}
      {selectedGame && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Products Management */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div>
                <h3 className="font-bold text-white">
                  Products Management
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedGame.product_name}
                  {selectedGame.requires_server && selectedRegion && ` — ${selectedRegion.region_name}`}
                </p>
              </div>
              <button
                onClick={() => { setAddingProduct(true); setEditingProduct(null); }}
                disabled={selectedGame.requires_server && !selectedRegion}
                className="flex items-center gap-1.5 bg-yellow-400 text-black font-bold text-xs px-3 py-2 rounded-xl hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus size={13} /> Add Product
              </button>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-5 py-2.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-white/5">
              <span>Image</span>
              <span>Product Name</span>
              <span>Price</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5 max-h-[420px]">
              {isLoadingDetail ? (
                <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
              ) : (selectedGame.requires_server && !selectedRegion) ? (
                <div className="p-8 text-center text-gray-500 text-sm">Select a server above to view products</div>
              ) : filteredSkus.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 text-sm mb-2">No products yet</p>
                  <button onClick={() => { setAddingProduct(true); setEditingProduct(null); }}
                    className="text-yellow-400 text-sm font-semibold hover:text-yellow-300">
                    + Add first product
                  </button>
                </div>
              ) : filteredSkus.map((sku) => {
                const isEditingThis = editingProduct?.id === sku.id;
                return (
                  <div key={sku.id}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-5 py-3 ${!sku.is_active ? "opacity-50" : ""} ${isEditingThis ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}>
                    <div className="w-9 h-9 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                      {sku.photo_url ? (
                        <img src={sku.photo_url} alt={sku.sku_name} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={13} className="text-gray-600" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white truncate">{sku.sku_name}</p>
                    <div>
                      {sku.sale_price ? (
                        <div className="text-right">
                          <p className="text-xs font-bold text-orange-400">${sku.sale_price.toFixed(2)}</p>
                          <p className="text-[10px] text-gray-500 line-through">${sku.original_price.toFixed(2)}</p>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-orange-400">${sku.original_price.toFixed(2)}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold ${sku.is_active ? "text-green-400" : "text-red-400"}`}>
                      {sku.is_active ? "Active" : "Hidden"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setEditingProduct(sku); setAddingProduct(false); }}
                        className="p-1 text-gray-500 hover:text-yellow-400">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={async () => {
                        if (!confirm("Delete this product?")) return;
                        await supabase.from("manual_skus").delete().eq("id", sku.id);
                        if (selectedGame) await loadGameDetail(selectedGame);
                        if (editingProduct?.id === sku.id) setEditingProduct(null);
                        toast.success("Deleted");
                      }} className="p-1 text-red-400/50 hover:text-red-400">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Edit / Add Product Panel */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            {!editingProduct && !addingProduct ? (
              <div className="flex-1 flex items-center justify-center p-10">
                <div className="text-center">
                  <Package size={32} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Select a product to edit<br />or click "Add Product"</p>
                </div>
              </div>
            ) : (
              <ProductForm
                key={editingProduct?.id || "new"}
                game={selectedGame}
                regionId={selectedGame.requires_server ? (selectedRegion?.id || null) : null}
                sku={editingProduct}
                onSave={async () => { await loadGameDetail(selectedGame); setEditingProduct(null); setAddingProduct(false); }}
                onCancel={() => { setEditingProduct(null); setAddingProduct(false); }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Product Form (right panel) ────────────────────────────────────────────────
function ProductForm({
  game, regionId, sku, onSave, onCancel,
}: {
  game: ManualGame;
  regionId: string | null;
  sku: Sku | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    sku_name: sku?.sku_name || "",
    original_price: sku?.original_price?.toString() || "",
    sale_price: sku?.sale_price?.toString() || "",
    sort_order: sku?.sort_order?.toString() || "0",
  });
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPrev, setImgPrev] = useState(sku?.photo_url || "");
  const [requirePlayerId, setRequirePlayerId] = useState(game.requires_player_id);
  const [requireServer, setRequireServer] = useState(game.requires_server);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!form.sku_name.trim() || !form.original_price) {
      toast.error("Product name and original price are required");
      return;
    }
    setIsSaving(true);
    // Always preserve existing photo_url; only replace if a new file was chosen
    let photoUrl: string | null = sku?.photo_url ?? null;
    if (imgFile) {
      const url = await uploadImg(imgFile, `sku_${game.id}_${Date.now()}`);
      if (url) photoUrl = url;
    }
    const payload = {
      product_id: game.id,
      region_id: regionId,
      sku_name: form.sku_name.trim(),
      original_price: parseFloat(form.original_price),
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      sort_order: parseInt(form.sort_order) || 0,
      photo_url: photoUrl,
      is_active: true,
    };

    if (sku?.id) {
      const { error } = await supabase.from("manual_skus").update(payload).eq("id", sku.id);
      if (error) { toast.error("Save failed: " + error.message); setIsSaving(false); return; }
      toast.success("Product updated — changes are live");
    } else {
      const { error } = await supabase.from("manual_skus").insert(payload);
      if (error) { toast.error("Save failed: " + error.message); setIsSaving(false); return; }
      toast.success("Product added");
    }
    setIsSaving(false);
    onSave();
  };

  const discountPct = form.sale_price && form.original_price
    ? Math.round((1 - parseFloat(form.sale_price) / parseFloat(form.original_price)) * 100)
    : 0;

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <h3 className="font-bold text-white">{sku ? "Edit Product" : "Add Product"}</h3>
        <button onClick={onCancel}><X size={16} className="text-gray-400 hover:text-white" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Product Name */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Product Name *</label>
          <input type="text" value={form.sku_name} onChange={(e) => setForm({ ...form, sku_name: e.target.value })}
            placeholder="e.g. 100 Diamonds, Weekly Membership"
            className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400" />
        </div>

        {/* Price */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Price (USD) *</label>
          <input type="number" step="0.01" value={form.original_price}
            onChange={(e) => setForm({ ...form, original_price: e.target.value })}
            placeholder="0.00"
            className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400" />
        </div>

        {/* Sale Price (optional) */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center justify-between">
            <span>Sale Price (optional)</span>
            {discountPct > 0 && (
              <span className="text-orange-400 font-bold text-[10px] bg-orange-400/15 px-2 py-0.5 rounded">-{discountPct}%</span>
            )}
          </label>
          <input type="number" step="0.01" value={form.sale_price}
            onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
            placeholder="Leave empty for no discount"
            className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400" />
        </div>

        {/* Image */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Image</label>
          <div className="flex items-center gap-3">
            <ImgPicker preview={imgPrev} size={16}
              onChange={(f, p) => { setImgFile(f); setImgPrev(p); }} />
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Click to upload or change image</p>
              <p className="text-[10px] text-gray-600">JPG, PNG, WEBP · Max 10MB</p>
              {imgFile && <p className="text-[10px] text-green-400 mt-1">{imgFile.name}</p>}
            </div>
            {imgPrev && (
              <button onClick={() => { setImgFile(null); setImgPrev(""); }}
                className="p-1 text-red-400/50 hover:text-red-400">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Toggles */}
        <div className="border-t border-white/5 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Require Player ID</span>
            <Toggle checked={requirePlayerId} onChange={setRequirePlayerId} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Require Server</span>
            <Toggle checked={requireServer} onChange={setRequireServer} />
          </div>
        </div>

        {/* Sort order */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Sort Order</label>
          <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            className="w-32 bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2 text-sm outline-none focus:border-yellow-400" />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 border border-white/20 text-gray-300 rounded-xl text-sm font-semibold hover:bg-white/5">
          Cancel
        </button>
        <button onClick={handleSave} disabled={isSaving}
          className="flex-1 py-2.5 bg-yellow-400 text-black rounded-xl text-sm font-bold hover:bg-yellow-300 disabled:opacity-50 flex items-center justify-center gap-2">
          {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function AdminProductsPage() {
  const [tab, setTab] = useState<Tab>("manual");

  return (
    <AdminLayout title="Product Management">
      <div className="max-w-6xl space-y-5">
        <div>
          <p className="text-gray-400 text-sm mb-4">
            <strong className="text-white">Manual</strong> products are fully custom with server/region support.
            <strong className="text-white"> Lootbar</strong> products are synced from the API — you can override images and categories.
          </p>

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit">
            {[
              { key: "manual" as Tab, label: "Manual Products", badge: null },
              { key: "lootbar" as Tab, label: "Lootbar Products", badge: "API" },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  tab === t.key ? "bg-yellow-400 text-black shadow" : "text-gray-400 hover:text-white"
                }`}>
                {t.label}
                {t.badge && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${tab === t.key ? "bg-black/20 text-black" : "bg-white/10 text-gray-500"}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {tab === "manual" ? <ManualTab /> : <LootbarTab />}
      </div>
    </AdminLayout>
  );
}
