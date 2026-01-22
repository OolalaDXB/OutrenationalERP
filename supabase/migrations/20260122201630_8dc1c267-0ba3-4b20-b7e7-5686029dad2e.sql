-- RLS policy for Pro customers to view their own invoices
CREATE POLICY "Pro customers can view own invoices" 
ON invoices
FOR SELECT 
TO authenticated
USING (
  customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
);