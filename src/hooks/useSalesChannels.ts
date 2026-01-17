import { useSettings, useUpdateSettings } from './useSettings';

export interface SalesChannel {
  id: string;
  name: string;
  url: string | null;
  enabled: boolean;
  icon?: string;
  builtin?: boolean;
}

export const DEFAULT_SALES_CHANNELS: SalesChannel[] = [
  { id: 'discogs', name: 'Discogs', url: '', enabled: true, icon: 'disc' },
  { id: 'ebay', name: 'eBay', url: '', enabled: false, icon: 'shopping-bag' },
  { id: 'website', name: 'Site web', url: '', enabled: true, icon: 'globe' },
  { id: 'phone', name: 'Téléphone', url: null, enabled: true, icon: 'phone', builtin: true },
  { id: 'email', name: 'Email', url: null, enabled: true, icon: 'mail', builtin: true },
  { id: 'instore', name: 'En boutique', url: null, enabled: true, icon: 'store', builtin: true },
];

export function useSalesChannels() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const salesChannels: SalesChannel[] = settings?.sales_channels as SalesChannel[] || DEFAULT_SALES_CHANNELS;

  const enabledChannels = salesChannels.filter(c => c.enabled);
  const marketplaceChannels = enabledChannels.filter(c => !c.builtin);
  const builtinChannels = enabledChannels.filter(c => c.builtin);

  const updateSalesChannels = async (channels: SalesChannel[]) => {
    await updateSettings.mutateAsync({ sales_channels: channels } as any);
  };

  const toggleChannel = async (channelId: string, enabled: boolean) => {
    const updated = salesChannels.map(c => 
      c.id === channelId ? { ...c, enabled } : c
    );
    await updateSalesChannels(updated);
  };

  const updateChannel = async (channelId: string, updates: Partial<SalesChannel>) => {
    const updated = salesChannels.map(c => 
      c.id === channelId ? { ...c, ...updates } : c
    );
    await updateSalesChannels(updated);
  };

  const addChannel = async (channel: Omit<SalesChannel, 'id'>) => {
    const id = channel.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newChannel: SalesChannel = {
      ...channel,
      id: `custom-${id}-${Date.now()}`,
    };
    await updateSalesChannels([...salesChannels, newChannel]);
  };

  const removeChannel = async (channelId: string) => {
    // Only allow removing custom channels
    const channel = salesChannels.find(c => c.id === channelId);
    if (channel?.builtin) return;
    const filtered = salesChannels.filter(c => c.id !== channelId);
    await updateSalesChannels(filtered);
  };

  return {
    salesChannels,
    enabledChannels,
    marketplaceChannels,
    builtinChannels,
    isLoading,
    updateSalesChannels,
    toggleChannel,
    updateChannel,
    addChannel,
    removeChannel,
    isUpdating: updateSettings.isPending,
  };
}

// Source detection patterns for auto-detecting source from file
export const SOURCE_DETECTION_PATTERNS: Record<string, { fileNamePatterns: RegExp[]; headerPatterns: string[] }> = {
  discogs: {
    fileNamePatterns: [/discogs/i, /disco?gs/i],
    headerPatterns: ['Listing ID', 'Release ID', 'Discogs Order'],
  },
  ebay: {
    fileNamePatterns: [/ebay/i, /e-?bay/i],
    headerPatterns: ['eBay Item Number', 'Item ID', 'eBay Order'],
  },
  bandcamp: {
    fileNamePatterns: [/bandcamp/i, /band-?camp/i],
    headerPatterns: ['Bandcamp', 'bandcamp_transaction'],
  },
};

export function detectSourceFromFile(fileName: string, headers: string[]): string | null {
  // Check file name patterns
  for (const [source, patterns] of Object.entries(SOURCE_DETECTION_PATTERNS)) {
    for (const pattern of patterns.fileNamePatterns) {
      if (pattern.test(fileName)) {
        return source;
      }
    }
  }
  
  // Check header patterns
  for (const [source, patterns] of Object.entries(SOURCE_DETECTION_PATTERNS)) {
    for (const headerPattern of patterns.headerPatterns) {
      if (headers.some(h => h.toLowerCase().includes(headerPattern.toLowerCase()))) {
        return source;
      }
    }
  }
  
  return null;
}
