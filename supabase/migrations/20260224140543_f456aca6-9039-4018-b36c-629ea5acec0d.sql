
-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table for company branding & user info
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT DEFAULT 'Minha Empresa',
  company_logo_url TEXT,
  primary_color TEXT DEFAULT '#1e3a5f',
  secondary_color TEXT DEFAULT '#2563eb',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Commissions table
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  factory TEXT NOT NULL,
  client TEXT NOT NULL,
  order_number TEXT NOT NULL,
  sale_value NUMERIC(15,2) NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 8.00,
  commission_total NUMERIC(15,2) NOT NULL,
  sale_date DATE NOT NULL,
  observations TEXT,
  crm_deal_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own commissions" ON public.commissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own commissions" ON public.commissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own commissions" ON public.commissions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own commissions" ON public.commissions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Commission installments (parcelas)
CREATE TABLE public.commission_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_id UUID NOT NULL REFERENCES public.commissions(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number BETWEEN 1 AND 4),
  value NUMERIC(15,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'previsto' CHECK (status IN ('previsto', 'recebido', 'atrasado')),
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own installments" ON public.commission_installments 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.commissions c WHERE c.id = commission_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can create own installments" ON public.commission_installments 
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.commissions c WHERE c.id = commission_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can update own installments" ON public.commission_installments 
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.commissions c WHERE c.id = commission_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own installments" ON public.commission_installments 
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.commissions c WHERE c.id = commission_id AND c.user_id = auth.uid()));

CREATE TRIGGER update_installments_updated_at BEFORE UPDATE ON public.commission_installments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('fixa', 'variavel')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC(15,2) NOT NULL,
  account TEXT NOT NULL DEFAULT 'cnpj' CHECK (account IN ('cnpj', 'pessoal')),
  due_date DATE NOT NULL,
  payment_date DATE,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'a_vencer' CHECK (status IN ('pago', 'a_vencer', 'vencendo', 'vencido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
