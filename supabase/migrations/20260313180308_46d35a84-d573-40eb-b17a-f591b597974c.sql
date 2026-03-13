
-- Create order_billing_lots table for partial billing (faturamento parcial)
CREATE TABLE IF NOT EXISTS public.order_billing_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  lot_number integer NOT NULL,
  billed_value numeric NOT NULL,
  billing_date date NOT NULL,
  commission_percent numeric NOT NULL DEFAULT 8,
  commission_value numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_billing_lots ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Company members can view order_billing_lots" ON public.order_billing_lots
  FOR SELECT TO public USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_billing_lots.order_id AND o.company_id = get_user_company_id(auth.uid()))
  );

CREATE POLICY "Company members can create order_billing_lots" ON public.order_billing_lots
  FOR INSERT TO public WITH CHECK (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_billing_lots.order_id AND o.company_id = get_user_company_id(auth.uid()))
  );

CREATE POLICY "Company members can update order_billing_lots" ON public.order_billing_lots
  FOR UPDATE TO public USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_billing_lots.order_id AND o.company_id = get_user_company_id(auth.uid()))
  );

CREATE POLICY "Company members can delete order_billing_lots" ON public.order_billing_lots
  FOR DELETE TO public USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_billing_lots.order_id AND o.company_id = get_user_company_id(auth.uid()))
  );

-- Add lot_id reference to commission_installments for tracing
ALTER TABLE public.commission_installments ADD COLUMN IF NOT EXISTS lot_id uuid REFERENCES public.order_billing_lots(id) ON DELETE SET NULL;
