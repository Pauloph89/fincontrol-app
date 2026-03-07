
-- 1. Add new roles to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'socio';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor';

-- 2. Create clients table (CRM)
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj_cpf text,
  telefone text,
  email text,
  endereco text,
  cidade text,
  estado text,
  observacoes text,
  vendedor_responsavel text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view clients" ON public.clients FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company members can create clients" ON public.clients FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company members can update clients" ON public.clients FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company members can delete clients" ON public.clients FOR DELETE USING (company_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX idx_clients_company_id ON public.clients(company_id);

-- 3. Create factories table
CREATE TABLE public.factories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  comissao_padrao numeric NOT NULL DEFAULT 8.00,
  prazo_pagamento text,
  contato_comercial text,
  email_financeiro text,
  politica_comissao text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view factories" ON public.factories FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company members can create factories" ON public.factories FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company members can update factories" ON public.factories FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company members can delete factories" ON public.factories FOR DELETE USING (company_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_factories_updated_at BEFORE UPDATE ON public.factories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX idx_factories_company_id ON public.factories(company_id);

-- 4. Create factory_import_configs table
CREATE TABLE public.factory_import_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  config_name text NOT NULL DEFAULT 'default',
  file_type text NOT NULL DEFAULT 'excel',
  field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.factory_import_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view import_configs" ON public.factory_import_configs FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company members can create import_configs" ON public.factory_import_configs FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company members can update import_configs" ON public.factory_import_configs FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Company members can delete import_configs" ON public.factory_import_configs FOR DELETE USING (company_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_factory_import_configs_updated_at BEFORE UPDATE ON public.factory_import_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Add optional FK columns to orders (keep existing text fields for backward compat)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS factory_id uuid REFERENCES public.factories(id) ON DELETE SET NULL;
