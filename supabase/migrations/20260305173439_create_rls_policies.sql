-- Create Row-Level Security (RLS) policies
-- Phase 1: Enforce separation between internal and public data

-- Enable RLS on signal_items
ALTER TABLE signal_items ENABLE ROW LEVEL SECURITY;

-- Public users can only read signals from sources with redistribution allowed
CREATE POLICY "Public read access to compliant signals"
ON signal_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM provenance_records pr
    JOIN sources s ON pr.source_id = s.id
    WHERE pr.signal_item_id = signal_items.id
    AND (s.license_policy->>'redistribution_allowed')::boolean = true
  )
);

-- Authenticated internal users can read all signals
CREATE POLICY "Internal full access to signals"
ON signal_items
FOR ALL
TO authenticated
USING (true);

-- Service role has full access (for Edge Functions)
CREATE POLICY "Service role full access to signals"
ON signal_items
FOR ALL
TO service_role
USING (true);

-- Enable RLS on news_items
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

-- Public users cannot access full content for snippet_only or link_only sources
CREATE POLICY "Public content filtering for news"
ON news_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM signal_items si
    JOIN provenance_records pr ON pr.signal_item_id = si.id
    JOIN sources s ON pr.source_id = s.id
    WHERE si.id = news_items.signal_item_id
    AND (s.license_policy->>'mode') = 'store_full_text_allowed'
    AND (s.license_policy->>'redistribution_allowed')::boolean = true
  )
);

-- Internal users can access all content
CREATE POLICY "Internal full access to news content"
ON news_items
FOR ALL
TO authenticated
USING (true);

-- Service role has full access
CREATE POLICY "Service role full access to news"
ON news_items
FOR ALL
TO service_role
USING (true);

-- Enable RLS on patent_items
ALTER TABLE patent_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to patents"
ON patent_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM signal_items si
    JOIN provenance_records pr ON pr.signal_item_id = si.id
    JOIN sources s ON pr.source_id = s.id
    WHERE si.id = patent_items.signal_item_id
    AND (s.license_policy->>'redistribution_allowed')::boolean = true
  )
);

CREATE POLICY "Internal full access to patents"
ON patent_items
FOR ALL
TO authenticated
USING (true);

CREATE POLICY "Service role full access to patents"
ON patent_items
FOR ALL
TO service_role
USING (true);

-- Enable RLS on paper_items
ALTER TABLE paper_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to papers"
ON paper_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM signal_items si
    JOIN provenance_records pr ON pr.signal_item_id = si.id
    JOIN sources s ON pr.source_id = s.id
    WHERE si.id = paper_items.signal_item_id
    AND (s.license_policy->>'redistribution_allowed')::boolean = true
  )
);

CREATE POLICY "Internal full access to papers"
ON paper_items
FOR ALL
TO authenticated
USING (true);

CREATE POLICY "Service role full access to papers"
ON paper_items
FOR ALL
TO service_role
USING (true);

-- Enable RLS on other tables (restrict to service role and authenticated only)
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE provenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingest_item_events ENABLE ROW LEVEL SECURITY;

-- Service role and authenticated users can access all internal tables
CREATE POLICY "Service role access to sources" ON sources FOR ALL TO service_role USING (true);
CREATE POLICY "Authenticated access to sources" ON sources FOR ALL TO authenticated USING (true);

CREATE POLICY "Service role access to endpoints" ON source_endpoints FOR ALL TO service_role USING (true);
CREATE POLICY "Authenticated access to endpoints" ON source_endpoints FOR ALL TO authenticated USING (true);

CREATE POLICY "Service role access to provenance" ON provenance_records FOR ALL TO service_role USING (true);
CREATE POLICY "Authenticated access to provenance" ON provenance_records FOR ALL TO authenticated USING (true);

CREATE POLICY "Service role access to fingerprints" ON signal_fingerprints FOR ALL TO service_role USING (true);
CREATE POLICY "Authenticated access to fingerprints" ON signal_fingerprints FOR ALL TO authenticated USING (true);

CREATE POLICY "Service role access to clusters" ON clusters FOR ALL TO service_role USING (true);
CREATE POLICY "Authenticated access to clusters" ON clusters FOR ALL TO authenticated USING (true);

CREATE POLICY "Service role access to cluster members" ON cluster_members FOR ALL TO service_role USING (true);
CREATE POLICY "Authenticated access to cluster members" ON cluster_members FOR ALL TO authenticated USING (true);

CREATE POLICY "Service role access to ingest runs" ON ingest_runs FOR ALL TO service_role USING (true);
CREATE POLICY "Authenticated access to ingest runs" ON ingest_runs FOR ALL TO authenticated USING (true);

CREATE POLICY "Service role access to ingest events" ON ingest_item_events FOR ALL TO service_role USING (true);
CREATE POLICY "Authenticated access to ingest events" ON ingest_item_events FOR ALL TO authenticated USING (true);
