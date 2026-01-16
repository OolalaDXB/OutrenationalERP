-- Add widget visibility preferences to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS visible_widgets jsonb DEFAULT '{
  "kpi_cards": true,
  "profitability_summary": true,
  "sales_evolution": true,
  "cost_breakdown": true,
  "top_profit_products": true,
  "top_customers": true,
  "supplier_stats": true,
  "supplier_sales_evolution": true,
  "orders_by_month": true,
  "stock_by_format": true,
  "products_by_currency": true
}'::jsonb;