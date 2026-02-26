
-- Add columns to commissions
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS billing_date date;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa';

-- Add columns to commission_installments
ALTER TABLE public.commission_installments ADD COLUMN IF NOT EXISTS notes text;

-- Add columns to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurrence text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurrence_end_date date;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS parent_expense_id uuid REFERENCES public.expenses(id);

-- Create expense_categories table
CREATE TABLE public.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own categories" ON public.expense_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own categories" ON public.expense_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.expense_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.expense_categories FOR DELETE USING (auth.uid() = user_id);

-- Create bank_entries table for reconciliation
CREATE TABLE public.bank_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  description text NOT NULL,
  value numeric NOT NULL,
  type text NOT NULL DEFAULT 'entrada',
  account text NOT NULL DEFAULT 'cnpj',
  reconciled boolean NOT NULL DEFAULT false,
  commission_installment_id uuid REFERENCES public.commission_installments(id),
  expense_id uuid REFERENCES public.expenses(id),
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bank entries" ON public.bank_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bank entries" ON public.bank_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank entries" ON public.bank_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bank entries" ON public.bank_entries FOR DELETE USING (auth.uid() = user_id);

-- Create audit_log table
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own audit log" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own audit log" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_bank_entries_updated_at BEFORE UPDATE ON public.bank_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create receipts storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Storage policies for receipts
CREATE POLICY "Users can upload own receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own receipts" ON storage.objects FOR DELETE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
