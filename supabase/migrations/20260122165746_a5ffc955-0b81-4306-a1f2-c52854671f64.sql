-- Add credit note numbering to settings
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS credit_note_prefix TEXT DEFAULT 'AV',
ADD COLUMN IF NOT EXISTS credit_note_next_number INTEGER DEFAULT 1;