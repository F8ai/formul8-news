-- Add arXiv sources for AI and cannabis research papers
-- arXiv is a free distribution service and open-access archive for scholarly articles

-- Insert arXiv sources
INSERT INTO sources (name, type, description, license_policy) VALUES
  ('arXiv AI', 'Literature_API', 'arXiv artificial intelligence and machine learning papers',
   '{"mode": "store_full_text_allowed", "snippet_length": 1000, "attribution_required": true, "redistribution_allowed": true, "license_type": "CC BY 4.0"}'::jsonb),
  ('arXiv Cannabis', 'Literature_API', 'arXiv cannabis and cannabinoid research papers',
   '{"mode": "store_full_text_allowed", "snippet_length": 1000, "attribution_required": true, "redistribution_allowed": true, "license_type": "CC BY 4.0"}'::jsonb);

-- Insert arXiv endpoints with search queries
-- arXiv API: https://arxiv.org/help/api/
INSERT INTO source_endpoints (source_id, name, endpoint_url, polling_schedule, is_active, auth_config)
SELECT 
  s.id,
  'arXiv API',
  'http://export.arxiv.org/api/query',
  '0 */6 * * *', -- Every 6 hours
  true,
  CASE s.name
    WHEN 'arXiv AI' THEN jsonb_build_object(
      'search_query', 'cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR cat:stat.ML',
      'max_results', 200,
      'sort_by', 'submittedDate',
      'sort_order', 'descending'
    )
    WHEN 'arXiv Cannabis' THEN jsonb_build_object(
      'search_query', 'all:cannabis OR all:cannabinoid OR all:cannabidiol OR all:CBD OR all:THC OR all:marijuana OR all:hemp',
      'max_results', 100,
      'sort_by', 'submittedDate',
      'sort_order', 'descending'
    )
  END
FROM sources s
WHERE s.name IN ('arXiv AI', 'arXiv Cannabis');
