-- Add widget order preferences to settings table
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS widget_order jsonb DEFAULT '{
  "dashboard": ["dashboard_kpi_cards", "dashboard_monthly_sales", "dashboard_payment_deadlines", "dashboard_supplier_performance"],
  "analytics": ["kpi_cards", "profitability_summary", "sales_evolution", "cost_breakdown", "top_profit_products", "top_customers", "supplier_stats", "supplier_sales_evolution", "orders_by_month", "stock_by_format", "products_by_currency"]
}'::jsonb;

-- Update existing visible_widgets to include the new dashboard_monthly_sales widget
UPDATE public.settings 
SET visible_widgets = visible_widgets || '{"dashboard_monthly_sales": true}'::jsonb
WHERE visible_widgets IS NOT NULL AND NOT visible_widgets ? 'dashboard_monthly_sales';