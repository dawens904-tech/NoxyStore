import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Plus, Edit2, Trash2, Play, Pause } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdminSidebar from './AdminSidebar';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Product {
  id: string;
  game_id: string;
  server_id: string | null;
  name: string;
  description: string;
  short_description: string;
  image: string;
  original_price: number;
  sale_price: number;
  discount_percent: number;
  is_active: boolean;
  display_order: number;
}

export default function GameProductManagement() {
  const navigate = useNavigate();
  const { gameId, serverId } = useParams();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [game, setGame] = useState<any>(null);
  const [server, setServer] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    short_description: '',
    image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400&h=400&fit=crop',
    original_price: 0,
    sale_price: 0,
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchGame();
    if (serverId) fetchServer();
    fetchProducts();
  }, [user, gameId, serverId]);

  const fetchGame = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) throw error;
      setGame(data);
    } catch (error: any) {
      console.error('Fetch game error:', error);
    }
  };

  const fetchServer = async () => {
    try {
      const { data, error } = await supabase
        .from('game_servers')
        .select('*')
        .eq('id', serverId)
        .single();

      if (error) throw error;
      setServer(data);
    } catch (error: any) {
      console.error('Fetch server error:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('game_products')
        .select('*')
        .eq('game_id', gameId);

      if (serverId) {
        query = query.eq('server_id', serverId);
      } else {
        query = query.is('server_id', null);
      }

      const { data, error } = await query.order('display_order');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Fetch products error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || '',
        short_description: product.short_description || '',
        image: product.image,
        original_price: product.original_price,
        sale_price: product.sale_price,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        short_description: '',
        image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400&h=400&fit=crop',
        original_price: 0,
        sale_price: 0,
      });
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    try {
      const discount_percent = productForm.original_price > 0
        ? Math.round(((productForm.original_price - productForm.sale_price) / productForm.original_price) * 100)
        : 0;

      if (editingProduct) {
        const { error } = await supabase
          .from('game_products')
          .update({
            ...productForm,
            discount_percent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Product updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('game_products')
          .insert({
            game_id: gameId,
            server_id: serverId || null,
            ...productForm,
            discount_percent,
            display_order: products.length,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Product created successfully',
        });
      }

      setShowProductModal(false);
      fetchProducts();
    } catch (error: any) {
      console.error('Save product error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save product',
        variant: 'destructive',
      });
    }
  };

  const toggleProductActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('game_products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(products.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p));

      toast({
        title: 'Success',
        description: `Product ${!product.is_active ? 'activated' : 'deactivated'}`,
      });
    } catch (error: any) {
      console.error('Toggle product error:', error);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Delete this product? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('game_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));

      toast({
        title: 'Success',
        description: 'Product deleted',
      });
    } catch (error: any) {
      console.error('Delete product error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || !game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="ml-64 flex-1 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => navigate(serverId ? `/admin/games/${gameId}/servers` : '/admin/games')} 
              className="p-2 hover:bg-accent rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Product Management</h1>
              <p className="text-muted-foreground">
                {game.name} {server && `• ${server.name}`} • {products.length} products
              </p>
            </div>

            <Button onClick={() => handleOpenProductModal()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>

          {/* Products Grid - 2 cols mobile, 5 cols desktop (matching frontend) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map((product) => (
              <div key={product.id} className="bg-card border rounded-lg overflow-hidden">
                <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${
                    product.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                  }`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </div>

                  {product.discount_percent > 0 && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-orange-500 text-white rounded text-xs font-bold">
                      -{product.discount_percent}%
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>

                  <div className="flex items-baseline gap-1.5 mb-3">
                    <span className="text-red-500 font-bold text-base">
                      ${product.sale_price.toFixed(2)}
                    </span>
                    {product.original_price > product.sale_price && (
                      <span className="text-gray-400 line-through text-xs">
                        ${product.original_price.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenProductModal(product)}
                      className="p-2"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
<Button
  variant="outline"
  size="sm"
  onClick={() => toggleProductActive(product)}
  className={`p-2 ${product.is_active ? "text-yellow-600" : "text-green-600"}`}
>
  {product.is_active ? <Pause size={16} /> : <Play size={16} />}
</Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteProduct(product.id)}
                      className="text-red-600 p-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12 bg-card border rounded-lg">
              <p className="text-muted-foreground mb-4">No products configured yet</p>
              <Button onClick={() => handleOpenProductModal()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Product
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div>
                <Label>Product Name *</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g., 100 Diamonds, 500 + 50 Diamonds"
                />
              </div>

              <div>
                <Label>Short Description</Label>
                <Input
                  value={productForm.short_description}
                  onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })}
                  placeholder="One-line description"
                />
              </div>

              <div>
                <Label>Full Description</Label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Detailed product description..."
                  className="w-full min-h-[100px] p-2 border rounded-md"
                />
              </div>

              <div>
                <Label>Image URL *</Label>
                <Input
                  value={productForm.image}
                  onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                  placeholder="https://..."
                />
                {productForm.image && (
                  <img src={productForm.image} alt="Preview" className="w-32 h-32 object-cover rounded mt-2" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Original Price ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={productForm.original_price}
                    onChange={(e) => setProductForm({ ...productForm, original_price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label>Sale Price ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={productForm.sale_price}
                    onChange={(e) => setProductForm({ ...productForm, sale_price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {productForm.original_price > 0 && productForm.sale_price > 0 && (
                <div className="p-3 bg-accent rounded-lg">
                  <p className="text-sm">
                    Discount: <strong>{Math.round(((productForm.original_price - productForm.sale_price) / productForm.original_price) * 100)}%</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Savings: ${(productForm.original_price - productForm.sale_price).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSaveProduct} className="flex-1">
                  {editingProduct ? 'Update' : 'Create'} Product
                </Button>
                <Button onClick={() => setShowProductModal(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );