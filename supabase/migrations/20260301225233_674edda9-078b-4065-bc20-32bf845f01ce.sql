
-- Create expense_rules table
CREATE TABLE public.expense_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  value numeric NOT NULL,
  account text NOT NULL DEFAULT 'cnpj',
  recurrence_type text NOT NULL DEFAULT 'mensal',
  recurrence_days jsonb NOT NULL DEFAULT '[5]',
  start_date date NOT NULL,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own rules" ON public.expense_rules FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own rules" ON public.expense_rules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rules" ON public.expense_rules FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rules" ON public.expense_rules FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_expense_rules_updated_at
  BEFORE UPDATE ON public.expense_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add column to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS generated_from_rule_id uuid REFERENCES public.expense_rules(id);

-- Performance indexes
CREATE INDEX idx_expense_rules_user_id ON public.expense_rules(user_id);
CREATE INDEX idx_expense_rules_active ON public.expense_rules(user_id, active);
CREATE INDEX idx_expenses_generated_from_rule ON public.expenses(generated_from_rule_id);
CREATE INDEX idx_expenses_due_date ON public.expenses(user_id, due_date);
CREATE INDEX idx_commission_installments_due_date ON public.commission_installments(due_date);
CREATE INDEX idx_commissions_user_status ON public.commissions(user_id, status);

-- Drop installment_number check constraint
DO $$ BEGIN
  ALTER TABLE public.commission_installments DROP CONSTRAINT IF EXISTS commission_installments_installment_number_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Migrate recurrent expenses to rules
INSERT INTO public.expense_rules (user_id, name, category, value, account, recurrence_type, recurrence_days, start_date, active)
SELECT
  sub.user_id, sub.description, sub.category, sub.value, sub.account,
  COALESCE(sub.recurrence, 'mensal'),
  CASE WHEN sub.recurrence = 'quinzenal' THEN '[5, 20]'::jsonb
       ELSE json_build_array(EXTRACT(DAY FROM sub.min_due)::int)::jsonb
  END,
  sub.min_due,
  true
FROM (
  SELECT e.user_id, e.description, e.category, e.value, e.account, e.recurrence,
         MIN(e.due_date) as min_due
  FROM public.expenses e
  WHERE e.recurrence IS NOT NULL AND e.parent_expense_id IS NULL
  GROUP BY e.user_id, e.description, e.category, e.value, e.account, e.recurrence
) sub;

-- Link existing expenses to rules
UPDATE public.expenses e
SET generated_from_rule_id = r.id
FROM public.expense_rules r
WHERE e.recurrence IS NOT NULL
  AND e.user_id = r.user_id
  AND e.description = r.name
  AND e.category = r.category
  AND e.value = r.value
  AND e.account = r.account;

UPDATE public.expenses child
SET generated_from_rule_id = parent.generated_from_rule_id
FROM public.expenses parent
WHERE child.parent_expense_id = parent.id
  AND parent.generated_from_rule_id IS NOT NULL;
