-- Allow authenticated users to read files from company-assets bucket
CREATE POLICY "Authenticated users can read company assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'company-assets');

-- Allow authenticated users to upload to company-assets bucket
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

-- Allow authenticated users to update their company assets
CREATE POLICY "Authenticated users can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets');