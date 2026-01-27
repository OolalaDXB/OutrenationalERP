import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears } from 'date-fns';

export type PeriodType = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

// Type definitions for finance data
export interface MonthlyRevenueRow {
  month: string;
  revenue_ht: number;
  tva_collected: number;
  invoice_count: number;
}

export interface TvaBreakdownItem {
  rate: string;
  baseHT: number;
  tvaAmount: number;
}

export interface TopProductItem {
  product_id: string | null;
  title: string;
  sku: string | null;
  total_revenue: number;
  total_quantity: number;
}

// View row type - not generated in types.ts
interface OrderItemWithMarginRow {
  margin: number | null;
  margin_type: 'purchase' | 'consignment' | 'unknown';
  order_date: string;
  total_price: number;
  product_id: string | null;
  title: string;
  sku: string | null;
  quantity: number;
}

export function getDateRange(period: PeriodType, customStart?: Date, customEnd?: Date) {
  const now = new Date();
  
  switch (period) {
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case 'this_quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'this_year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'custom':
      return { 
        start: customStart || startOfMonth(now), 
        end: customEnd || endOfMonth(now) 
      };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export function getPreviousPeriodRange(period: PeriodType, start: Date, end: Date) {
  switch (period) {
    case 'this_month':
    case 'last_month':
      return { 
        start: startOfMonth(subMonths(start, 1)), 
        end: endOfMonth(subMonths(end, 1)) 
      };
    case 'this_quarter':
      return { 
        start: startOfQuarter(subQuarters(start, 1)), 
        end: endOfQuarter(subQuarters(end, 1)) 
      };
    case 'this_year':
      return { 
        start: startOfYear(subYears(start, 1)), 
        end: endOfYear(subYears(end, 1)) 
      };
    case 'custom':
      const durationMs = end.getTime() - start.getTime();
      return { 
        start: new Date(start.getTime() - durationMs - 86400000), 
        end: new Date(start.getTime() - 86400000) 
      };
    default:
      return { 
        start: startOfMonth(subMonths(start, 1)), 
        end: endOfMonth(subMonths(end, 1)) 
      };
  }
}

// KPIs hook
export function useFinanceKPIs(startDate: Date, endDate: Date, period: PeriodType) {
  const prevRange = getPreviousPeriodRange(period, startDate, endDate);
  
  return useQuery({
    queryKey: ['finance', 'kpis', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      // Current period invoices
      const { data: currentInvoices, error: invError } = await supabase
        .from('invoices')
        .select('id, subtotal, tax_amount, total, status, due_date')
        .not('status', 'in', '("cancelled","draft")')
        .gte('issue_date', format(startDate, 'yyyy-MM-dd'))
        .lte('issue_date', format(endDate, 'yyyy-MM-dd'));
      
      if (invError) throw invError;
      
      // Previous period invoices for comparison
      const { data: prevInvoices, error: prevError } = await supabase
        .from('invoices')
        .select('id, subtotal, tax_amount')
        .not('status', 'in', '("cancelled","draft")')
        .gte('issue_date', format(prevRange.start, 'yyyy-MM-dd'))
        .lte('issue_date', format(prevRange.end, 'yyyy-MM-dd'));
      
      if (prevError) throw prevError;
      
      // Current period margin from view
      const { data: marginDataRaw, error: marginError } = await supabase
        .from('v_order_items_with_margin')
        .select('margin, margin_type, order_date, total_price')
        .gte('order_date', format(startDate, 'yyyy-MM-dd'))
        .lte('order_date', format(endDate, 'yyyy-MM-dd'));
      
      if (marginError) throw marginError;
      const marginData = (marginDataRaw || []) as unknown as OrderItemWithMarginRow[];
      
      // Previous period margin
      const { data: prevMarginDataRaw, error: prevMarginError } = await supabase
        .from('v_order_items_with_margin')
        .select('margin, margin_type')
        .gte('order_date', format(prevRange.start, 'yyyy-MM-dd'))
        .lte('order_date', format(prevRange.end, 'yyyy-MM-dd'));
      
      if (prevMarginError) throw prevMarginError;
      const prevMarginData = (prevMarginDataRaw || []) as unknown as OrderItemWithMarginRow[];
      
      // Unpaid invoices (all time) - calculate from invoices table directly
      let unpaidStats = { total_count: 0, total_amount: 0, overdue_count: 0, overdue_amount: 0 };
      const { data: unpaidInvoices } = await supabase
        .from('invoices')
        .select('total, due_date')
        .not('status', 'in', '("cancelled","draft","paid")');
      
      if (unpaidInvoices) {
        const now = new Date();
        unpaidStats = unpaidInvoices.reduce((acc, inv) => {
          acc.total_count++;
          acc.total_amount += Number(inv.total || 0);
          if (inv.due_date && new Date(inv.due_date) < now) {
            acc.overdue_count++;
            acc.overdue_amount += Number(inv.total || 0);
          }
          return acc;
        }, { total_count: 0, total_amount: 0, overdue_count: 0, overdue_amount: 0 });
      }
      
      // Calculate current period
      const revenueHT = currentInvoices?.reduce((sum, inv) => sum + Number(inv.subtotal || 0), 0) || 0;
      const tvaCollected = currentInvoices?.reduce((sum, inv) => sum + Number(inv.tax_amount || 0), 0) || 0;
      const invoiceCount = currentInvoices?.length || 0;
      
      // Calculate margin
      const validMargins = marginData.filter(m => m.margin !== null);
      const grossMargin = validMargins.reduce((sum, m) => sum + Number(m.margin || 0), 0);
      const unknownCostCount = marginData.filter(m => m.margin_type === 'unknown').length;
      const totalRevenue = marginData.reduce((sum, m) => sum + Number(m.total_price || 0), 0);
      const marginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
      
      // Previous period calculations
      const prevRevenueHT = prevInvoices?.reduce((sum, inv) => sum + Number(inv.subtotal || 0), 0) || 0;
      const prevGrossMargin = prevMarginData.filter(m => m.margin !== null).reduce((sum, m) => sum + Number(m.margin || 0), 0);
      
      // Change percentages
      const revenueChange = prevRevenueHT > 0 ? ((revenueHT - prevRevenueHT) / prevRevenueHT) * 100 : 0;
      const marginChange = prevGrossMargin > 0 ? ((grossMargin - prevGrossMargin) / prevGrossMargin) * 100 : 0;
      
      return {
        revenueHT,
        revenueChange,
        grossMargin,
        marginPercent,
        marginChange,
        unknownCostCount,
        tvaCollected,
        invoiceCount,
        avgBasket: invoiceCount > 0 ? revenueHT / invoiceCount : 0,
        unpaidTotal: unpaidStats.total_amount,
        unpaidCount: unpaidStats.total_count,
        overdueTotal: unpaidStats.overdue_amount,
        overdueCount: unpaidStats.overdue_count,
      };
    },
  });
}

// Monthly revenue - calculates in app since view types aren't generated
export function useMonthlyRevenue() {
  return useQuery({
    queryKey: ['finance', 'monthly-revenue'],
    queryFn: async (): Promise<MonthlyRevenueRow[]> => {
      const { data, error } = await supabase
        .from('invoices')
        .select('issue_date, subtotal, tax_amount')
        .not('status', 'in', '("cancelled","draft")')
        .order('issue_date', { ascending: true });
      
      if (error) throw error;
      
      // Group by month - last 12 months
      const now = new Date();
      const months: MonthlyRevenueRow[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthKey = format(monthStart, 'yyyy-MM-dd');
        
        const monthInvoices = (data || []).filter(inv => {
          const invDate = new Date(inv.issue_date);
          return invDate >= monthStart && invDate <= monthEnd;
        });
        
        months.push({
          month: monthKey,
          revenue_ht: monthInvoices.reduce((sum, inv) => sum + Number(inv.subtotal || 0), 0),
          tva_collected: monthInvoices.reduce((sum, inv) => sum + Number(inv.tax_amount || 0), 0),
          invoice_count: monthInvoices.length,
        });
      }
      
      return months;
    },
  });
}

// TVA breakdown
export function useTvaBreakdown(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['finance', 'tva-breakdown', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async (): Promise<TvaBreakdownItem[]> => {
      const { data, error } = await supabase
        .from('invoices')
        .select('subtotal, tax_amount')
        .not('status', 'in', '("cancelled","draft")')
        .gte('issue_date', format(startDate, 'yyyy-MM-dd'))
        .lte('issue_date', format(endDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Aggregate by inferred tax_rate
      const byRate: Record<string, TvaBreakdownItem> = {};
      
      (data || []).forEach(inv => {
        const subtotal = Number(inv.subtotal || 0);
        const taxAmount = Number(inv.tax_amount || 0);
        const rate = subtotal > 0 ? Math.round((taxAmount / subtotal) * 1000) / 10 : 0;
        
        let rateKey = 'other';
        if (rate === 0) rateKey = '0';
        else if (rate >= 5 && rate <= 6) rateKey = '5.5';
        else if (rate >= 19 && rate <= 21) rateKey = '20';
        
        if (!byRate[rateKey]) {
          byRate[rateKey] = { rate: rateKey, baseHT: 0, tvaAmount: 0 };
        }
        byRate[rateKey].baseHT += subtotal;
        byRate[rateKey].tvaAmount += taxAmount;
      });
      
      return Object.values(byRate);
    },
  });
}

// Overdue invoices
export function useOverdueInvoices() {
  return useQuery({
    queryKey: ['finance', 'overdue-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, issue_date, due_date, subtotal, tax_amount, total, status, customer_id, order_id')
        .not('status', 'in', '("cancelled","draft","paid")')
        .lt('due_date', format(new Date(), 'yyyy-MM-dd'))
        .order('due_date', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      
      return (data || []).map(inv => ({
        ...inv,
        days_overdue: inv.due_date 
          ? Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0
      }));
    },
  });
}

// Top products by revenue
export function useTopProducts(startDate: Date, endDate: Date, limit = 5) {
  return useQuery({
    queryKey: ['finance', 'top-products', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), limit],
    queryFn: async (): Promise<TopProductItem[]> => {
      const { data: rawData, error } = await supabase
        .from('v_order_items_with_margin')
        .select('product_id, title, sku, total_price, quantity')
        .gte('order_date', format(startDate, 'yyyy-MM-dd'))
        .lte('order_date', format(endDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      const data = (rawData || []) as unknown as OrderItemWithMarginRow[];
      
      // Aggregate by product
      const byProduct: Record<string, TopProductItem> = {};
      
      data.forEach(item => {
        const key = item.product_id || item.sku || item.title;
        if (!byProduct[key]) {
          byProduct[key] = { 
            product_id: item.product_id,
            title: item.title, 
            sku: item.sku, 
            total_revenue: 0, 
            total_quantity: 0 
          };
        }
        byProduct[key].total_revenue += Number(item.total_price || 0);
        byProduct[key].total_quantity += Number(item.quantity || 0);
      });
      
      return Object.values(byProduct)
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit);
    },
  });
}

// Margin stats from view
export function useMarginStats(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['finance', 'margin-stats', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data: rawData, error } = await supabase
        .from('v_order_items_with_margin')
        .select('margin, margin_type, total_price')
        .gte('order_date', format(startDate, 'yyyy-MM-dd'))
        .lte('order_date', format(endDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      const items = (rawData || []) as unknown as OrderItemWithMarginRow[];
      const purchaseItems = items.filter(i => i.margin_type === 'purchase');
      const consignmentItems = items.filter(i => i.margin_type === 'consignment');
      const unknownItems = items.filter(i => i.margin_type === 'unknown');
      
      return {
        totalMargin: items.reduce((sum, i) => sum + Number(i.margin || 0), 0),
        purchaseMargin: purchaseItems.reduce((sum, i) => sum + Number(i.margin || 0), 0),
        consignmentMargin: consignmentItems.reduce((sum, i) => sum + Number(i.margin || 0), 0),
        purchaseRevenue: purchaseItems.reduce((sum, i) => sum + Number(i.total_price || 0), 0),
        consignmentRevenue: consignmentItems.reduce((sum, i) => sum + Number(i.total_price || 0), 0),
        unknownCount: unknownItems.length,
        unknownRevenue: unknownItems.reduce((sum, i) => sum + Number(i.total_price || 0), 0),
      };
    },
  });
}

// Recent invoices
export function useRecentInvoices(limit = 5) {
  return useQuery({
    queryKey: ['finance', 'recent-invoices', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, issue_date, total, status, customer_id, recipient_name')
        .not('status', 'in', '("cancelled","draft")')
        .order('issue_date', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },
  });
}
