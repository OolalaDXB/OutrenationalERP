import { useState } from 'react';
import { Store, Plus, Trash2, Globe, Disc, ShoppingBag, Phone, Mail, Loader2, GripVertical, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSalesChannels, SalesChannel } from '@/hooks/useSalesChannels';
import { toast } from '@/hooks/use-toast';

const iconMap: Record<string, React.ElementType> = {
  disc: Disc,
  'shopping-bag': ShoppingBag,
  globe: Globe,
  phone: Phone,
  mail: Mail,
  store: Store,
  briefcase: Briefcase,
};

function ChannelIcon({ icon }: { icon?: string }) {
  const Icon = iconMap[icon || 'globe'] || Globe;
  return <Icon className="w-4 h-4" />;
}

export function SalesChannelsSection() {
  const { 
    salesChannels, 
    isLoading, 
    toggleChannel, 
    updateChannel, 
    addChannel, 
    removeChannel,
    isUpdating,
  } = useSalesChannels();
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');

  const handleAddChannel = async () => {
    if (!newChannelName.trim()) {
      toast({ title: 'Erreur', description: 'Le nom du canal est requis', variant: 'destructive' });
      return;
    }
    
    await addChannel({
      name: newChannelName.trim(),
      url: newChannelUrl.trim() || '',
      enabled: true,
      icon: 'globe',
    });
    
    setNewChannelName('');
    setNewChannelUrl('');
    setIsAddingNew(false);
    toast({ title: 'Canal ajouté', description: `${newChannelName} a été ajouté` });
  };

  const handleRemoveChannel = async (channel: SalesChannel) => {
    if (channel.builtin) return;
    await removeChannel(channel.id);
    toast({ title: 'Canal supprimé', description: `${channel.name} a été supprimé` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const marketplaces = salesChannels.filter(c => !c.builtin);
  const builtins = salesChannels.filter(c => c.builtin);

  return (
    <div className="space-y-6">
      {/* Marketplaces */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Places de marché
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configurez vos canaux de vente en ligne (Discogs, eBay, site web...)
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {marketplaces.map((channel) => (
            <div 
              key={channel.id}
              className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ChannelIcon icon={channel.icon} />
              </div>
              
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nom</Label>
                  <Input
                    value={channel.name}
                    onChange={(e) => updateChannel(channel.id, { name: e.target.value })}
                    className="mt-1 h-9"
                    disabled={isUpdating}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">URL du shop</Label>
                  <Input
                    value={channel.url || ''}
                    onChange={(e) => updateChannel(channel.id, { url: e.target.value })}
                    className="mt-1 h-9"
                    placeholder="https://..."
                    disabled={isUpdating}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 shrink-0">
                <Switch
                  checked={channel.enabled}
                  onCheckedChange={(checked) => toggleChannel(channel.id, checked)}
                  disabled={isUpdating}
                />
                {!channel.id.startsWith('discogs') && !channel.id.startsWith('ebay') && !channel.id.startsWith('website') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveChannel(channel)}
                    disabled={isUpdating}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Add new channel */}
          {isAddingNew ? (
            <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nom</Label>
                  <Input
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="mt-1 h-9"
                    placeholder="Bandcamp, Vinylhub..."
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">URL du shop</Label>
                  <Input
                    value={newChannelUrl}
                    onChange={(e) => setNewChannelUrl(e.target.value)}
                    className="mt-1 h-9"
                    placeholder="https://..."
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={handleAddChannel}
                  disabled={isUpdating || !newChannelName.trim()}
                >
                  Ajouter
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewChannelName('');
                    setNewChannelUrl('');
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setIsAddingNew(true)}
            >
              <Plus className="w-4 h-4" />
              Ajouter un canal de vente
            </Button>
          )}
        </div>
      </div>

      {/* Built-in sources */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Store className="w-5 h-5" />
            Canaux intégrés
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sources de commande sans URL (téléphone, email, boutique)
          </p>
        </div>

        <div className="space-y-3">
          {builtins.map((channel) => (
            <div 
              key={channel.id}
              className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ChannelIcon icon={channel.icon} />
                </div>
                <span className="font-medium">{channel.name}</span>
              </div>
              
              <Switch
                checked={channel.enabled}
                onCheckedChange={(checked) => toggleChannel(channel.id, checked)}
                disabled={isUpdating}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
