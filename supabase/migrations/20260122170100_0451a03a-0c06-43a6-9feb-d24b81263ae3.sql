-- 1. Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  iban TEXT NOT NULL,
  bic TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  is_default BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage bank accounts" ON bank_accounts
FOR ALL TO authenticated
USING (is_staff_or_admin())
WITH CHECK (is_staff_or_admin());

CREATE POLICY "Authenticated can read active bank accounts" ON bank_accounts
FOR SELECT TO authenticated
USING (active = true);

CREATE UNIQUE INDEX bank_accounts_default_per_currency 
ON bank_accounts (currency) WHERE is_default = TRUE;

-- 2. Payment Methods Configuration Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  active BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  currencies TEXT[] DEFAULT ARRAY['EUR'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage payment methods" ON payment_methods
FOR ALL TO authenticated
USING (is_staff_or_admin())
WITH CHECK (is_staff_or_admin());

CREATE POLICY "Authenticated can read active payment methods" ON payment_methods
FOR SELECT TO authenticated
USING (active = true);

-- Seed default payment methods
INSERT INTO payment_methods (code, name, description, icon, active, display_order, currencies, config) VALUES
('bank_transfer', 'Virement bancaire', 'Paiement par virement SEPA ou international', 'Building2', true, 1, ARRAY['EUR', 'USD', 'GBP'], '{}'),
('paypal', 'PayPal', 'Paiement via PayPal', 'Wallet', false, 2, ARRAY['EUR', 'USD', 'GBP'], '{"email": ""}'),
('stripe', 'Carte bancaire', 'Paiement par carte via Stripe', 'CreditCard', false, 3, ARRAY['EUR', 'USD', 'GBP'], '{"publishable_key": "", "secret_key": ""}'),
('crypto', 'Stablecoins (USDC/USDT)', 'Paiement en crypto stablecoins', 'Bitcoin', false, 4, ARRAY['USD'], '{"wallet_address": "", "network": ""}')
ON CONFLICT (code) DO NOTHING;

-- 3. Customer preferences
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'EUR';

-- 4. Order currency and payment method code
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method_code TEXT;