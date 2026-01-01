import { useState, useMemo } from "react";
import { Plus, Music, Disc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { products } from "@/data/demo-data";
import { ArtistFormModal } from "@/components/forms/ArtistFormModal";

export interface Artist {
  id: string;
  name: string;
  productsCount: number;
  totalRevenue: number;
  topFormat: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);

export function ArtistsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Extraire les artistes depuis les produits
  const artists = useMemo(() => {
    const artistMap = new Map<string, Artist>();

    products.forEach((product) => {
      if (!artistMap.has(product.artist)) {
        artistMap.set(product.artist, {
          id: `artist-${product.artist.toLowerCase().replace(/\s+/g, "-")}`,
          name: product.artist,
          productsCount: 0,
          totalRevenue: 0,
          topFormat: product.format,
        });
      }

      const artist = artistMap.get(product.artist)!;
      artist.productsCount += 1;
      artist.totalRevenue += product.sellingPrice * product.stock;
    });

    return Array.from(artistMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, []);

  const filteredArtists = useMemo(() => {
    if (!searchTerm) return artists;
    return artists.filter((artist) =>
      artist.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [artists, searchTerm]);

  const formatLabels: Record<string, string> = {
    lp: "LP",
    "2lp": "2×LP",
    cd: "CD",
    boxset: "Box Set",
    "7inch": "7\"",
    cassette: "K7",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tous les artistes</h2>
          <p className="text-sm text-muted-foreground">
            {artists.length} artistes au catalogue
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Ajouter un artiste
        </Button>
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
          {filteredArtists.map((artist) => (
            <div
              key={artist.id}
              className="bg-secondary rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-primary/20"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{artist.name}</div>
                </div>
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
          ))}
        </div>

        {filteredArtists.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun artiste trouvé</p>
          </div>
        )}
      </div>

      <ArtistFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </div>
  );
}
