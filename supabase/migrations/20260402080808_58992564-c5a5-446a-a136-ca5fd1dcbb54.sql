
-- 1. Fix SELECT policies: public → authenticated for 6 financial tables
DROP POLICY IF EXISTS "Company members can view commissions" ON public.commissions;
CREATE POLICY "Company members can view commissions" ON public.commissions
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Company members can view expenses" ON public.expenses;
CREATE POLICY "Company members can view expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Company members can view bank_entries" ON public.bank_entries;
CREATE POLICY "Company members can view bank_entries" ON public.bank_entries
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Company members can view rules" ON public.expense_rules;
CREATE POLICY "Company members can view rules" ON public.expense_rules
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Company members can view factories" ON public.factories;
CREATE POLICY "Company members can view factories" ON public.factories
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Company members can view orders" ON public.orders;
CREATE POLICY "Company members can view orders" ON public.orders
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- 2. Make company-assets bucket private
UPDATE storage.buckets SET public = false WHERE id = 'company-assets';

-- 3. Fix company-assets storage policies: public → authenticated
DROP POLICY IF EXISTS "Anyone can view company assets" ON storage.objects;
CREATE POLICY "Authenticated users can view company assets" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Users can upload own company assets" ON storage.objects;
CREATE POLICY "Users can upload own company assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own company assets" ON storage.objects;
CREATE POLICY "Users can update own company assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own company assets" ON storage.objects;
CREATE POLICY "Users can delete own company assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Remove duplicate public INSERT policy for receipts
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
