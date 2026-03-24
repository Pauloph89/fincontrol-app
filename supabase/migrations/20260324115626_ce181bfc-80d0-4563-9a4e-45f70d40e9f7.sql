CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  notify_commission_overdue boolean NOT NULL DEFAULT true,
  notify_expense_due_soon boolean NOT NULL DEFAULT true,
  notify_expense_overdue boolean NOT NULL DEFAULT true,
  notify_lead_inactive boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view notification_settings"
  ON public.notification_settings FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can insert notification_settings"
  ON public.notification_settings FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can update notification_settings"
  ON public.notification_settings FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();