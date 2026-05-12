// ======================================
// LOOTBAR API TYPES
// ======================================

export interface LootbarToken {
  token: string;
  callback_key: string;
  expire_at: number;
}

export interface LootbarGame {
  game_id: string;
  game_name: string;
  game_image?: string;
  category?: string;
  rating?: number;
  sold_count?: string;
  is_hot?: boolean;
  discount?: number;
  min_price?: number | null;
}

export interface SkuAttribute {
  key: string;
  key_text: string;
  value: string;
  value_text: string;
}

export interface SkuExtraInfo {
  name: string;
  title: string;
  type: "input" | "select" | "text";
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface SkuItem {
  sku_id: string;
  sku_name: string;
  attribute: SkuAttribute[];
  extra_info: SkuExtraInfo[];
  price?: number;
  original_price?: number;
  discount_amount?: number;
  image?: string;
  game_id?: string;
}

export interface OrderProduct {
  sku_id: string;
  num: number;
}

export interface CreateOrderRequest {
  reference_id: string;
  game_id: string;
  product: OrderProduct[];
  extra_info: Record<string, string>;
  callback_url: string;
}

export interface Order {
  id: string;
  reference_id: string;
  order_id: string;
  game_id: string;
  game_name: string;
  sku_name: string;
  price: number;
  state: OrderState;
  created_at: string;
  updated_at: string;
  extra_info: Record<string, string>;
}

export type OrderState = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const ORDER_STATE_MAP: Record<OrderState, { label: string; color: string; bg: string }> = {
  1: { label: "In Transaction", color: "text-blue-600", bg: "bg-blue-50" },
  2: { label: "Success", color: "text-green-600", bg: "bg-green-50" },
  3: { label: "Failed", color: "text-red-600", bg: "bg-red-50" },
  4: { label: "Settlement", color: "text-purple-600", bg: "bg-purple-50" },
  5: { label: "Partially Successful", color: "text-orange-600", bg: "bg-orange-50" },
  6: { label: "Cancelled", color: "text-gray-600", bg: "bg-gray-100" },
  7: { label: "Deleted", color: "text-gray-400", bg: "bg-gray-50" },
};

// ======================================
// APP TYPES
// ======================================

export interface User {
  id: string;
  nickname: string;
  email: string;
  avatar?: string;
  balance: number;
  points: number;
  coupons: number;
  role: "user" | "admin";
}

export interface CartItem {
  sku: SkuItem;
  game: LootbarGame;
  quantity: number;
  extra_info: Record<string, string>;
}

export interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ApiResponse<T> {
  status: "ok" | "error";
  msg?: string;
  data: T;
}
