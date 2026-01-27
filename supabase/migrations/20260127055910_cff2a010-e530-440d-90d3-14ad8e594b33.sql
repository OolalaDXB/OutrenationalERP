-- Grant permissions on tenant_users table (critical for RLS helper functions)
GRANT SELECT ON public.tenant_users TO authenticated;
GRANT SELECT ON public.tenant_users TO anon;

-- Grant permissions on tenants table
GRANT SELECT ON public.tenants TO authenticated;
GRANT SELECT ON public.tenants TO anon;

-- Grant permissions on existing views
GRANT SELECT ON public.v_dashboard_kpis TO authenticated;
GRANT SELECT ON public.v_dashboard_kpis TO anon;

GRANT SELECT ON public.v_supplier_sales TO authenticated;
GRANT SELECT ON public.v_supplier_sales TO anon;

GRANT SELECT ON public.v_order_items_with_margin TO authenticated;
GRANT SELECT ON public.v_order_items_with_margin TO anon;

GRANT SELECT ON public.v_low_stock_products TO authenticated;
GRANT SELECT ON public.v_low_stock_products TO anon;

GRANT SELECT ON public.v_top_products_by_revenue TO authenticated;
GRANT SELECT ON public.v_top_products_by_revenue TO anon;