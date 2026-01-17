-- Add custom_marketplace_mappings column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS custom_marketplace_mappings JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.settings.custom_marketplace_mappings IS 'Custom column mappings per marketplace for order imports';