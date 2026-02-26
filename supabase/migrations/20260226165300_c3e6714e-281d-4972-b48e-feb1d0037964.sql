
-- Drop the check constraint on installment_number that causes errors with custom installments
ALTER TABLE public.commission_installments DROP CONSTRAINT IF EXISTS commission_installments_installment_number_check;

-- Create public bucket for company assets (logos)
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company-assets bucket
CREATE POLICY "Users can upload own company assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own company assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own company assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view company assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');
