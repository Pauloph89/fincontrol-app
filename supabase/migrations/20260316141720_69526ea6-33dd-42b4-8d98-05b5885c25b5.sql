
CREATE TABLE public.sales_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  user_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  goal_value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, year, month)
);

ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view sales_goals"
  ON public.sales_goals FOR SELECT TO public
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can create sales_goals"
  ON public.sales_goals FOR INSERT TO public
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can update sales_goals"
  ON public.sales_goals FOR UPDATE TO public
  USING (company_id = get_user_company_id(auth.uid()));
