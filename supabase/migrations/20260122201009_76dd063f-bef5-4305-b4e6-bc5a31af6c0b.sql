-- Add weight and item-based pricing to shipping_rates
ALTER TABLE public.shipping_rates 
ADD COLUMN IF NOT EXISTS rate_type TEXT NOT NULL DEFAULT 'flat',
ADD COLUMN IF NOT EXISTS per_kg_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS per_item_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_weight NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_items INTEGER DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.shipping_rates.rate_type IS 'Type of rate: flat, per_weight, per_item, or combined';
COMMENT ON COLUMN public.shipping_rates.per_kg_price IS 'Price per kg (for weight-based pricing)';
COMMENT ON COLUMN public.shipping_rates.per_item_price IS 'Price per additional item (for item-based pricing)';
COMMENT ON COLUMN public.shipping_rates.max_weight IS 'Maximum weight limit for this rate in kg';
COMMENT ON COLUMN public.shipping_rates.max_items IS 'Maximum items limit for this rate';