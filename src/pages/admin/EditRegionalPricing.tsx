import { useState, useEffect, useRef } from 'react';
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
  Trash2,
  Save,
  Shield,
  Lock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface RegionalProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
  originalPrice: number;
  isAvailable: boolean;
}

interface Region {
  id: string;
  name: string;
  active: boolean;
}

export default function EditRegionalPricing() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [regions, setRegions] = useState<Region[]>([
    { id: 'usa', name: 'USA & Latam', active: true },
    { id: 'brazil', name: 'Brazil', active: true },
    { id: 'malaysia', name: 'Malaysia/Singapore', active: true },
    { id: 'indonesia', name: 'Indonesia', active: true },
    { id: 'europe', name: 'Europe & Russia', active: true }
  ]);

  const [selectedRegion, setSelectedRegion] = useState('usa');

  const [regionalProducts, setRegionalProducts] = useState<Record<string, RegionalProduct[]>>({
    usa: [
      { id: '1', name: '100 Diamonds', quantity: 100, price: 1.50, originalPrice: 2.00, isAvailable: true },
      { id: '2', name: '200 Diamonds', quantity: 200, price: 2.80, originalPrice: 3.50, isAvailable: true },
      { id: '3', name: '500 Diamonds', quantity: 500, price: 6.50, originalPrice: 8.00, isAvailable: true }
    ],
    brazil: [
      { id: '1', name: '100 Diamonds', quantity: 100, price: 0.90, originalPrice: 1.20, isAvailable: true },
      { id: '2', name: '200 Diamonds', quantity: 200, price: 1.70, originalPrice: 2.10, isAvailable: true }
    ],
    malaysia: [
      { id: '1', name: '100 Diamonds', quantity: 100, price: 1.80, originalPrice: 2.20, isAvailable: true }
    ],
    indonesia: [],
    europe: [
      { id: '1', name: '100 Diamonds', quantity: 100, price: 2.10, originalPrice: 2.50, isAvailable: true }
    ]
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

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

      // Load real data from Supabase if admin
      await loadRegionalPricing();
      setLoading(false);
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
      setLoading(false);
    }
  }

  async function loadRegionalPricing() {
    try {
      // Fetch real regional pricing from database
      const { data: pricingData, error } = await supabase
        .from('regional_pricing')
        .select('*')
        .eq('product_id', productId);

      if (error) throw error;

      if (pricingData && pricingData.length > 0) {
        // Organize by region
        const organized: Record<string, RegionalProduct[]> = {};
        pricingData.forEach((item: any) => {
          if (!organized[item.region_id]) {
            organized[item.region_id] = [];
          }
          organized[item.region_id].push({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            originalPrice: item.original_price,
            isAvailable: item.is_available
          });
        });
        setRegionalProducts(organized);
      }
    } catch (error) {
      console.error('Error loading regional pricing:', error);
    }
  }

  const currentProducts = regionalProducts[selectedRegion] || [];

  const addProduct = () => {
    const newProduct: RegionalProduct = {
      id: Date.now().toString(),
      name: '',
      quantity: 0,
      price: 0,
      originalPrice: 0,
      isAvailable: true
    };

    setRegionalProducts({
      ...regionalProducts,
      [selectedRegion]: [...currentProducts, newProduct]
    });
  };

  const removeProduct = (productId: string) => {
    setRegionalProducts({
      ...regionalProducts,
      [selectedRegion]: currentProducts.filter(p => p.id !== productId)
    });
  };

  const updateProduct = (productId: string, field: keyof RegionalProduct, value: any) => {
    setRegionalProducts({
      ...regionalProducts,
      [selectedRegion]: currentProducts.map(p =>
        p.id === productId ? { ...p, [field]: value } : p
      )
    });
  };

  const handleSave = async () => {
    // Verify admin status before saving
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

    try {
      // Save to Supabase
      const allPricing = Object.entries(regionalProducts).flatMap(([regionId, products]) =>
        products.map(p => ({
          product_id: productId,
          region_id: regionId,
          name: p.name,
          quantity: p.quantity,
          price: p.price,
          original_price: p.originalPrice,
          is_available: p.isAvailable,
          updated_at: new Date().toISOString()
        }))
      );

      // Upsert to database
      const { error } = await supabase
        .from('regional_pricing')
        .upsert(allPricing, { onConflict: 'id' });

      if (error) throw error;

      toast({
        title: 'Pricing updated',
        description: 'Regional pricing has been saved successfully'
      });
      navigate('/admin/products');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save regional pricing',
        variant: 'destructive'
      });
    }
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
            <source src="https://files.catbox.moe/x4jfgk.mp4" type="video/mp4" />
            <source src="https://files.catbox.moe/vin7z9.mp4" type="video/webm" />
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full">
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
      <main className="ml-64 flex-1 p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/products')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <h2 className="text-2xl font-bold mb-2">Regional Pricing Management</h2>
          <p className="text-gray-600">Configure prices for different regions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Region Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-bold mb-3">Regions</h3>
              <div className="space-y-2">
                {regions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => setSelectedRegion(region.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                      selectedRegion === region.id
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{region.name}</span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {regionalProducts[region.id]?.length || 0}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Products List */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">
                  Products for {regions.find(r => r.id === selectedRegion)?.name}
                </h3>
                <Button onClick={addProduct} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Product
                </Button>
              </div>

              <div className="space-y-4">
                {currentProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Package className="h-16 w-16 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No products in this region</p>
                    <p className="text-sm">Click "Add Product" to get started</p>
                  </div>
                ) : (
                  currentProducts.map((product) => (
                    <div
                      key={product.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Product Name</label>
                          <Input
                            value={product.name}
                            onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                            placeholder="e.g., 100 Diamonds"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Quantity</label>
                          <Input
                            type="number"
                            value={product.quantity}
                            onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 0)}
                            placeholder="100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Sale Price ($)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={product.price}
                            onChange={(e) => updateProduct(product.id, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Original Price ($)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={product.originalPrice}
                            onChange={(e) => updateProduct(product.id, 'originalPrice', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={product.isAvailable}
                            onChange={(e) => updateProduct(product.id, 'isAvailable', e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm font-medium">Available</span>
                        </label>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProduct(product.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>

                      {product.originalPrice > product.price && (
                        <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
                          Discount: ${(product.originalPrice - product.price).toFixed(2)} (
                          {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% off)
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin/products')}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

