-- Add order lifecycle columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Create trigger to automatically set timestamps when status changes
CREATE OR REPLACE FUNCTION public.update_order_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set confirmed_at when status changes to confirmed
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    NEW.confirmed_at = NOW();
  END IF;
  
  -- Set processing_at when status changes to processing
  IF NEW.status = 'processing' AND (OLD.status IS DISTINCT FROM 'processing') THEN
    NEW.processing_at = NOW();
  END IF;
  
  -- Set shipped_at when status changes to shipped
  IF NEW.status = 'shipped' AND (OLD.status IS DISTINCT FROM 'shipped') THEN
    NEW.shipped_at = NOW();
  END IF;
  
  -- Set delivered_at when status changes to delivered
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    NEW.delivered_at = NOW();
  END IF;
  
  -- Set cancelled_at when status changes to cancelled
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    NEW.cancelled_at = NOW();
  END IF;
  
  -- Set refunded_at when status changes to refunded
  IF NEW.status = 'refunded' AND (OLD.status IS DISTINCT FROM 'refunded') THEN
    NEW.refunded_at = NOW();
  END IF;
  
  -- Set refund_requested_at when refund_requested changes to true
  IF NEW.refund_requested = TRUE AND (OLD.refund_requested IS DISTINCT FROM TRUE) THEN
    NEW.refund_requested_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_order_status_timestamps ON orders;
CREATE TRIGGER trigger_update_order_status_timestamps
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_status_timestamps();

-- RLS Policy: Pro customers can cancel own pending orders or request refunds
CREATE POLICY "Pro customers can update own orders limited"
ON orders FOR UPDATE
TO authenticated
USING (
  customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  AND deleted_at IS NULL
)
WITH CHECK (
  customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
);