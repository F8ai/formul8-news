-- Add AI news sources for models and tools coverage
-- This expands the platform to cover AI industry news alongside cannabis

-- Insert AI news sources
INSERT INTO sources (name, type, description, license_policy) VALUES
  ('OpenAI Blog', 'RSS', 'Official OpenAI blog covering GPT models, DALL-E, and AI research', 
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Anthropic News', 'RSS', 'Anthropic announcements and Claude AI updates',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Hugging Face Blog', 'RSS', 'Open source AI models, datasets, and tools',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Google AI Blog', 'RSS', 'Google AI research and product announcements',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('The Batch by deeplearning.ai', 'RSS', 'Weekly AI news and insights from Andrew Ng',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('AI News - MIT Technology Review', 'RSS', 'AI coverage from MIT Technology Review',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('VentureBeat AI', 'RSS', 'AI business news and product launches',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb);

-- Insert RSS endpoints for AI sources
INSERT INTO source_endpoints (source_id, name, endpoint_url, polling_schedule, is_active)
SELECT 
  s.id,
  'Main Feed',
  CASE s.name
    WHEN 'OpenAI Blog' THEN 'https://openai.com/blog/rss.xml'
    WHEN 'Anthropic News' THEN 'https://www.anthropic.com/news/rss.xml'
    WHEN 'Hugging Face Blog' THEN 'https://huggingface.co/blog/feed.xml'
    WHEN 'Google AI Blog' THEN 'http://ai.googleblog.com/feeds/posts/default'
    WHEN 'The Batch by deeplearning.ai' THEN 'https://www.deeplearning.ai/the-batch/feed/'
    WHEN 'AI News - MIT Technology Review' THEN 'https://www.technologyreview.com/topic/artificial-intelligence/feed'
    WHEN 'VentureBeat AI' THEN 'https://venturebeat.com/category/ai/feed/'
  END,
  '*/30 * * * *', -- Every 30 minutes
  true
FROM sources s
WHERE s.name IN (
  'OpenAI Blog',
  'Anthropic News', 
  'Hugging Face Blog',
  'Google AI Blog',
  'The Batch by deeplearning.ai',
  'AI News - MIT Technology Review',
  'VentureBeat AI'
);

-- Add AI-specific topics to the topics table
INSERT INTO topics (slug, name, description) VALUES
  ('large-language-models', 'Large Language Models', 'GPT, Claude, Llama, and other LLMs'),
  ('computer-vision', 'Computer Vision', 'Image generation, recognition, and processing'),
  ('machine-learning', 'Machine Learning', 'ML algorithms, training, and deployment'),
  ('ai-tools', 'AI Tools', 'AI development tools, frameworks, and platforms'),
  ('ai-models', 'AI Models', 'New AI model releases and updates'),
  ('ai-research', 'AI Research', 'Academic AI research and papers'),
  ('ai-ethics', 'AI Ethics', 'AI safety, alignment, and ethical considerations'),
  ('ai-business', 'AI Business', 'AI startups, funding, and market trends'),
  ('generative-ai', 'Generative AI', 'Text, image, video, and audio generation'),
  ('ai-infrastructure', 'AI Infrastructure', 'GPU, cloud, and compute for AI')
ON CONFLICT (name) DO NOTHING;
