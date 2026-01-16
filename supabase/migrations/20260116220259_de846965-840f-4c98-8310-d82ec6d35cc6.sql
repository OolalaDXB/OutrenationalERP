-- Add supplier_id column to labels table for direct supplier association
ALTER TABLE public.labels 
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_labels_supplier_id ON public.labels(supplier_id);