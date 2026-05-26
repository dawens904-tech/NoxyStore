import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  Plus,
  X,
  Upload,
  Save,
  Shield,
  Lock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProductStore } from '@/stores/productStore';
import { useToast } from '@/hooks/use-toast';
import type { Product, QuantityOption, ProductServer, DescriptionBlock } from '@/types';

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getProductById, updateProduct } = useProductStore();
  const product = getProductById(id || '');

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    nameColor: '',
    category: '' as Product['category'] | '',
    image: '',
    sku: '',
    originalPrice: '0',
    salePrice: '0',
    shortDescription: '',
    fullDescription: '',
    howToUse: '',
    requiresPlayerId: false,
    playerIdLabel: '',
    pricingType: 'quantity' as 'quantity' | 'server',
    verifyEndpoint: '',
    requiresRegion: false
  });

  const [quantityOptions, setQuantityOptions] = useState<QuantityOption[]>([]);
  const [servers, setServers] = useState<ProductServer[]>([]);
  const [visibilityTags, setVisibilityTags] = useState<Product['visibilityTags']>([]);
  const [descriptionBlocks, setDescriptionBlocks] = useState<DescriptionBlock[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin && product) {
      // Load product data into form
      setFormData({
        name: product.name || '',
        nameColor: product.nameColor || '',
        category: product.category || '',
        image: product.image || '',
        sku: product.sku || '',
        originalPrice: product.originalPrice?.toString() || '0',
        salePrice: product.salePrice?.toString() || '0',
        shortDescription: product.shortDescription || '',
        fullDescription: product.fullDescription || '',
        howToUse: product.howToUse || '',
        requiresPlayerId: product.requiresPlayerId || false,
        playerIdLabel: product.playerIdLabel || '',
        pricingType: product.pricingType || 'quantity',
        verifyEndpoint: product.verifyEndpoint || '',
        requiresRegion: product.id === 'free-fire' || product.id === 'free-fire-plus'
      });

      setQuantityOptions(product.quantityOptions || []);
      setServers(product.servers || []);
      setVisibilityTags(product.visibilityTags || []);
      setDescriptionBlocks(product.descriptionBlocks || []);
    }
  }, [isAdmin, product]);

  async function checkAdminAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, is_admin')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const hasAdminRole = profile?.role === 'admin' || profile?.is_admin === true;
      setIsAdmin(hasAdminRole);

      if (!hasAdminRole) {
        setLoading(false);
        return;
      }

      if (!product) {
        toast({
          title: 'Product not found',
          description: 'The requested product could not be found',
          variant: 'destructive'
        });
        navigate('/admin/products');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
      setLoading(false);
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!id) return;

    // Verify admin status before submitting
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_admin')
      .eq('id', user?.id)
      .single();

    if (!profile || (profile.role !== 'admin' && !profile.is_admin)) {
      toast({
        title: 'Unauthorized',
        description: 'Admin access required',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }

    const updates: Partial<Product> = {
      name: formData.name,
      nameColor: formData.nameColor || undefined,
      category: formData.category,
      image: formData.image,
      sku: formData.sku,
      originalPrice: parseFloat(formData.originalPrice),
      salePrice: parseFloat(formData.salePrice),
      discount: Math.round(((parseFloat(formData.originalPrice) - parseFloat(formData.salePrice)) / parseFloat(formData.originalPrice)) * 100),
      shortDescription: formData.shortDescription,
      fullDescription: formData.fullDescription,
      howToUse: formData.howToUse,
      requiresPlayerId: formData.requiresPlayerId,
      playerIdLabel: formData.playerIdLabel || undefined,
      requiresServer: formData.pricingType === 'server',
      pricingType: formData.pricingType,
      quantityOptions: formData.pricingType === 'quantity' ? quantityOptions : undefined,
      servers: formData.pricingType === 'server' ? servers : undefined,
      visibilityTags,
      descriptionBlocks: descriptionBlocks.length > 0 ? descriptionBlocks : undefined,
      verifyEndpoint: formData.verifyEndpoint || undefined
    };

    updateProduct(id, updates);

    toast({
      title: 'Product updated',
      description: 'The product has been successfully updated'
    });

    navigate('/admin/products');
  };

  const addQuantityOption = () => {
    setQuantityOptions([...quantityOptions, {
      id: `qty-${Date.now()}`,
      name: '',
      quantity: 0,
      price: 0
    }]);
  };

  const removeQuantityOption = (optionId: string) => {
    setQuantityOptions(quantityOptions.filter(q => q.id !== optionId));
  };

  const updateQuantityOption = (optionId: string, field: keyof QuantityOption, value: string | number) => {
    setQuantityOptions(quantityOptions.map(q =>
      q.id === optionId ? { ...q, [field]: value } : q
    ));
  };

  const addServer = () => {
    setServers([...servers, {
      id: `server-${Date.now()}`,
      name: '',
      price: 0
    }]);
  };

  const removeServer = (serverId: string) => {
    setServers(servers.filter(s => s.id !== serverId));
  };

  const updateServer = (serverId: string, field: keyof ProductServer, value: string | number) => {
    setServers(servers.map(s =>
      s.id === serverId ? { ...s, [field]: value } : s
    ));
  };

  const toggleVisibilityTag = (tag: Product['visibilityTags'][number]) => {
    setVisibilityTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addDescriptionBlock = (type: DescriptionBlock['type']) => {
    setDescriptionBlocks([...descriptionBlocks, {
      id: `block-${Date.now()}`,
      type,
      content: '',
      imageUrl: type === 'image' || type === 'image-with-instruction' ? '' : undefined,
      instruction: type === 'image-with-instruction' ? '' : undefined
    }]);
  };

  const removeDescriptionBlock = (blockId: string) => {
    setDescriptionBlocks(descriptionBlocks.filter(b => b.id !== blockId));
  };

  const updateDescriptionBlock = (blockId: string, field: keyof DescriptionBlock, value: string) => {
    setDescriptionBlocks(descriptionBlocks.map(b =>
      b.id === blockId ? { ...b, [field]: value } : b
    ));
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // NOT ADMIN - Show BLACK screen with video
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        {/* Video Container */}
        <div className="w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-800">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-contain"
            poster="/video-poster.jpg"
          >
            {/* Replace this src with your real video link */}
            <source src="https://your-real-video-link.mp4" type="video/mp4" />
            <source src="https://your-real-video-link.webm" type="video/webm" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Message below video */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 text-red-500 mb-2">
            <Lock className="w-6 h-6" />
            <span className="font-bold text-lg">Access Denied</span>
          </div>
          <p className="text-gray-400 mb-1">
            Ou pa gen pèmisyon pou w akseye paj sa a.
          </p>
          <p className="text-gray-500 text-sm">
            (You don't have permission to access this page.)
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
          >
            Retounen (Go Back)
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold">NoxyStore Admin</h1>
          <div className="mt-2 flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium">Admin</span>
          </div>
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
          <h2 className="text-2xl font-bold mb-2">Edit Product</h2>
          <p className="text-gray-600">Update product information and pricing</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Basic Information</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Product Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 110 + 16 💎"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Name Color (Optional)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.nameColor}
                    onChange={(e) => setFormData({ ...formData, nameColor: e.target.value })}
                    className="h-10 w-20 rounded border"
                  />
                  <Input
                    value={formData.nameColor}
                    onChange={(e) => setFormData({ ...formData, nameColor: e.target.value })}
                    placeholder="#000000"
                    className="flex-1"
                  />
                  {formData.nameColor && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, nameColor: '' })}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Product['category'] })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="top-up">Top Up</option>
                  <option value="gift-card">Gift Card</option>
                  <option value="game-coins">Game Coins</option>
                  <option value="game-items">Game Items</option>
                  <option value="cdkey">CD KEY</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">SKU *</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Product Image URL</label>
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
                {formData.image && (
                  <div className="mt-2">
                    <img src={formData.image} alt="Preview" className="w-32 h-32 object-cover rounded border" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Pricing</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Original Price *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sale Price *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  required
                />
              </div>
            </div>

            {formData.originalPrice && formData.salePrice && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  Discount: {Math.round(((parseFloat(formData.originalPrice) - parseFloat(formData.salePrice)) / parseFloat(formData.originalPrice)) * 100)}%
                </p>
              </div>
            )}
          </div>

          {/* Region Requirements */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Region & ID Requirements</h3>

            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requiresRegion}
                  onChange={(e) => setFormData({ ...formData, requiresRegion: e.target.checked })}
                  className="rounded"
                />
                <span className="font-medium">Requires Region Selection</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requiresPlayerId}
                  onChange={(e) => setFormData({ ...formData, requiresPlayerId: e.target.checked })}
                  className="rounded"
                />
                <span className="font-medium">Requires Player ID</span>
              </label>

              {formData.requiresPlayerId && (
                <div>
                  <label className="block text-sm font-medium mb-2">Player ID Label</label>
                  <Input
                    value={formData.playerIdLabel}
                    onChange={(e) => setFormData({ ...formData, playerIdLabel: e.target.value })}
                    placeholder="e.g., Free Fire UID"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Pricing Options */}
          {formData.pricingType === 'quantity' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Quantity Options</h3>
                <Button type="button" size="sm" onClick={addQuantityOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-2">
                {quantityOptions.map((option) => (
                  <div key={option.id} className="flex items-center gap-2 p-3 border rounded-lg">
                    <Input
                      placeholder="Name"
                      value={option.name}
                      onChange={(e) => updateQuantityOption(option.id, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={option.quantity}
                      onChange={(e) => updateQuantityOption(option.id, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={option.price}
                      onChange={(e) => updateQuantityOption(option.id, 'price', parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuantityOption(option.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description Blocks */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Product Description</h3>
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
              {descriptionBlocks.map((block, idx) => (
                <div key={block.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      {block.type === 'heading' ? '📌 Heading' : block.type === 'image' ? '🖼️ Image' : '📝 Text'}
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

                  {block.type === 'image' || block.type === 'image-with-instruction' ? (
                    <>
                      <Input
                        placeholder="Image URL"
                        value={block.imageUrl || ''}
                        onChange={(e) => updateDescriptionBlock(block.id, 'imageUrl', e.target.value)}
                        className="mb-2"
                      />
                      {block.type === 'image-with-instruction' && (
                        <Input
                          placeholder="Instruction text"
                          value={block.instruction || ''}
                          onChange={(e) => updateDescriptionBlock(block.id, 'instruction', e.target.value)}
                        />
                      )}
                    </>
                  ) : (
                    <textarea
                      value={block.content}
                      onChange={(e) => updateDescriptionBlock(block.id, 'content', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={block.type === 'heading' ? 1 : 3}
                      placeholder={block.type === 'heading' ? 'Heading text' : 'Paragraph text'}
                    />
                  )}
                </div>
              ))}

              {descriptionBlocks.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  No description blocks added yet. Click the buttons above to add content.
                </div>
              )}
            </div>
          </div>

          {/* Visibility Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Product Visibility</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { value: 'home-page', label: 'Home Page' },
                { value: 'top-selling', label: 'Top Selling' },
                { value: 'best-seller', label: 'Best Seller' },
                { value: 'new-product', label: 'New Products' },
                { value: 'gift-card-page', label: 'Gift Card Section' }
              ].map((tag) => (
                <label
                  key={tag.value}
                  className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    visibilityTags.includes(tag.value as any)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={visibilityTags.includes(tag.value as any)}
                    onChange={() => toggleVisibilityTag(tag.value as any)}
                    className="rounded"
                  />
                  <span className="font-medium text-sm">{tag.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Save className="h-5 w-5 mr-2" />
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => navigate('/admin/products')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}