ALTER TABLE public.commission_installments ADD COLUMN IF NOT EXISTS data_baixa date DEFAULT NULL;
ALTER TABLE public.commission_installments ADD COLUMN IF NOT EXISTS nf_emitida boolean DEFAULT false;