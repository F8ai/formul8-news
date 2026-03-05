-- Remove old blocked RSS sources
DELETE FROM source_endpoints WHERE source_id IN (
  SELECT id FROM sources WHERE name IN ('Marijuana Business Daily', 'High Times', 'Leafly News')
);

DELETE FROM sources WHERE name IN ('Marijuana Business Daily', 'High Times', 'Leafly News');

-- Add working RSS sources
INSERT INTO sources (id, name, type, description, is_active) VALUES
  (extensions.uuid_generate_v4(), 'New Cannabis Ventures', 'rss', 'Cannabis business news and information', true),
  (extensions.uuid_generate_v4(), 'Cannabis Industry Journal', 'rss', 'Digital publishing platform for legal cannabis industry', true),
  (extensions.uuid_generate_v4(), 'Americans for Safe Access', 'rss', 'Medical marijuana advocacy and policy news', true);

-- Add endpoints for new sources
INSERT INTO source_endpoints (id, source_id, endpoint_url, endpoint_type, is_active)
SELECT 
  extensions.uuid_generate_v4(),
  s.id,
  e.url,
  'feed',
  true
FROM sources s
CROSS JOIN (VALUES
  ('New Cannabis Ventures', 'https://www.newcannabisventures.com/feed/'),
  ('Cannabis Industry Journal', 'https://cannabisindustryjournal.com/feed/'),
  ('Americans for Safe Access', 'https://www.safeaccessnow.org/blog.rss')
) AS e(source_name, url)
WHERE s.name = e.source_name;
