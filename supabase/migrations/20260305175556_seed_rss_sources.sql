-- Seed RSS sources for cannabis and related news
-- Cannabis industry news sources

-- Insert cannabis news sources
INSERT INTO sources (name, type, description, license_policy) VALUES
  ('New Cannabis Ventures', 'RSS', 'Cannabis business news and information', 
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Cannabis Industry Journal', 'RSS', 'Digital publishing platform for legal cannabis industry',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Americans for Safe Access', 'RSS', 'Medical marijuana advocacy and policy news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb);

-- Insert RSS endpoints for each source
INSERT INTO source_endpoints (source_id, name, endpoint_url, polling_schedule, is_active)
SELECT 
  s.id,
  'Main Feed',
  CASE s.name
    WHEN 'New Cannabis Ventures' THEN 'https://www.newcannabisventures.com/feed/'
    WHEN 'Cannabis Industry Journal' THEN 'https://cannabisindustryjournal.com/feed/'
    WHEN 'Americans for Safe Access' THEN 'https://www.safeaccessnow.org/blog.rss'
  END,
  '*/30 * * * *', -- Every 30 minutes
  true
FROM sources s
WHERE s.type = 'RSS';

