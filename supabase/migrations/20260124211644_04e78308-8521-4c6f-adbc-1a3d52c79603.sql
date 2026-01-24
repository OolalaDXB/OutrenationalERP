-- 1) Add new status 'in_transit' to po_status enum
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'in_transit' AFTER 'acknowledged';

-- 2) Add tracking and payment columns to purchase_orders
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS carrier VARCHAR(50),
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);