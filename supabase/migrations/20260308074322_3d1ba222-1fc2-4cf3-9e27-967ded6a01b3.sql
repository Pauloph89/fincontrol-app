
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'outros',
ADD COLUMN IF NOT EXISTS status_funil text DEFAULT 'lead';
