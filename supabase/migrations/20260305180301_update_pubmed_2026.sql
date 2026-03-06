-- Update PubMed configuration to focus on 2026 articles
-- This updates the search query to include date filters for recent research

-- Update PubMed endpoint to search for 2026 articles
UPDATE source_endpoints
SET 
  auth_config = jsonb_set(
    jsonb_set(
      auth_config,
      '{search_query}',
      '"(cannabis[Title/Abstract] OR cannabidiol[Title/Abstract] OR CBD[Title/Abstract] OR THC[Title/Abstract] OR marijuana[Title/Abstract] OR cannabinoid[Title/Abstract]) AND (2026[PDAT])"'::jsonb
    ),
    '{max_results}',
    '500'::jsonb
  ),
  polling_schedule = '0 */3 * * *' -- Every 3 hours for more frequent updates
WHERE source_id = (SELECT id FROM sources WHERE name = 'PubMed')
  AND name = 'E-utilities Search';

-- Add comment explaining the configuration
COMMENT ON TABLE source_endpoints IS 'PubMed endpoint configured to fetch cannabis research from 2026 with increased frequency and result limit';
