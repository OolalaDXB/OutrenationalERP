/**
 * Marketplace-specific column mappings for order imports.
 * Each marketplace has its own export format with different column names.
 * These mappings translate marketplace columns to our internal field names.
 */

export interface MarketplaceMapping {
  id: string;
  name: string;
  // Column name in marketplace export -> our internal field name
  headerMapping: Record<string, string>;
  // Value transformers for specific fields (e.g., status normalization)
  valueTransformers?: Record<string, (value: unknown) => unknown>;
  // Unique column headers that identify this marketplace
  identifyingHeaders: string[];
  // File name patterns that identify this marketplace
  fileNamePatterns: RegExp[];
  // Description for the UI
  description: string;
}

// Status mapping helpers
const normalizeDiscogsStatus = (value: unknown): string => {
  const status = String(value || '').toLowerCase().trim();
  const statusMap: Record<string, string> = {
    'shipped': 'shipped',
    'payment received': 'confirmed',
    'payment pending': 'pending',
    'invoice sent': 'pending',
    'cancelled': 'cancelled',
    'refunded': 'refunded',
    'merged': 'cancelled',
    'shipped (carrier unknown)': 'shipped',
    'awaiting shipment': 'processing',
  };
  return statusMap[status] || 'delivered';
};

const normalizeDiscogsPaymentStatus = (value: unknown): string => {
  const status = String(value || '').toLowerCase().trim();
  if (status.includes('received') || status.includes('paid')) return 'paid';
  if (status.includes('pending') || status.includes('invoice')) return 'pending';
  if (status.includes('refund')) return 'refunded';
  return 'paid';
};

const normalizeEbayStatus = (value: unknown): string => {
  const status = String(value || '').toLowerCase().trim();
  const statusMap: Record<string, string> = {
    'completed': 'delivered',
    'shipped': 'shipped',
    'paid': 'confirmed',
    'awaiting payment': 'pending',
    'cancelled': 'cancelled',
    'refunded': 'refunded',
    'delivered': 'delivered',
    'dispatched': 'shipped',
    'awaiting dispatch': 'processing',
  };
  return statusMap[status] || 'delivered';
};

const normalizeEbayPaymentStatus = (value: unknown): string => {
  const status = String(value || '').toLowerCase().trim();
  if (status.includes('paid') || status.includes('completed') || status.includes('cleared')) return 'paid';
  if (status.includes('pending') || status.includes('awaiting')) return 'pending';
  if (status.includes('refund')) return 'refunded';
  return 'paid';
};

// Parse price with currency symbol removal
const parsePrice = (value: unknown): number => {
  if (typeof value === 'number') return value;
  const str = String(value || '0')
    .replace(/[€$£¥₹]/g, '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .trim();
  return parseFloat(str) || 0;
};

// Parse quantity
const parseQuantity = (value: unknown): number => {
  const num = parseInt(String(value || '1'));
  return isNaN(num) ? 1 : Math.max(1, num);
};

export const DISCOGS_MAPPING: MarketplaceMapping = {
  id: 'discogs',
  name: 'Discogs',
  description: 'Export depuis Discogs Seller',
  identifyingHeaders: [
    'Listing ID', 'Release ID', 'order_id', 'Order ID', 'Discogs Order',
    'Media Condition', 'Sleeve Condition', 'Catalog#'
  ],
  fileNamePatterns: [/discogs/i, /disco?gs/i],
  headerMapping: {
    // Order identification
    'order_id': 'order_number',
    'Order ID': 'order_number',
    'Order Number': 'order_number',
    'Order Id': 'order_number',
    // Date
    'order_created': 'order_date',
    'Order Created': 'order_date',
    'Order Date': 'order_date',
    'Created': 'order_date',
    'Date': 'order_date',
    // Customer
    'buyer': 'customer_name',
    'Buyer': 'customer_name',
    'Buyer Username': 'customer_name',
    'buyer_name': 'customer_name',
    'buyer_email': 'customer_email',
    'Buyer Email': 'customer_email',
    'Email': 'customer_email',
    // Shipping address
    'shipping_name': 'customer_name',
    'Shipping Name': 'customer_name',
    'Ship To Name': 'customer_name',
    'shipping_address': 'shipping_address',
    'Shipping Address': 'shipping_address',
    'Address': 'shipping_address',
    'Address Line 1': 'shipping_address',
    'shipping_address_line_1': 'shipping_address',
    'shipping_address_line_2': 'shipping_address_line_2',
    'Shipping Address Line 2': 'shipping_address_line_2',
    'Address Line 2': 'shipping_address_line_2',
    'shipping_city': 'shipping_city',
    'Shipping City': 'shipping_city',
    'City': 'shipping_city',
    'shipping_postal_code': 'shipping_postal_code',
    'Shipping Postal Code': 'shipping_postal_code',
    'Postal Code': 'shipping_postal_code',
    'Zip': 'shipping_postal_code',
    'Zip Code': 'shipping_postal_code',
    'shipping_country': 'shipping_country',
    'Shipping Country': 'shipping_country',
    'Country': 'shipping_country',
    'shipping_phone': 'shipping_phone',
    'Shipping Phone': 'shipping_phone',
    'Phone': 'shipping_phone',
    // Status
    'status': 'status',
    'Status': 'status',
    'Order Status': 'status',
    'payment_status': 'payment_status',
    'Payment Status': 'payment_status',
    // Items
    'Listing ID': 'product_sku',
    'listing_id': 'product_sku',
    'Catalog#': 'product_sku',
    'catalog_number': 'product_sku',
    'Catalog Number': 'product_sku',
    'Release ID': 'discogs_release_id',
    'release_id': 'discogs_release_id',
    'Release Title': 'product_title',
    'release_title': 'product_title',
    'Artist': 'artist_name',
    'artist': 'artist_name',
    'Label': 'label_name',
    'label': 'label_name',
    'Format': 'format',
    'format': 'format',
    'Media Condition': 'condition_media',
    'Sleeve Condition': 'condition_sleeve',
    // Pricing
    'price': 'unit_price',
    'Price': 'unit_price',
    'Item Price': 'unit_price',
    'item_price': 'unit_price',
    'quantity': 'quantity',
    'Quantity': 'quantity',
    'Qty': 'quantity',
    'item_total': 'total_price',
    'Item Total': 'total_price',
    'subtotal': 'subtotal',
    'Subtotal': 'subtotal',
    'order_total': 'order_total',
    'Order Total': 'order_total',
    'Total': 'order_total',
    'shipping': 'shipping_amount',
    'Shipping': 'shipping_amount',
    'Shipping Cost': 'shipping_amount',
    // Notes
    'buyer_message': 'notes',
    'Buyer Message': 'notes',
    'Comments': 'notes',
    'Notes': 'notes',
    'Seller Notes': 'internal_notes',
  },
  valueTransformers: {
    status: normalizeDiscogsStatus,
    payment_status: normalizeDiscogsPaymentStatus,
    unit_price: parsePrice,
    total_price: parsePrice,
    shipping_amount: parsePrice,
    order_total: parsePrice,
    subtotal: parsePrice,
    quantity: parseQuantity,
  },
};

export const EBAY_MAPPING: MarketplaceMapping = {
  id: 'ebay',
  name: 'eBay',
  description: 'Export depuis eBay Seller Hub',
  identifyingHeaders: [
    'eBay Item Number', 'Item ID', 'Sales Record Number', 'Transaction ID',
    'eBay User ID', 'eBay Order', 'Record Number', 'Order Number'
  ],
  fileNamePatterns: [/ebay/i, /e-?bay/i],
  headerMapping: {
    // Order identification
    'Sales Record Number': 'order_number',
    'Record Number': 'order_number',
    'Order Number': 'order_number',
    'order_id': 'order_number',
    'Transaction ID': 'transaction_id',
    // Date
    'Paid on Date': 'order_date',
    'Sale Date': 'order_date',
    'Sold On': 'order_date',
    'Transaction Date': 'order_date',
    'Date': 'order_date',
    'Order Date': 'order_date',
    // Customer
    'Buyer User ID': 'customer_name',
    'Buyer Username': 'customer_name',
    'Buyer ID': 'customer_name',
    'eBay User ID': 'customer_name',
    'buyer_name': 'customer_name',
    'Buyer Name': 'customer_name',
    'Buyer Full Name': 'customer_name',
    'Buyer Email': 'customer_email',
    'buyer_email': 'customer_email',
    'Email': 'customer_email',
    'Buyer Email Address': 'customer_email',
    // Shipping address
    'Ship To Name': 'customer_name',
    'Recipient Name': 'customer_name',
    'Ship To Address 1': 'shipping_address',
    'Ship to Address 1': 'shipping_address',
    'Ship to: Address Line 1': 'shipping_address',
    'Shipping Address 1': 'shipping_address',
    'Address': 'shipping_address',
    'Ship To Address 2': 'shipping_address_line_2',
    'Ship to Address 2': 'shipping_address_line_2',
    'Ship to: Address Line 2': 'shipping_address_line_2',
    'Shipping Address 2': 'shipping_address_line_2',
    'Ship To City': 'shipping_city',
    'Ship to: City': 'shipping_city',
    'City': 'shipping_city',
    'Ship To Zip': 'shipping_postal_code',
    'Ship to: Postal Code': 'shipping_postal_code',
    'Post Code': 'shipping_postal_code',
    'Postal Code': 'shipping_postal_code',
    'Zip': 'shipping_postal_code',
    'Ship To Country': 'shipping_country',
    'Ship to: Country': 'shipping_country',
    'Country': 'shipping_country',
    'Shipping Country': 'shipping_country',
    'Buyer Phone Number': 'shipping_phone',
    'Phone': 'shipping_phone',
    // Status
    'Order Status': 'status',
    'Status': 'status',
    'Paid Status': 'payment_status',
    'Payment Status': 'payment_status',
    // Items
    'eBay Item Number': 'ebay_item_id',
    'Item ID': 'ebay_item_id',
    'Item Number': 'ebay_item_id',
    'Custom Label': 'product_sku',
    'Custom label': 'product_sku',
    'SKU': 'product_sku',
    'Item SKU': 'product_sku',
    'Item Title': 'product_title',
    'Title': 'product_title',
    'Item Description': 'product_title',
    // Pricing
    'Sold For': 'unit_price',
    'Item Price': 'unit_price',
    'Sale Price': 'unit_price',
    'Price': 'unit_price',
    'Total Price': 'total_price',
    'Quantity': 'quantity',
    'Qty': 'quantity',
    'Quantity Sold': 'quantity',
    'Shipping and Handling': 'shipping_amount',
    'Shipping Cost': 'shipping_amount',
    'Postage and Packaging': 'shipping_amount',
    'P&P': 'shipping_amount',
    'Order Total': 'order_total',
    'Total': 'order_total',
    // Notes
    'Buyer Note': 'notes',
    'Buyer Notes': 'notes',
    'Notes to Seller': 'notes',
    'Special Instructions': 'notes',
  },
  valueTransformers: {
    status: normalizeEbayStatus,
    payment_status: normalizeEbayPaymentStatus,
    unit_price: parsePrice,
    total_price: parsePrice,
    shipping_amount: parsePrice,
    order_total: parsePrice,
    quantity: parseQuantity,
  },
};

export const BANDCAMP_MAPPING: MarketplaceMapping = {
  id: 'bandcamp',
  name: 'Bandcamp',
  description: 'Export depuis Bandcamp',
  identifyingHeaders: ['bandcamp_transaction', 'Bandcamp', 'payment_id', 'ship_date'],
  fileNamePatterns: [/bandcamp/i, /band-?camp/i],
  headerMapping: {
    // Order identification
    'payment_id': 'order_number',
    'transaction_id': 'order_number',
    // Date
    'date': 'order_date',
    'paid_on': 'order_date',
    'ship_date': 'shipped_at',
    // Customer
    'ship_to_name': 'customer_name',
    'buyer_name': 'customer_name',
    'email': 'customer_email',
    'buyer_email': 'customer_email',
    // Shipping
    'ship_to_street': 'shipping_address',
    'ship_to_street_2': 'shipping_address_line_2',
    'ship_to_city': 'shipping_city',
    'ship_to_zip': 'shipping_postal_code',
    'ship_to_country': 'shipping_country',
    'ship_to_country_code': 'shipping_country',
    // Item
    'item_name': 'product_title',
    'sku': 'product_sku',
    'catalog_number': 'product_sku',
    'quantity': 'quantity',
    'item_price': 'unit_price',
    'subtotal': 'subtotal',
    'shipping': 'shipping_amount',
    'total': 'order_total',
    // Notes
    'item_note': 'notes',
    'buyer_note': 'notes',
  },
  valueTransformers: {
    unit_price: parsePrice,
    subtotal: parsePrice,
    shipping_amount: parsePrice,
    order_total: parsePrice,
    quantity: parseQuantity,
  },
};

// Registry of all marketplace mappings
export const MARKETPLACE_MAPPINGS: Record<string, MarketplaceMapping> = {
  discogs: DISCOGS_MAPPING,
  ebay: EBAY_MAPPING,
  bandcamp: BANDCAMP_MAPPING,
};

/**
 * Detect which marketplace mapping to use based on file name and headers
 */
export function detectMarketplaceMapping(
  fileName: string,
  headers: string[]
): MarketplaceMapping | null {
  // Check file name patterns first
  for (const mapping of Object.values(MARKETPLACE_MAPPINGS)) {
    for (const pattern of mapping.fileNamePatterns) {
      if (pattern.test(fileName)) {
        return mapping;
      }
    }
  }
  
  // Check identifying headers
  const headersLower = headers.map(h => h.toLowerCase());
  for (const mapping of Object.values(MARKETPLACE_MAPPINGS)) {
    const matchCount = mapping.identifyingHeaders.filter(
      idHeader => headersLower.some(h => h.includes(idHeader.toLowerCase()))
    ).length;
    // If we match at least 2 identifying headers, it's likely this marketplace
    if (matchCount >= 2) {
      return mapping;
    }
  }
  
  // Check for single strong match
  for (const mapping of Object.values(MARKETPLACE_MAPPINGS)) {
    for (const idHeader of mapping.identifyingHeaders) {
      if (headers.some(h => h.toLowerCase() === idHeader.toLowerCase())) {
        return mapping;
      }
    }
  }
  
  return null;
}

/**
 * Get merged header mapping combining default + marketplace-specific + custom
 */
export function getMergedHeaderMapping(
  defaultMapping: Record<string, string>,
  marketplace: MarketplaceMapping | null,
  customMappings?: Record<string, { sourceColumn: string; targetField: string }[]> | null
): Record<string, string> {
  let result = { ...defaultMapping };
  
  // Add marketplace mappings
  if (marketplace) {
    result = { ...result, ...marketplace.headerMapping };
    
    // Add custom mappings for this marketplace (highest priority)
    if (customMappings && customMappings[marketplace.id]) {
      for (const mapping of customMappings[marketplace.id]) {
        result[mapping.sourceColumn] = mapping.targetField;
      }
    }
  }
  
  return result;
}

/**
 * Apply value transformers to a row of data
 */
export function applyValueTransformers(
  row: Record<string, unknown>,
  marketplace: MarketplaceMapping | null
): Record<string, unknown> {
  if (!marketplace?.valueTransformers) return row;
  
  const transformed = { ...row };
  for (const [field, transformer] of Object.entries(marketplace.valueTransformers)) {
    if (field in transformed) {
      transformed[field] = transformer(transformed[field]);
    }
  }
  
  return transformed;
}
