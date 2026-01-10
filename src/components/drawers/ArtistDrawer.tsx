import { useState, useMemo } from "react";
import { X, Music, Disc, Euro, Package, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDeleteArtist, Artist as DbArtist } from "@/hooks/useArtists";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { ArtistFormModal } from "@/components/forms/ArtistFormModal";

// Support both the local Artist interface from Artists.tsx and the database Artist type
interface LocalArtist {
  id: string;
  name: string;
  productsCount?: number;
  totalRevenue?: number;
  topFormat?: string;
  image_url?: string | null;
}

type ArtistType = DbArtist | LocalArtist;

interface ArtistDrawerProps {
  artist: ArtistType | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatLabels: Record<string, string> = {
  lp: "LP",
  "2lp": "2×LP",
  cd: "CD",
  boxset: "Box Set",
  "7inch": '7"',
  cassette: "K7",
};

export function ArtistDrawer({ artist, isOpen, onClose }: ArtistDrawerProps) {
  const { canWrite, canDelete } = useAuth();
  const deleteArtist = useDeleteArtist();
  const { data: allProducts = [] } = useProducts();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Produits de l'artiste
  const artistProducts = useMemo(() => {
    if (!artist) return [];
    return allProducts.filter((p) => p.artist_id === artist.id || p.artist_name === artist.name);
  }, [allProducts, artist]);

  // Stock total
  const totalStock = artistProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalSold = artistProducts.reduce((sum, p) => sum + (p.total_sold || 0), 0);
  const totalRevenue = artistProducts.reduce((sum, p) => sum + (p.total_revenue || 0), 0);

  const handleDelete = async () => {
    if (!artist) return;
    try {
      await deleteArtist.mutateAsync(artist.id);
      toast({ title: "Artiste supprimé", description: `${artist.name} a été supprimé.` });
      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer l'artiste.", variant: "destructive" });
    }
  };

  if (!isOpen || !artist) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-lg animate-slide-in-right overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border z-10">
            <div className="flex items-center gap-3">
              {artist.image_url ? (
                <img src={artist.image_url} alt={artist.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                  <Music className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold">{artist.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {artistProducts.length} référence{artistProducts.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-secondary rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                  <Package className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">{totalStock}</div>
                <div className="text-xs text-muted-foreground">En stock</div>
              </div>
              <div className="bg-secondary rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                  <Disc className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">{totalSold}</div>
                <div className="text-xs text-muted-foreground">Vendus</div>
              </div>
              <div className="bg-secondary rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                  <Euro className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <div className="text-xs text-muted-foreground">CA</div>
              </div>
            </div>

            {/* Produits */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Disc className="w-4 h-4" />
                Discographie au catalogue
              </h3>
              <div className="space-y-3">
                {artistProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-sidebar to-foreground flex items-center justify-center flex-shrink-0">
                        <Disc className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{product.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-card rounded text-[0.65rem] font-medium">
                          {formatLabels[product.format] || product.format.toUpperCase()}
                        </span>
                        <span>{product.sku}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{formatCurrency(product.selling_price)}</div>
                      <div className={`text-xs ${(product.stock || 0) > (product.stock_threshold || 0) ? 'text-success' : (product.stock || 0) > 0 ? 'text-warning' : 'text-danger'}`}>
                        {product.stock || 0} en stock
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button className="flex-1">Voir tous les produits</Button>
              <Button variant="secondary" className="flex-1">Exporter</Button>
            </div>

            {/* Edit/Delete Actions */}
            {(canWrite() || canDelete()) && (
              <div className="flex gap-3 pt-4 border-t border-border">
                {canWrite() && (
                  <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                )}
                {canDelete() && (
                  <Button variant="destructive" className="flex-1" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <ArtistFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        artist={artist}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'artiste ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'artiste "{artist.name}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
