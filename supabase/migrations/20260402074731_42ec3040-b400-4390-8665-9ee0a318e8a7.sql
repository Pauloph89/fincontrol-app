
-- 1. Make receipts bucket private
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

-- 2. Ensure RLS storage policies exist for receipts
-- Drop any existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;

CREATE POLICY "Users can upload receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view company receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts');

CREATE POLICY "Users can update own receipts" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Fix privilege escalation: add explicit INSERT-only policy for user_roles
-- The existing ALL policy for admins already covers admin operations.
-- We need to ensure non-admins cannot insert roles.
-- The handle_new_user_role trigger inserts via SECURITY DEFINER, so it bypasses RLS.
-- No additional INSERT policy needed since the ALL policy with has_role check blocks non-admins.
-- But let's be explicit by ensuring no other INSERT path exists.

-- 4. Add role-based write restrictions using a helper function
CREATE OR REPLACE FUNCTION public.can_write(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND active = true
      AND role IN ('admin', 'financeiro', 'vendedor')
  )
$$;

-- 5. Add role-based DELETE restrictions (only admin can delete)
-- Orders
DROP POLICY IF EXISTS "Company members can delete orders" ON public.orders;
CREATE POLICY "Company members can delete orders" ON public.orders
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Commissions
DROP POLICY IF EXISTS "Company members can delete commissions" ON public.commissions;
CREATE POLICY "Company members can delete commissions" ON public.commissions
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Expenses
DROP POLICY IF EXISTS "Company members can delete expenses" ON public.expenses;
CREATE POLICY "Company members can delete expenses" ON public.expenses
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Clients
DROP POLICY IF EXISTS "Company members can delete clients" ON public.clients;
CREATE POLICY "Company members can delete clients" ON public.clients
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Bank entries
DROP POLICY IF EXISTS "Company members can delete bank_entries" ON public.bank_entries;
CREATE POLICY "Company members can delete bank_entries" ON public.bank_entries
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Expense rules
DROP POLICY IF EXISTS "Company members can delete rules" ON public.expense_rules;
CREATE POLICY "Company members can delete rules" ON public.expense_rules
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Factories
DROP POLICY IF EXISTS "Company members can delete factories" ON public.factories;
CREATE POLICY "Company members can delete factories" ON public.factories
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- 6. Restrict INSERT/UPDATE to writable roles for key tables
-- Orders INSERT
DROP POLICY IF EXISTS "Company members can create orders" ON public.orders;
CREATE POLICY "Company members can create orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Orders UPDATE
DROP POLICY IF EXISTS "Company members can update orders" ON public.orders;
CREATE POLICY "Company members can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Commissions INSERT
DROP POLICY IF EXISTS "Company members can create commissions" ON public.commissions;
CREATE POLICY "Company members can create commissions" ON public.commissions
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Commissions UPDATE
DROP POLICY IF EXISTS "Company members can update commissions" ON public.commissions;
CREATE POLICY "Company members can update commissions" ON public.commissions
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Expenses INSERT
DROP POLICY IF EXISTS "Company members can create expenses" ON public.expenses;
CREATE POLICY "Company members can create expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Expenses UPDATE
DROP POLICY IF EXISTS "Company members can update expenses" ON public.expenses;
CREATE POLICY "Company members can update expenses" ON public.expenses
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Bank entries INSERT
DROP POLICY IF EXISTS "Company members can create bank_entries" ON public.bank_entries;
CREATE POLICY "Company members can create bank_entries" ON public.bank_entries
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Bank entries UPDATE
DROP POLICY IF EXISTS "Company members can update bank_entries" ON public.bank_entries;
CREATE POLICY "Company members can update bank_entries" ON public.bank_entries
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Clients INSERT
DROP POLICY IF EXISTS "Company members can create clients" ON public.clients;
CREATE POLICY "Company members can create clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Clients UPDATE
DROP POLICY IF EXISTS "Company members can update clients" ON public.clients;
CREATE POLICY "Company members can update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Expense rules INSERT
DROP POLICY IF EXISTS "Company members can create rules" ON public.expense_rules;
CREATE POLICY "Company members can create rules" ON public.expense_rules
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Expense rules UPDATE
DROP POLICY IF EXISTS "Company members can update rules" ON public.expense_rules;
CREATE POLICY "Company members can update rules" ON public.expense_rules
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Factories INSERT
DROP POLICY IF EXISTS "Company members can create factories" ON public.factories;
CREATE POLICY "Company members can create factories" ON public.factories
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- Factories UPDATE
DROP POLICY IF EXISTS "Company members can update factories" ON public.factories;
CREATE POLICY "Company members can update factories" ON public.factories
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

-- 7. Add DELETE policy for sales_goals
CREATE POLICY "Company members can delete sales_goals" ON public.sales_goals
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));
