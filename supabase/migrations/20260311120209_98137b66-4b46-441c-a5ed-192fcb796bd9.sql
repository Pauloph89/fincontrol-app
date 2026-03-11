
-- Add paid_value and paid_observation to commission_installments
ALTER TABLE public.commission_installments 
  ADD COLUMN IF NOT EXISTS paid_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS paid_observation text DEFAULT NULL;
