/**
 * AdminBannersPage — Manage home banners stored in `home_banners` table.
 * Features: view all banners, add/edit (image file upload OR URL), reorder, toggle active, delete.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import AdminSidebar from "./AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Save, X, Loader2,
  Upload, Image, Link, ChevronUp, ChevronDown, RefreshCw, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface BannerForm {
  title: string;
  subtitle: string;
  image_url: string;
  link: string;
  is_active: boolean;
}

const EMPTY_FORM: BannerForm = {
  title: "",
  subtitle: "",
  image_url: "",
  link: "/",
  is_active: true,
};

// ── Banner Edit/Create Modal ─────────────────────────────────────────────────
function BannerModal({
  banner,
  onClose,
  onSaved,
}: {
  banner: Banner | null; // null = create new
  onClose: () => void;
  onSaved: (b: Banner) => void;
}) {
  const [form, setForm] = useState<BannerForm>(
    banner
      ? {
          title: banner.title,
          subtitle: banner.subtitle,
          image_url: banner.image_url,
          link: banner.link,
          is_active: banner.is_active,
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageTab, setImageTab] = useState<"url" | "upload">("url");
  const [aiGenerating, setAiGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `banners/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("banners").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed: " + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: data.publicUrl }));
    toast.success("Image uploaded");
    setUploading(false);
  };

  const handleGenerateAI = async () => {
    if (!form.image_url.trim()) {
      toast.error("Please add an image URL or upload an image first");
      return;
    }
    setAiGenerating(true);
    const { data, error } = await supabase.functions.invoke("banner-ai", {
      body: { image_url: form.image_url.trim() },
    });
    setAiGenerating(false);
    if (error) {
      let msg = error.message;
      try {
        const { FunctionsHttpError } = await import("@supabase/supabase-js");
        if (error instanceof FunctionsHttpError) {
          msg = (await error.context?.text()) || msg;
        }
      } catch {}
      toast.error("AI generation failed: " + msg);
      return;
    }
    if (data?.title) {
      setForm(f => ({
        ...f,
        title: f.title.trim() ? f.title : data.title,
        subtitle: f.subtitle.trim() ? f.subtitle : (data.subtitle || ""),
      }));
      toast.success("AI generated title & badge!");
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.image_url.trim()) { toast.error("Image is required"); return; }
    setSaving(true);

    if (banner) {
      // Update existing
      const { data, error } = await supabase
        .from("home_banners")
        .update({
          title: form.title.trim(),
          subtitle: form.subtitle.trim(),
          image_url: form.image_url.trim(),
          link: form.link.trim() || "/",
          is_active: form.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", banner.id)
        .select()
        .single();
      setSaving(false);
      if (error) { toast.error("Save failed: " + error.message); return; }
      toast.success("Banner updated");
      onSaved(data as Banner);
    } else {
      // Create new
      const { data: countData } = await supabase.from("home_banners").select("sort_order").order("sort_order", { ascending: false }).limit(1).single();
      const nextOrder = (countData?.sort_order ?? -1) + 1;
      const { data, error } = await supabase
        .from("home_banners")
        .insert({
          title: form.title.trim(),
          subtitle: form.subtitle.trim(),
          image_url: form.image_url.trim(),
          link: form.link.trim() || "/",
          is_active: form.is_active,
          sort_order: nextOrder,
        })
        .select()
        .single();
      setSaving(false);
      if (error) { toast.error("Create failed: " + error.message); return; }
      toast.success("Banner created");
      onSaved(data as Banner);
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl w-full mx-auto relative overflow-hidden fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Image size={15} /> {banner ? "Edit Banner" : "Add Banner"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Preview */}
          {form.image_url && (
            <div className="w-full h-32 rounded-xl overflow-hidden bg-gray-100 relative">
              <img
                src={form.image_url}
                alt="preview"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
              <div className="absolute bottom-2 left-3 text-white">
                {form.subtitle && <p className="text-[10px] font-bold text-yellow-400 uppercase">{form.subtitle}</p>}
                {form.title && <p className="text-sm font-bold leading-tight">{form.title}</p>}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-semibold text-gray-600">Title *</Label>
              {form.image_url && (
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={aiGenerating}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold rounded-lg transition-colors disabled:opacity-60"
                >
                  {aiGenerating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  {aiGenerating ? "AI thinking…" : "Generate with AI"}
                </button>
              )}
            </div>
            <Input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Summer Sale — Up to 30% Off"
              className="text-sm rounded-xl"
            />
          </div>

          {/* Subtitle */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1 block">Subtitle / Badge</Label>
            <Input
              value={form.subtitle}
              onChange={(e) => setForm(f => ({ ...f, subtitle: e.target.value }))}
              placeholder="e.g. LIMITED TIME"
              className="text-sm rounded-xl"
            />
          </div>

          {/* AI Thinking overlay */}
          {aiGenerating && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl">
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-6 py-4">
                <Loader2 size={22} className="text-blue-500 animate-spin" />
                <div>
                  <p className="text-sm font-bold text-blue-700">AI is analyzing your image…</p>
                  <p className="text-xs text-blue-500 mt-0.5">Generating title & badge</p>
                </div>
              </div>
            </div>
          )}

          {/* Image — URL or Upload tabs */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Banner Image *</Label>
            <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-2">
              {(["url", "upload"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setImageTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                    imageTab === tab ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {tab === "url" ? <Link size={12} /> : <Upload size={12} />}
                  {tab === "url" ? "Paste URL" : "Upload File"}
                </button>
              ))}
            </div>

            {imageTab === "url" ? (
              <Input
                value={form.image_url}
                onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))}
                placeholder="https://example.com/banner.jpg"
                className="text-sm rounded-xl"
              />
            ) : (
              <div className="flex gap-2">
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="Uploaded URL will appear here…"
                  className="text-sm rounded-xl flex-1"
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold rounded-xl flex-shrink-0 transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {uploading ? "..." : "Upload"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                />
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-1">Recommended: 1200×400px or wider (landscape).</p>
          </div>

          {/* Link */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1 block">Click Link</Label>
            <Input
              value={form.link}
              onChange={(e) => setForm(f => ({ ...f, link: e.target.value }))}
              placeholder="/games or https://noxystore.com/…"
              className="text-sm rounded-xl"
            />
            <p className="text-[10px] text-gray-400 mt-1">Use / for no action, or an internal path like /games.</p>
          </div>

          {/* Active toggle */}
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Active (visible on homepage)</span>
            </div>
            <div
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.is_active ? "bg-yellow-400" : "bg-gray-300"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-4" : "translate-x-0"}`} />
            </div>
          </label>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold border-0 gap-1.5"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save Banner"}
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminBannersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editBanner, setEditBanner] = useState<Banner | null | undefined>(undefined); // undefined = closed, null = create new
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "admin") { navigate("/"); return; }
    loadBanners();
  }, [user]);

  const loadBanners = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("home_banners")
      .select("*")
      .order("sort_order");
    if (error) { toast.error("Failed to load banners"); }
    else setBanners((data || []) as Banner[]);
    setIsLoading(false);
  };

  const handleSaved = (updated: Banner) => {
    setBanners(prev => {
      const existing = prev.find(b => b.id === updated.id);
      if (existing) return prev.map(b => b.id === updated.id ? updated : b);
      return [...prev, updated];
    });
  };

  const handleToggleActive = async (banner: Banner) => {
    const { error } = await supabase
      .from("home_banners")
      .update({ is_active: !banner.is_active, updated_at: new Date().toISOString() })
      .eq("id", banner.id);
    if (error) { toast.error(error.message); return; }
    setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: !b.is_active } : b));
    toast.success(banner.is_active ? "Banner hidden" : "Banner shown");
  };

  const handleDelete = async (banner: Banner) => {
    if (!confirm(`Delete banner "${banner.title}"? This cannot be undone.`)) return;
    setDeleting(banner.id);
    const { error } = await supabase.from("home_banners").delete().eq("id", banner.id);
    setDeleting(null);
    if (error) { toast.error(error.message); return; }
    setBanners(prev => prev.filter(b => b.id !== banner.id));
    toast.success("Banner deleted");
  };

  const handleMove = async (idx: number, dir: -1 | 1) => {
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= banners.length) return;
    const reordered = [...banners];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    // Assign sequential sort_order
    const updates = reordered.map((b, i) => ({ id: b.id, sort_order: i }));
    setBanners(reordered.map((b, i) => ({ ...b, sort_order: i })));
    await Promise.all(
      updates.map(u =>
        supabase.from("home_banners").update({ sort_order: u.sort_order }).eq("id", u.id)
      )
    );
    toast.success("Order updated");
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <AdminSidebar />
      <main className="ml-64 flex-1 py-8">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Banner Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">{banners.length} banners · changes reflect instantly on homepage</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadBanners} variant="outline" className="gap-2 rounded-xl" disabled={isLoading}>
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                Reload
              </Button>
              <Button
                onClick={() => setEditBanner(null)}
                className="gap-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-bold border-0"
              >
                <Plus size={14} /> Add Banner
              </Button>
            </div>
          </div>

          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-5 text-xs text-blue-700 flex items-center gap-2">
            <Image size={13} className="text-blue-500 flex-shrink-0" />
            <span>
              Banners are loaded from the <strong>home_banners</strong> database table. Active banners display on the homepage in sort order.
              Support both file upload and image URL.
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : banners.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
              <Image size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">No banners yet</p>
              <p className="text-gray-400 text-sm mt-1 mb-5">Create your first banner to display on the homepage</p>
              <Button
                onClick={() => setEditBanner(null)}
                className="gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold border-0"
              >
                <Plus size={14} /> Create First Banner
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {banners.map((banner, idx) => (
                <div
                  key={banner.id}
                  className={`bg-white rounded-2xl border-2 p-4 flex items-center gap-4 transition-all ${
                    banner.is_active ? "border-gray-100" : "border-gray-100 opacity-60"
                  }`}
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => handleMove(idx, -1)}
                      disabled={idx === 0}
                      className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 1)}
                      disabled={idx === banners.length - 1}
                      className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  {/* Image preview */}
                  <div className="w-32 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
                    <span className="absolute bottom-1 left-2 text-[9px] bg-black/60 text-white px-1 py-0.5 rounded font-bold">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 truncate">{banner.title}</p>
                      {!banner.is_active && (
                        <span className="text-[9px] bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded">HIDDEN</span>
                      )}
                    </div>
                    {banner.subtitle && (
                      <p className="text-xs text-yellow-600 font-semibold mt-0.5">{banner.subtitle}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5 truncate">Link: {banner.link || "/"}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5 truncate">{banner.image_url}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(banner)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        banner.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                      title={banner.is_active ? "Hide banner" : "Show banner"}
                    >
                      {banner.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button
                      onClick={() => setEditBanner(banner)}
                      className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-yellow-100 text-gray-600 hover:text-yellow-700 flex items-center justify-center transition-colors"
                      title="Edit banner"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(banner)}
                      disabled={deleting === banner.id}
                      className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 flex items-center justify-center transition-colors disabled:opacity-50"
                      title="Delete banner"
                    >
                      {deleting === banner.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Live preview link */}
          {banners.filter(b => b.is_active).length > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => window.open("/", "_blank")}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Preview homepage →
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Edit / Create Modal */}
      {editBanner !== undefined && (
        <BannerModal
          banner={editBanner}
          onClose={() => setEditBanner(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}


