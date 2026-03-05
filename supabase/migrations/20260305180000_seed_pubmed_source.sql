-- Add PubMed as a literature source for cannabis research tracking

-- Insert PubMed source
INSERT INTO sources (name, type, description, license_policy) VALUES
  ('PubMed', 'Literature_API', 'NIH database of biomedical literature including cannabis research',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb);

-- Insert PubMed endpoint using E-utilities API
INSERT INTO source_endpoints (source_id, name, endpoint_url, polling_schedule, is_active, auth_config)
SELECT 
  s.id,
  'E-utilities Search',
  'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
  '0 */6 * * *', -- Every 6 hours
  true,
  '{"api_key": null, "search_query": "(cannabis[Title/Abstract] OR cannabidiol[Title/Abstract] OR CBD[Title/Abstract] OR THC[Title/Abstract] OR marijuana[Title/Abstract] OR cannabinoid[Title/Abstract])", "max_results": 100}'::jsonb
FROM sources s
WHERE s.name = 'PubMed';
