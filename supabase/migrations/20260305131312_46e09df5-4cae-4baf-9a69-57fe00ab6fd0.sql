
-- =============================================
-- PHASE 1: Multi-tenant migration
-- =============================================

-- 1.1 Create companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Minha Empresa',
  cnpj text,
  logo_url text,
  email text,
  phone text,
  primary_color text DEFAULT '#1e3a5f',
  secondary_color text DEFAULT '#2563eb',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 1.2 Add company_id to all data tables (nullable first)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.expense_categories ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.expense_rules ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.bank_entries ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 1.2b Add external_order_id to commissions for future integrations
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS external_order_id text;

-- 1.3 Migrate existing data
-- Create one company per existing user based on their profile data
DO $$
DECLARE
  rec RECORD;
  new_company_id uuid;
BEGIN
  FOR rec IN SELECT DISTINCT p.user_id, p.company_name, p.cnpj, p.company_logo_url, p.email, p.phone, p.primary_color, p.secondary_color
             FROM public.profiles p
             WHERE p.company_id IS NULL
  LOOP
    INSERT INTO public.companies (name, cnpj, logo_url, email, phone, primary_color, secondary_color)
    VALUES (
      COALESCE(rec.company_name, 'Minha Empresa'),
      rec.cnpj,
      rec.company_logo_url,
      rec.email,
      rec.phone,
      rec.primary_color,
      rec.secondary_color
    )
    RETURNING id INTO new_company_id;

    -- Update profile
    UPDATE public.profiles SET company_id = new_company_id WHERE user_id = rec.user_id;

    -- Update all data tables for this user
    UPDATE public.commissions SET company_id = new_company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE public.expenses SET company_id = new_company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE public.expense_categories SET company_id = new_company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE public.expense_rules SET company_id = new_company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE public.bank_entries SET company_id = new_company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE public.audit_log SET company_id = new_company_id WHERE user_id = rec.user_id AND company_id IS NULL;
  END LOOP;
END;
$$;

-- 1.4 Create helper function: get_user_company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 1.5 Add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_company_id ON public.commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_company_id ON public.expense_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_rules_company_id ON public.expense_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_entries_company_id ON public.bank_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_company_id ON public.audit_log(company_id);

-- 1.6 Update RLS policies
-- Drop old user-based policies and create company-based ones

-- COMPANIES
CREATE POLICY "Company members can view own company"
ON public.companies FOR SELECT
USING (id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can update own company"
ON public.companies FOR UPDATE
USING (id = get_user_company_id(auth.uid()));

-- PROFILES: keep user-based for own profile, add company view for admin
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view company profiles"
ON public.profiles FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) OR user_id = auth.uid());

-- COMMISSIONS
DROP POLICY IF EXISTS "Users can view own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Users can create own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Users can update own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Users can delete own commissions" ON public.commissions;

CREATE POLICY "Company members can view commissions"
ON public.commissions FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can create commissions"
ON public.commissions FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can update commissions"
ON public.commissions FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can delete commissions"
ON public.commissions FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

-- COMMISSION_INSTALLMENTS: via parent commission's company
DROP POLICY IF EXISTS "Users can view own installments" ON public.commission_installments;
DROP POLICY IF EXISTS "Users can create own installments" ON public.commission_installments;
DROP POLICY IF EXISTS "Users can update own installments" ON public.commission_installments;
DROP POLICY IF EXISTS "Users can delete own installments" ON public.commission_installments;

CREATE POLICY "Company members can view installments"
ON public.commission_installments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.commissions c
  WHERE c.id = commission_installments.commission_id
    AND c.company_id = get_user_company_id(auth.uid())
));

CREATE POLICY "Company members can create installments"
ON public.commission_installments FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.commissions c
  WHERE c.id = commission_installments.commission_id
    AND c.company_id = get_user_company_id(auth.uid())
));

CREATE POLICY "Company members can update installments"
ON public.commission_installments FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.commissions c
  WHERE c.id = commission_installments.commission_id
    AND c.company_id = get_user_company_id(auth.uid())
));

CREATE POLICY "Company members can delete installments"
ON public.commission_installments FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.commissions c
  WHERE c.id = commission_installments.commission_id
    AND c.company_id = get_user_company_id(auth.uid())
));

-- EXPENSES
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can create own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Company members can view expenses"
ON public.expenses FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can create expenses"
ON public.expenses FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can update expenses"
ON public.expenses FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can delete expenses"
ON public.expenses FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

-- EXPENSE_CATEGORIES
DROP POLICY IF EXISTS "Users can view own categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can create own categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.expense_categories;

CREATE POLICY "Company members can view categories"
ON public.expense_categories FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can create categories"
ON public.expense_categories FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can update categories"
ON public.expense_categories FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can delete categories"
ON public.expense_categories FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

-- EXPENSE_RULES
DROP POLICY IF EXISTS "Users can view own rules" ON public.expense_rules;
DROP POLICY IF EXISTS "Users can create own rules" ON public.expense_rules;
DROP POLICY IF EXISTS "Users can update own rules" ON public.expense_rules;
DROP POLICY IF EXISTS "Users can delete own rules" ON public.expense_rules;

CREATE POLICY "Company members can view rules"
ON public.expense_rules FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can create rules"
ON public.expense_rules FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can update rules"
ON public.expense_rules FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can delete rules"
ON public.expense_rules FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

-- BANK_ENTRIES
DROP POLICY IF EXISTS "Users can view own bank entries" ON public.bank_entries;
DROP POLICY IF EXISTS "Users can create own bank entries" ON public.bank_entries;
DROP POLICY IF EXISTS "Users can update own bank entries" ON public.bank_entries;
DROP POLICY IF EXISTS "Users can delete own bank entries" ON public.bank_entries;

CREATE POLICY "Company members can view bank_entries"
ON public.bank_entries FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can create bank_entries"
ON public.bank_entries FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can update bank_entries"
ON public.bank_entries FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can delete bank_entries"
ON public.bank_entries FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

-- AUDIT_LOG: company-wide read, user-only write
DROP POLICY IF EXISTS "Users can view own audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Users can create own audit log" ON public.audit_log;

CREATE POLICY "Company members can view audit_log"
ON public.audit_log FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create own audit_log"
ON public.audit_log FOR INSERT
WITH CHECK (auth.uid() = user_id AND company_id = get_user_company_id(auth.uid()));

-- Update handle_new_user to NOT auto-create profile (invited users get profile from edge function)
-- Keep trigger but update to set a default - profile will be created by invite function for new users
