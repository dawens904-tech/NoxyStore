import { useState, useEffect } from 'react';
import { Star, ShoppingCart } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Server, 
  ShoppingBag,
  X,
  Check,
  Search
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdminSidebar from './AdminSidebar';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Game {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  short_description?: string;
  full_description?: string;
  how_to_topup?: string;
  platform_info?: string;
  server_info?: string;
  rating: number;
  total_reviews: number;
  total_sold: number;
  requires_server: boolean;
  requires_player_id: boolean;
  is_active: boolean;
  display_order: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function GameManagement() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showGameModal, setShowGameModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  
  // Form state
  const [gameForm, setGameForm] = useState({
    name: '',
    slug: '',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop',
    short_description: '',
    full_description: '',
    how_to_topup: '',
    platform_info: '',
    server_info: '',
    requires_server: false,
    requires_player_id: true,
  });

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchGames();
    fetchCategories();
  }, [user]);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setGames(data || []);
    } catch (error: any) {
      console.error('Fetch games error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load games',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('game_categories')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Fetch categories error:', error);
    }
  };

  const handleOpenGameModal = (game?: Game) => {
    if (game) {
      setEditingGame(game);
      setGameForm({
        name: game.name,
        slug: game.slug,
        image: game.image,
        short_description: game.short_description || '',
        full_description: game.full_description || '',
        how_to_topup: game.how_to_topup || '',
        platform_info: game.platform_info || '',
        server_info: game.server_info || '',
        requires_server: game.requires_server,
        requires_player_id: game.requires_player_id,
      });

      fetchGameCategories(game.id);
    } else {
      setEditingGame(null);
      setGameForm({
        name: '',
        slug: '',
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop',
        short_description: '',
        full_description: '',
        how_to_topup: '',
        platform_info: '',
        server_info: '',
        requires_server: false,
        requires_player_id: true,
      });
      setSelectedCategories([]);
    }
    setShowGameModal(true);
  };

  const fetchGameCategories = async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('game_category_assignments')
        .select('category_id')
        .eq('game_id', gameId);

      if (error) throw error;
      setSelectedCategories(data.map(d => d.category_id));
    } catch (error) {
      console.error('Error fetching game categories:', error);
    }
  };

  const handleSaveGame = async () => {
    try {
      const slug = gameForm.slug || gameForm.name.toLowerCase().replace(/\s+/g, '-');
      
      if (editingGame) {
        const { error } = await supabase
          .from('games')
          .update({
            ...gameForm,
            slug,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingGame.id);

        if (error) throw error;

        await updateGameCategories(editingGame.id);

        toast({
          title: 'Success',
          description: 'Game updated successfully',
        });
      } else {
        const { data, error } = await supabase
          .from('games')
          .insert({
            ...gameForm,
            slug,
            display_order: games.length,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          await updateGameCategories(data.id);
        }

        toast({
          title: 'Success',
          description: 'Game created successfully',
        });
      }

      setShowGameModal(false);
      fetchGames();
    } catch (error: any) {
      console.error('Save game error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save game',
        variant: 'destructive',
      });
    }
  };

  const updateGameCategories = async (gameId: string) => {
    try {
      await supabase
        .from('game_category_assignments')
        .delete()
        .eq('game_id', gameId);

      if (selectedCategories.length > 0) {
        await supabase
          .from('game_category_assignments')
          .insert(
            selectedCategories.map(categoryId => ({
              game_id: gameId,
              category_id: categoryId,
            }))
          );
      }
    } catch (error) {
      console.error('Error updating game categories:', error);
    }
  };

  const toggleGameActive = async (game: Game) => {
    try {
      const { error } = await supabase
        .from('games')
        .update({ is_active: !game.is_active })
        .eq('id', game.id);

      if (error) throw error;

      setGames(games.map(g => g.id === game.id ? { ...g, is_active: !g.is_active } : g));

      toast({
        title: 'Success',
        description: `Game ${!game.is_active ? 'activated' : 'deactivated'}`,
      });
    } catch (error: any) {
      console.error('Toggle game error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update game status',
        variant: 'destructive',
      });
    }
  };

  const deleteGame = async (gameId: string) => {
    if (!confirm('Delete this game? This will also delete all servers and products.')) return;

    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;

      setGames(games.filter(g => g.id !== gameId));

      toast({
        title: 'Success',
        description: 'Game deleted',
      });
    } catch (error: any) {
      console.error('Delete game error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete game',
        variant: 'destructive',
      });
    }
  };

  const filteredGames = games.filter(game =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Game Management</h1>
              <p className="text-muted-foreground">
                Manage games, categories, servers, and products
              </p>
            </div>

            <Button onClick={() => handleOpenGameModal()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Game
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map((game) => (
              <div key={game.id} className="bg-card border rounded-lg overflow-hidden">
                <div className="relative h-48 bg-gradient-to-br from-blue-50 to-purple-50">
                  <img
                    src={game.image}
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                  
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${
                    game.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                  }`}>
                    {game.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{game.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {game.short_description || game.description || 'No description'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
  <span className="flex items-center gap-1">
    <Star size={14} className="text-yellow-500" />
    {game.rating} ({game.total_reviews})
  </span>

  <span className="flex items-center gap-1">
    <ShoppingCart size={14} />
    {game.total_sold} sold
  </span>
</div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {game.requires_server && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        Server Required
                      </span>
                    )}
                    {game.requires_player_id && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        Player ID Required
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {game.requires_server ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/games/${game.id}/servers`)}
                        className="gap-2"
                      >
                        <Server className="h-4 w-4" />
                        Servers
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/games/${game.id}/products`)}
                        className="gap-2"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Products
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenGameModal(game)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleGameActive(game)}
                      className={game.is_active ? 'text-red-600' : 'text-green-600'}
                    >
                      {game.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteGame(game.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredGames.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No games found</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showGameModal} onOpenChange={setShowGameModal}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingGame ? 'Edit Game' : 'Add New Game'}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div>
                <Label>Game Name *</Label>
                <Input
                  value={gameForm.name}
                  onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })}
                  placeholder="e.g., Free Fire"
                />
              </div>

              <div>
                <Label>Slug (URL-friendly name)</Label>
                <Input
                  value={gameForm.slug}
                  onChange={(e) => setGameForm({ ...gameForm, slug: e.target.value })}
                  placeholder="e.g., free-fire-top-up (auto-generated if empty)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Will appear as: /top-up/{gameForm.slug || gameForm.name.toLowerCase().replace(/\s+/g, '-')}
                </p>
              </div>

              <div>
                <Label>Image URL</Label>
                <Input
                  value={gameForm.image}
                  onChange={(e) => setGameForm({ ...gameForm, image: e.target.value })}
                  placeholder="https://..."
                />
                {gameForm.image && (
                  <img src={gameForm.image} alt="Preview" className="w-32 h-32 object-cover rounded mt-2" />
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Description Content</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label>Short Description (Visible by default)</Label>
                    <textarea
                      value={gameForm.short_description}
                      onChange={(e) => setGameForm({ ...gameForm, short_description: e.target.value })}
                      placeholder="Brief description visible on the page..."
                      className="w-full min-h-[80px] p-2 border rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <Label>Platform Info</Label>
                    <Input
                      value={gameForm.platform_info}
                      onChange={(e) => setGameForm({ ...gameForm, platform_info: e.target.value })}
                      placeholder="e.g., Mobile game"
                    />
                  </div>

                  <div>
                    <Label>Server Info</Label>
                    <textarea
                      value={gameForm.server_info}
                      onChange={(e) => setGameForm({ ...gameForm, server_info: e.target.value })}
                      placeholder="e.g., International server (excluding specific regions)"
                      className="w-full min-h-[60px] p-2 border rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <Label>How to Top-up</Label>
                    <textarea
                      value={gameForm.how_to_topup}
                      onChange={(e) => setGameForm({ ...gameForm, how_to_topup: e.target.value })}
                      placeholder="Step-by-step instructions for top-up..."
                      className="w-full min-h-[100px] p-2 border rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <Label>Full Description (Shown after 'Show More')</Label>
                    <textarea
                      value={gameForm.full_description}
                      onChange={(e) => setGameForm({ ...gameForm, full_description: e.target.value })}
                      placeholder="Detailed game information and features..."
                      className="w-full min-h-[150px] p-2 border rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Game Settings</h3>
                
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gameForm.requires_server}
                      onChange={(e) => setGameForm({ ...gameForm, requires_server: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Requires Server Selection</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gameForm.requires_player_id}
                      onChange={(e) => setGameForm({ ...gameForm, requires_player_id: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Requires Player ID</span>
                  </label>
                </div>
              </div>

              <div>
                <Label>Categories (Select where this game should appear)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories([...selectedCategories, category.id]);
                          } else {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{category.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ This game will ONLY appear in the selected categories. If a game is in "Top Selling", it will NOT automatically appear in "Best Seller".
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveGame} className="flex-1">
                  {editingGame ? 'Update' : 'Create'} Game
                </Button>
                <Button onClick={() => setShowGameModal(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

