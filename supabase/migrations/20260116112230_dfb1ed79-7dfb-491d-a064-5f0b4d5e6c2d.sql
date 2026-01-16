-- Enable RLS on all tables that have policies but RLS disabled

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for activity_log
CREATE POLICY "All authenticated can read activity_log" 
ON public.activity_log FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert activity_log" 
ON public.activity_log FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

-- Fix views to use security_invoker
DROP VIEW IF EXISTS public.v_dashboard_kpis;
DROP VIEW IF EXISTS public.v_low_stock_products;
DROP VIEW IF EXISTS public.v_supplier_sales;

-- Recreate v_dashboard_kpis with security_invoker
CREATE VIEW public.v_dashboard_kpis
WITH (security_invoker = true)
AS
SELECT 
  (SELECT COALESCE(SUM(total), 0) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days' AND status != 'cancelled') as revenue_30d,
  (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days' AND status != 'cancelled') as orders_30d,
  (SELECT COUNT(*) FROM suppliers WHERE active = true) as active_suppliers,
  (SELECT COUNT(*) FROM products WHERE stock <= stock_threshold AND status = 'published') as low_stock_alerts,
  (SELECT COUNT(*) FROM customers WHERE created_at >= NOW() - INTERVAL '30 days') as new_customers_30d;

-- Recreate v_low_stock_products with security_invoker
CREATE VIEW public.v_low_stock_products
WITH (security_invoker = true)
AS
SELECT 
  p.*,
  s.email as supplier_email,
  s.phone as supplier_phone
FROM products p
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.stock <= p.stock_threshold AND p.status = 'published';

-- Recreate v_supplier_sales with security_invoker  
CREATE VIEW public.v_supplier_sales
WITH (security_invoker = true)
AS
SELECT 
  s.id as supplier_id,
  s.name as supplier_name,
  s.type as supplier_type,
  s.commission_rate,
  COALESCE(SUM(oi.total_price), 0) as gross_sales,
  COALESCE(SUM(oi.quantity), 0) as items_sold,
  COUNT(DISTINCT oi.order_id) as orders_count,
  CASE 
    WHEN s.type = 'consignment' THEN COALESCE(SUM(oi.total_price * s.commission_rate), 0)
    WHEN s.type = 'purchase' THEN COALESCE(SUM(oi.total_price) - SUM(oi.unit_cost * oi.quantity), 0)
    ELSE COALESCE(SUM(oi.total_price), 0)
  END as our_margin,
  CASE 
    WHEN s.type = 'consignment' THEN COALESCE(SUM(oi.total_price * (1 - s.commission_rate)), 0)
    ELSE 0
  END as supplier_due
FROM suppliers s
LEFT JOIN order_items oi ON s.id = oi.supplier_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled', 'refunded')
GROUP BY s.id, s.name, s.type, s.commission_rate;