-- Create storage bucket for game images
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-images', 'game-images', true);

-- Allow anyone to view images
CREATE POLICY "Anyone can view game images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'game-images');

-- Allow service role to upload/update/delete images
CREATE POLICY "Service role can upload game images"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'game-images');

CREATE POLICY "Service role can update game images"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'game-images');

CREATE POLICY "Service role can delete game images"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'game-images');

-- Allow anon users to upload (for the admin panel without auth)
CREATE POLICY "Anon can upload game images"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'game-images');