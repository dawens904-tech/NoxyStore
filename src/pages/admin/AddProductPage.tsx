import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Users,
  Store,
  TrendingUp,
  CreditCard,
  Settings,
  ArrowLeft,
  Upload,
  Plus,
  X,
  Save,
  Image as ImageIcon,
  Trash2,
  GripVertical,
  Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProductStore } from '@/stores/productStore';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductDenomination, ProductRegion, InfoModalContent, DescriptionBlock, ProductServer } from '@/types';

export default function AddProductPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addProduct } = useProductStore();

  const [formData, setFormData] = useState({
    name: '',
    nameColor: '',
    category: '' as Product['category'] | '',
    image: '',
    sku: '',
    isActive: true,
    shortDescription: '',
    howToUse: '',
    howToUseLong: '',
    requiresPlayerId: false,
    playerIdLabel: '',
    requiresRegion: false,
    requiresServerSelection: false,
    priceAdjustmentType: 'none' as 'none' | 'percentage' | 'fixed',
    priceAdjustmentValue: 0
  });

  const [denominations, setDenominations] = useState<ProductDenomination[]>([]);
  const [regions, setRegions] = useState<ProductRegion[]>([]);
  const [servers, setServers] = useState<ProductServer[]>([]);
  const [infoModal, setInfoModal] = useState<InfoModalContent>({
    description: '',
    image: '',
    steps: []
  });
  const [descriptionBlocks, setDescriptionBlocks] = useState<DescriptionBlock[]>([]);

  // Denomination Management
  const addDenomination = () => {
    const newDenom: ProductDenomination = {
      id: `denom-${Date.now()}`,
      name: '',
      image: '',
      originalPrice: 0,
      salePrice: 0,
      discount: 0,
      isAvailable: true,
      order: denominations.length
    };
    setDenominations([...denominations, newDenom]);
  };

  const updateDenomination = (id: string, field: keyof ProductDenomination, value: any) => {
    setDenominations(denoms =>
      denoms.map(d => {
        if (d.id !== id) return d;
        const updated = { ...d, [field]: value };
        
        // Auto-calculate discount
        if (field === 'originalPrice' || field === 'salePrice') {
          const orig = field === 'originalPrice' ? parseFloat(value as string) : d.originalPrice;
          const sale = field === 'salePrice' ? parseFloat(value as string) : d.salePrice;
          if (orig > 0 && sale > 0) {
            updated.discount = Math.round(((orig - sale) / orig) * 100);
          }
        }
        
        return updated;
      })
    );
  };

  const removeDenomination = (id: string) => {
    setDenominations(denoms => denoms.filter(d => d.id !== id));
  };

  const moveDenomination = (id: string, direction: 'up' | 'down') => {
    const index = denominations.findIndex(d => d.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= denominations.length) return;
    
    const newDenoms = [...denominations];
    [newDenoms[index], newDenoms[newIndex]] = [newDenoms[newIndex], newDenoms[index]];
    newDenoms.forEach((d, i) => d.order = i);
    setDenominations(newDenoms);
  };

  // Region Management
  const addRegion = () => {
    const newRegion: ProductRegion = {
      id: `region-${Date.now()}`,
      name: '',
      code: '',
      isAvailable: true
    };
    setRegions([...regions, newRegion]);
  };

  const updateRegion = (id: string, field: keyof ProductRegion, value: any) => {
    setRegions(regions.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeRegion = (id: string) => {
    setRegions(regions.filter(r => r.id !== id));
  };

  // Server Management
  const addServer = () => {
    const newServer: ProductServer = {
      id: `server-${Date.now()}`,
      name: '',
      price: 0
    };
    setServers([...servers, newServer]);
  };

  const updateServer = (id: string, field: keyof ProductServer, value: any) => {
    setServers(servers.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeServer = (id: string) => {
    setServers(servers.filter(s => s.id !== id));
  };

  // Description Blocks Management
  const addDescriptionBlock = (type: DescriptionBlock['type']) => {
    setDescriptionBlocks([...descriptionBlocks, {
      id: `block-${Date.now()}`,
      type,
      content: '',
      imageUrl: type === 'image' || type === 'image-with-instruction' ? '' : undefined,
      instruction: type === 'image-with-instruction' ? '' : undefined
    }]);
  };

  const updateDescriptionBlock = (id: string, field: keyof DescriptionBlock, value: string) => {
    setDescriptionBlocks(blocks =>
      blocks.map(b => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const removeDescriptionBlock = (id: string) => {
    setDescriptionBlocks(blocks => blocks.filter(b => b.id !== id));
  };

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.category || !formData.sku) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in product name, category, and SKU',
        variant: 'destructive'
      });
      return;
    }

    if (denominations.length === 0) {
      toast({
        title: 'No Denominations',
        description: 'Please add at least one product denomination',
        variant: 'destructive'
      });
      return;
    }

    if (formData.requiresRegion && regions.length === 0) {
      toast({
        title: 'No Regions',
        description: 'Please add at least one region',
        variant: 'destructive'
      });
      return;
    }

    if (formData.requiresServerSelection && servers.length === 0) {
      toast({
        title: 'No Servers',
        description: 'Please add at least one server',
        variant: 'destructive'
      });
      return;
    }

    // Calculate average price from denominations
    const avgOriginalPrice = denominations.reduce((sum, d) => sum + d.originalPrice, 0) / denominations.length;
    const avgSalePrice = denominations.reduce((sum, d) => sum + d.salePrice, 0) / denominations.length;

    const newProduct: Product = {
      id: `product-${Date.now()}`,
      name: formData.name,
      nameColor: formData.nameColor || undefined,
      category: formData.category,
      image: denominations[0]?.image || formData.image || 'https://via.placeholder.com/400',
      discount: Math.round(((avgOriginalPrice - avgSalePrice) / avgOriginalPrice) * 100),
      rating: 5.0,
      reviewCount: 0,
      soldCount: '0',
      originalPrice: avgOriginalPrice,
      salePrice: avgSalePrice,
      sku: formData.sku,
      isInstant: true,
      shortDescription: formData.shortDescription,
      fullDescription: '',
      howToUse: formData.howToUse,
      howToUseLong: formData.howToUseLong,
      requiresPlayerId: formData.requiresPlayerId,
      playerIdLabel: formData.playerIdLabel || undefined,
      requiresServer: formData.requiresServerSelection,
      requiresRegion: formData.requiresRegion,
      pricingType: formData.requiresServerSelection ? 'server' : 'quantity',
      denominations,
      availableRegions: formData.requiresRegion ? regions : undefined,
      servers: formData.requiresServerSelection ? servers : undefined,
      infoModalContent: infoModal.description ? infoModal : undefined,
      descriptionBlocks: descriptionBlocks.length > 0 ? descriptionBlocks : undefined,
      priceAdjustment: formData.priceAdjustmentType !== 'none' ? {
        type: formData.priceAdjustmentType,
        value: formData.priceAdjustmentValue
      } : undefined,
      isActive: formData.isActive,
      visibilityTags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    addProduct(newProduct);

    toast({
      title: 'Product Created',
      description: `${formData.name} has been successfully created`
    });

    navigate('/admin/products');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Package, label: 'Products', path: '/admin/products', active: true },
    { icon: Layers, label: 'Categories', path: '/admin/categories' },
    { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: Store, label: 'Stores', path: '/admin/stores' },
    { icon: TrendingUp, label: 'Affiliate', path: '/admin/affiliate' },
    { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' }
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold">NoxyStore Admin</h1>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8 pb-20">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/products')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <h2 className="text-2xl font-bold mb-2">Add New Product</h2>
          <p className="text-gray-600">Create a professional product with full configuration</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-6xl space-y-8">
          {/* 1. Basic Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              1️⃣ Basic Information
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Product Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Free Fire, Call of Duty, PUBG Mobile"
                  required
                  className="text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Product['category'] })}
                  className="w-full px-4 py-2.5 border rounded-lg bg-white"
                  required
                >
                  <option value="">Select category</option>
                  <option value="top-up">Games - Top Up</option>
                  <option value="gift-card">Gift Cards</option>
                  <option value="game-coins">Game Coins</option>
                  <option value="game-items">Game Items</option>
                  <option value="cdkey">CD KEY</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">SKU (Unique ID) *</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g., FF-DIAM-001"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <div className="font-medium">Product Status: {formData.isActive ? '✅ Active' : '⚠️ Disabled'}</div>
                    <div className="text-sm text-gray-500">
                      {formData.isActive ? 'Product is visible and purchasable' : 'Product is hidden from customers'}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* 2. Region System (Optional) */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              2️⃣ Region System (Optional & Multi-Region)
            </h3>

            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 mb-6">
              <input
                type="checkbox"
                checked={formData.requiresRegion}
                onChange={(e) => setFormData({ ...formData, requiresRegion: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              <div>
                <div className="font-medium">Require Region Selection</div>
                <div className="text-sm text-gray-500">Enable if this product has different options per region (e.g., USA, Brazil, Europe)</div>
              </div>
            </label>

            {formData.requiresRegion && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="font-medium">Available Regions</label>
                  <Button type="button" size="sm" onClick={addRegion}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Region
                  </Button>
                </div>

                <div className="space-y-3">
                  {regions.map((region) => (
                    <div key={region.id} className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50">
                      <Input
                        placeholder="Region Name (e.g., USA&Latam, Brazil, Malaysia/Singapore)"
                        value={region.name}
                        onChange={(e) => updateRegion(region.id, 'name', e.target.value)}
                        className="flex-1 bg-white"
                      />
                      <Input
                        placeholder="Code (e.g., usa)"
                        value={region.code}
                        onChange={(e) => updateRegion(region.id, 'code', e.target.value.toLowerCase())}
                        className="w-32 bg-white"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRegion(region.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {regions.length === 0 && (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                      No regions added yet. Click "Add Region" to start.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Server Requirement (Optional) */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Server className="h-5 w-5 text-green-600" />
              3️⃣ Server Requirement (Optional)
            </h3>

            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 mb-6">
              <input
                type="checkbox"
                checked={formData.requiresServerSelection}
                onChange={(e) => setFormData({ ...formData, requiresServerSelection: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              <div>
                <div className="font-medium">Require Server Selection</div>
                <div className="text-sm text-gray-500">Enable if customers must select their game server during checkout (e.g., Brazil, NA, EU)</div>
              </div>
            </label>

            {formData.requiresServerSelection && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="font-medium">Available Servers</label>
                  <Button type="button" size="sm" onClick={addServer}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Server
                  </Button>
                </div>

                <div className="space-y-3">
                  {servers.map((server) => (
                    <div key={server.id} className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50">
                      <Input
                        placeholder="Server Name (e.g., Brazil, NA, EU, Asia)"
                        value={server.name}
                        onChange={(e) => updateServer(server.id, 'name', e.target.value)}
                        className="flex-1 bg-white"
                      />
                      <div className="w-40">
                        <label className="block text-xs font-medium mb-1 text-gray-600">Price (Optional)</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={server.price || ''}
                          onChange={(e) => updateServer(server.id, 'price', parseFloat(e.target.value) || 0)}
                          className="bg-white"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeServer(server.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {servers.length === 0 && (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                      No servers added yet. Click "Add Server" to start.
                    </div>
                  )}
                </div>

                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> Server prices are optional. If you set a price, it will override the base product price for that server.
                    Leave it at 0 if all servers have the same price.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 4. Product Denominations/Cards */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Layers className="h-5 w-5 text-orange-600" />
              4️⃣ Product Cards / Denominations (VERY IMPORTANT)
            </h3>

            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Important:</strong> Add multiple product variants (e.g., 100 Diamonds, 200 Diamonds, 500 Diamonds).
                Each variant can have its own image, name, and price. These will auto-generate clean product cards matching your reference designs.
              </p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <label className="font-medium">Denominations ({denominations.length})</label>
              <Button type="button" onClick={addDenomination}>
                <Plus className="h-4 w-4 mr-2" />
                Add Denomination
              </Button>
            </div>

            <div className="space-y-4">
              {denominations.map((denom, index) => (
                <div key={denom.id} className="border-2 rounded-xl p-5 bg-gray-50 hover:border-blue-300 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Order Controls */}
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveDenomination(denom.id, 'up')}
                        disabled={index === 0}
                        className="h-8 w-8 p-0"
                      >
                        ↑
                      </Button>
                      <span className="text-xs text-center font-medium text-gray-500">#{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveDenomination(denom.id, 'down')}
                        disabled={index === denominations.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        ↓
                      </Button>
                    </div>

                    <div className="flex-1 grid md:grid-cols-3 gap-4">
                      {/* Image Upload */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Product Image *</label>
                        <div className="space-y-2">
                          <Input
                            placeholder="Image URL"
                            value={denom.image}
                            onChange={(e) => updateDenomination(denom.id, 'image', e.target.value)}
                          />
                          {denom.image && (
                            <img src={denom.image} alt="Preview" className="w-full h-32 object-cover rounded border" />
                          )}
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="md:col-span-2 space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Denomination Name *</label>
                          <Input
                            placeholder="e.g., LEGENDARY DREAMSPACE 50 PULLS, 100 Diamonds"
                            value={denom.name}
                            onChange={(e) => updateDenomination(denom.id, 'name', e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-2">Original Price *</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={denom.originalPrice || ''}
                              onChange={(e) => updateDenomination(denom.id, 'originalPrice', parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Sale Price *</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={denom.salePrice || ''}
                              onChange={(e) => updateDenomination(denom.id, 'salePrice', parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Discount</label>
                            <div className="px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg font-bold text-green-700">
                              {denom.discount}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDenomination(denom.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}

              {denominations.length === 0 && (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-xl">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">No denominations added yet</p>
                  <p className="text-sm mt-1">Click "Add Denomination" to create product variants</p>
                </div>
              )}
            </div>
          </div>

          {/* 5. Price Adjustment Tools */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              5️⃣ Price Adjustment (Optional)
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Adjustment Type</label>
                <select
                  value={formData.priceAdjustmentType}
                  onChange={(e) => setFormData({ ...formData, priceAdjustmentType: e.target.value as any })}
                  className="w-full px-4 py-2.5 border rounded-lg bg-white"
                >
                  <option value="none">No Adjustment</option>
                  <option value="percentage">Percentage Decrease</option>
                  <option value="fixed">Fixed Amount Decrease</option>
                </select>
              </div>

              {formData.priceAdjustmentType !== 'none' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {formData.priceAdjustmentType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={formData.priceAdjustmentValue || ''}
                    onChange={(e) => setFormData({ ...formData, priceAdjustmentValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 6. SKU & Product Identity */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6">6️⃣ SKU & Product Identity</h3>
            <p className="text-sm text-gray-600">SKU already set above in Basic Information. Each product has a unique identifier for tracking and inventory management.</p>
          </div>

          {/* 7. Info Modal Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-indigo-600" />
              7️⃣ Info Icon Modal (ℹ️ Button Content)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Modal Title (Optional)</label>
                <Input
                  placeholder="e.g., Product Details"
                  value={infoModal.title || ''}
                  onChange={(e) => setInfoModal({ ...infoModal, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description/Instructions</label>
                <textarea
                  value={infoModal.description}
                  onChange={(e) => setInfoModal({ ...infoModal, description: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg min-h-[120px]"
                  placeholder="Enter instructions that will appear when users click the info icon on product cards..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Modal Image URL (Optional)</label>
                <Input
                  placeholder="https://example.com/guide-image.jpg"
                  value={infoModal.image || ''}
                  onChange={(e) => setInfoModal({ ...infoModal, image: e.target.value })}
                />
                {infoModal.image && (
                  <img src={infoModal.image} alt="Modal preview" className="mt-3 w-full max-w-md rounded border" />
                )}
              </div>
            </div>
          </div>

          {/* 8. Descriptions & How To Use */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6">8️⃣ Product Descriptions</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Short Description</label>
                <textarea
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg min-h-[80px]"
                  placeholder="Brief description shown near product title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">How to Use (Short)</label>
                <textarea
                  value={formData.howToUse}
                  onChange={(e) => setFormData({ ...formData, howToUse: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg min-h-[100px]"
                  placeholder="Quick usage instructions..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">How to Use (Detailed - Show More)</label>
                <textarea
                  value={formData.howToUseLong}
                  onChange={(e) => setFormData({ ...formData, howToUseLong: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg min-h-[150px]"
                  placeholder="Detailed step-by-step instructions, terms, and notices..."
                />
              </div>
            </div>
          </div>

          {/* 9. Advanced Description Blocks */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">9️⃣ Advanced Description Builder (Optional)</h3>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => addDescriptionBlock('heading')}>
                  + Heading
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addDescriptionBlock('paragraph')}>
                  + Text
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addDescriptionBlock('image')}>
                  + Image
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {descriptionBlocks.map((block) => (
                <div key={block.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600">
                      {block.type === 'heading' ? '📌 Heading' : block.type === 'image' ? '🖼️ Image' : '📝 Paragraph'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDescriptionBlock(block.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {block.type === 'image' ? (
                    <Input
                      placeholder="Image URL"
                      value={block.imageUrl || ''}
                      onChange={(e) => updateDescriptionBlock(block.id, 'imageUrl', e.target.value)}
                    />
                  ) : (
                    <textarea
                      value={block.content}
                      onChange={(e) => updateDescriptionBlock(block.id, 'content', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                      rows={block.type === 'heading' ? 1 : 3}
                      placeholder={block.type === 'heading' ? 'Heading text...' : 'Paragraph text...'}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 10. Player ID Requirements */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6">🔟 Order Requirements</h3>

            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.requiresPlayerId}
                  onChange={(e) => setFormData({ ...formData, requiresPlayerId: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <div className="font-medium">Require Player ID / UID</div>
                  <div className="text-sm text-gray-500">Customer must enter their game ID during checkout</div>
                </div>
              </label>

              {formData.requiresPlayerId && (
                <div>
                  <label className="block text-sm font-medium mb-2">Player ID Label</label>
                  <Input
                    placeholder="e.g., Free Fire UID, PUBG Player ID"
                    value={formData.playerIdLabel}
                    onChange={(e) => setFormData({ ...formData, playerIdLabel: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="sticky bottom-0 bg-white border-t-4 border-blue-600 shadow-2xl rounded-t-2xl p-6">
            <div className="flex items-center gap-4 max-w-6xl">
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-lg font-bold"
              >
                <Save className="h-5 w-5 mr-2" />
                Create Product
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/products')}
                className="h-12 px-8"
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
