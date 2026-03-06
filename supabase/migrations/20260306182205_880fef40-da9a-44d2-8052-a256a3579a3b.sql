
-- Create orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  user_id uuid NOT NULL,
  order_number text NOT NULL,
  factory_invoice_number text,
  order_date date NOT NULL,
  billing_date date,
  factory text NOT NULL,
  client text NOT NULL,
  client_cnpj text,
  client_city text,
  client_state text,
  salesperson text,
  pre_posto text,
  commission_base_value numeric NOT NULL,
  invoice_total_value numeric,
  commission_percent_rep numeric NOT NULL DEFAULT 8.00,
  commission_percent_preposto numeric DEFAULT 0,
  commission_total_rep numeric NOT NULL DEFAULT 0,
  commission_total_preposto numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pedido_enviado',
  observations text,
  external_order_id text,
  crm_deal_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view orders" ON public.orders FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company members can create orders" ON public.orders FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company members can update orders" ON public.orders FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company members can delete orders" ON public.orders FOR DELETE USING (company_id = get_user_company_id(auth.uid()));

-- Create order_installments table
CREATE TABLE public.order_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  value numeric NOT NULL,
  commission_value_rep numeric NOT NULL DEFAULT 0,
  commission_value_preposto numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'previsto',
  paid_date date,
  paid_value numeric,
  paid_observation text,
  receipt_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view order_installments" ON public.order_installments FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_installments.order_id AND o.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Company members can create order_installments" ON public.order_installments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_installments.order_id AND o.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Company members can update order_installments" ON public.order_installments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_installments.order_id AND o.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Company members can delete order_installments" ON public.order_installments FOR DELETE USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_installments.order_id AND o.company_id = get_user_company_id(auth.uid())));

-- Indexes
CREATE INDEX idx_orders_company_id ON public.orders(company_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_installments_order_id ON public.order_installments(order_id);
CREATE INDEX idx_order_installments_status ON public.order_installments(status);
CREATE INDEX idx_order_installments_due_date ON public.order_installments(due_date);

-- Updated_at triggers
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER order_installments_updated_at BEFORE UPDATE ON public.order_installments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
