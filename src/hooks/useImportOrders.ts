import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;

export interface ParsedOrder {
  order_number: string;
  order_date: string;
  customer_email: string;
  customer_name?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  status?: string;
  payment_status?: string;
  source?: string;
  notes?: string;
}

export interface ParsedOrderItem {
  order_number: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
}

export interface ImportWarning {
  type: 'unknown_sku' | 'duplicate_order' | 'invalid_date' | 'missing_field';
  message: string;
  row?: number;
  order_number?: string;
  sku?: string;
}

export interface ParseResult {
  orders: ParsedOrder[];
  items: ParsedOrderItem[];
  warnings: ImportWarning[];
}

export interface ImportOptions {
  skipDuplicates: boolean;
  updateExisting: boolean;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// Parse date from various formats
function parseDate(value: unknown): string | null {
  if (!value) return null;
  
  const strValue = String(value).trim();
  
  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(strValue)) {
    const date = new Date(strValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  // DD/MM/YYYY format
  const ddmmyyyy = strValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  // Excel serial date number
  if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(strValue)) {
    const serial = parseFloat(strValue);
    // Excel dates start from January 1, 1900
    const date = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1990) {
      return date.toISOString();
    }
  }
  
  return null;
}

// Parse items from semicolon-separated format (Format B)
function parseItemsString(itemsStr: string, orderNumber: string): ParsedOrderItem[] {
  if (!itemsStr) return [];
  
  const items: ParsedOrderItem[] = [];
  const parts = itemsStr.split(';');
  
  for (const part of parts) {
    const [sku, qtyStr, priceStr] = part.trim().split(':');
    if (sku) {
      items.push({
        order_number: orderNumber,
        product_sku: sku.trim(),
        quantity: parseInt(qtyStr) || 1,
        unit_price: parseFloat(priceStr) || 0,
      });
    }
  }
  
  return items;
}

export function useImportOrders() {
  const [isImporting, setIsImporting] = useState(false);
  const queryClient = useQueryClient();

  const parseOrdersFile = async (
    rows: Record<string, unknown>[],
    existingOrderNumbers: string[],
    existingSkus: string[]
  ): Promise<ParseResult> => {
    const orders: ParsedOrder[] = [];
    const items: ParsedOrderItem[] = [];
    const warnings: ImportWarning[] = [];
    const seenOrderNumbers = new Set<string>();
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header row and 1-indexing
      
      const orderNumber = String(row.order_number || '').trim();
      const customerEmail = String(row.customer_email || '').trim();
      
      // Check required fields
      if (!orderNumber) {
        warnings.push({
          type: 'missing_field',
          message: `Ligne ${rowNum}: Numéro de commande manquant`,
          row: rowNum,
        });
        continue;
      }
      
      if (!customerEmail) {
        warnings.push({
          type: 'missing_field',
          message: `Ligne ${rowNum}: Email client manquant (${orderNumber})`,
          row: rowNum,
          order_number: orderNumber,
        });
        continue;
      }
      
      // Parse date
      const orderDate = parseDate(row.order_date);
      if (!orderDate) {
        warnings.push({
          type: 'invalid_date',
          message: `Ligne ${rowNum}: Date invalide (${orderNumber})`,
          row: rowNum,
          order_number: orderNumber,
        });
        continue;
      }
      
      // Check for duplicates
      if (existingOrderNumbers.includes(orderNumber)) {
        warnings.push({
          type: 'duplicate_order',
          message: `Commande ${orderNumber} existe déjà`,
          order_number: orderNumber,
        });
      }
      
      // Add order if not already seen (for grouped items in Format A)
      if (!seenOrderNumbers.has(orderNumber)) {
        seenOrderNumbers.add(orderNumber);
        orders.push({
          order_number: orderNumber,
          order_date: orderDate,
          customer_email: customerEmail,
          customer_name: row.customer_name ? String(row.customer_name).trim() : undefined,
          shipping_address: row.shipping_address ? String(row.shipping_address).trim() : undefined,
          shipping_city: row.shipping_city ? String(row.shipping_city).trim() : undefined,
          shipping_postal_code: row.shipping_postal_code ? String(row.shipping_postal_code).trim() : undefined,
          shipping_country: row.shipping_country ? String(row.shipping_country).trim() : undefined,
          status: row.status ? String(row.status).trim().toLowerCase() : 'delivered',
          payment_status: row.payment_status ? String(row.payment_status).trim().toLowerCase() : 'paid',
          source: row.source ? String(row.source).trim() : undefined,
          notes: row.notes || row.internal_notes ? String(row.notes || row.internal_notes).trim() : undefined,
        });
      }
      
      // Parse items - Format A (flat with product_sku column)
      if (row.product_sku) {
        const sku = String(row.product_sku).trim();
        if (!existingSkus.includes(sku)) {
          warnings.push({
            type: 'unknown_sku',
            message: `SKU inconnu: ${sku} (ligne ${rowNum})`,
            row: rowNum,
            order_number: orderNumber,
            sku,
          });
        }
        items.push({
          order_number: orderNumber,
          product_sku: sku,
          quantity: parseInt(String(row.quantity)) || 1,
          unit_price: parseFloat(String(row.unit_price)) || 0,
        });
      }
      
      // Parse items - Format B (semicolon-separated in items column)
      if (row.items) {
        const parsedItems = parseItemsString(String(row.items), orderNumber);
        for (const item of parsedItems) {
          if (!existingSkus.includes(item.product_sku)) {
            warnings.push({
              type: 'unknown_sku',
              message: `SKU inconnu: ${item.product_sku} (commande ${orderNumber})`,
              order_number: orderNumber,
              sku: item.product_sku,
            });
          }
          items.push(item);
        }
      }
    }
    
    return { orders, items, warnings };
  };

  const importOrders = async (
    orders: ParsedOrder[],
    items: ParsedOrderItem[],
    options: ImportOptions
  ): Promise<ImportResult> => {
    setIsImporting(true);
    const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
    
    try {
      // Get existing orders
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('id, order_number');
      const existingOrderMap = new Map(
        (existingOrders || []).map(o => [o.order_number, o.id])
      );
      
      // Get products by SKU
      const { data: products } = await supabase
        .from('products')
        .select('id, sku, title, selling_price, supplier_id, supplier_name, supplier_type, consignment_rate, cost_price, image_url, format, artist_name');
      const productMap = new Map(
        (products || []).map(p => [p.sku, p])
      );
      
      // Get or create customers by email
      const customerEmails = [...new Set(orders.map(o => o.customer_email))];
      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('id, email')
        .in('email', customerEmails);
      const customerMap = new Map(
        (existingCustomers || []).map(c => [c.email.toLowerCase(), c.id])
      );
      
      // Create missing customers
      const missingEmails = customerEmails.filter(e => !customerMap.has(e.toLowerCase()));
      if (missingEmails.length > 0) {
        const newCustomers = missingEmails.map(email => {
          const order = orders.find(o => o.customer_email === email);
          const nameParts = (order?.customer_name || '').split(' ');
          return {
            email,
            first_name: nameParts[0] || null,
            last_name: nameParts.slice(1).join(' ') || null,
          };
        });
        const { data: createdCustomers, error } = await supabase
          .from('customers')
          .insert(newCustomers as any)
          .select('id, email');
        
        if (!error && createdCustomers) {
          createdCustomers.forEach(c => customerMap.set(c.email.toLowerCase(), c.id));
        }
      }
      
      // Process each order
      for (const order of orders) {
        const existingOrderId = existingOrderMap.get(order.order_number);
        
        if (existingOrderId) {
          if (options.skipDuplicates) {
            result.skipped++;
            continue;
          }
          if (!options.updateExisting) {
            result.skipped++;
            continue;
          }
        }
        
        // Get order items
        const orderItems = items.filter(i => i.order_number === order.order_number);
        
        // Calculate totals
        let subtotal = 0;
        const itemsToInsert: any[] = [];
        
        for (const item of orderItems) {
          const product = productMap.get(item.product_sku);
          const unitPrice = item.unit_price || product?.selling_price || 0;
          const totalPrice = unitPrice * item.quantity;
          subtotal += totalPrice;
          
          itemsToInsert.push({
            order_id: '', // Will be set after order creation
            product_id: product?.id || null,
            title: product?.title || item.product_sku,
            sku: item.product_sku,
            quantity: item.quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            unit_cost: product?.cost_price || null,
            supplier_id: product?.supplier_id || null,
            supplier_name: product?.supplier_name || null,
            supplier_type: product?.supplier_type || null,
            consignment_rate: product?.consignment_rate || null,
            image_url: product?.image_url || null,
            format: product?.format || null,
            artist_name: product?.artist_name || null,
            status: 'active',
          });
        }
        
        const customerId = customerMap.get(order.customer_email.toLowerCase());
        
        const orderData: any = {
          order_number: order.order_number,
          created_at: order.order_date,
          customer_email: order.customer_email,
          customer_name: order.customer_name || null,
          customer_id: customerId || null,
          shipping_address: order.shipping_address || null,
          shipping_city: order.shipping_city || null,
          shipping_postal_code: order.shipping_postal_code || null,
          shipping_country: order.shipping_country || null,
          status: (order.status as any) || 'delivered',
          payment_status: (order.payment_status as any) || 'paid',
          source: order.source || null,
          internal_notes: order.notes || null,
          subtotal,
          total: subtotal,
          paid_at: order.payment_status === 'paid' ? order.order_date : null,
          delivered_at: order.status === 'delivered' ? order.order_date : null,
        };
        
        try {
          if (existingOrderId && options.updateExisting) {
            // Update existing order
            const { error: updateError } = await supabase
              .from('orders')
              .update(orderData)
              .eq('id', existingOrderId);
            
            if (updateError) throw updateError;
            
            // Delete existing items and re-insert
            await supabase.from('order_items').delete().eq('order_id', existingOrderId);
            
            if (itemsToInsert.length > 0) {
              const itemsWithOrderId = itemsToInsert.map(i => ({ ...i, order_id: existingOrderId }));
              await supabase.from('order_items').insert(itemsWithOrderId);
            }
            
            result.updated++;
          } else {
            // Create new order
            const { data: newOrder, error: createError } = await supabase
              .from('orders')
              .insert(orderData)
              .select('id')
              .single();
            
            if (createError) throw createError;
            
            if (itemsToInsert.length > 0 && newOrder) {
              const itemsWithOrderId = itemsToInsert.map(i => ({ ...i, order_id: newOrder.id }));
              await supabase.from('order_items').insert(itemsWithOrderId);
            }
            
            result.created++;
          }
        } catch (error) {
          result.errors.push(`Erreur pour ${order.order_number}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
    } finally {
      setIsImporting(false);
    }
    
    return result;
  };

  return {
    parseOrdersFile,
    importOrders,
    isImporting,
  };
}
