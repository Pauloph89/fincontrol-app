
-- Fix company-assets policies to match actual folder structure (company_id based)
DROP POLICY IF EXISTS "Users can upload own company assets" ON storage.objects;
CREATE POLICY "Company members can upload company assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text);

DROP POLICY IF EXISTS "Users can update own company assets" ON storage.objects;
CREATE POLICY "Company members can update company assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text);

DROP POLICY IF EXISTS "Users can delete own company assets" ON storage.objects;
CREATE POLICY "Company members can delete company assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text);

-- Also scope SELECT to company
DROP POLICY IF EXISTS "Authenticated users can view company assets" ON storage.objects;
CREATE POLICY "Company members can view company assets" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text);
