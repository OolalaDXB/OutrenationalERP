-- Create a junction table to associate suppliers with labels
CREATE TABLE public.supplier_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, label_id)
);

-- Enable RLS
ALTER TABLE public.supplier_labels ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" 
ON public.supplier_labels 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
ON public.supplier_labels 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
ON public.supplier_labels 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Enable delete access for authenticated users" 
ON public.supplier_labels 
FOR DELETE 
TO authenticated
USING (true);

-- Add indexes for performance
CREATE INDEX idx_supplier_labels_supplier_id ON public.supplier_labels(supplier_id);
CREATE INDEX idx_supplier_labels_label_id ON public.supplier_labels(label_id);