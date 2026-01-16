// EU Member States (as of 2024)
export const EU_COUNTRIES = [
  "Allemagne", "Germany",
  "Autriche", "Austria",
  "Belgique", "Belgium",
  "Bulgarie", "Bulgaria",
  "Chypre", "Cyprus",
  "Croatie", "Croatia",
  "Danemark", "Denmark",
  "Espagne", "Spain",
  "Estonie", "Estonia",
  "Finlande", "Finland",
  "France",
  "Grèce", "Greece",
  "Hongrie", "Hungary",
  "Irlande", "Ireland",
  "Italie", "Italy",
  "Lettonie", "Latvia",
  "Lituanie", "Lithuania",
  "Luxembourg",
  "Malte", "Malta",
  "Pays-Bas", "Netherlands",
  "Pologne", "Poland",
  "Portugal",
  "République tchèque", "Czech Republic", "Czechia",
  "Roumanie", "Romania",
  "Slovaquie", "Slovakia",
  "Slovénie", "Slovenia",
  "Suède", "Sweden",
];

// Countries with states/provinces
export const COUNTRIES_WITH_STATES = [
  "États-Unis", "USA", "United States",
  "Canada",
  "Émirats arabes unis", "UAE", "United Arab Emirates",
];

// Default VAT rate for France
export const DEFAULT_VAT_RATE = 0.20; // 20%

export type VatZone = 'france' | 'eu' | 'non-eu';
export type CustomerType = 'particulier' | 'professionnel';

/**
 * Determine VAT zone based on country
 */
export function getVatZone(country: string | null | undefined): VatZone {
  if (!country) return 'france';
  
  const normalizedCountry = country.trim().toLowerCase();
  
  if (normalizedCountry === 'france') {
    return 'france';
  }
  
  const isEu = EU_COUNTRIES.some(
    (euCountry) => euCountry.toLowerCase() === normalizedCountry
  );
  
  return isEu ? 'eu' : 'non-eu';
}

/**
 * Check if a country requires state/province field
 */
export function requiresState(country: string | null | undefined): boolean {
  if (!country) return false;
  
  const normalizedCountry = country.trim().toLowerCase();
  
  return COUNTRIES_WITH_STATES.some(
    (c) => c.toLowerCase() === normalizedCountry
  );
}

/**
 * Calculate applicable VAT rate
 * - France: 20% for all customers
 * - EU Professional with valid VAT: 0% (reverse charge / autoliquidation)
 * - EU Individual: 20%
 * - Non-EU: 0% (export)
 */
export function calculateVatRate(
  country: string | null | undefined,
  customerType: CustomerType,
  hasValidVatNumber: boolean
): number {
  const zone = getVatZone(country);
  
  switch (zone) {
    case 'france':
      return DEFAULT_VAT_RATE;
    case 'eu':
      // Professional with valid intra-community VAT number: reverse charge
      if (customerType === 'professionnel' && hasValidVatNumber) {
        return 0;
      }
      // Individual or professional without valid VAT: standard rate
      return DEFAULT_VAT_RATE;
    case 'non-eu':
      // Export: no VAT
      return 0;
    default:
      return DEFAULT_VAT_RATE;
  }
}

/**
 * Get VAT status label
 */
export function getVatStatusLabel(
  country: string | null | undefined,
  customerType: CustomerType,
  hasValidVatNumber: boolean
): string {
  const zone = getVatZone(country);
  
  switch (zone) {
    case 'france':
      return 'TVA 20%';
    case 'eu':
      if (customerType === 'professionnel' && hasValidVatNumber) {
        return 'Autoliquidation (0%)';
      }
      return 'TVA 20%';
    case 'non-eu':
      return 'Export (0%)';
    default:
      return 'TVA 20%';
  }
}

/**
 * Validate intra-community VAT number format (basic validation)
 * Format: 2-letter country code + number
 */
export function isValidVatNumberFormat(vatNumber: string | null | undefined): boolean {
  if (!vatNumber) return false;
  
  // Basic format: 2 letters followed by alphanumeric characters
  const vatRegex = /^[A-Z]{2}[A-Z0-9]{2,12}$/i;
  return vatRegex.test(vatNumber.replace(/\s/g, ''));
}

/**
 * Get US states
 */
export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming", "District of Columbia"
];

/**
 * Get Canadian provinces
 */
export const CANADIAN_PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
  "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
  "Quebec", "Saskatchewan", "Yukon"
];

/**
 * Get UAE Emirates
 */
export const UAE_EMIRATES = [
  "Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah", "Umm Al Quwain"
];
