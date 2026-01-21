import countries from 'i18n-iso-countries';
import frLocale from 'i18n-iso-countries/langs/fr.json';

// Register French locale
countries.registerLocale(frLocale);

// ISO codes for EU countries
export const EU_COUNTRY_CODES = [
  "FR", "DE", "BE", "NL", "ES", "IT", "PT", "AT", "IE", "LU", 
  "FI", "SE", "DK", "PL", "CZ", "GR", "HU", "RO", "BG", "HR", 
  "SK", "SI", "EE", "LV", "LT", "CY", "MT"
];

// Countries requiring State/Province/Emirate
export const STATE_REQUIRED_COUNTRIES = ["US", "CA", "AU", "AE", "IN", "BR", "MX"];

// Countries with specific tax ID (non-EU)
export const TAX_ID_COUNTRIES = ["AE", "GB", "CH", "NO"];

export interface CountryOption {
  code: string;
  name: string;
}

/**
 * Get all countries as options sorted alphabetically
 */
export function getCountryOptions(): CountryOption[] {
  const countryObj = countries.getNames('fr', { select: 'official' });
  
  return Object.entries(countryObj)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/**
 * Get country name from ISO code
 */
export function getCountryName(code: string): string {
  return countries.getName(code, 'fr') || code;
}

/**
 * Check if country requires state/province field
 */
export function requiresState(countryCode: string | null): boolean {
  if (!countryCode) return false;
  return STATE_REQUIRED_COUNTRIES.includes(countryCode);
}

/**
 * Check if country is in EU
 */
export function isEuCountry(countryCode: string | null): boolean {
  if (!countryCode) return false;
  return EU_COUNTRY_CODES.includes(countryCode);
}

/**
 * Get VAT/Tax ID configuration for a country
 */
export function getTaxIdConfig(countryCode: string | null): {
  show: boolean;
  label: string;
  placeholder: string;
  required: boolean;
} {
  if (!countryCode) {
    return { show: false, label: "", placeholder: "", required: false };
  }

  if (isEuCountry(countryCode)) {
    return {
      show: true,
      label: "N° TVA intracommunautaire",
      placeholder: countryCode === "FR" ? "FR12345678901" : `${countryCode}123456789`,
      required: false
    };
  }

  switch (countryCode) {
    case "AE":
      return {
        show: true,
        label: "TRN (Tax Registration Number)",
        placeholder: "100000000000003",
        required: false
      };
    case "GB":
      return {
        show: true,
        label: "VAT Number",
        placeholder: "GB123456789",
        required: false
      };
    case "CH":
      return {
        show: true,
        label: "N° TVA / MWST",
        placeholder: "CHE-123.456.789",
        required: false
      };
    case "NO":
      return {
        show: true,
        label: "MVA Number",
        placeholder: "NO123456789MVA",
        required: false
      };
    default:
      return {
        show: false,
        label: "Tax ID",
        placeholder: "",
        required: false
      };
  }
}

/**
 * Get state/province label for a country
 */
export function getStateLabel(countryCode: string | null): string {
  if (!countryCode) return "État / Province";
  
  switch (countryCode) {
    case "US":
      return "État";
    case "CA":
      return "Province";
    case "AE":
      return "Émirat";
    case "AU":
      return "État / Territoire";
    case "IN":
      return "État";
    case "BR":
      return "État";
    case "MX":
      return "État";
    default:
      return "État / Province";
  }
}

/**
 * Get state/province options for a country
 */
export function getStateOptions(countryCode: string | null): string[] {
  if (!countryCode) return [];
  
  switch (countryCode) {
    case "US":
      return [
        "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
        "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
        "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
        "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
        "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
        "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
        "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
        "Wisconsin", "Wyoming", "District of Columbia"
      ];
    case "CA":
      return [
        "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
        "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
        "Quebec", "Saskatchewan", "Yukon"
      ];
    case "AE":
      return [
        "Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah", "Umm Al Quwain"
      ];
    case "AU":
      return [
        "Australian Capital Territory", "New South Wales", "Northern Territory", 
        "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia"
      ];
    case "IN":
      return [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
        "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
        "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
        "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
        "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh"
      ];
    case "BR":
      return [
        "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal",
        "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul",
        "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí",
        "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia",
        "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
      ];
    case "MX":
      return [
        "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
        "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Guanajuato",
        "Guerrero", "Hidalgo", "Jalisco", "México", "Michoacán", "Morelos", "Nayarit",
        "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí",
        "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
      ];
    default:
      return [];
  }
}

/**
 * Validate EU VAT number format
 */
export function isValidEuVatFormat(vatNumber: string | null): boolean {
  if (!vatNumber) return false;
  // 2 letters followed by 8-12 alphanumeric characters
  const vatRegex = /^[A-Z]{2}[A-Z0-9]{8,12}$/i;
  return vatRegex.test(vatNumber.replace(/\s/g, ''));
}

/**
 * Get country code from phone number for E.164 format
 */
export function getDefaultCountryForPhone(countryCode: string | null): string {
  // Map ISO country codes to phone library country codes (same in most cases)
  return countryCode || 'FR';
}
