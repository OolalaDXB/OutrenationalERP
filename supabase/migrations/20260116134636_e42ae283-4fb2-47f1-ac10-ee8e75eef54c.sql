-- Add missing fields to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Add missing fields to suppliers table  
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS state VARCHAR(100);

-- Add comments to clarify field usage
COMMENT ON COLUMN public.customers.customer_type IS 'Type of customer: particulier (individual) or professionnel (professional/business)';
COMMENT ON COLUMN public.customers.state IS 'State/Province for US, Canada, UAE addresses';
COMMENT ON COLUMN public.customers.vat_number IS 'Intra-community VAT number for EU professional customers';
COMMENT ON COLUMN public.customers.website IS 'Customer website URL';

COMMENT ON COLUMN public.suppliers.vat_number IS 'Intra-community VAT number for EU suppliers';
COMMENT ON COLUMN public.suppliers.state IS 'State/Province for US, Canada, UAE addresses';