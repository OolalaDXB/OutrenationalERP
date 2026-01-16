-- Create invoice_history table for tracking invoice modifications
CREATE TABLE public.invoice_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'status_changed', 'duplicated'
  changes JSONB, -- stores the changed fields with old and new values
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_history ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all authenticated users to read/write for now)
CREATE POLICY "Allow authenticated users to view invoice history"
ON public.invoice_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert invoice history"
ON public.invoice_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_invoice_history_invoice_id ON public.invoice_history(invoice_id);
CREATE INDEX idx_invoice_history_created_at ON public.invoice_history(created_at DESC);