import { useEffect, useState } from "react";
import { RefreshCw, Edit2, Upload, Save, X, Trash2, EyeOff, Eye, Star } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { lootbarApi } from "@/lib/lootbar-api";
import { CATEGORIES } from "@/constants/mockData";
import { toast } from "sonner";

interface GameOverride {
  game_id: string;
  custom_price?: number;
  category_override?: string;
  is_featured?: boolean;
  is_hidden?: boolean;
  custom_image_url?: string;
}

export function AdminProductsPage() {
  const [games, setGames] = useState<any[]>([]);
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
    // Load games from cache first
    const { data: cached } = await supabase.from("games_cache").select("*").order("game_name");
    if (cached && cached.length > 0) {
      setGames(cached);
    } else {
      try {
        const g = await lootbarApi.getGames(1, 200);
        setGames(g);
      } catch { setGames([]); }
    }
    // Load overrides
    const { data: ovr } = await supabase.from("game_overrides").select("*");
    if (ovr) {
      const map: Record<string, GameOverride> = {};
      ovr.forEach((r: any) => { map[r.game_id] = r; });
      setOverrides(map);
    }
    setIsLoading(false);
  };

  const startEdit = (game: any) => {
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
      const ext = imgFile.name.split(".").pop();
      const path = `game_${gameId}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("store-assets").upload(path, imgFile, { upsert: true, contentType: imgFile.type });
      if (upErr) { toast.error("Upload failed"); setIsUploading(false); return; }
      imageUrl = supabase.storage.from("store-assets").getPublicUrl(path).data.publicUrl;
      // Also update games_cache
      await supabase.from("games_cache").update({ game_image: imageUrl }).eq("game_id", gameId);
    }
    const updates: any = {
      game_id: gameId,
      category_override: editData.category_override,
      is_featured: editData.is_featured,
      is_hidden: editData.is_hidden,
      updated_at: new Date().toISOString(),
    };
    if (editData.custom_price_str) updates.custom_price = parseFloat(editData.custom_price_str);
    if (imageUrl) updates.custom_image_url = imageUrl;
    await supabase.from("game_overrides").upsert(updates);
    toast.success("Product saved!");
    setEditingId(null); setImgFile(null); setImgPreview("");
    loadAll();
    setIsUploading(false);
  };

  const toggleHidden = async (gameId: string) => {
    const current = overrides[gameId]?.is_hidden ?? false;
    await supabase.from("game_overrides").upsert({ game_id: gameId, is_hidden: !current, updated_at: new Date().toISOString() });
    toast.success(!current ? "Product hidden from store" : "Product visible");
    loadAll();
  };

  const filtered = games.filter(g => !search || g.game_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Product Management">
      <div className="space-y-4 max-w-5xl">
        <p className="text-gray-400 text-sm">Edit categories, custom prices, photos for Lootbar products. Changes are saved permanently.</p>
        <div className="flex gap-3">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name…"
            className="flex-1 bg-[#1a1a1a] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400 placeholder-gray-600" />
          <button onClick={loadAll} className="p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-gray-400 hover:text-white">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Loading products…</div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.slice(0, 100).map((game) => {
                const ovr = overrides[game.game_id];
                const isEditing = editingId === game.game_id;
                const isHidden = ovr?.is_hidden ?? false;
                const isFeatured = ovr?.is_featured ?? false;
                return (
                  <div key={game.game_id} className={isHidden ? "opacity-50" : ""}>
                    <div className="px-5 py-4 flex items-center gap-4">
                      <img
                        src={ovr?.custom_image_url || game.game_image}
                        alt={game.game_name}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-gray-800"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=48&h=48&fit=crop"; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">{game.game_name}</p>
                          {isFeatured && <Star size={12} className="text-yellow-400 flex-shrink-0" fill="currentColor" />}
                          {isHidden && <EyeOff size={12} className="text-red-400 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500">ID: {game.game_id} · {ovr?.category_override || game.category || "Top Up"}{ovr?.custom_price ? ` · $${ovr.custom_price}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => toggleHidden(game.game_id)}
                          className={`p-2 rounded-lg transition-colors ${isHidden ? "text-red-400 bg-red-400/10" : "text-gray-500 hover:text-white bg-white/5"}`}>
                          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={() => isEditing ? setEditingId(null) : startEdit(game)}
                          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-3 py-2 rounded-xl">
                          <Edit2 size={12} /> {isEditing ? "Cancel" : "Edit"}
                        </button>
                      </div>
                    </div>
                    {isEditing && (
                      <div className="px-5 pb-5 bg-white/[0.02] border-t border-white/5 pt-4 space-y-4">
                        {/* Photo upload */}
                        <div>
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Custom Photo</label>
                          <div className="flex items-center gap-3">
                            <img src={imgPreview || editData.custom_image_url || game.game_image} alt="" className="w-16 h-16 rounded-xl object-cover bg-gray-800"
                              onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=64&h=64&fit=crop"; }} />
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/15 text-white font-semibold px-3 py-2 rounded-xl text-xs">
                                <Upload size={12} /> {imgFile ? imgFile.name.slice(0, 25) : "Upload Photo"}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                  const f = e.target.files?.[0]; if (!f) return; setImgFile(f);
                                  const r = new FileReader(); r.onload = ev => setImgPreview(ev.target?.result as string); r.readAsDataURL(f);
                                }} />
                              </label>
                              <input type="text" value={editData.custom_image_url || ""} onChange={(e) => setEditData({ ...editData, custom_image_url: e.target.value })}
                                placeholder="Or paste image URL"
                                className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-yellow-400" />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Custom Price ($)</label>
                            <input type="number" value={editData.custom_price_str || ""} onChange={(e) => setEditData({ ...editData, custom_price_str: e.target.value })}
                              placeholder="Leave empty = Lootbar price"
                              className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Category</label>
                            <select value={editData.category_override || "Top Up"} onChange={(e) => setEditData({ ...editData, category_override: e.target.value })}
                              className="w-full bg-[#0f0f0f] border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400">
                              {CATEGORIES.filter(c => c !== "All").map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editData.is_featured || false} onChange={(e) => setEditData({ ...editData, is_featured: e.target.checked })} className="w-4 h-4 rounded accent-yellow-400" />
                            <span className="text-sm text-gray-300">Featured</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editData.is_hidden || false} onChange={(e) => setEditData({ ...editData, is_hidden: e.target.checked })} className="w-4 h-4 rounded accent-red-400" />
                            <span className="text-sm text-gray-300">Hide from store</span>
                          </label>
                        </div>
                        <button onClick={() => saveEdit(game.game_id)} disabled={isUploading}
                          className="flex items-center gap-2 bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-300 text-sm">
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
    </AdminLayout>
  );
}
hello ai please fix error saved product photo and add support page that have multi faq and name enter email select support type or other and message enter and photo upload require make its more stable.
