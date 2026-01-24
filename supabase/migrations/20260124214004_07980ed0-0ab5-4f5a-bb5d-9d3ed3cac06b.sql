-- Add Ship24 tracking columns to purchase_orders
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS ship24_tracker_id VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS tracking_last_update TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS tracking_events JSONB NULL;

-- Add index for Ship24 tracker lookup
CREATE INDEX IF NOT EXISTS idx_po_ship24_tracker_id ON public.purchase_orders(ship24_tracker_id) WHERE ship24_tracker_id IS NOT NULL;

-- Create tracking_events table for detailed history
CREATE TABLE IF NOT EXISTS public.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  status_code VARCHAR(50) NULL,
  location VARCHAR(200) NULL,
  message TEXT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  raw_event JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for fast lookup by PO
CREATE INDEX IF NOT EXISTS idx_tracking_events_po_id ON public.tracking_events(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_occurred_at ON public.tracking_events(purchase_order_id, occurred_at DESC);

-- Enable RLS on tracking_events
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for tracking_events (staff/admin only)
CREATE POLICY "Staff can view tracking events"
ON public.tracking_events FOR SELECT
USING (public.is_staff_or_admin());

CREATE POLICY "Staff can insert tracking events"
ON public.tracking_events FOR INSERT
WITH CHECK (public.is_staff_or_admin());

-- Comment for documentation
COMMENT ON COLUMN public.purchase_orders.ship24_tracker_id IS 'Ship24 tracker ID for automated tracking updates';
COMMENT ON COLUMN public.purchase_orders.tracking_status IS 'Current tracking status: pending, in_transit, out_for_delivery, delivered, exception, unknown';
COMMENT ON COLUMN public.purchase_orders.tracking_last_update IS 'Last time tracking was updated from Ship24';
COMMENT ON COLUMN public.purchase_orders.tracking_events IS 'Cached array of recent tracking events from Ship24';
COMMENT ON TABLE public.tracking_events IS 'Detailed tracking event history for purchase orders';