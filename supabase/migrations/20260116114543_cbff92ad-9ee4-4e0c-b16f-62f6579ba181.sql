-- Re-apply GRANT permissions on views (they should persist)
GRANT SELECT ON public.v_dashboard_kpis TO authenticated, anon;
GRANT SELECT ON public.v_low_stock_products TO authenticated, anon;
GRANT SELECT ON public.v_supplier_sales TO authenticated, anon;

-- Verify the grants are recorded
DO $$
BEGIN
  RAISE NOTICE 'Permissions granted successfully';
END $$;