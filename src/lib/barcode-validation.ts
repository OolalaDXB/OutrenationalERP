/**
 * Barcode validation utilities
 * Supports EAN-13, EAN-8, UPC-A with check digit verification
 */

export interface BarcodeValidationResult {
  isValid: boolean;
  format: 'EAN-13' | 'EAN-8' | 'UPC-A' | null;
  message: string;
}

/**
 * Calculate check digit for EAN/UPC barcodes
 * Uses the standard modulo 10 algorithm
 */
function calculateCheckDigit(digits: number[], isEAN: boolean): number {
  let sum = 0;
  const length = digits.length;
  
  for (let i = 0; i < length; i++) {
    const digit = digits[i];
    // For EAN: odd positions (0-indexed even) multiply by 1, even positions by 3
    // For UPC: same pattern
    const multiplier = (i % 2 === 0) ? 1 : 3;
    sum += digit * multiplier;
  }
  
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Validate EAN-13 barcode (13 digits)
 */
function validateEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;
  
  const digits = barcode.split('').map(Number);
  const checkDigit = digits.pop()!;
  const calculatedCheck = calculateCheckDigit(digits, true);
  
  return checkDigit === calculatedCheck;
}

/**
 * Validate EAN-8 barcode (8 digits)
 */
function validateEAN8(barcode: string): boolean {
  if (!/^\d{8}$/.test(barcode)) return false;
  
  const digits = barcode.split('').map(Number);
  const checkDigit = digits.pop()!;
  
  // EAN-8 uses slightly different weight pattern
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const multiplier = (i % 2 === 0) ? 3 : 1;
    sum += digits[i] * multiplier;
  }
  const remainder = sum % 10;
  const calculatedCheck = remainder === 0 ? 0 : 10 - remainder;
  
  return checkDigit === calculatedCheck;
}

/**
 * Validate UPC-A barcode (12 digits)
 */
function validateUPCA(barcode: string): boolean {
  if (!/^\d{12}$/.test(barcode)) return false;
  
  const digits = barcode.split('').map(Number);
  const checkDigit = digits.pop()!;
  
  // UPC-A: odd positions (1st, 3rd, 5th...) multiply by 3, even by 1
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const multiplier = (i % 2 === 0) ? 3 : 1;
    sum += digits[i] * multiplier;
  }
  const remainder = sum % 10;
  const calculatedCheck = remainder === 0 ? 0 : 10 - remainder;
  
  return checkDigit === calculatedCheck;
}

/**
 * Validate a barcode and return format info
 */
export function validateBarcode(barcode: string | null | undefined): BarcodeValidationResult {
  if (!barcode || barcode.trim() === '') {
    return { isValid: true, format: null, message: '' };
  }
  
  const cleaned = barcode.trim().replace(/\s/g, '');
  
  // Check if it's only digits
  if (!/^\d+$/.test(cleaned)) {
    return { 
      isValid: false, 
      format: null, 
      message: 'Format non reconnu (caractères non numériques)' 
    };
  }
  
  // Check EAN-13 (13 digits)
  if (cleaned.length === 13) {
    if (validateEAN13(cleaned)) {
      return { isValid: true, format: 'EAN-13', message: 'EAN-13 ✓' };
    }
    return { 
      isValid: false, 
      format: null, 
      message: 'EAN-13 invalide (digit de contrôle incorrect)' 
    };
  }
  
  // Check UPC-A (12 digits)
  if (cleaned.length === 12) {
    if (validateUPCA(cleaned)) {
      return { isValid: true, format: 'UPC-A', message: 'UPC-A ✓' };
    }
    return { 
      isValid: false, 
      format: null, 
      message: 'UPC-A invalide (digit de contrôle incorrect)' 
    };
  }
  
  // Check EAN-8 (8 digits)
  if (cleaned.length === 8) {
    if (validateEAN8(cleaned)) {
      return { isValid: true, format: 'EAN-8', message: 'EAN-8 ✓' };
    }
    return { 
      isValid: false, 
      format: null, 
      message: 'EAN-8 invalide (digit de contrôle incorrect)' 
    };
  }
  
  // Unknown format - still allow custom barcodes
  return { 
    isValid: false, 
    format: null, 
    message: 'Format non reconnu' 
  };
}
