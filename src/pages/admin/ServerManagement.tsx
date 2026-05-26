import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Plus, Edit2, Trash2, ShoppingBag, Play, Pause } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdminSidebar from './AdminSidebar';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Game {
  id: string;
  name: string;
  requires_server: boolean;
}

interface Server {
  id: string;
  game_id: string;
  name: string;
  code: string;
  is_active: boolean;
  display_order: number;
}

export default function ServerManagement() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [game, setGame] = useState<Game | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showServerModal, setShowServerModal] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  
  const [serverForm, setServerForm] = useState({
    name: '',
    code: '',
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchGame();
    fetchServers();
  }, [user, gameId]);

  const fetchGame = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('id, name, requires_server')
        .eq('id', gameId)
        .single();

      if (error) throw error;
      setGame(data);
    } catch (error: any) {
      console.error('Fetch game error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load game',
        variant: 'destructive',
      });
    }
  };

  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from('game_servers')
        .select('*')
        .eq('game_id', gameId)
        .order('display_order');

      if (error) throw error;
      setServers(data || []);
    } catch (error: any) {
      console.error('Fetch servers error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load servers',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenServerModal = (server?: Server) => {
    if (server) {
      setEditingServer(server);
      setServerForm({
        name: server.name,
        code: server.code,
      });
    } else {
      setEditingServer(null);
      setServerForm({
        name: '',
        code: '',
      });
    }
    setShowServerModal(true);
  };

  const handleSaveServer = async () => {
    try {
      const code = serverForm.code || serverForm.name.toLowerCase().replace(/\s+/g, '-');
      
      if (editingServer) {
        const { error } = await supabase
          .from('game_servers')
          .update({
            ...serverForm,
            code,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingServer.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Server updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('game_servers')
          .insert({
            game_id: gameId,
            ...serverForm,
            code,
            display_order: servers.length,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Server created successfully',
        });
      }

      setShowServerModal(false);
      fetchServers();
    } catch (error: any) {
      console.error('Save server error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save server',
        variant: 'destructive',
      });
    }
  };

  const toggleServerActive = async (server: Server) => {
    try {
      const { error } = await supabase
        .from('game_servers')
        .update({ is_active: !server.is_active })
        .eq('id', server.id);

      if (error) throw error;

      setServers(servers.map(s => s.id === server.id ? { ...s, is_active: !s.is_active } : s));

      toast({
        title: 'Success',
        description: `Server ${!server.is_active ? 'activated' : 'deactivated'}`,
      });
    } catch (error: any) {
      console.error('Toggle server error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update server status',
        variant: 'destructive',
      });
    }
  };

  const deleteServer = async (serverId: string) => {
    if (!confirm('Delete this server? This will also delete all products for this server.')) return;

    try {
      const { error } = await supabase
        .from('game_servers')
        .delete()
        .eq('id', serverId);

      if (error) throw error;

      setServers(servers.filter(s => s.id !== serverId));

      toast({
        title: 'Success',
        description: 'Server deleted',
      });
    } catch (error: any) {
      console.error('Delete server error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete server',
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
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => navigate('/admin/games')} className="p-2 hover:bg-accent rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Server Management</h1>
              <p className="text-muted-foreground">
                {game.name} • {servers.length} servers
              </p>
            </div>

            <Button onClick={() => handleOpenServerModal()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Server
            </Button>
          </div>

          {!game.requires_server && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ This game does not require server selection. Products will be managed globally without servers.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servers.map((server) => (
              <div key={server.id} className="bg-card border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{server.name}</h3>
                    <p className="text-sm text-muted-foreground">Code: {server.code}</p>
                  </div>

                  <div className={`px-2 py-1 rounded text-xs font-bold ${
                    server.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                  }`}>
                    {server.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/games/${gameId}/servers/${server.id}/products`)}
                    className="flex-1 gap-2"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Manage Products
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenServerModal(server)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>

                 <Button
  variant="outline"
  size="sm"
  onClick={() => toggleServerActive(server)}
  className={server.is_active ? "text-yellow-600" : "text-green-600"}
>
  {server.is_active ? <Pause size={16} /> : <Play size={16} />}
</Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteServer(server.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {servers.length === 0 && (
            <div className="text-center py-12 bg-card border rounded-lg">
              <p className="text-muted-foreground mb-4">No servers configured yet</p>
              <Button onClick={() => handleOpenServerModal()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Server
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showServerModal} onOpenChange={setShowServerModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingServer ? 'Edit Server' : 'Add New Server'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Server Name *</Label>
              <Input
                value={serverForm.name}
                onChange={(e) => setServerForm({ ...serverForm, name: e.target.value })}
                placeholder="e.g., Brazil, Malaysia, USA & Latin America"
              />
            </div>

            <div>
              <Label>Server Code</Label>
              <Input
                value={serverForm.code}
                onChange={(e) => setServerForm({ ...serverForm, code: e.target.value })}
                placeholder="e.g., brazil, malaysia (auto-generated if empty)"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveServer} className="flex-1">
                {editingServer ? 'Update' : 'Create'} Server
              </Button>
              <Button onClick={() => setShowServerModal(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}