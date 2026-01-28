-- Add Stripe caching columns to sillon_plans to avoid repeated API searches
ALTER TABLE sillon_plans 
ADD COLUMN IF NOT EXISTS stripe_product_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Grant permissions for edge functions to update these
GRANT UPDATE (stripe_product_id, stripe_price_id) ON sillon_plans TO authenticated;