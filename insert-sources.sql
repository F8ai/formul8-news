-- Insert cannabis news sources directly
INSERT INTO sources (name, type, description, license_policy) VALUES
  ('Marijuana Business Daily', 'RSS', 'Leading cannabis business news and analysis', 
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('High Times', 'RSS', 'Cannabis culture and news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Leafly News', 'RSS', 'Cannabis news, culture, and education',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb);

-- Insert RSS endpoints
INSERT INTO source_endpoints (source_id, name, endpoint_url, polling_schedule, is_active)
SELECT 
  s.id,
  s.name || ' RSS Feed',
  CASE s.name
    WHEN 'Marijuana Business Daily' THEN 'https://mjbizdaily.com/feed/'
    WHEN 'High Times' THEN 'https://hightimes.com/feed/'
    WHEN 'Leafly News' THEN 'https://www.leafly.com/news/feed'
  END,
  '*/30 * * * *',
  true
FROM sources s
WHERE s.type = 'RSS';
