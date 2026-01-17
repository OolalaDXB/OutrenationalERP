-- Table pour stocker l'historique des imports
CREATE TABLE public.import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'products', 'customers', 'suppliers'
  file_name TEXT,
  records_created INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'rolled_back'
  rolled_back_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour stocker les IDs des enregistrements créés lors d'un import
CREATE TABLE public.import_created_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES public.import_history(id) ON DELETE CASCADE,
  record_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour accélérer les recherches
CREATE INDEX idx_import_history_entity_type ON public.import_history(entity_type);
CREATE INDEX idx_import_history_created_at ON public.import_history(created_at DESC);
CREATE INDEX idx_import_created_records_import_id ON public.import_created_records(import_id);
CREATE INDEX idx_import_created_records_record_id ON public.import_created_records(record_id);

-- Enable RLS
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_created_records ENABLE ROW LEVEL SECURITY;

-- Policies - Allow authenticated users to manage import history
CREATE POLICY "Authenticated users can view import history"
ON public.import_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert import history"
ON public.import_history FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update import history"
ON public.import_history FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete import history"
ON public.import_history FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view import records"
ON public.import_created_records FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert import records"
ON public.import_created_records FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete import records"
ON public.import_created_records FOR DELETE
TO authenticated
USING (true);