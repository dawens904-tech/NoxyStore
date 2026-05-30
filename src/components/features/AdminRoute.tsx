import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";

// Emails with instant admin access (no DB query required)
const ADMIN_EMAIL_WHITELIST = new Set([
  "berryxoe@gmail.com",
]);

interface Props {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: Props) {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    if (!user) {
      setStatus("denied");
      return;
    }

    // Fast-path: whitelisted email → instant allow
    if (ADMIN_EMAIL_WHITELIST.has(user.email)) {
      setStatus("allowed");
      return;
    }

    // Fast-path: role already cached in store
    if ((user as any).role === "admin") {
      setStatus("allowed");
      return;
    }

    // DB check (only for non-whitelisted, non-cached users)
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("email", user.email)
      .eq("role", "admin")
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setStatus(data ? "allowed" : "denied");
      });

    return () => { cancelled = true; };
  }, [user]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
