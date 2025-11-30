-- Add image_url column to questions table
ALTER TABLE questions 
ADD COLUMN image_url TEXT;

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true);

-- RLS policies for question images bucket
CREATE POLICY "Admins can upload question images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'question-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update question images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'question-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete question images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'question-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Everyone can view question images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'question-images');