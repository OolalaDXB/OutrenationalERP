-- Grant SELECT permissions on views to authenticated users
GRANT SELECT ON public.v_dashboard_kpis TO authenticated;
GRANT SELECT ON public.v_low_stock_products TO authenticated;
GRANT SELECT ON public.v_supplier_sales TO authenticated;

-- Also grant to anon for public access if needed
GRANT SELECT ON public.v_dashboard_kpis TO anon;
GRANT SELECT ON public.v_low_stock_products TO anon;
GRANT SELECT ON public.v_supplier_sales TO anon;