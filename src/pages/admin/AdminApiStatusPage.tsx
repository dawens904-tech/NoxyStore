import { useEffect, useState } from "react";
import { RefreshCw, Zap, Image, AlertCircle } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { lootbarApi } from "@/lib/lootbar-api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function AdminApiStatusPage() {
  const [balance, setBalance] = useState("—");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [apiStatus, setApiStatus] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ expire_at?: number; created_at?: string } | null>(null);

  useEffect(() => {
    checkApi();
    loadTokenInfo();
    loadMissingImagesCount();
  }, []);

  const checkApi = async () => {
    setIsChecking(true);
    setApiStatus(null);
    try {
      await lootbarApi.getGames(1, 1);
      setApiStatus(true);
    } catch {
      setApiStatus(false);
    }
    setIsChecking(false);
  };

  const fetchBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const bal = await lootbarApi.getBalance();
      setBalance(bal);
    } catch { toast.error("Failed to fetch balance"); }
    setIsLoadingBalance(false);
  };

  const loadTokenInfo = async () => {
    const { data } = await supabase.from("lootbar_tokens").select("expire_at, created_at").order("created_at", { ascending: false }).limit(1).single();
    if (data) setTokenInfo(data);
  };

  const [isFetchingImages, setIsFetchingImages] = useState(false);
  const [imageFetchResult, setImageFetchResult] = useState<{ updated: number; not_found: number } | null>(null);
  const [missingImagesCount, setMissingImagesCount] = useState<number | null>(null);

  const loadMissingImagesCount = async () => {
    const { count } = await supabase
      .from("games_cache")
      .select("*", { count: "exact", head: true })
      .or("game_image.is.null,game_image.eq.");
    if (count !== null) setMissingImagesCount(count);
  };

  const fetchMissingImages = async () => {
    setIsFetchingImages(true);
    setImageFetchResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-game-images", {
        body: { use_fallback: true },
      });
      if (error) { toast.error("Image fetch failed"); }
      else {
        setImageFetchResult({ updated: data.updated ?? 0, not_found: data.not_found ?? 0 });
        toast.success(`Updated ${data.updated} game images`);
        loadMissingImagesCount();
      }
    } catch { toast.error("Image fetch error"); }
    setIsFetchingImages(false);
  };

  const tokenExpiry = tokenInfo?.expire_at ? new Date(tokenInfo.expire_at * 1000) : null;
  const isTokenExpired = tokenExpiry ? tokenExpiry < new Date() : false;
  const timeUntilExpiry = tokenExpiry ? Math.max(0, Math.floor((tokenExpiry.getTime() - Date.now()) / 60000)) : null;

  const statusItems = [
    { label: "Base URL", value: "https://api.lootbar.gg", ok: true },
    { label: "Edge Function Proxy", value: "supabase/functions/lootbar-proxy", ok: apiStatus !== false },
    { label: "API Connection", value: apiStatus === true ? "Connected" : apiStatus === false ? "Disconnected" : "Checking…", ok: apiStatus === true },
    { label: "Token Status", value: tokenExpiry ? (isTokenExpired ? "EXPIRED" : `Valid · expires in ${timeUntilExpiry}m`) : "Unknown", ok: !isTokenExpired },
    { label: "Token Storage", value: "Supabase DB (lootbar_tokens)", ok: true },
    { label: "Webhook Handler", value: "supabase/functions/lootbar-notify", ok: true },
    { label: "Auto Token Refresh", value: "Refreshes 5 min before expiry", ok: true },
    { label: "Callback Key", value: "Stored server-side (never exposed)", ok: true },
  ];

  return (
    <AdminLayout title="API Status">
      <div className="space-y-6 max-w-3xl">
        {/* Status overview */}
        <div className={`rounded-2xl p-6 ${apiStatus === true ? "bg-green-900/30 border border-green-400/30" : apiStatus === false ? "bg-red-900/30 border border-red-400/30" : "bg-[#1a1a1a] border border-white/10"}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${apiStatus === true ? "bg-green-400" : apiStatus === false ? "bg-red-400" : "bg-gray-400 animate-pulse"}`} />
            <p className={`font-bold text-lg ${apiStatus === true ? "text-green-400" : apiStatus === false ? "text-red-400" : "text-gray-300"}`}>
              {apiStatus === true ? "Lootbar API — Live" : apiStatus === false ? "Lootbar API — Offline" : "Checking API status…"}
            </p>
          </div>
          <p className="text-sm text-gray-400">
            {apiStatus === true ? "All systems operational. Orders can be processed." : apiStatus === false ? "Connection to Lootbar API failed. Check the edge function logs." : "Connecting to API…"}
          </p>
        </div>

        {/* Balance */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white">Reseller Balance</h3>
            <button onClick={fetchBalance} disabled={isLoadingBalance} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-xl">
              <RefreshCw size={12} className={isLoadingBalance ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          <p className="text-3xl font-black text-yellow-400">${isLoadingBalance ? "—" : parseFloat(balance || "0").toFixed(2)} <span className="text-sm text-gray-500 font-normal">USD</span></p>
        </div>

        {/* Status details */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Connection Details</h3>
            <button onClick={checkApi} disabled={isChecking} className="flex items-center gap-1.5 bg-yellow-400 text-black font-bold text-xs px-3 py-2 rounded-xl hover:bg-yellow-300">
              <Zap size={12} /> {isChecking ? "Checking…" : "Re-check"}
            </button>
          </div>
          <div className="space-y-3">
            {statusItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{item.value}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.ok ? "bg-green-400" : "bg-red-400"}`} />
                  <span className={`text-xs font-semibold ${item.ok ? "text-green-400" : "text-red-400"}`}>{item.ok ? "OK" : "Error"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Missing Images Indicator */}
        {missingImagesCount !== null && missingImagesCount > 0 && (
          <div className="bg-orange-900/30 border border-orange-400/30 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-orange-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-orange-300 font-semibold text-sm">{missingImagesCount} games missing images</p>
              <p className="text-orange-500/70 text-xs mt-0.5">Use the Fetch Images button below to auto-fill them</p>
            </div>
            <button onClick={loadMissingImagesCount} className="text-orange-400 hover:text-orange-300">
              <RefreshCw size={14} />
            </button>
          </div>
        )}
        {missingImagesCount === 0 && (
          <div className="bg-green-900/20 border border-green-400/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <p className="text-green-400 text-sm font-semibold">All games have images</p>
          </div>
        )}

        {/* Auto Image Fetcher */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-white">Auto Game Images</h3>
              <p className="text-xs text-gray-500 mt-0.5">Fetch missing images from RAWG database (up to 50 games){missingImagesCount !== null ? ` · ${missingImagesCount} missing` : ""}</p>
            </div>
            <button onClick={fetchMissingImages} disabled={isFetchingImages} className="flex items-center gap-1.5 bg-purple-500 text-white font-bold text-xs px-3 py-2 rounded-xl hover:bg-purple-400 disabled:opacity-50">
              <Image size={12} className={isFetchingImages ? "animate-pulse" : ""} />
              {isFetchingImages ? "Fetching…" : "Fetch Images"}
            </button>
          </div>
          {imageFetchResult && (
            <div className="bg-white/5 rounded-xl p-3 text-sm">
              <p className="text-green-400 font-semibold">{imageFetchResult.updated} images updated</p>
              {imageFetchResult.not_found > 0 && <p className="text-gray-500 text-xs mt-0.5">{imageFetchResult.not_found} games not found on RAWG</p>}
            </div>
          )}
          <div className="mt-3 text-xs text-gray-600 space-y-1">
            <p>Source priority: <span className="text-blue-400 font-mono">SerpApi (lootbar query)</span> → <span className="text-yellow-400 font-mono">RAWG</span> → <span className="text-purple-400 font-mono">IGDB</span> → Unsplash fallback</p>
            <p>SerpApi: <span className="font-mono">serpapi.com</span> · RAWG: free key at <span className="font-mono">rawg.io/apidocs</span> · IGDB: Twitch dev account at <span className="font-mono">dev.twitch.tv</span></p>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
          <h3 className="font-bold text-white mb-3">Token Lifecycle</h3>
          <div className="text-sm text-gray-400 space-y-1.5">
            <p>1. Edge function logs in automatically on first use</p>
            <p>2. Token stored server-side in <span className="font-mono text-yellow-400">lootbar_tokens</span> table</p>
            <p>3. Token auto-refreshed 5 minutes before expiry</p>
            <p>4. Callback key stored server-side — never exposed to client</p>
          </div>
          {tokenInfo && (
            <div className="mt-4 p-3 bg-white/5 rounded-xl">
              <p className="text-xs text-gray-500">Last token stored: {new Date(tokenInfo.created_at!).toLocaleString()}</p>
              {tokenExpiry && <p className={`text-xs mt-0.5 ${isTokenExpired ? "text-red-400" : "text-green-400"}`}>
                Expires: {tokenExpiry.toLocaleString()} {isTokenExpired ? "(EXPIRED)" : `(in ${timeUntilExpiry} min)`}
              </p>}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
