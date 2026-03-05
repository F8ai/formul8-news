-- Fix RLS policies to allow public read access without requiring provenance records
-- This is a temporary fix until provenance records are properly created

-- Drop existing policies for signal_items
DROP POLICY IF EXISTS "Public read access to compliant signals" ON signal_items;
DROP POLICY IF EXISTS "Internal full access to signals" ON signal_items;
DROP POLICY IF EXISTS "Service role full access to signals" ON signal_items;

-- Create simpler public read policy for signal_items
CREATE POLICY "Public read access to signals"
ON signal_items
FOR SELECT
TO anon, authenticated
USING (true);

-- Service role still needs full access for writes
CREATE POLICY "Service role full access to signals"
ON signal_items
FOR ALL
TO service_role
USING (true);

-- Drop existing policies for news_items
DROP POLICY IF EXISTS "Public content filtering for news" ON news_items;
DROP POLICY IF EXISTS "Internal full access to news content" ON news_items;
DROP POLICY IF EXISTS "Service role full access to news" ON news_items;

-- Create simpler public read policy for news_items
CREATE POLICY "Public read access to news"
ON news_items
FOR SELECT
TO anon, authenticated
USING (true);

-- Service role still needs full access for writes
CREATE POLICY "Service role full access to news"
ON news_items
FOR ALL
TO service_role
USING (true);

-- Drop existing policies for patent_items
DROP POLICY IF EXISTS "Public read access to patents" ON patent_items;
DROP POLICY IF EXISTS "Internal full access to patents" ON patent_items;
DROP POLICY IF EXISTS "Service role full access to patents" ON patent_items;

-- Create simpler public read policy for patent_items
CREATE POLICY "Public read access to patents"
ON patent_items
FOR SELECT
TO anon, authenticated
USING (true);

-- Service role still needs full access for writes
CREATE POLICY "Service role full access to patents"
ON patent_items
FOR ALL
TO service_role
USING (true);

-- Drop existing policies for paper_items
DROP POLICY IF EXISTS "Public read access to papers" ON paper_items;
DROP POLICY IF EXISTS "Internal full access to papers" ON paper_items;
DROP POLICY IF EXISTS "Service role full access to papers" ON paper_items;

-- Create simpler public read policy for paper_items
CREATE POLICY "Public read access to papers"
ON paper_items
FOR SELECT
TO anon, authenticated
USING (true);

-- Service role still needs full access for writes
CREATE POLICY "Service role full access to papers"
ON paper_items
FOR ALL
TO service_role
USING (true);

-- Allow public read access to sources (needed for the news page to show source names)
CREATE POLICY "Public read access to sources"
ON sources
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public read access to topics (needed for topic tags)
-- First check if the topics table exists and has RLS enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'topics') THEN
    ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Public read access to topics" ON topics;
    CREATE POLICY "Public read access to topics"
    ON topics
    FOR SELECT
    TO anon, authenticated
    USING (true);
    
    DROP POLICY IF EXISTS "Service role full access to topics" ON topics;
    CREATE POLICY "Service role full access to topics"
    ON topics
    FOR ALL
    TO service_role
    USING (true);
  END IF;
END $$;

-- Allow public read access to signal_topics (needed for topic associations)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'signal_topics') THEN
    ALTER TABLE signal_topics ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Public read access to signal_topics" ON signal_topics;
    CREATE POLICY "Public read access to signal_topics"
    ON signal_topics
    FOR SELECT
    TO anon, authenticated
    USING (true);
    
    DROP POLICY IF EXISTS "Service role full access to signal_topics" ON signal_topics;
    CREATE POLICY "Service role full access to signal_topics"
    ON signal_topics
    FOR ALL
    TO service_role
    USING (true);
  END IF;
END $$;
