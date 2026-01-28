-- Add payment_provider column to tenant_subscriptions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenant_subscriptions' 
    AND column_name = 'payment_provider'
  ) THEN
    ALTER TABLE public.tenant_subscriptions 
    ADD COLUMN payment_provider text DEFAULT 'stripe';
  END IF;
END $$;

-- Add last_payment_at column if not exists  
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenant_subscriptions' 
    AND column_name = 'last_payment_at'
  ) THEN
    ALTER TABLE public.tenant_subscriptions 
    ADD COLUMN last_payment_at timestamptz;
  END IF;
END $$;

-- Add cancel_at_period_end column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenant_subscriptions' 
    AND column_name = 'cancel_at_period_end'
  ) THEN
    ALTER TABLE public.tenant_subscriptions 
    ADD COLUMN cancel_at_period_end boolean DEFAULT false;
  END IF;
END $$;

-- Add stripe_invoice_id to tenant_invoices if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenant_invoices' 
    AND column_name = 'stripe_invoice_id'
  ) THEN
    ALTER TABLE public.tenant_invoices 
    ADD COLUMN stripe_invoice_id text UNIQUE;
  END IF;
END $$;

-- Create index for stripe lookups
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_stripe_customer 
ON public.tenant_subscriptions(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_stripe_subscription 
ON public.tenant_subscriptions(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;