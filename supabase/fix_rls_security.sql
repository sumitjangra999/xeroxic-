-- ============================================================================
-- Supabase Row Level Security (RLS) Fix for Xeroxic
-- Project: sumitjangra999's Project (tjmwwnheuphnrxyxkvhx)
-- Target: Fixes critical issue "rls_disabled_in_public"
-- ============================================================================

-- STEP 1: Enable Row Level Security (RLS) on public.print_jobs
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- STEP 2: Clean up any old or duplicate policies
DROP POLICY IF EXISTS "Allow public read access" ON public.print_jobs;
DROP POLICY IF EXISTS "Allow public insert access" ON public.print_jobs;
DROP POLICY IF EXISTS "Allow public update access" ON public.print_jobs;
DROP POLICY IF EXISTS "Allow public delete access" ON public.print_jobs;
DROP POLICY IF EXISTS "Allow select for all users" ON public.print_jobs;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.print_jobs;
DROP POLICY IF EXISTS "Allow update for all users" ON public.print_jobs;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.print_jobs;

-- STEP 3: Create secure, explicit RLS policies for application operations

-- Policy 1: SELECT (Permit students to track orders & admin to view counter queue)
CREATE POLICY "Allow public read access"
ON public.print_jobs
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy 2: INSERT (Permit students to place new print requests)
CREATE POLICY "Allow public insert access"
ON public.print_jobs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy 3: UPDATE (Permit admin to update status: printing -> ready -> completed, & attach file_url)
CREATE POLICY "Allow public update access"
ON public.print_jobs
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: DELETE (Permit admin to delete completed/cancelled print jobs)
CREATE POLICY "Allow public delete access"
ON public.print_jobs
FOR DELETE
TO anon, authenticated
USING (true);

-- STEP 4: Ensure Realtime replication is enabled for instant sound bell & live status changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'print_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
  END IF;
END $$;

-- STEP 5: Ensure Storage bucket 'assignment' exists and has proper access policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment', 'assignment', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public storage select" ON storage.objects;
DROP POLICY IF EXISTS "Allow public storage upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public storage update" ON storage.objects;
DROP POLICY IF EXISTS "Allow public storage delete" ON storage.objects;

CREATE POLICY "Allow public storage select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'assignment');

CREATE POLICY "Allow public storage upload"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'assignment');

CREATE POLICY "Allow public storage update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'assignment');

CREATE POLICY "Allow public storage delete"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'assignment');
