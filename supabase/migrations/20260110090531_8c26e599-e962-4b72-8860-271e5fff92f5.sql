-- Add professional customer fields to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'retail' CHECK (customer_type IN ('retail', 'professional')),
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS discount_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS vat_number TEXT,
ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30;

-- Create index for professional customer lookups
CREATE INDEX IF NOT EXISTS idx_customers_professional 
ON public.customers(auth_user_id, customer_type, approved) 
WHERE customer_type = 'professional';