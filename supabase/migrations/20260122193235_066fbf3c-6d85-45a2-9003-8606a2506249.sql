-- Add policy for staff to read ALL payment methods (including inactive)
CREATE POLICY "Staff can read all payment methods" 
ON public.payment_methods 
FOR SELECT 
USING (is_staff_or_admin());