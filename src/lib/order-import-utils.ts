// Order import template columns
export const orderTemplateColumns = [
  { header: 'order_number', example: 'ORD-001' },
  { header: 'order_date', example: '2024-01-15' },
  { header: 'customer_email', example: 'client@example.com' },
  { header: 'customer_name', example: 'Jean Dupont' },
  { header: 'shipping_address', example: '12 Rue de la Musique' },
  { header: 'shipping_city', example: 'Paris' },
  { header: 'shipping_postal_code', example: '75011' },
  { header: 'shipping_country', example: 'France' },
  { header: 'status', example: 'delivered' },
  { header: 'payment_status', example: 'paid' },
  { header: 'source', example: 'Discogs' },
  { header: 'notes', example: 'Commande prioritaire' },
  { header: 'product_sku', example: 'VIA01LP' },
  { header: 'quantity', example: '1' },
  { header: 'unit_price', example: '27.00' },
];

// Header mapping for parsing
export const orderHeaderMapping: Record<string, string> = {
  'order_number': 'order_number',
  'Numéro Commande': 'order_number',
  'N° Commande': 'order_number',
  'order_date': 'order_date',
  'Date Commande': 'order_date',
  'Date': 'order_date',
  'customer_email': 'customer_email',
  'Email Client': 'customer_email',
  'Email': 'customer_email',
  'customer_name': 'customer_name',
  'Nom Client': 'customer_name',
  'Client': 'customer_name',
  'shipping_address': 'shipping_address',
  'Adresse': 'shipping_address',
  'Adresse Livraison': 'shipping_address',
  'shipping_city': 'shipping_city',
  'Ville': 'shipping_city',
  'shipping_postal_code': 'shipping_postal_code',
  'Code Postal': 'shipping_postal_code',
  'CP': 'shipping_postal_code',
  'shipping_country': 'shipping_country',
  'Pays': 'shipping_country',
  'status': 'status',
  'Statut': 'status',
  'Statut Commande': 'status',
  'payment_status': 'payment_status',
  'Statut Paiement': 'payment_status',
  'Paiement': 'payment_status',
  'source': 'source',
  'Source': 'source',
  'Origine': 'source',
  'notes': 'notes',
  'Notes': 'notes',
  'internal_notes': 'internal_notes',
  'Notes Internes': 'internal_notes',
  'product_sku': 'product_sku',
  'SKU': 'product_sku',
  'SKU Produit': 'product_sku',
  'quantity': 'quantity',
  'Quantité': 'quantity',
  'Qté': 'quantity',
  'unit_price': 'unit_price',
  'Prix Unitaire': 'unit_price',
  'Prix': 'unit_price',
  'items': 'items',
  'Articles': 'items',
};

// Order export columns (Format A - one row per item)
export const orderExportColumns = [
  { key: 'order_number' as const, header: 'order_number' },
  { key: 'order_date' as const, header: 'order_date' },
  { key: 'customer_email' as const, header: 'customer_email' },
  { key: 'customer_name' as const, header: 'customer_name' },
  { key: 'shipping_address' as const, header: 'shipping_address' },
  { key: 'shipping_city' as const, header: 'shipping_city' },
  { key: 'shipping_postal_code' as const, header: 'shipping_postal_code' },
  { key: 'shipping_country' as const, header: 'shipping_country' },
  { key: 'status' as const, header: 'status' },
  { key: 'payment_status' as const, header: 'payment_status' },
  { key: 'source' as const, header: 'source' },
  { key: 'notes' as const, header: 'notes' },
  { key: 'product_sku' as const, header: 'product_sku' },
  { key: 'product_title' as const, header: 'product_title' },
  { key: 'quantity' as const, header: 'quantity' },
  { key: 'unit_price' as const, header: 'unit_price' },
  { key: 'total_price' as const, header: 'total_price' },
];

// Flatten orders with items for export (Format A)
export interface OrderWithItemsForExport {
  order_number: string;
  order_date: string;
  customer_email: string;
  customer_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  status: string;
  payment_status: string;
  source: string;
  notes: string;
  product_sku: string;
  product_title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  [key: string]: string | number; // Index signature for compatibility
}

export function flattenOrdersForExport(
  orders: Array<{
    order_number: string;
    created_at: string | null;
    customer_email: string;
    customer_name: string | null;
    shipping_address: string | null;
    shipping_city: string | null;
    shipping_postal_code: string | null;
    shipping_country: string | null;
    status: string | null;
    payment_status: string | null;
    source: string | null;
    internal_notes: string | null;
    order_items?: Array<{
      sku: string | null;
      title: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
  }>
): OrderWithItemsForExport[] {
  const result: OrderWithItemsForExport[] = [];
  
  for (const order of orders) {
    const items = order.order_items || [];
    
    if (items.length === 0) {
      // Order without items
      result.push({
        order_number: order.order_number,
        order_date: order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : '',
        customer_email: order.customer_email,
        customer_name: order.customer_name || '',
        shipping_address: order.shipping_address || '',
        shipping_city: order.shipping_city || '',
        shipping_postal_code: order.shipping_postal_code || '',
        shipping_country: order.shipping_country || '',
        status: order.status || '',
        payment_status: order.payment_status || '',
        source: order.source || '',
        notes: order.internal_notes || '',
        product_sku: '',
        product_title: '',
        quantity: 0,
        unit_price: 0,
        total_price: 0,
      });
    } else {
      // One row per item
      for (const item of items) {
        result.push({
          order_number: order.order_number,
          order_date: order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : '',
          customer_email: order.customer_email,
          customer_name: order.customer_name || '',
          shipping_address: order.shipping_address || '',
          shipping_city: order.shipping_city || '',
          shipping_postal_code: order.shipping_postal_code || '',
          shipping_country: order.shipping_country || '',
          status: order.status || '',
          payment_status: order.payment_status || '',
          source: order.source || '',
          notes: order.internal_notes || '',
          product_sku: item.sku || '',
          product_title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        });
      }
    }
  }
  
  return result;
}
