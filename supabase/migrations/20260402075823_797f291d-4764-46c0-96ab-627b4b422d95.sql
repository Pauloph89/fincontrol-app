
-- 1. Fix receipts cross-tenant: restrict SELECT to owner only
DROP POLICY IF EXISTS "Users can view company receipts" ON storage.objects;
CREATE POLICY "Users can view own receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Fix clients SELECT: public → authenticated
DROP POLICY IF EXISTS "Company members can view clients" ON public.clients;
CREATE POLICY "Company members can view clients" ON public.clients
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- 3. Fix sales_goals: public → authenticated + can_write
DROP POLICY IF EXISTS "Company members can create sales_goals" ON public.sales_goals;
CREATE POLICY "Company members can create sales_goals" ON public.sales_goals
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can update sales_goals" ON public.sales_goals;
CREATE POLICY "Company members can update sales_goals" ON public.sales_goals
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can view sales_goals" ON public.sales_goals;
CREATE POLICY "Company members can view sales_goals" ON public.sales_goals
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- 4. Fix commission_installments: public → authenticated + can_write
DROP POLICY IF EXISTS "Company members can create installments" ON public.commission_installments;
CREATE POLICY "Company members can create installments" ON public.commission_installments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM commissions c WHERE c.id = commission_installments.commission_id AND c.company_id = get_user_company_id(auth.uid())) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can update installments" ON public.commission_installments;
CREATE POLICY "Company members can update installments" ON public.commission_installments
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM commissions c WHERE c.id = commission_installments.commission_id AND c.company_id = get_user_company_id(auth.uid())) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can delete installments" ON public.commission_installments;
CREATE POLICY "Company members can delete installments" ON public.commission_installments
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM commissions c WHERE c.id = commission_installments.commission_id AND c.company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Company members can view installments" ON public.commission_installments;
CREATE POLICY "Company members can view installments" ON public.commission_installments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM commissions c WHERE c.id = commission_installments.commission_id AND c.company_id = get_user_company_id(auth.uid())));

-- 5. Fix order_billing_lots: public → authenticated + can_write
DROP POLICY IF EXISTS "Company members can create order_billing_lots" ON public.order_billing_lots;
CREATE POLICY "Company members can create order_billing_lots" ON public.order_billing_lots
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_billing_lots.order_id AND o.company_id = get_user_company_id(auth.uid())) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can update order_billing_lots" ON public.order_billing_lots;
CREATE POLICY "Company members can update order_billing_lots" ON public.order_billing_lots
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_billing_lots.order_id AND o.company_id = get_user_company_id(auth.uid())) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can delete order_billing_lots" ON public.order_billing_lots;
CREATE POLICY "Company members can delete order_billing_lots" ON public.order_billing_lots
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_billing_lots.order_id AND o.company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Company members can view order_billing_lots" ON public.order_billing_lots;
CREATE POLICY "Company members can view order_billing_lots" ON public.order_billing_lots
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_billing_lots.order_id AND o.company_id = get_user_company_id(auth.uid())));

-- 6. Fix order_installments: public → authenticated + can_write
DROP POLICY IF EXISTS "Company members can create order_installments" ON public.order_installments;
CREATE POLICY "Company members can create order_installments" ON public.order_installments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_installments.order_id AND o.company_id = get_user_company_id(auth.uid())) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can update order_installments" ON public.order_installments;
CREATE POLICY "Company members can update order_installments" ON public.order_installments
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_installments.order_id AND o.company_id = get_user_company_id(auth.uid())) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can delete order_installments" ON public.order_installments;
CREATE POLICY "Company members can delete order_installments" ON public.order_installments
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_installments.order_id AND o.company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Company members can view order_installments" ON public.order_installments;
CREATE POLICY "Company members can view order_installments" ON public.order_installments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_installments.order_id AND o.company_id = get_user_company_id(auth.uid())));

-- 7. Fix expense_categories: public → authenticated + can_write
DROP POLICY IF EXISTS "Company members can create categories" ON public.expense_categories;
CREATE POLICY "Company members can create categories" ON public.expense_categories
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can update categories" ON public.expense_categories;
CREATE POLICY "Company members can update categories" ON public.expense_categories
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can delete categories" ON public.expense_categories;
CREATE POLICY "Company members can delete categories" ON public.expense_categories
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Company members can view categories" ON public.expense_categories;
CREATE POLICY "Company members can view categories" ON public.expense_categories
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- 8. Fix factory_import_configs: public → authenticated + can_write
DROP POLICY IF EXISTS "Company members can create import_configs" ON public.factory_import_configs;
CREATE POLICY "Company members can create import_configs" ON public.factory_import_configs
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can update import_configs" ON public.factory_import_configs;
CREATE POLICY "Company members can update import_configs" ON public.factory_import_configs
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can delete import_configs" ON public.factory_import_configs;
CREATE POLICY "Company members can delete import_configs" ON public.factory_import_configs
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Company members can view import_configs" ON public.factory_import_configs;
CREATE POLICY "Company members can view import_configs" ON public.factory_import_configs
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- 9. Fix audit_log: public → authenticated
DROP POLICY IF EXISTS "Users can create own audit_log" ON public.audit_log;
CREATE POLICY "Users can create own audit_log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Company members can view audit_log" ON public.audit_log;
CREATE POLICY "Company members can view audit_log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- 10. Fix profiles: public → authenticated
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;
CREATE POLICY "Users can view company profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR user_id = auth.uid());

-- 11. Fix companies: public → authenticated + can_write
DROP POLICY IF EXISTS "Company members can update own company" ON public.companies;
CREATE POLICY "Company members can update own company" ON public.companies
  FOR UPDATE TO authenticated
  USING (id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can view own company" ON public.companies;
CREATE POLICY "Company members can view own company" ON public.companies
  FOR SELECT TO authenticated
  USING (id = get_user_company_id(auth.uid()));

-- 12. Fix notification_settings: add can_write
DROP POLICY IF EXISTS "Company members can insert notification_settings" ON public.notification_settings;
CREATE POLICY "Company members can insert notification_settings" ON public.notification_settings
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can update notification_settings" ON public.notification_settings;
CREATE POLICY "Company members can update notification_settings" ON public.notification_settings
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can view notification_settings" ON public.notification_settings;
CREATE POLICY "Company members can view notification_settings" ON public.notification_settings
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- 13. Fix client_interactions: add can_write
DROP POLICY IF EXISTS "Company members can create client_interactions" ON public.client_interactions;
CREATE POLICY "Company members can create client_interactions" ON public.client_interactions
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can update client_interactions" ON public.client_interactions;
CREATE POLICY "Company members can update client_interactions" ON public.client_interactions
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND can_write(auth.uid()));

DROP POLICY IF EXISTS "Company members can delete client_interactions" ON public.client_interactions;
CREATE POLICY "Company members can delete client_interactions" ON public.client_interactions
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Company members can view client_interactions" ON public.client_interactions;
CREATE POLICY "Company members can view client_interactions" ON public.client_interactions
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
