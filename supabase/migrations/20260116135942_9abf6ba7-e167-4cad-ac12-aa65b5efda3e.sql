-- Create cache table for VIES VAT validations
CREATE TABLE public.vat_validations_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vat_number TEXT NOT NULL UNIQUE,
  country_code TEXT NOT NULL,
  is_valid BOOLEAN NOT NULL,
  company_name TEXT,
  company_address TEXT,
  validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX idx_vat_validations_cache_vat ON public.vat_validations_cache(vat_number);
CREATE INDEX idx_vat_validations_cache_expires ON public.vat_validations_cache(expires_at);

-- Enable RLS
ALTER TABLE public.vat_validations_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to read cache
CREATE POLICY "Authenticated users can read VAT cache"
ON public.vat_validations_cache
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow edge functions to manage cache (using service role)
CREATE POLICY "Service role can manage VAT cache"
ON public.vat_validations_cache
FOR ALL
USING (auth.role() = 'service_role');

-- Allow authenticated users to insert/update cache entries
CREATE POLICY "Authenticated users can insert VAT cache"
ON public.vat_validations_cache
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update VAT cache"
ON public.vat_validations_cache
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE public.vat_validations_cache IS 'Cache for VIES VAT number validations to avoid repeated API calls';