-- Add payout invoice numbering fields to settings
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS payout_invoice_prefix TEXT DEFAULT 'REV',
ADD COLUMN IF NOT EXISTS payout_invoice_next_number INTEGER DEFAULT 1;