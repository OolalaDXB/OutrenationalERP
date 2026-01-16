-- Add cost breakdown fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS marketplace_fees numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS import_fees numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR';

-- Add comment for documentation
COMMENT ON COLUMN public.products.marketplace_fees IS 'Marketplace fees (Discogs, eBay, etc.)';
COMMENT ON COLUMN public.products.import_fees IS 'Import/customs fees';
COMMENT ON COLUMN public.products.shipping_cost IS 'Shipping cost for acquiring the product';
COMMENT ON COLUMN public.products.exchange_rate IS 'Exchange rate used (e.g., USD to EUR)';
COMMENT ON COLUMN public.products.currency IS 'Currency of the purchase price (EUR, USD)';