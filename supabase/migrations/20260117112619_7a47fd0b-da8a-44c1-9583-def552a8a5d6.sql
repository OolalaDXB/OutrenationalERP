-- Create role_change_history table to track role modifications
CREATE TABLE public.role_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  old_role public.app_role,
  new_role public.app_role NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT
);

-- Enable RLS
ALTER TABLE public.role_change_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view role change history
CREATE POLICY "Admins can view role change history"
ON public.role_change_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert role change history
CREATE POLICY "Admins can insert role change history"
ON public.role_change_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_role_change_history_user_id ON public.role_change_history(user_id);
CREATE INDEX idx_role_change_history_changed_at ON public.role_change_history(changed_at DESC);