
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'venda';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS origin_order_id uuid REFERENCES public.orders(id);
