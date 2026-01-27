-- =====================================================
-- SILLON CONTROL PANEL v2 - Complete Migration
-- =====================================================

-- 1. Créer ENUMs
CREATE TYPE sillon_admin_role AS ENUM ('super_admin', 'admin', 'staff', 'viewer');
CREATE TYPE billing_type AS ENUM ('fixed', 'variable', 'hybrid');

-- 2. Table admins Sillon
CREATE TABLE public.sillon_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role sillon_admin_role NOT NULL DEFAULT 'viewer',
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- 3. Table audit logs
CREATE TABLE public.sillon_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT NOT NULL,
  actor_role sillon_admin_role,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  target_name TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT
);

-- 4. Table plans
CREATE TABLE public.sillon_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  base_price_monthly DECIMAL(10,2) NOT NULL,
  billing_type billing_type NOT NULL DEFAULT 'fixed',
  variable_rate DECIMAL(5,4) DEFAULT 0,
  variable_cap DECIMAL(10,2) DEFAULT NULL,
  
  -- Capabilities template
  capabilities JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  version TEXT NOT NULL DEFAULT '2026-01',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table add-ons
CREATE TABLE public.sillon_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  capability_key TEXT NOT NULL,
  included_in_plans TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table plan versions (historique pour grandfathering)
CREATE TABLE public.sillon_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES sillon_plans(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  base_price_monthly DECIMAL(10,2) NOT NULL,
  capabilities JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(plan_id, version)
);

-- 7. Index
CREATE INDEX idx_sillon_admins_email ON sillon_admins(email);
CREATE INDEX idx_sillon_admins_user ON sillon_admins(user_id);
CREATE INDEX idx_audit_timestamp ON sillon_audit_logs(timestamp DESC);
CREATE INDEX idx_audit_actor ON sillon_audit_logs(actor_id);
CREATE INDEX idx_audit_target ON sillon_audit_logs(target_type, target_id);
CREATE INDEX idx_plans_code ON sillon_plans(code);
CREATE INDEX idx_plans_active ON sillon_plans(is_active);

-- 8. RLS
ALTER TABLE sillon_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sillon_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sillon_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sillon_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE sillon_plan_versions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a sillon admin
CREATE OR REPLACE FUNCTION public.is_sillon_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sillon_admins
    WHERE user_id = _user_id AND is_active = true
  )
$$;

-- Helper function to get sillon admin role
CREATE OR REPLACE FUNCTION public.get_sillon_admin_role(_user_id UUID DEFAULT auth.uid())
RETURNS sillon_admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM sillon_admins
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- Policies pour sillon_admins
CREATE POLICY "Sillon admins can read sillon_admins"
  ON sillon_admins FOR SELECT
  USING (public.is_sillon_admin(auth.uid()));

CREATE POLICY "Super admins can insert sillon_admins"
  ON sillon_admins FOR INSERT
  WITH CHECK (public.get_sillon_admin_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can update sillon_admins"
  ON sillon_admins FOR UPDATE
  USING (public.get_sillon_admin_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can delete sillon_admins"
  ON sillon_admins FOR DELETE
  USING (public.get_sillon_admin_role(auth.uid()) = 'super_admin');

-- Policies pour audit logs
CREATE POLICY "Sillon admins can read audit logs"
  ON sillon_audit_logs FOR SELECT
  USING (public.get_sillon_admin_role(auth.uid()) IN ('super_admin', 'admin', 'staff'));

CREATE POLICY "System can insert audit logs"
  ON sillon_audit_logs FOR INSERT
  WITH CHECK (true);

-- Policies pour plans (lecture publique pour active+public, écriture admin)
CREATE POLICY "Anyone can read active public plans"
  ON sillon_plans FOR SELECT
  USING (is_active = true AND is_public = true);

CREATE POLICY "Sillon admins can read all plans"
  ON sillon_plans FOR SELECT
  USING (public.is_sillon_admin(auth.uid()));

CREATE POLICY "Admins can manage plans"
  ON sillon_plans FOR ALL
  USING (public.get_sillon_admin_role(auth.uid()) IN ('super_admin', 'admin'));

-- Policies pour addons
CREATE POLICY "Anyone can read active addons"
  ON sillon_addons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Sillon admins can read all addons"
  ON sillon_addons FOR SELECT
  USING (public.is_sillon_admin(auth.uid()));

CREATE POLICY "Admins can manage addons"
  ON sillon_addons FOR ALL
  USING (public.get_sillon_admin_role(auth.uid()) IN ('super_admin', 'admin'));

-- Policies pour plan versions
CREATE POLICY "Sillon admins can read plan versions"
  ON sillon_plan_versions FOR SELECT
  USING (public.is_sillon_admin(auth.uid()));

CREATE POLICY "Admins can manage plan versions"
  ON sillon_plan_versions FOR ALL
  USING (public.get_sillon_admin_role(auth.uid()) IN ('super_admin', 'admin'));

-- 9. Données initiales - Plans
INSERT INTO sillon_plans (code, name, description, base_price_monthly, billing_type, display_order, capabilities) VALUES
('PRO', 'Pro', 'ERP fiable pour distributeurs indépendants', 149.00, 'fixed', 1, '{
  "purchase_orders": true,
  "goods_receipts": true,
  "partial_receipts": true,
  "supplier_invoices": true,
  "import_vat_tracking": true,
  "multi_currency_purchase": false,
  "supplier_fx_override": false,
  "landed_cost_methods": ["prorata_value"],
  "stock_lots_tracking": false,
  "consignment_basic": true,
  "consignment_advanced": false,
  "consignment_settlement": false,
  "basic_exports": true,
  "purchase_analytics": false,
  "fx_exposure_dashboard": false,
  "custom_accounting_export": false,
  "replenishment_suggestions": true,
  "auto_replenishment": false,
  "auto_fx_alerts": false,
  "max_portal_customers": 20,
  "max_users": 3,
  "max_products": 1000,
  "api_access": false,
  "pos_access": false,
  "advisor_access": false
}'::jsonb),

('BUSINESS', 'Business', 'Import multi-fournisseurs et pilotage avancé', 249.00, 'fixed', 2, '{
  "purchase_orders": true,
  "goods_receipts": true,
  "partial_receipts": true,
  "supplier_invoices": true,
  "import_vat_tracking": true,
  "multi_currency_purchase": true,
  "supplier_fx_override": true,
  "landed_cost_methods": ["prorata_value", "prorata_weight", "prorata_qty"],
  "stock_lots_tracking": true,
  "consignment_basic": true,
  "consignment_advanced": false,
  "consignment_settlement": false,
  "basic_exports": true,
  "purchase_analytics": true,
  "fx_exposure_dashboard": true,
  "custom_accounting_export": false,
  "replenishment_suggestions": true,
  "auto_replenishment": false,
  "auto_fx_alerts": true,
  "max_portal_customers": 0,
  "max_users": 10,
  "max_products": 10000,
  "api_access": false,
  "pos_access": false,
  "advisor_access": false
}'::jsonb),

('BUSINESS_PLUS', 'Business+', 'Consignment avancé et automatisation', 399.00, 'fixed', 3, '{
  "purchase_orders": true,
  "goods_receipts": true,
  "partial_receipts": true,
  "supplier_invoices": true,
  "import_vat_tracking": true,
  "multi_currency_purchase": true,
  "supplier_fx_override": true,
  "landed_cost_methods": ["prorata_value", "prorata_weight", "prorata_qty", "fixed_unit"],
  "stock_lots_tracking": true,
  "consignment_basic": true,
  "consignment_advanced": true,
  "consignment_settlement": true,
  "basic_exports": true,
  "purchase_analytics": true,
  "fx_exposure_dashboard": true,
  "custom_accounting_export": true,
  "margin_analysis_advanced": true,
  "replenishment_suggestions": true,
  "auto_replenishment": true,
  "auto_fx_alerts": true,
  "max_portal_customers": 0,
  "max_users": 25,
  "max_products": 0,
  "api_access": false,
  "pos_access": false,
  "advisor_access": false
}'::jsonb),

('ENTERPRISE', 'Enterprise', 'ERP opéré avec API, POS et Advisor inclus', 349.00, 'hybrid', 4, '{
  "purchase_orders": true,
  "goods_receipts": true,
  "partial_receipts": true,
  "supplier_invoices": true,
  "import_vat_tracking": true,
  "multi_currency_purchase": true,
  "supplier_fx_override": true,
  "landed_cost_methods": ["prorata_value", "prorata_weight", "prorata_qty", "fixed_unit"],
  "stock_lots_tracking": true,
  "consignment_basic": true,
  "consignment_advanced": true,
  "consignment_settlement": true,
  "basic_exports": true,
  "purchase_analytics": true,
  "fx_exposure_dashboard": true,
  "custom_accounting_export": true,
  "margin_analysis_advanced": true,
  "replenishment_suggestions": true,
  "auto_replenishment": true,
  "auto_fx_alerts": true,
  "max_portal_customers": 0,
  "max_users": 0,
  "max_products": 0,
  "api_access": true,
  "pos_access": true,
  "advisor_access": true
}'::jsonb);

-- Mettre à jour Enterprise avec variable rate
UPDATE sillon_plans 
SET variable_rate = 0.02, variable_cap = 1500.00 
WHERE code = 'ENTERPRISE';

-- 10. Données initiales - Add-ons
INSERT INTO sillon_addons (code, name, description, price_monthly, capability_key, included_in_plans, display_order) VALUES
('advisor', 'SILLON Advisor', 'Conseils FX, alertes et recommandations intelligentes', 49.00, 'advisor_access', '{"ENTERPRISE"}', 1),
('pos', 'SILLON POS', 'Caisse tactile PWA pour vente en magasin', 39.00, 'pos_access', '{"ENTERPRISE"}', 2),
('api', 'SILLON API', 'Accès API REST et webhooks', 29.00, 'api_access', '{"ENTERPRISE"}', 3);

-- 11. Function pour logger les actions admin
CREATE OR REPLACE FUNCTION public.log_sillon_action(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID DEFAULT NULL,
  p_target_name TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email TEXT;
  v_actor_role sillon_admin_role;
  v_log_id UUID;
BEGIN
  SELECT email, role INTO v_actor_email, v_actor_role
  FROM sillon_admins WHERE user_id = auth.uid();
  
  INSERT INTO sillon_audit_logs (
    actor_id, actor_email, actor_role,
    action, target_type, target_id, target_name, details
  ) VALUES (
    auth.uid(), COALESCE(v_actor_email, 'system'), v_actor_role,
    p_action, p_target_type, p_target_id, p_target_name, p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 12. Function pour créer une nouvelle version de plan
CREATE OR REPLACE FUNCTION public.create_plan_version(
  p_plan_code TEXT,
  p_new_version TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_version TEXT;
  v_price DECIMAL(10,2);
  v_capabilities JSONB;
BEGIN
  SELECT id, base_price_monthly, capabilities 
  INTO v_plan_id, v_price, v_capabilities
  FROM sillon_plans WHERE code = p_plan_code;
  
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_code;
  END IF;
  
  v_version := COALESCE(p_new_version, TO_CHAR(NOW(), 'YYYY-MM'));
  
  INSERT INTO sillon_plan_versions (plan_id, version, base_price_monthly, capabilities, created_by)
  VALUES (v_plan_id, v_version, v_price, v_capabilities, auth.uid())
  ON CONFLICT (plan_id, version) DO UPDATE SET
    base_price_monthly = EXCLUDED.base_price_monthly,
    capabilities = EXCLUDED.capabilities;
  
  UPDATE sillon_plans SET version = v_version, updated_at = NOW() WHERE id = v_plan_id;
  
  PERFORM log_sillon_action('plan.version_created', 'plan', v_plan_id, p_plan_code, 
    jsonb_build_object('version', v_version));
  
  RETURN v_version;
END;
$$;

-- 13. Grants
GRANT SELECT ON sillon_plans TO authenticated, anon;
GRANT SELECT ON sillon_addons TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_sillon_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sillon_admin_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_sillon_action(TEXT, TEXT, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_plan_version(TEXT, TEXT) TO authenticated;