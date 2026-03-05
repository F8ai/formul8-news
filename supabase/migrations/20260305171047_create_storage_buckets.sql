-- Create storage buckets for raw artifacts and public feeds
-- Phase 1: raw-artifacts (private), public-feeds (public)

-- Create raw-artifacts bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'raw-artifacts',
  'raw-artifacts',
  false,
  52428800, -- 50MB limit
  ARRAY['text/xml', 'application/json', 'application/pdf', 'text/html']
)
ON CONFLICT (id) DO NOTHING;

-- Create public-feeds bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-feeds',
  'public-feeds',
  true,
  10485760, -- 10MB limit
  ARRAY['application/json']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for raw-artifacts bucket
-- Only service role can read/write
CREATE POLICY "Service role can read raw artifacts"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'raw-artifacts');

CREATE POLICY "Service role can write raw artifacts"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'raw-artifacts');

CREATE POLICY "Service role can update raw artifacts"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'raw-artifacts');

CREATE POLICY "Service role can delete raw artifacts"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'raw-artifacts');

-- Storage policies for public-feeds bucket
-- Public can read, service role can write
CREATE POLICY "Public can read feeds"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public-feeds');

CREATE POLICY "Service role can write feeds"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'public-feeds');

CREATE POLICY "Service role can update feeds"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'public-feeds');

CREATE POLICY "Service role can delete feeds"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'public-feeds');
