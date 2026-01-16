import { useState } from "react";
import { Search, Loader2, Image as ImageIcon, Check, X, Disc3, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDiscogsSearch, type DiscogsResult } from "@/hooks/useDiscogsSearch";

export interface DiscogsProductData {
  title?: string;
  artist?: string;
  label?: string;
  year?: number;
  format?: string;
  catalogNumber?: string;
}

interface DiscogsImageSearchProps {
  barcode?: string;
  title?: string;
  artist?: string;
  onImageSelect: (imageUrl: string) => void;
  onImagesSelect?: (imageUrls: string[]) => void;
  onProductDataSelect?: (data: DiscogsProductData) => void;
}

export function DiscogsImageSearch({
  barcode,
  title,
  artist,
  onImageSelect,
  onImagesSelect,
  onProductDataSelect,
}: DiscogsImageSearchProps) {
  const { isSearching, error, results, searchByBarcode, searchByQuery, clearResults } = useDiscogsSearch();
  const [showResults, setShowResults] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (barcode) {
      await searchByBarcode(barcode);
    } else if (title || artist) {
      const query = [artist, title].filter(Boolean).join(" - ");
      await searchByQuery(query);
    }
    setShowResults(true);
  };

  const handleSelectImage = (url: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedImages(newSelected);
  };

  const handleConfirmSelection = () => {
    const urls = Array.from(selectedImages);
    if (urls.length > 0) {
      onImageSelect(urls[0]);
      if (onImagesSelect) {
        onImagesSelect(urls);
      }
    }
    setShowResults(false);
    clearResults();
    setSelectedImages(new Set());
  };

  const handleUseProductData = (result: DiscogsResult) => {
    if (!onProductDataSelect) return;
    
    // Parse title to extract artist and album title (format: "Artist - Title")
    const titleParts = result.title.split(" - ");
    const artistName = titleParts.length > 1 ? titleParts[0].trim() : undefined;
    const albumTitle = titleParts.length > 1 ? titleParts.slice(1).join(" - ").trim() : result.title;
    
    // Map Discogs format to our format enum
    const formatMap: Record<string, string> = {
      'LP': 'lp',
      'Album': 'lp',
      '2xLP': '2lp',
      '3xLP': '3lp',
      'CD': 'cd',
      'Box Set': 'boxset',
      '7"': '7inch',
      '10"': '10inch',
      '12"': '12inch',
      'Cassette': 'cassette',
    };
    
    const discogsFormat = result.format?.[0] || '';
    let mappedFormat: string | undefined;
    for (const [key, value] of Object.entries(formatMap)) {
      if (discogsFormat.toLowerCase().includes(key.toLowerCase())) {
        mappedFormat = value;
        break;
      }
    }
    
    const data: DiscogsProductData = {
      title: albumTitle,
      artist: artistName,
      label: result.label?.[0],
      year: result.year ? parseInt(result.year, 10) : undefined,
      format: mappedFormat,
      catalogNumber: result.catno,
    };
    
    onProductDataSelect(data);
  };

  const handleClose = () => {
    setShowResults(false);
    clearResults();
    setSelectedImages(new Set());
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleSearch}
        disabled={isSearching || (!barcode && !title && !artist)}
        className="gap-2"
      >
        {isSearching ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Disc3 className="w-4 h-4" />
        )}
        Rechercher sur Discogs
      </Button>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {showResults && results.length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-secondary/30 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              {results.length} résultat(s) Discogs
            </h4>
            <div className="flex gap-2">
              {selectedImages.size > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmSelection}
                  className="gap-1"
                >
                  <Check className="w-3 h-3" />
                  Ajouter {selectedImages.size} image(s)
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {results.map((result) => (
              <DiscogsResultCard
                key={result.id}
                result={result}
                selectedImages={selectedImages}
                onSelectImage={handleSelectImage}
                onUseProductData={onProductDataSelect ? handleUseProductData : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {showResults && results.length === 0 && !isSearching && (
        <p className="text-sm text-muted-foreground">Aucun résultat trouvé</p>
      )}
    </div>
  );
}

function DiscogsResultCard({
  result,
  selectedImages,
  onSelectImage,
  onUseProductData,
}: {
  result: DiscogsResult;
  selectedImages: Set<string>;
  onSelectImage: (url: string) => void;
  onUseProductData?: (result: DiscogsResult) => void;
}) {
  const allImages = result.images.length > 0 
    ? result.images.map(img => img.uri)
    : result.cover_image 
      ? [result.cover_image]
      : result.thumb 
        ? [result.thumb]
        : [];

  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <div className="flex items-start gap-3 mb-3">
        {result.thumb && (
          <img
            src={result.thumb}
            alt={result.title}
            className="w-12 h-12 rounded object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{result.title}</div>
          <div className="text-xs text-muted-foreground">
            {result.year && <span>{result.year}</span>}
            {result.label?.[0] && <span> • {result.label[0]}</span>}
            {result.format?.[0] && <span> • {result.format[0]}</span>}
            {result.catno && <span> • {result.catno}</span>}
          </div>
        </div>
        {onUseProductData && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onUseProductData(result)}
            className="gap-1 shrink-0"
          >
            <FileDown className="w-3 h-3" />
            Utiliser
          </Button>
        )}
      </div>

      {allImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {allImages.slice(0, 8).map((url, idx) => {
            const isSelected = selectedImages.has(url);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectImage(url)}
                className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent hover:border-primary/50"
                }`}
              >
                <img
                  src={url}
                  alt={`${result.title} - Image ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {allImages.length === 0 && (
        <div className="flex items-center justify-center h-16 bg-secondary rounded text-muted-foreground">
          <ImageIcon className="w-4 h-4 mr-2" />
          <span className="text-xs">Aucune image</span>
        </div>
      )}
    </div>
  );
}
