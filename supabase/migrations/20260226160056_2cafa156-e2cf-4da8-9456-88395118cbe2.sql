
-- Extend profiles table with company settings fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS responsible_name text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS financial_day_start integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS default_account text NOT NULL DEFAULT 'cnpj',
ADD COLUMN IF NOT EXISTS alert_days integer NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL';

-- Add receipt_url to commission_installments for receipt uploads
ALTER TABLE public.commission_installments
ADD COLUMN IF NOT EXISTS receipt_url text;
