import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Order } from "@/types";
import { supabase } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  orders: Order[];
  isLoading: boolean;

  login: (userData: Partial<User>) => void;
  logout: () => void;
  updateBalance: (amount: number) => void;
  addOrder: (order: Order) => void;
  updateOrderState: (referenceId: string, state: number) => void;
  setLoading: (loading: boolean) => void;
  syncOrdersFromDB: (email: string) => Promise<void>;
}

function mapSupabaseUser(supabaseUser: { id: string; email?: string; user_metadata?: Record<string, string> }, role = "user"): User {
  return {
    id: supabaseUser.id,
    nickname: supabaseUser.user_metadata?.username || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "Gamer",
    email: supabaseUser.email ?? "",
    balance: 0,
    points: 39,
    coupons: 0,
    role: role as "user" | "admin",
    avatar: supabaseUser.user_metadata?.avatar_url,
  };
}

export { mapSupabaseUser };

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      orders: [],
      isLoading: false,

      login: (userData) =>
        set({
          user: {
            id: userData.id || `user_${Date.now()}`,
            nickname: userData.nickname || "Gamer",
            email: userData.email || "",
            balance: userData.balance || 0,
            points: userData.points || 39,
            coupons: userData.coupons || 0,
            role: userData.role || "user",
            avatar: userData.avatar,
          },
          isAuthenticated: true,
        }),

      logout: async () => {
        try { await supabase.auth.signOut(); } catch {}
        set({ user: null, isAuthenticated: false, orders: [] });
      },

      updateBalance: (amount) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, balance: Math.max(0, state.user.balance + amount) }
            : null,
        })),

      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
        })),

      updateOrderState: (referenceId, orderState) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.reference_id === referenceId ? { ...o, state: orderState as Order["state"] } : o
          ),
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      syncOrdersFromDB: async (email: string) => {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("user_email", email)
          .order("created_at", { ascending: false })
          .limit(50);
        if (data && data.length > 0) {
          set({ orders: data as Order[] });
        }
      },
    }),
    {
      name: "noxy-auth-store",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        orders: state.orders,
      }),
    }
  )
);
