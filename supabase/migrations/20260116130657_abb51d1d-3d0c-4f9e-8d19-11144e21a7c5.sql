-- Add RLS policies for invoice_history table to allow reading
CREATE POLICY "Authenticated users can view invoice history"
ON public.invoice_history
FOR SELECT
TO authenticated
USING (true);

-- Also ensure insert policy exists for authenticated users
CREATE POLICY "Authenticated users can insert invoice history"
ON public.invoice_history
FOR INSERT
TO authenticated
WITH CHECK (true);