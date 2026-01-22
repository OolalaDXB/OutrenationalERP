// EU country codes (excluding France which is handled separately)
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI',
  'ES', 'SE', 'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 
  'Czech Republic', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'Germany', 
  'Greece', 'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg',
  'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 
  'Slovenia', 'Spain', 'Sweden', 'Allemagne', 'Belgique', 'Espagne', 'Italie',
  'Pays-Bas', 'Portugal', 'Autriche', 'Irlande', 'Grèce', 'Pologne', 'Suède',
  'Danemark', 'Finlande', 'République tchèque', 'Hongrie', 'Roumanie', 'Bulgarie',
  'Croatie', 'Slovénie', 'Slovaquie', 'Lituanie', 'Lettonie', 'Estonie', 
  'Chypre', 'Malte', 'Luxembourg'
];

const FRANCE_CODES = ['FR', 'France', 'FRANCE'];

export type VatZone = 'france' | 'eu_with_vat' | 'eu_without_vat' | 'world';
export type ShippingZone = 'france' | 'eu' | 'world';

export interface VatInfo {
  zone: VatZone;
  rate: number;
  label: string;
}

export interface ShippingInfo {
  zone: ShippingZone;
  baseCost: number;
  freeThreshold: number;
  isFree: boolean;
  finalCost: number;
}

/**
 * Determine VAT zone and rate based on customer country and VAT number
 */
export function calculateVatInfo(country: string | null | undefined, vatNumber: string | null | undefined): VatInfo {
  const normalizedCountry = (country || '').trim();
  
  // France → 20% TVA
  if (FRANCE_CODES.some(c => c.toLowerCase() === normalizedCountry.toLowerCase())) {
    return {
      zone: 'france',
      rate: 20,
      label: 'TVA 20%'
    };
  }
  
  // Check if EU country
  const isEU = EU_COUNTRIES.some(c => c.toLowerCase() === normalizedCountry.toLowerCase());
  
  if (isEU) {
    // EU with valid VAT number → 0% (intracommunautaire)
    if (vatNumber && vatNumber.trim().length > 0) {
      return {
        zone: 'eu_with_vat',
        rate: 0,
        label: 'Exonéré (intracommunautaire)'
      };
    }
    // EU without VAT number → 20% TVA
    return {
      zone: 'eu_without_vat',
      rate: 20,
      label: 'TVA 20%'
    };
  }
  
  // Outside EU → 0% (export)
  return {
    zone: 'world',
    rate: 0,
    label: 'Exonéré (export)'
  };
}

/**
 * Calculate shipping cost based on customer country and order subtotal
 */
export function calculateShippingInfo(country: string | null | undefined, subtotalHT: number): ShippingInfo {
  const normalizedCountry = (country || '').trim();
  
  // France: 8€ (free above 150€)
  if (FRANCE_CODES.some(c => c.toLowerCase() === normalizedCountry.toLowerCase())) {
    const isFree = subtotalHT >= 150;
    return {
      zone: 'france',
      baseCost: 8,
      freeThreshold: 150,
      isFree,
      finalCost: isFree ? 0 : 8
    };
  }
  
  // Check if EU country
  const isEU = EU_COUNTRIES.some(c => c.toLowerCase() === normalizedCountry.toLowerCase());
  
  if (isEU) {
    // EU: 15€ (free above 250€)
    const isFree = subtotalHT >= 250;
    return {
      zone: 'eu',
      baseCost: 15,
      freeThreshold: 250,
      isFree,
      finalCost: isFree ? 0 : 15
    };
  }
  
  // World: 25€ (free above 350€)
  const isFree = subtotalHT >= 350;
  return {
    zone: 'world',
    baseCost: 25,
    freeThreshold: 350,
    isFree,
    finalCost: isFree ? 0 : 25
  };
}
