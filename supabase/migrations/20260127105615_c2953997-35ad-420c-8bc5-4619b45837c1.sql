-- Corriger la policy audit logs pour être plus sécurisée
DROP POLICY IF EXISTS "System can insert audit logs" ON sillon_audit_logs;

CREATE POLICY "Authenticated users can insert audit logs"
  ON sillon_audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);