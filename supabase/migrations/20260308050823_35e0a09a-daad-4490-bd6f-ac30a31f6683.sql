
-- Add telefone column to factories
ALTER TABLE public.factories ADD COLUMN IF NOT EXISTS telefone text;

-- Create client_interactions table for CRM
CREATE TABLE public.client_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'contato',
  description text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Company members can view client_interactions"
  ON public.client_interactions FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can create client_interactions"
  ON public.client_interactions FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can update client_interactions"
  ON public.client_interactions FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can delete client_interactions"
  ON public.client_interactions FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_client_interactions_updated_at
  BEFORE UPDATE ON public.client_interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
