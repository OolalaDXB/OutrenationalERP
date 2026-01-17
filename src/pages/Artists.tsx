import { useState, useMemo, useCallback } from "react";
import { Plus, Music, Disc, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportExportDropdowns } from "@/components/ui/import-export-dropdowns";
import { useProducts } from "@/hooks/useProducts";
import { useArtists, useDeleteArtist, type Artist as DBArtist } from "@/hooks/useArtists";
import { ArtistFormModal } from "@/components/forms/ArtistFormModal";
import { ArtistDrawer } from "@/components/drawers/ArtistDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface Artist {
  id: string;
  name: string;
  productsCount: number;
  totalRevenue: number;
  topFormat: string;
}

const formatLabels: Record<string, string> = {
  lp: "LP",
  "2lp": "2×LP",
  "3lp": "3×LP",
  cd: "CD",
  boxset: "Box Set",
  "7inch": '7"',
  "10inch": '10"',
  "12inch": '12"',
  cassette: "K7",
  digital: "Digital",
};

export function ArtistsPage() {
  const { data: products = [], isLoading: productsLoading, error: productsError } = useProducts();
  const { data: dbArtists = [], isLoading: artistsLoading } = useArtists();
  const deleteArtist = useDeleteArtist();
  const { canWrite, canDelete } = useAuth();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<DBArtist | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deletingArtist, setDeletingArtist] = useState<DBArtist | null>(null);

  const isLoading = productsLoading || artistsLoading;
  const error = productsError;

  // Extraire les artistes depuis les produits
  const artists = useMemo(() => {
    const artistMap = new Map<string, Artist>();

    products.forEach((product) => {
      const artistName = product.artist_name || 'Unknown Artist';
      
      if (!artistMap.has(artistName)) {
        artistMap.set(artistName, {
          id: `artist-${artistName.toLowerCase().replace(/\s+/g, "-")}`,
          name: artistName,
          productsCount: 0,
          totalRevenue: 0,
          topFormat: product.format,
        });
      }

      const artist = artistMap.get(artistName)!;
      artist.productsCount += 1;
      artist.totalRevenue += product.selling_price * (product.stock ?? 0);
    });

    return Array.from(artistMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [products]);

  const filteredArtists = useMemo(() => {
    if (!searchTerm) return artists;
    return artists.filter((artist) =>
      artist.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [artists, searchTerm]);

  const handleArtistClick = (artist: Artist) => {
    setSelectedArtist(artist);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedArtist(null);
  };

  const handleEdit = (artist: Artist) => {
    // Find the DB artist by name
    const dbArtist = dbArtists.find(a => a.name.toLowerCase() === artist.name.toLowerCase());
    if (dbArtist) {
      setEditingArtist(dbArtist);
      setIsFormOpen(true);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingArtist(null);
  };

  const handleDelete = async () => {
    if (!deletingArtist) return;
    try {
      await deleteArtist.mutateAsync(deletingArtist.id);
      toast({ title: "Succès", description: "Artiste supprimé" });
      setDeletingArtist(null);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer l'artiste", variant: "destructive" });
    }
  };

  const handleDeleteClick = (artist: Artist) => {
    const dbArtist = dbArtists.find(a => a.name.toLowerCase() === artist.name.toLowerCase());
    if (dbArtist) {
      setDeletingArtist(dbArtist);
    }
  };

  // CSV Export function
  const exportToCSV = useCallback(() => {
    if (filteredArtists.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucun artiste à exporter", variant: "destructive" });
      return;
    }

    const headers = ["Nom", "Produits", "Format principal"];
    const rows = filteredArtists.map(artist => [
      `"${(artist.name || '').replace(/"/g, '""')}"`,
      artist.productsCount.toString(),
      formatLabels[artist.topFormat] || artist.topFormat
    ].join(";"));

    const csvContent = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `artistes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Export réussi", description: `${filteredArtists.length} artiste(s) exporté(s)` });
  }, [filteredArtists, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center text-destructive">
        Erreur lors du chargement des artistes
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tous les artistes</h2>
          <p className="text-sm text-muted-foreground">
            {artists.length} artistes au catalogue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportDropdowns
            onExportCSV={exportToCSV}
            canWrite={false}
            showHistory={false}
          />
          {canWrite() && (
            <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Ajouter un artiste
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
          <input
            type="text"
            placeholder="Rechercher un artiste..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
          {filteredArtists.map((artist) => {
            const dbArtist = dbArtists.find(a => a.name.toLowerCase() === artist.name.toLowerCase());
            return (
              <div
                key={artist.id}
                className="bg-secondary rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-primary/20 group"
                onClick={() => handleArtistClick(artist)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                    <Music className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{artist.name}</div>
                  </div>
                  {canWrite() && dbArtist && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(artist)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {canDelete() && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(artist)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Disc className="w-3 h-3" />
                    <span>{artist.productsCount} produit{artist.productsCount > 1 ? "s" : ""}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-card rounded text-xs font-medium">
                      {formatLabels[artist.topFormat] || artist.topFormat.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredArtists.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun artiste trouvé</p>
          </div>
        )}
      </div>

      <ArtistFormModal 
        isOpen={isFormOpen} 
        onClose={handleCloseForm}
        artist={editingArtist}
      />
      <ArtistDrawer artist={selectedArtist} isOpen={isDrawerOpen} onClose={handleCloseDrawer} />

      <AlertDialog open={!!deletingArtist} onOpenChange={() => setDeletingArtist(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet artiste ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'artiste "{deletingArtist?.name}" ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleteArtist.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteArtist.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
