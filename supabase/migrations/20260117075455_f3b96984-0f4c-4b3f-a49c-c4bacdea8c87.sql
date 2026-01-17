-- Add sales_channels JSONB column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS sales_channels JSONB DEFAULT '[
  {"id": "discogs", "name": "Discogs", "url": "", "enabled": true, "icon": "disc"},
  {"id": "ebay", "name": "eBay", "url": "", "enabled": false, "icon": "shopping-bag"},
  {"id": "website", "name": "Site web", "url": "", "enabled": true, "icon": "globe"},
  {"id": "phone", "name": "Téléphone", "url": null, "enabled": true, "icon": "phone", "builtin": true},
  {"id": "email", "name": "Email", "url": null, "enabled": true, "icon": "mail", "builtin": true},
  {"id": "instore", "name": "En boutique", "url": null, "enabled": true, "icon": "store", "builtin": true}
]'::jsonb;

-- Create order_import_history table
CREATE TABLE IF NOT EXISTS public.order_import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_name TEXT,
  import_type TEXT NOT NULL DEFAULT 'xls', -- 'csv', 'xls', 'ocr'
  source TEXT, -- detected/selected source from sales channels
  orders_created INTEGER NOT NULL DEFAULT 0,
  orders_updated INTEGER NOT NULL DEFAULT 0,
  orders_skipped INTEGER NOT NULL DEFAULT 0,
  items_created INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT
);

-- Enable RLS
ALTER TABLE public.order_import_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_import_history
CREATE POLICY "Authenticated users can view order import history" 
ON public.order_import_history 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert order import history" 
ON public.order_import_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_import_history_created_at 
ON public.order_import_history(created_at DESC);