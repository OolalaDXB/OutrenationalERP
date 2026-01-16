import * as XLSX from 'xlsx';

// Generic function to export data to XLS
export function exportToXLS<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  filename: string
): void {
  const worksheetData = data.map(item => {
    const row: Record<string, unknown> = {};
    columns.forEach(col => {
      row[col.header] = item[col.key] ?? '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  // Auto-size columns
  const colWidths = columns.map(col => ({
    wch: Math.max(col.header.length, 15)
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Generate a template XLS with headers only
export function generateTemplateXLS(
  columns: { header: string; example?: string }[],
  filename: string
): void {
  const headers = columns.map(c => c.header);
  const examples = columns.map(c => c.example || '');
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, examples]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  
  // Auto-size columns
  worksheet['!cols'] = columns.map(col => ({
    wch: Math.max(col.header.length, col.example?.length || 0, 15)
  }));

  XLSX.writeFile(workbook, `${filename}_template.xlsx`);
}

// Parse XLS/XLSX file to array of objects
export function parseXLSFile<T>(
  file: File,
  headerMapping: Record<string, keyof T>
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
        
        const mappedData = jsonData.map(row => {
          const mappedRow: Partial<T> = {};
          Object.entries(headerMapping).forEach(([header, key]) => {
            // Check for exact header match or case-insensitive match
            const value = row[header] ?? row[header.toLowerCase()] ?? row[header.toUpperCase()];
            if (value !== undefined) {
              (mappedRow as Record<string, unknown>)[key as string] = value;
            }
          });
          return mappedRow as T;
        });
        
        resolve(mappedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// Product template columns
export const productTemplateColumns = [
  { header: 'SKU', example: 'VINYL-001' },
  { header: 'Titre', example: 'Abbey Road' },
  { header: 'Artiste', example: 'The Beatles' },
  { header: 'Format', example: 'lp' },
  { header: 'Prix Vente', example: '29.99' },
  { header: 'Prix Achat', example: '15.00' },
  { header: 'Stock', example: '5' },
  { header: 'Seuil Stock', example: '2' },
  { header: 'Localisation', example: 'A-01' },
  { header: 'Code Barre', example: '0602547670069' },
  { header: 'Catalogue', example: 'B0025297-01' },
  { header: 'Label', example: 'Apple Records' },
  { header: 'Pays Label', example: 'UK' },
  { header: 'Site Web Label', example: 'https://applerecords.com' },
  { header: 'Année', example: '1969' },
  { header: 'Pays Origine', example: 'UK' },
  { header: 'Condition Média', example: 'NM' },
  { header: 'Condition Pochette', example: 'VG+' },
];

// Customer template columns
export const customerTemplateColumns = [
  { header: 'Email', example: 'client@example.com' },
  { header: 'Prénom', example: 'Jean' },
  { header: 'Nom', example: 'Dupont' },
  { header: 'Entreprise', example: 'SARL Disques' },
  { header: 'Type', example: 'professionnel' },
  { header: 'Téléphone', example: '+33612345678' },
  { header: 'Adresse', example: '12 Rue de la Musique' },
  { header: 'Adresse 2', example: 'Bâtiment B' },
  { header: 'Ville', example: 'Paris' },
  { header: 'Code Postal', example: '75011' },
  { header: 'Pays', example: 'France' },
  { header: 'N° TVA', example: 'FR12345678901' },
  { header: 'Remise %', example: '10' },
  { header: 'Délai Paiement', example: '30' },
  { header: 'Notes', example: 'Client fidèle' },
];

// Supplier template columns
export const supplierTemplateColumns = [
  { header: 'Nom', example: 'Fournisseur Vinyles' },
  { header: 'Type', example: 'consignment' },
  { header: 'Email', example: 'contact@fournisseur.com' },
  { header: 'Téléphone', example: '+33145678900' },
  { header: 'Contact', example: 'Marie Martin' },
  { header: 'Adresse', example: '45 Avenue des Disques' },
  { header: 'Ville', example: 'Lyon' },
  { header: 'Code Postal', example: '69001' },
  { header: 'Pays', example: 'France' },
  { header: 'Commission %', example: '30' },
  { header: 'Délai Paiement', example: '30' },
  { header: 'N° TVA', example: 'FR98765432109' },
  { header: 'IBAN', example: 'FR76 1234 5678 9012 3456 7890 123' },
  { header: 'BIC', example: 'BNPAFRPP' },
  { header: 'Site Web', example: 'https://www.fournisseur.com' },
  { header: 'Notes', example: 'Spécialisé jazz' },
];

// Product export columns
export const productExportColumns = [
  { key: 'sku' as const, header: 'SKU' },
  { key: 'title' as const, header: 'Titre' },
  { key: 'artist_name' as const, header: 'Artiste' },
  { key: 'format' as const, header: 'Format' },
  { key: 'selling_price' as const, header: 'Prix Vente' },
  { key: 'cost_price' as const, header: 'Prix Achat' },
  { key: 'stock' as const, header: 'Stock' },
  { key: 'stock_threshold' as const, header: 'Seuil Stock' },
  { key: 'location' as const, header: 'Localisation' },
  { key: 'barcode' as const, header: 'Code Barre' },
  { key: 'catalog_number' as const, header: 'Catalogue' },
  { key: 'label_name' as const, header: 'Label' },
  { key: 'label_country' as const, header: 'Pays Label' },
  { key: 'label_website' as const, header: 'Site Web Label' },
  { key: 'year_released' as const, header: 'Année' },
  { key: 'country_of_origin' as const, header: 'Pays Origine' },
  { key: 'condition_media' as const, header: 'Condition Média' },
  { key: 'condition_sleeve' as const, header: 'Condition Pochette' },
  { key: 'supplier_name' as const, header: 'Fournisseur' },
  { key: 'status' as const, header: 'Statut' },
];

// Customer export columns
export const customerExportColumns = [
  { key: 'email' as const, header: 'Email' },
  { key: 'first_name' as const, header: 'Prénom' },
  { key: 'last_name' as const, header: 'Nom' },
  { key: 'company_name' as const, header: 'Entreprise' },
  { key: 'customer_type' as const, header: 'Type' },
  { key: 'phone' as const, header: 'Téléphone' },
  { key: 'address' as const, header: 'Adresse' },
  { key: 'address_line_2' as const, header: 'Adresse 2' },
  { key: 'city' as const, header: 'Ville' },
  { key: 'postal_code' as const, header: 'Code Postal' },
  { key: 'country' as const, header: 'Pays' },
  { key: 'vat_number' as const, header: 'N° TVA' },
  { key: 'discount_rate' as const, header: 'Remise %' },
  { key: 'payment_terms' as const, header: 'Délai Paiement' },
  { key: 'orders_count' as const, header: 'Nb Commandes' },
  { key: 'total_spent' as const, header: 'CA Total' },
  { key: 'notes' as const, header: 'Notes' },
];

// Supplier export columns
export const supplierExportColumns = [
  { key: 'name' as const, header: 'Nom' },
  { key: 'type' as const, header: 'Type' },
  { key: 'email' as const, header: 'Email' },
  { key: 'phone' as const, header: 'Téléphone' },
  { key: 'contact_name' as const, header: 'Contact' },
  { key: 'address' as const, header: 'Adresse' },
  { key: 'city' as const, header: 'Ville' },
  { key: 'postal_code' as const, header: 'Code Postal' },
  { key: 'country' as const, header: 'Pays' },
  { key: 'commission_rate' as const, header: 'Commission %' },
  { key: 'payment_terms' as const, header: 'Délai Paiement' },
  { key: 'vat_number' as const, header: 'N° TVA' },
  { key: 'iban' as const, header: 'IBAN' },
  { key: 'bic' as const, header: 'BIC' },
  { key: 'website' as const, header: 'Site Web' },
  { key: 'products_count' as const, header: 'Nb Produits' },
  { key: 'total_revenue' as const, header: 'CA Total' },
  { key: 'notes' as const, header: 'Notes' },
];

// Header mappings for import
export const productHeaderMapping: Record<string, string> = {
  'SKU': 'sku',
  'Titre': 'title',
  'Artiste': 'artist_name',
  'Format': 'format',
  'Prix Vente': 'selling_price',
  'Prix Achat': 'cost_price',
  'Stock': 'stock',
  'Seuil Stock': 'stock_threshold',
  'Localisation': 'location',
  'Code Barre': 'barcode',
  'Catalogue': 'catalog_number',
  'Label': 'label_name',
  'Pays Label': 'label_country',
  'Site Web Label': 'label_website',
  'Année': 'year_released',
  'Pays Origine': 'country_of_origin',
  'Condition Média': 'condition_media',
  'Condition Pochette': 'condition_sleeve',
};

export const customerHeaderMapping: Record<string, string> = {
  'Email': 'email',
  'Prénom': 'first_name',
  'Nom': 'last_name',
  'Entreprise': 'company_name',
  'Type': 'customer_type',
  'Téléphone': 'phone',
  'Adresse': 'address',
  'Adresse 2': 'address_line_2',
  'Ville': 'city',
  'Code Postal': 'postal_code',
  'Pays': 'country',
  'N° TVA': 'vat_number',
  'Remise %': 'discount_rate',
  'Délai Paiement': 'payment_terms',
  'Notes': 'notes',
};

export const supplierHeaderMapping: Record<string, string> = {
  'Nom': 'name',
  'Type': 'type',
  'Email': 'email',
  'Téléphone': 'phone',
  'Contact': 'contact_name',
  'Adresse': 'address',
  'Ville': 'city',
  'Code Postal': 'postal_code',
  'Pays': 'country',
  'Commission %': 'commission_rate',
  'Délai Paiement': 'payment_terms',
  'N° TVA': 'vat_number',
  'IBAN': 'iban',
  'BIC': 'bic',
  'Site Web': 'website',
  'Notes': 'notes',
};
