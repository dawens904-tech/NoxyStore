import type { LootbarGame, SkuItem } from "@/types";

// ======================================
// MOCK GAMES DATA (mirrors Lootbar API structure)
// ======================================
export const MOCK_GAMES: LootbarGame[] = [
  {
    game_id: "1003",
    game_name: "Genshin Impact",
    game_image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&h=400&fit=crop&q=80",
    category: "Top Up",
    rating: 5.0,
    sold_count: "100k+",
    is_hot: true,
    discount: 0,
  },
  {
    game_id: "1005",
    game_name: "Honkai: Star Rail",
    game_image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&q=80",
    category: "Top Up",
    rating: 5.0,
    sold_count: "100k+",
    is_hot: true,
    discount: 0,
  },
  {
    game_id: "1006",
    game_name: "Zenless Zone Zero",
    game_image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop&q=80",
    category: "Top Up",
    rating: 5.0,
    sold_count: "100k+",
    is_hot: false,
    discount: 0,
  },
  {
    game_id: "1002",
    game_name: "Free Fire",
    game_image: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=400&h=400&fit=crop&q=80",
    category: "Top Up",
    rating: 4.9,
    sold_count: "100k+",
    is_hot: true,
    discount: 5,
  },
  {
    game_id: "1004",
    game_name: "PUBG Mobile",
    game_image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=400&fit=crop&q=80",
    category: "Top Up",
    rating: 4.8,
    sold_count: "100k+",
    is_hot: true,
    discount: 0,
  },
  {
    game_id: "1001",
    game_name: "Mobile Legends",
    game_image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=400&fit=crop&q=80",
    category: "Top Up",
    rating: 4.9,
    sold_count: "100k+",
    is_hot: false,
    discount: 14,
  },
  {
    game_id: "1007",
    game_name: "Valorant",
    game_image: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&q=80",
    category: "Game Coins",
    rating: 4.8,
    sold_count: "50k+",
    is_hot: false,
    discount: 10,
  },
  {
    game_id: "1008",
    game_name: "League of Legends",
    game_image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=400&fit=crop&q=80",
    category: "Game Coins",
    rating: 4.7,
    sold_count: "50k+",
    is_hot: false,
    discount: 8,
  },
  {
    game_id: "1009",
    game_name: "Call of Duty Mobile",
    game_image: "https://images.unsplash.com/photo-1563207153-f403bf289096?w=400&h=400&fit=crop&q=80",
    category: "Top Up",
    rating: 4.6,
    sold_count: "30k+",
    is_hot: false,
    discount: 0,
  },
  {
    game_id: "1010",
    game_name: "Clash of Clans",
    game_image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=400&fit=crop&q=80",
    category: "Top Up",
    rating: 4.5,
    sold_count: "20k+",
    is_hot: false,
    discount: 0,
  },
  {
    game_id: "1011",
    game_name: "Brawl Stars",
    game_image: "https://images.unsplash.com/photo-1535223289429-462ece25a154?w=400&h=400&fit=crop&q=80",
    category: "Top Up",
    rating: 4.7,
    sold_count: "25k+",
    is_hot: false,
    discount: 0,
  },
  {
    game_id: "1012",
    game_name: "Steam Wallet",
    game_image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400&h=400&fit=crop&q=80",
    category: "Gift Card",
    rating: 5.0,
    sold_count: "80k+",
    is_hot: true,
    discount: 0,
  },
];

// ======================================
// MOCK SKUs PER GAME
// ======================================
export const MOCK_SKUS: Record<string, SkuItem[]> = {
  "1003": [ // Genshin Impact
    {
      sku_id: "gen_60", sku_name: "60 Genesis Crystals",
      attribute: [{ key: "region", key_text: "Server", value: "os_asia", value_text: "Asia" }],
      extra_info: [{ name: "uid", title: "UID", type: "input", required: true, placeholder: "Enter your UID" }],
      price: 0.99, original_price: 0.99, discount_amount: 0,
      image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=200&h=200&fit=crop",
      game_id: "1003",
    },
    {
      sku_id: "gen_300", sku_name: "300 + 30 Genesis Crystals",
      attribute: [{ key: "region", key_text: "Server", value: "os_asia", value_text: "Asia" }],
      extra_info: [{ name: "uid", title: "UID", type: "input", required: true, placeholder: "Enter your UID" }],
      price: 4.99, original_price: 5.49, discount_amount: 0.50,
      image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=200&h=200&fit=crop",
      game_id: "1003",
    },
    {
      sku_id: "gen_980", sku_name: "980 + 110 Genesis Crystals",
      attribute: [{ key: "region", key_text: "Server", value: "os_asia", value_text: "Asia" }],
      extra_info: [{ name: "uid", title: "UID", type: "input", required: true, placeholder: "Enter your UID" }],
      price: 14.99, original_price: 16.49, discount_amount: 1.50,
      image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=200&h=200&fit=crop",
      game_id: "1003",
    },
    {
      sku_id: "gen_1980", sku_name: "1980 + 260 Genesis Crystals",
      attribute: [{ key: "region", key_text: "Server", value: "os_asia", value_text: "Asia" }],
      extra_info: [{ name: "uid", title: "UID", type: "input", required: true, placeholder: "Enter your UID" }],
      price: 29.99, original_price: 32.99, discount_amount: 3.00,
      image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=200&h=200&fit=crop",
      game_id: "1003",
    },
    {
      sku_id: "gen_3280", sku_name: "3280 + 600 Genesis Crystals",
      attribute: [{ key: "region", key_text: "Server", value: "os_asia", value_text: "Asia" }],
      extra_info: [{ name: "uid", title: "UID", type: "input", required: true, placeholder: "Enter your UID" }],
      price: 49.99, original_price: 54.99, discount_amount: 5.00,
      image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=200&h=200&fit=crop",
      game_id: "1003",
    },
    {
      sku_id: "gen_6480", sku_name: "6480 + 1600 Genesis Crystals",
      attribute: [{ key: "region", key_text: "Server", value: "os_asia", value_text: "Asia" }],
      extra_info: [{ name: "uid", title: "UID", type: "input", required: true, placeholder: "Enter your UID" }],
      price: 99.99, original_price: 109.99, discount_amount: 10.00,
      image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=200&h=200&fit=crop",
      game_id: "1003",
    },
  ],
  "1002": [ // Free Fire
    {
      sku_id: "ff_100", sku_name: "100 Diamonds",
      attribute: [{ key: "region", key_text: "Server", value: "ff_my", value_text: "Malaysia/Singapore" }],
      extra_info: [
        { name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" },
        { name: "server", title: "Server", type: "select", required: true, options: [
          { value: "my", label: "Malaysia/Singapore" },
          { value: "id", label: "Indonesia" },
          { value: "th", label: "Thailand" },
          { value: "vn", label: "Vietnam" },
        ]},
      ],
      price: 1.99, original_price: 2.09, discount_amount: 0.10,
      image: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=200&h=200&fit=crop",
      game_id: "1002",
    },
    {
      sku_id: "ff_310", sku_name: "310 Diamonds",
      attribute: [{ key: "region", key_text: "Server", value: "ff_my", value_text: "Malaysia/Singapore" }],
      extra_info: [
        { name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" },
        { name: "server", title: "Server", type: "select", required: true, options: [
          { value: "my", label: "Malaysia/Singapore" },
          { value: "id", label: "Indonesia" },
          { value: "th", label: "Thailand" },
        ]},
      ],
      price: 3.76, original_price: 3.95, discount_amount: 0.19,
      image: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=200&h=200&fit=crop",
      game_id: "1002",
    },
    {
      sku_id: "ff_520", sku_name: "520 Diamonds",
      attribute: [{ key: "region", key_text: "Server", value: "ff_br", value_text: "Brazil" }],
      extra_info: [
        { name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" },
      ],
      price: 6.49, original_price: 6.99, discount_amount: 0.50,
      image: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=200&h=200&fit=crop",
      game_id: "1002",
    },
    {
      sku_id: "ff_1060", sku_name: "1060 Diamonds",
      attribute: [{ key: "region", key_text: "Server", value: "ff_my", value_text: "Malaysia/Singapore" }],
      extra_info: [
        { name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" },
      ],
      price: 13.38, original_price: 14.08, discount_amount: 0.70,
      image: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=200&h=200&fit=crop",
      game_id: "1002",
    },
    {
      sku_id: "ff_2180", sku_name: "2180 Diamonds",
      attribute: [{ key: "region", key_text: "Server", value: "ff_my", value_text: "Malaysia/Singapore" }],
      extra_info: [
        { name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" },
      ],
      price: 26.76, original_price: 28.16, discount_amount: 1.40,
      image: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=200&h=200&fit=crop",
      game_id: "1002",
    },
    {
      sku_id: "ff_5600", sku_name: "5600+560 Diamonds",
      attribute: [{ key: "region", key_text: "Server", value: "ff_my", value_text: "Malaysia/Singapore" }],
      extra_info: [
        { name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" },
      ],
      price: 44.04, original_price: 46.35, discount_amount: 2.31,
      image: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=200&h=200&fit=crop",
      game_id: "1002",
    },
  ],
  "1004": [ // PUBG Mobile
    {
      sku_id: "pubg_60", sku_name: "60 UC",
      attribute: [{ key: "region", key_text: "Server", value: "pubg_global", value_text: "Global" }],
      extra_info: [{ name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" }],
      price: 0.99, original_price: 0.99, discount_amount: 0,
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop",
      game_id: "1004",
    },
    {
      sku_id: "pubg_325", sku_name: "325 UC",
      attribute: [{ key: "region", key_text: "Server", value: "pubg_global", value_text: "Global" }],
      extra_info: [{ name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" }],
      price: 4.99, original_price: 4.99, discount_amount: 0,
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop",
      game_id: "1004",
    },
    {
      sku_id: "pubg_660", sku_name: "660 UC",
      attribute: [{ key: "region", key_text: "Server", value: "pubg_global", value_text: "Global" }],
      extra_info: [{ name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" }],
      price: 9.99, original_price: 9.99, discount_amount: 0,
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop",
      game_id: "1004",
    },
    {
      sku_id: "pubg_1800", sku_name: "1800 UC",
      attribute: [{ key: "region", key_text: "Server", value: "pubg_global", value_text: "Global" }],
      extra_info: [{ name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" }],
      price: 24.99, original_price: 24.99, discount_amount: 0,
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop",
      game_id: "1004",
    },
  ],
  "1001": [ // Mobile Legends
    {
      sku_id: "ml_56", sku_name: "56 Diamonds",
      attribute: [{ key: "region", key_text: "Server", value: "ml_sea", value_text: "SEA" }],
      extra_info: [
        { name: "uid", title: "User ID", type: "input", required: true, placeholder: "Enter your User ID" },
        { name: "server", title: "Zone ID", type: "input", required: true, placeholder: "Enter Zone ID" },
      ],
      price: 0.99, original_price: 1.15, discount_amount: 0.16,
      image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=200&h=200&fit=crop",
      game_id: "1001",
    },
    {
      sku_id: "ml_172", sku_name: "172 Diamonds",
      attribute: [{ key: "region", key_text: "Server", value: "ml_sea", value_text: "SEA" }],
      extra_info: [
        { name: "uid", title: "User ID", type: "input", required: true, placeholder: "Enter your User ID" },
        { name: "server", title: "Zone ID", type: "input", required: true, placeholder: "Enter Zone ID" },
      ],
      price: 2.99, original_price: 3.45, discount_amount: 0.46,
      image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=200&h=200&fit=crop",
      game_id: "1001",
    },
    {
      sku_id: "ml_257", sku_name: "257 Diamonds",
      attribute: [{ key: "region", key_text: "Server", value: "ml_sea", value_text: "SEA" }],
      extra_info: [
        { name: "uid", title: "User ID", type: "input", required: true, placeholder: "Enter your User ID" },
        { name: "server", title: "Zone ID", type: "input", required: true, placeholder: "Enter Zone ID" },
      ],
      price: 4.49, original_price: 5.19, discount_amount: 0.70,
      image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=200&h=200&fit=crop",
      game_id: "1001",
    },
    {
      sku_id: "ml_706", sku_name: "706 Diamonds",
      attribute: [{ key: "region", key_text: "Server", value: "ml_sea", value_text: "SEA" }],
      extra_info: [
        { name: "uid", title: "User ID", type: "input", required: true, placeholder: "Enter your User ID" },
        { name: "server", title: "Zone ID", type: "input", required: true, placeholder: "Enter Zone ID" },
      ],
      price: 11.99, original_price: 13.99, discount_amount: 2.00,
      image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=200&h=200&fit=crop",
      game_id: "1001",
    },
  ],
  "1005": [ // Honkai: Star Rail
    {
      sku_id: "hsr_60", sku_name: "60 Oneiric Shards",
      attribute: [{ key: "region", key_text: "Server", value: "os_asia", value_text: "Asia" }],
      extra_info: [{ name: "uid", title: "UID", type: "input", required: true, placeholder: "Enter your UID" }],
      price: 0.99, original_price: 0.99, discount_amount: 0,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop",
      game_id: "1005",
    },
    {
      sku_id: "hsr_300", sku_name: "300 + 30 Oneiric Shards",
      attribute: [{ key: "region", key_text: "Server", value: "os_asia", value_text: "Asia" }],
      extra_info: [{ name: "uid", title: "UID", type: "input", required: true, placeholder: "Enter your UID" }],
      price: 4.99, original_price: 4.99, discount_amount: 0,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop",
      game_id: "1005",
    },
    {
      sku_id: "hsr_980", sku_name: "980 + 110 Oneiric Shards",
      attribute: [{ key: "region", key_text: "Server", value: "os_asia", value_text: "Asia" }],
      extra_info: [{ name: "uid", title: "UID", type: "input", required: true, placeholder: "Enter your UID" }],
      price: 14.99, original_price: 14.99, discount_amount: 0,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop",
      game_id: "1005",
    },
    {
      sku_id: "hsr_1980", sku_name: "1980 + 260 Oneiric Shards",
      attribute: [{ key: "region", key_text: "Server", value: "os_asia", value_text: "Asia" }],
      extra_info: [{ name: "uid", title: "UID", type: "input", required: true, placeholder: "Enter your UID" }],
      price: 29.99, original_price: 29.99, discount_amount: 0,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop",
      game_id: "1005",
    },
  ],
};

// For games without specific SKUs, generate generic ones
export function getGenericSkus(gameId: string, gameName: string): SkuItem[] {
  const game = MOCK_GAMES.find(g => g.game_id === gameId);
  const image = game?.game_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop";
  return [
    {
      sku_id: `${gameId}_s`, sku_name: "Starter Pack",
      attribute: [{ key: "region", key_text: "Server", value: "global", value_text: "Global" }],
      extra_info: [{ name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" }],
      price: 4.99, original_price: 5.49, discount_amount: 0.50, image, game_id: gameId,
    },
    {
      sku_id: `${gameId}_m`, sku_name: "Standard Pack",
      attribute: [{ key: "region", key_text: "Server", value: "global", value_text: "Global" }],
      extra_info: [{ name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" }],
      price: 9.99, original_price: 11.49, discount_amount: 1.50, image, game_id: gameId,
    },
    {
      sku_id: `${gameId}_l`, sku_name: "Premium Pack",
      attribute: [{ key: "region", key_text: "Server", value: "global", value_text: "Global" }],
      extra_info: [{ name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" }],
      price: 19.99, original_price: 22.99, discount_amount: 3.00, image, game_id: gameId,
    },
    {
      sku_id: `${gameId}_xl`, sku_name: "Ultimate Pack",
      attribute: [{ key: "region", key_text: "Server", value: "global", value_text: "Global" }],
      extra_info: [{ name: "uid", title: "Player ID", type: "input", required: true, placeholder: "Enter your Player ID" }],
      price: 49.99, original_price: 54.99, discount_amount: 5.00, image, game_id: gameId,
    },
  ];
}

export const CATEGORIES = ["All", "Top Up", "Game Coins", "Gift Card", "Game Keys", "Game Items"];

export const BANNER_IMAGES = [
  {
    id: 1,
    image: "/src/assets/hero-banner-1.jpg",
    title: "New: Exclusive Deals",
    subtitle: "Coupon code: NOXYSTORE",
    fallback: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=400&fit=crop&q=80",
  },
  {
    id: 2,
    image: "/src/assets/hero-banner-2.jpg",
    title: "Genshin Impact",
    subtitle: "Up to 10% OFF Crystals",
    fallback: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&h=400&fit=crop&q=80",
  },
  {
    id: 3,
    image: "/src/assets/hero-banner-3.jpg",
    title: "Top Up & Save",
    subtitle: "Safe & Fast 24/7",
    fallback: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=400&fit=crop&q=80",
  },
];
remove this page no demo service in my store remove all this page delete it.
